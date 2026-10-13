param(
  [Parameter(Mandatory = $true)][string]$EncryptedBackupPath,
  [string]$PostgresImage = "postgres:17-alpine"
)

$ErrorActionPreference = "Stop"
. (Join-Path $PSScriptRoot "file-hash.ps1")
$projectRoot = [System.IO.Path]::GetFullPath((Get-Location).Path)
$dockerPath = Join-Path $env:LOCALAPPDATA "Programs\DockerDesktop\resources\bin\docker.exe"
$opensslPath = "C:\Program Files\Git\usr\bin\openssl.exe"
$resolvedBackup = [System.IO.Path]::GetFullPath((Join-Path $projectRoot $EncryptedBackupPath))
if (-not (Test-Path -LiteralPath $resolvedBackup -PathType Leaf)) { throw "Encrypted backup not found: $resolvedBackup" }
if (-not (Test-Path -LiteralPath $dockerPath -PathType Leaf)) { throw "Docker Desktop was not found." }
if (-not (Test-Path -LiteralPath $opensslPath -PathType Leaf)) { throw "OpenSSL was not found in Git for Windows." }

$checksumPath = "$resolvedBackup.sha256"
if (-not (Test-Path -LiteralPath $checksumPath -PathType Leaf)) { throw "Checksum file not found: $checksumPath" }
$expected = ((Get-Content -LiteralPath $checksumPath -Raw).Trim() -split '\s+')[0].ToLowerInvariant()
$actual = Get-TudelaFileSha256 -LiteralPath $resolvedBackup
if ($actual -ne $expected) { throw "Encrypted backup checksum mismatch." }

$tempRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("tudela-database-verify-" + [guid]::NewGuid().ToString('N'))
$plainZip = Join-Path $tempRoot "backup.zip"
$extractPath = Join-Path $tempRoot "files"
New-Item -ItemType Directory -Path $tempRoot | Out-Null
$passphraseSecure = Read-Host "Enter the database-backup passphrase" -AsSecureString
$passphrase = [System.Net.NetworkCredential]::new('', $passphraseSecure).Password
try {
  $env:TUDELA_BACKUP_PASSPHRASE = $passphrase
  & $opensslPath enc -d -aes-256-cbc -pbkdf2 -iter 200000 -in $resolvedBackup -out $plainZip -pass env:TUDELA_BACKUP_PASSPHRASE
  if ($LASTEXITCODE -ne 0) { throw "Decryption failed. Check the passphrase and backup integrity." }
  Expand-Archive -LiteralPath $plainZip -DestinationPath $extractPath

  $dumpPath = Join-Path $extractPath "database.dump"
  $summaryPath = Join-Path $extractPath "DATABASE-SUMMARY.json"
  if (-not (Test-Path -LiteralPath $dumpPath -PathType Leaf)) { throw "database.dump is missing from the decrypted backup." }
  if (-not (Test-Path -LiteralPath $summaryPath -PathType Leaf)) { throw "DATABASE-SUMMARY.json is missing from the decrypted backup." }
  $summary = Get-Content -LiteralPath $summaryPath -Raw | ConvertFrom-Json
  $dumpHash = Get-TudelaFileSha256 -LiteralPath $dumpPath
  if ($dumpHash -ne $summary.databaseSha256) { throw "The database archive checksum does not match its internal summary." }

  & $dockerPath image inspect $PostgresImage *> $null
  if ($LASTEXITCODE -ne 0) { throw "The PostgreSQL verification image is not available: $PostgresImage" }
  $mountSource = $extractPath.Replace('\', '/')
  $listOutput = & $dockerPath run --rm --mount "type=bind,source=$mountSource,target=/backup,readonly" $PostgresImage pg_restore --list /backup/database.dump
  if ($LASTEXITCODE -ne 0) { throw "pg_restore could not read the decrypted database archive." }
  $archiveEntryCount = @($listOutput | Where-Object { $_ -match '^\d+;' }).Count
  if ($archiveEntryCount -ne [int]$summary.archiveEntryCount) { throw "The database archive entry count does not match its internal summary." }

  Write-Output "Encrypted database backup verified: $resolvedBackup"
  Write-Output "Archive entries verified: $archiveEntryCount"
  Write-Output "Encrypted SHA-256: $actual"
}
finally {
  Remove-Item Env:TUDELA_BACKUP_PASSPHRASE -ErrorAction SilentlyContinue
  $passphrase = $null
  $passphraseSecure = $null
  if (Test-Path -LiteralPath $tempRoot) { Remove-Item -LiteralPath $tempRoot -Recurse -Force }
}
