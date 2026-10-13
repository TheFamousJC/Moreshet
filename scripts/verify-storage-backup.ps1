param(
  [Parameter(Mandatory = $true)][string]$EncryptedBackupPath
)

$ErrorActionPreference = "Stop"
. (Join-Path $PSScriptRoot "file-hash.ps1")
$projectRoot = [System.IO.Path]::GetFullPath((Get-Location).Path)
$opensslPath = "C:\Program Files\Git\usr\bin\openssl.exe"
$resolvedBackup = [System.IO.Path]::GetFullPath((Join-Path $projectRoot $EncryptedBackupPath))
if (-not (Test-Path -LiteralPath $resolvedBackup -PathType Leaf)) { throw "Encrypted backup not found: $resolvedBackup" }
if (-not (Test-Path -LiteralPath $opensslPath -PathType Leaf)) { throw "OpenSSL was not found in Git for Windows." }

$checksumPath = "$resolvedBackup.sha256"
if (-not (Test-Path -LiteralPath $checksumPath -PathType Leaf)) { throw "Checksum file not found: $checksumPath" }
$expected = ((Get-Content -LiteralPath $checksumPath -Raw).Trim() -split '\s+')[0]
$actual = Get-TudelaFileSha256 -LiteralPath $resolvedBackup
if ($actual -ne $expected) { throw "Encrypted backup checksum mismatch." }

$tempRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("tudela-storage-verify-" + [guid]::NewGuid().ToString('N'))
$plainZip = Join-Path $tempRoot "backup.zip"
$extractPath = Join-Path $tempRoot "files"
New-Item -ItemType Directory -Path $tempRoot | Out-Null
$passphraseSecure = Read-Host "Enter the Storage-backup passphrase" -AsSecureString
$passphrase = [System.Net.NetworkCredential]::new('', $passphraseSecure).Password
try {
  $env:TUDELA_BACKUP_PASSPHRASE = $passphrase
  & $opensslPath enc -d -aes-256-cbc -pbkdf2 -iter 200000 -in $resolvedBackup -out $plainZip -pass env:TUDELA_BACKUP_PASSPHRASE
  if ($LASTEXITCODE -ne 0) { throw "Decryption failed. Check the passphrase and backup integrity." }
  Expand-Archive -LiteralPath $plainZip -DestinationPath $extractPath

  $manifestPath = Join-Path $extractPath "STORAGE-MANIFEST.json"
  if (-not (Test-Path -LiteralPath $manifestPath -PathType Leaf)) { throw "Storage manifest is missing from the decrypted backup." }
  $manifest = Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json
  foreach ($entry in @($manifest)) {
    $filePath = Join-Path $extractPath ($entry.path.Replace('/', '\'))
    if (-not (Test-Path -LiteralPath $filePath -PathType Leaf)) { throw "Backup object is missing: $($entry.path)" }
    $fileHash = Get-TudelaFileSha256 -LiteralPath $filePath
    if ($fileHash -ne $entry.sha256) { throw "Backup object checksum mismatch: $($entry.path)" }
  }
  Write-Output "Encrypted backup verified: $resolvedBackup"
  Write-Output "Objects verified: $(@($manifest).Count)"
  Write-Output "Encrypted SHA-256: $actual"
}
finally {
  Remove-Item Env:TUDELA_BACKUP_PASSPHRASE -ErrorAction SilentlyContinue
  $passphrase = $null
  $passphraseSecure = $null
  if (Test-Path -LiteralPath $tempRoot) { Remove-Item -LiteralPath $tempRoot -Recurse -Force }
}
