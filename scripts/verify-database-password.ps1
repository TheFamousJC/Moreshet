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
if ($linkedRef -cne $ProjectRef) { throw "Refusing to verify an unexpected project. Linked project: $linkedRef" }
if (-not (Test-Path -LiteralPath $poolerUrlPath -PathType Leaf)) { throw "The linked Session Pooler address is missing." }
if (-not (Test-Path -LiteralPath $dockerPath -PathType Leaf)) { throw "Docker Desktop was not found." }

$passwordSecure = Read-Host "Enter the NEW production database password (input is hidden)" -AsSecureString
$password = [System.Net.NetworkCredential]::new('', $passwordSecure).Password
if (-not $password) { throw "No password was entered." }
$temporaryRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("tudela-password-verify-" + [guid]::NewGuid().ToString('N'))
$credentialPath = Join-Path $temporaryRoot "database.env"
New-Item -ItemType Directory -Path $temporaryRoot | Out-Null
try {
  $poolerUrl = [uri](Get-Content -LiteralPath $poolerUrlPath -Raw).Trim()
  $dbUser = [uri]::UnescapeDataString($poolerUrl.UserInfo.Split(':', 2)[0])
  $dbName = [uri]::UnescapeDataString($poolerUrl.AbsolutePath.TrimStart('/'))
  $dbPort = if ($poolerUrl.IsDefaultPort) { 5432 } else { $poolerUrl.Port }
  [System.IO.File]::WriteAllText($credentialPath, "PGPASSWORD=$password`nPGSSLMODE=require`n", [System.Text.UTF8Encoding]::new($false))

  $previousErrorActionPreference = $ErrorActionPreference
  $ErrorActionPreference = "Continue"
  try {
    $connectionOutput = & $dockerPath run --rm --env-file $credentialPath $PostgresImage `
      psql --host $poolerUrl.Host --port $dbPort --username $dbUser --dbname $dbName --no-password --tuples-only --command "select current_database();" 2>&1
    $connectionExitCode = $LASTEXITCODE
  }
  finally { $ErrorActionPreference = $previousErrorActionPreference }
  if ($connectionExitCode -ne 0 -or ((@($connectionOutput) -join " ") -notmatch 'postgres')) {
    throw "The new production database password did not authenticate. Do not run another rotation; confirm that the exact newly generated password was entered."
  }
  Write-Output "New production database password verified successfully."
  Write-Output "The old database password is no longer valid. Remove all plaintext copies and retain only the new password in the approved password manager."
}
finally {
  $password = $null
  $passwordSecure = $null
  if (Test-Path -LiteralPath $temporaryRoot) { Remove-Item -LiteralPath $temporaryRoot -Recurse -Force }
}
