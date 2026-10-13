param(
  [string]$OutputDirectory = ".\backups\storage",
  [string[]]$Buckets = @("tour-media", "narration-audio")
)

$ErrorActionPreference = "Stop"
. (Join-Path $PSScriptRoot "file-hash.ps1")
$projectRoot = [System.IO.Path]::GetFullPath((Get-Location).Path)
$projectRefPath = Join-Path $projectRoot "supabase\.temp\project-ref"
if (-not (Test-Path -LiteralPath $projectRefPath -PathType Leaf)) {
  throw "The Supabase project is not linked. Run the approved Supabase link procedure first."
}
$projectRef = (Get-Content -LiteralPath $projectRefPath -Raw).Trim()
if ($projectRef -notmatch '^[a-z0-9]{20}$') { throw "The linked Supabase project reference is invalid." }

$cliPath = Join-Path $projectRoot "node_modules\@supabase\cli-windows-x64\bin\supabase.exe"
$opensslPath = "C:\Program Files\Git\usr\bin\openssl.exe"
if (-not (Test-Path -LiteralPath $cliPath -PathType Leaf)) { throw "Run npm.cmd install to restore the project-scoped Supabase CLI." }
if (-not (Test-Path -LiteralPath $opensslPath -PathType Leaf)) { throw "OpenSSL was not found in Git for Windows. Reinstall the current Git for Windows package." }

$resolvedOutput = [System.IO.Path]::GetFullPath((Join-Path $projectRoot $OutputDirectory))
New-Item -ItemType Directory -Path $resolvedOutput -Force | Out-Null
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$setName = "tudela-storage-$timestamp-$projectRef"
$stagingPath = Join-Path $resolvedOutput "$setName.staging"
$plainZipPath = Join-Path $resolvedOutput "$setName.zip"
$encryptedPath = Join-Path $resolvedOutput "$setName.zip.enc"
$checksumPath = "$encryptedPath.sha256"
foreach ($path in @($stagingPath, $plainZipPath, $encryptedPath, $checksumPath)) {
  if (Test-Path -LiteralPath $path) { throw "The intended backup path already exists: $path" }
}

$passphraseSecure = Read-Host "Enter a new backup passphrase (minimum 16 characters; store it in your password manager)" -AsSecureString
$passphrase = [System.Net.NetworkCredential]::new('', $passphraseSecure).Password
if ($passphrase.Length -lt 16) {
  $passphrase = $null
  throw "The backup passphrase must contain at least 16 characters."
}
$confirmationSecure = Read-Host "Enter the same backup passphrase again" -AsSecureString
$confirmation = [System.Net.NetworkCredential]::new('', $confirmationSecure).Password
if ($confirmation -cne $passphrase) {
  $passphrase = $null
  $confirmation = $null
  throw "The two backup passphrases did not match. No files were downloaded."
}
$confirmation = $null
$confirmationSecure = $null

New-Item -ItemType Directory -Path $stagingPath | Out-Null
try {
  foreach ($bucket in $Buckets) {
    if ($bucket -notmatch '^[a-z0-9][a-z0-9-]*$') { throw "Unsafe bucket name: $bucket" }
    $bucketPath = Join-Path $stagingPath $bucket
    New-Item -ItemType Directory -Path $bucketPath | Out-Null
    Push-Location $bucketPath
    try {
      & $cliPath storage cp "ss:///$bucket" "." --recursive --experimental --linked
      if ($LASTEXITCODE -ne 0) { throw "Supabase Storage download failed for $bucket with exit code $LASTEXITCODE." }
    }
    finally { Pop-Location }
  }

  $manifestRows = foreach ($file in Get-ChildItem -LiteralPath $stagingPath -File -Recurse | Sort-Object FullName) {
    $relativePath = $file.FullName.Substring($stagingPath.Length).TrimStart([char[]]@('\', '/')).Replace('\', '/')
    [pscustomobject]@{
      path = $relativePath
      bytes = $file.Length
      sha256 = Get-TudelaFileSha256 -LiteralPath $file.FullName
    }
  }
  if (-not $manifestRows) { throw "No Storage objects were downloaded; refusing to create an empty backup." }

  $manifestRows | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath (Join-Path $stagingPath "STORAGE-MANIFEST.json") -Encoding utf8
  [ordered]@{
    createdUtc = (Get-Date).ToUniversalTime().ToString('o')
    projectRef = $projectRef
    buckets = $Buckets
    objectCount = @($manifestRows).Count
    totalBytes = ($manifestRows | Measure-Object -Property bytes -Sum).Sum
    gitCommit = (& git rev-parse HEAD).Trim()
  } | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath (Join-Path $stagingPath "BACKUP-SUMMARY.json") -Encoding utf8

  Compress-Archive -Path (Join-Path $stagingPath '*') -DestinationPath $plainZipPath -CompressionLevel Optimal
  $env:TUDELA_BACKUP_PASSPHRASE = $passphrase
  & $opensslPath enc -aes-256-cbc -salt -pbkdf2 -iter 200000 -in $plainZipPath -out $encryptedPath -pass env:TUDELA_BACKUP_PASSPHRASE
  if ($LASTEXITCODE -ne 0) { throw "OpenSSL encryption failed with exit code $LASTEXITCODE." }

  $hash = Get-TudelaFileSha256 -LiteralPath $encryptedPath
  Set-Content -LiteralPath $checksumPath -Value "$hash  $([System.IO.Path]::GetFileName($encryptedPath))" -Encoding ascii
  Write-Output "Encrypted Storage backup created: $encryptedPath"
  Write-Output "Objects: $(@($manifestRows).Count)"
  Write-Output "Encrypted SHA-256: $hash"
  Write-Output "Keep the passphrase in your password manager; it is not stored in the backup."
}
finally {
  Remove-Item Env:TUDELA_BACKUP_PASSPHRASE -ErrorAction SilentlyContinue
  $passphrase = $null
  $passphraseSecure = $null
  $confirmation = $null
  $confirmationSecure = $null
  if (Test-Path -LiteralPath $plainZipPath) { Remove-Item -LiteralPath $plainZipPath -Force }
  if (Test-Path -LiteralPath $stagingPath) { Remove-Item -LiteralPath $stagingPath -Recurse -Force }
}
