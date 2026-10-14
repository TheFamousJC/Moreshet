param(
  [string]$ProjectRef = "whptmssqxehkxwfwyxqm",
  [string]$PostgresImage = "postgres:17-alpine"
)

$ErrorActionPreference = "Stop"
$projectRoot = [System.IO.Path]::GetFullPath((Get-Location).Path)
$linkedRefPath = Join-Path $projectRoot "supabase\.temp\project-ref"
$poolerUrlPath = Join-Path $projectRoot "supabase\.temp\pooler-url"
$dockerPath = Join-Path $env:LOCALAPPDATA "Programs\DockerDesktop\resources\bin\docker.exe"

if (-not (Test-Path -LiteralPath $linkedRefPath -PathType Leaf)) { throw "The Supabase project is not linked." }
$linkedRef = (Get-Content -LiteralPath $linkedRefPath -Raw).Trim()
if ($linkedRef -cne $ProjectRef) { throw "Refusing to rotate an unexpected project. Linked project: $linkedRef" }
if (-not (Test-Path -LiteralPath $poolerUrlPath -PathType Leaf)) { throw "The linked Session Pooler address is missing." }
if (-not (Test-Path -LiteralPath $dockerPath -PathType Leaf)) { throw "Docker Desktop was not found." }

if (-not ("Moreshet.CredentialReader" -as [type])) {
  Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;

namespace Moreshet {
  public static class CredentialReader {
    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
    private struct Credential {
      public UInt32 Flags;
      public UInt32 Type;
      public IntPtr TargetName;
      public IntPtr Comment;
      public System.Runtime.InteropServices.ComTypes.FILETIME LastWritten;
      public UInt32 CredentialBlobSize;
      public IntPtr CredentialBlob;
      public UInt32 Persist;
      public UInt32 AttributeCount;
      public IntPtr Attributes;
      public IntPtr TargetAlias;
      public IntPtr UserName;
    }

    [DllImport("Advapi32.dll", EntryPoint = "CredReadW", CharSet = CharSet.Unicode, SetLastError = true)]
    private static extern bool CredRead(string target, UInt32 type, UInt32 flags, out IntPtr credentialPtr);

    [DllImport("Advapi32.dll", SetLastError = false)]
    private static extern void CredFree(IntPtr credentialPtr);

    public static byte[] ReadGenericSecret(string target) {
      IntPtr ptr;
      if (!CredRead(target, 1, 0, out ptr)) {
        throw new System.ComponentModel.Win32Exception(Marshal.GetLastWin32Error());
      }
      try {
        Credential credential = (Credential)Marshal.PtrToStructure(ptr, typeof(Credential));
        byte[] bytes = new byte[credential.CredentialBlobSize];
        if (bytes.Length > 0) Marshal.Copy(credential.CredentialBlob, bytes, 0, bytes.Length);
        return bytes;
      }
      finally { CredFree(ptr); }
    }
  }
}
"@
}

$tokenBytes = [Moreshet.CredentialReader]::ReadGenericSecret("Supabase CLI:supabase")
if (-not $tokenBytes -or $tokenBytes.Length -lt 20) { throw "The authenticated Supabase CLI token could not be read." }
$looksUnicode = $tokenBytes.Length -ge 2
for ($index = 1; $looksUnicode -and $index -lt $tokenBytes.Length; $index += 2) {
  if ($tokenBytes[$index] -ne 0) { $looksUnicode = $false }
}
$accessToken = if ($looksUnicode) {
  [System.Text.Encoding]::Unicode.GetString($tokenBytes)
} else {
  [System.Text.Encoding]::UTF8.GetString($tokenBytes)
}
$accessToken = $accessToken.Trim([char]0).Trim()
if ($accessToken.Length -lt 20) { throw "The authenticated Supabase CLI token is invalid." }

$newPasswordSecure = Read-Host "Enter the NEW production database password (minimum 16 characters; input is hidden)" -AsSecureString
$newPassword = [System.Net.NetworkCredential]::new('', $newPasswordSecure).Password
if ($newPassword.Length -lt 16) { throw "The new database password must contain at least 16 characters." }
if ($newPassword -match "[`r`n]") { throw "The new database password cannot contain a newline." }
$confirmationSecure = Read-Host "Enter the same NEW production database password again" -AsSecureString
$confirmation = [System.Net.NetworkCredential]::new('', $confirmationSecure).Password
if ($confirmation -cne $newPassword) { throw "The two passwords did not match. The production password was not changed." }

$temporaryRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("moreshet-password-rotation-" + [guid]::NewGuid().ToString('N'))
$credentialPath = Join-Path $temporaryRoot "database.env"
New-Item -ItemType Directory -Path $temporaryRoot | Out-Null
try {
  Write-Output "Rotating the database password for the verified production project $ProjectRef..."
  $headers = @{ Authorization = "Bearer $accessToken" }
  $body = @{ password = $newPassword } | ConvertTo-Json -Compress
  Invoke-RestMethod -Method Patch -Uri "https://api.supabase.com/v1/projects/$ProjectRef/database/password" -Headers $headers -ContentType "application/json" -Body $body | Out-Null
  Write-Output "Supabase accepted the password rotation. Waiting for the new credential to become active..."

  $poolerUrl = [uri](Get-Content -LiteralPath $poolerUrlPath -Raw).Trim()
  $dbUser = [uri]::UnescapeDataString($poolerUrl.UserInfo.Split(':', 2)[0])
  $dbName = [uri]::UnescapeDataString($poolerUrl.AbsolutePath.TrimStart('/'))
  $dbPort = if ($poolerUrl.IsDefaultPort) { 5432 } else { $poolerUrl.Port }
  [System.IO.File]::WriteAllText($credentialPath, "PGPASSWORD=$newPassword`nPGSSLMODE=require`n", [System.Text.UTF8Encoding]::new($false))

  $verified = $false
  for ($attempt = 1; $attempt -le 18 -and -not $verified; $attempt++) {
    Start-Sleep -Seconds 10
    $previousErrorActionPreference = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    try {
      $connectionOutput = & $dockerPath run --rm --env-file $credentialPath $PostgresImage `
        psql --host $poolerUrl.Host --port $dbPort --username $dbUser --dbname $dbName --no-password --tuples-only --command "select current_database();" 2>&1
    }
    finally { $ErrorActionPreference = $previousErrorActionPreference }
    if ($LASTEXITCODE -eq 0 -and ((@($connectionOutput) -join " ") -match 'postgres')) {
      $verified = $true
    } else {
      Write-Output "Verification attempt $attempt of 18 is not ready yet."
    }
  }
  if (-not $verified) { throw "Supabase accepted the rotation, but the new password did not verify within three minutes. Do not discard the new password; retry verification later." }

  Write-Output "Production database password rotation verified successfully."
  Write-Output "Store the new password in the approved password manager and remove every plaintext copy of the old password."
}
finally {
  $accessToken = $null
  $tokenBytes = $null
  $newPassword = $null
  $newPasswordSecure = $null
  $confirmation = $null
  $confirmationSecure = $null
  $headers = $null
  $body = $null
  if (Test-Path -LiteralPath $temporaryRoot) { Remove-Item -LiteralPath $temporaryRoot -Recurse -Force }
}
