param(
  [string]$OutputDirectory = ".\backups\database",
  [string]$PostgresImage = "postgres:17-alpine"
)

$ErrorActionPreference = "Stop"
. (Join-Path $PSScriptRoot "file-hash.ps1")
$projectRoot = [System.IO.Path]::GetFullPath((Get-Location).Path)
$projectRefPath = Join-Path $projectRoot "supabase\.temp\project-ref"
$poolerUrlPath = Join-Path $projectRoot "supabase\.temp\pooler-url"
$dockerPath = Join-Path $env:LOCALAPPDATA "Programs\DockerDesktop\resources\bin\docker.exe"
$opensslPath = "C:\Program Files\Git\usr\bin\openssl.exe"

if (-not (Test-Path -LiteralPath $projectRefPath -PathType Leaf)) {
  throw "The Supabase project is not linked. Run the approved Supabase link procedure first."
}
if (-not (Test-Path -LiteralPath $poolerUrlPath -PathType Leaf)) {
  throw "The linked Supabase Session Pooler address is missing. Relink the project first."
}
$projectRef = (Get-Content -LiteralPath $projectRefPath -Raw).Trim()
if ($projectRef -notmatch '^[a-z0-9]{20}$') { throw "The linked Supabase project reference is invalid." }
if (-not (Test-Path -LiteralPath $dockerPath -PathType Leaf)) { throw "Docker Desktop was not found." }
if (-not (Test-Path -LiteralPath $opensslPath -PathType Leaf)) { throw "OpenSSL was not found in Git for Windows." }

$resolvedOutput = [System.IO.Path]::GetFullPath((Join-Path $projectRoot $OutputDirectory))
New-Item -ItemType Directory -Path $resolvedOutput -Force | Out-Null
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$setName = "tudela-database-$timestamp-$projectRef"
$stagingPath = Join-Path $resolvedOutput "$setName.staging"
$plainZipPath = Join-Path $resolvedOutput "$setName.zip"
$encryptedPath = Join-Path $resolvedOutput "$setName.zip.enc"
$checksumPath = "$encryptedPath.sha256"
foreach ($path in @($stagingPath, $plainZipPath, $encryptedPath, $checksumPath)) {
  if (Test-Path -LiteralPath $path) { throw "The intended backup path already exists: $path" }
}

$poolerUrl = (Get-Content -LiteralPath $poolerUrlPath -Raw).Trim()
try { $databaseUri = [uri]$poolerUrl } catch { throw "The saved Session Pooler URI is invalid." }
if ($databaseUri.Scheme -notin @('postgres', 'postgresql')) { throw "The connection URI must start with postgres:// or postgresql://." }
if (-not $databaseUri.Host) { throw "The connection URI does not contain a database host." }
$dbUser = [uri]::UnescapeDataString($databaseUri.UserInfo.Split(':', 2)[0])
$passwordSecure = Read-Host "Enter the production Supabase database password (input is hidden)" -AsSecureString
$dbPassword = [System.Net.NetworkCredential]::new('', $passwordSecure).Password
$dbName = [uri]::UnescapeDataString($databaseUri.AbsolutePath.TrimStart('/'))
$dbPort = if ($databaseUri.IsDefaultPort) { 5432 } else { $databaseUri.Port }
if (-not $dbUser -or -not $dbPassword -or -not $dbName) { throw "The connection URI is missing a username, password or database name." }

$passphraseSecure = Read-Host "Enter a new database-backup passphrase (minimum 16 characters; store it in your password manager)" -AsSecureString
$passphrase = [System.Net.NetworkCredential]::new('', $passphraseSecure).Password
if ($passphrase.Length -lt 16) { throw "The backup passphrase must contain at least 16 characters." }
$confirmationSecure = Read-Host "Enter the same database-backup passphrase again" -AsSecureString
$confirmation = [System.Net.NetworkCredential]::new('', $confirmationSecure).Password
if ($confirmation -cne $passphrase) { throw "The two backup passphrases did not match. No backup was created." }

New-Item -ItemType Directory -Path $stagingPath | Out-Null
$dumpPath = Join-Path $stagingPath "database.dump"
$summaryPath = Join-Path $stagingPath "DATABASE-SUMMARY.json"
$credentialPath = Join-Path $stagingPath ".database-backup.env"
try {
  & $dockerPath image inspect $PostgresImage *> $null
  if ($LASTEXITCODE -ne 0) {
    Write-Output "Downloading the PostgreSQL backup tools on this first run..."
    & $dockerPath pull $PostgresImage
    if ($LASTEXITCODE -ne 0) { throw "Docker could not download $PostgresImage." }
  }

  if ($dbPassword -match "[`r`n]") { throw "The database password contains an unsupported newline character." }
  [System.IO.File]::WriteAllText($credentialPath, "PGPASSWORD=$dbPassword`nPGSSLMODE=require`n", [System.Text.UTF8Encoding]::new($false))

  $mountSource = $stagingPath.Replace('\', '/')
  $connectionOutput = & $dockerPath run --rm --env-file $credentialPath $PostgresImage `
    psql --host $databaseUri.Host --port $dbPort --username $dbUser --dbname $dbName --no-password --tuples-only --command "select current_database();" 2>&1
  $connectionExitCode = $LASTEXITCODE
  if ($connectionExitCode -ne 0) {
    $connectionMessage = (@($connectionOutput) -join [Environment]::NewLine).Trim()
    throw "PostgreSQL connection test failed. $connectionMessage"
  }
  Write-Output "Production database connection verified. Creating the read-only archive..."

  $dumpOutput = & $dockerPath run --rm --mount "type=bind,source=$mountSource,target=/backup" --env-file $credentialPath $PostgresImage `
    pg_dump --host $databaseUri.Host --port $dbPort --username $dbUser --dbname $dbName --format custom --compress 9 --no-owner --no-privileges --file /backup/database.dump 2>&1
  $dumpExitCode = $LASTEXITCODE
  if ($dumpExitCode -ne 0) {
    $dumpMessage = (@($dumpOutput) -join [Environment]::NewLine).Trim()
    throw "pg_dump failed with exit code $dumpExitCode. $dumpMessage"
  }
  if (-not (Test-Path -LiteralPath $dumpPath -PathType Leaf) -or (Get-Item -LiteralPath $dumpPath).Length -eq 0) { throw "pg_dump did not create a valid archive file." }

  Remove-Item -LiteralPath $credentialPath -Force
  $listOutput = & $dockerPath run --rm --mount "type=bind,source=$mountSource,target=/backup,readonly" $PostgresImage pg_restore --list /backup/database.dump
  if ($LASTEXITCODE -ne 0) { throw "pg_restore could not read the new archive." }
  $archiveEntryCount = @($listOutput | Where-Object { $_ -match '^\d+;' }).Count
  if ($archiveEntryCount -lt 1) { throw "The database archive contains no restorable entries." }

  $dumpHash = Get-TudelaFileSha256 -LiteralPath $dumpPath
  [ordered]@{
    createdUtc = (Get-Date).ToUniversalTime().ToString('o')
    projectRef = $projectRef
    gitCommit = (& git rev-parse HEAD).Trim()
    databaseArchive = "database.dump"
    databaseBytes = (Get-Item -LiteralPath $dumpPath).Length
    databaseSha256 = $dumpHash
    archiveEntryCount = $archiveEntryCount
    postgresImage = $PostgresImage
  } | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath $summaryPath -Encoding utf8

  Compress-Archive -Path $dumpPath, $summaryPath -DestinationPath $plainZipPath -CompressionLevel NoCompression
  $env:TUDELA_BACKUP_PASSPHRASE = $passphrase
  & $opensslPath enc -aes-256-cbc -salt -pbkdf2 -iter 200000 -in $plainZipPath -out $encryptedPath -pass env:TUDELA_BACKUP_PASSPHRASE
  if ($LASTEXITCODE -ne 0) { throw "OpenSSL encryption failed with exit code $LASTEXITCODE." }

  $encryptedHash = Get-TudelaFileSha256 -LiteralPath $encryptedPath
  Set-Content -LiteralPath $checksumPath -Value "$encryptedHash  $([System.IO.Path]::GetFileName($encryptedPath))" -Encoding ascii
  Write-Output "Encrypted database backup created: $encryptedPath"
  Write-Output "Archive entries: $archiveEntryCount"
  Write-Output "Encrypted SHA-256: $encryptedHash"
  Write-Output "Keep the passphrase in your password manager; it is not stored in the backup."
}
finally {
  Remove-Item Env:TUDELA_BACKUP_PASSPHRASE -ErrorAction SilentlyContinue
  $poolerUrl = $null
  $passwordSecure = $null
  $dbPassword = $null
  $passphrase = $null
  $passphraseSecure = $null
  $confirmation = $null
  $confirmationSecure = $null
  if (Test-Path -LiteralPath $plainZipPath) { Remove-Item -LiteralPath $plainZipPath -Force }
  if (Test-Path -LiteralPath $stagingPath) { Remove-Item -LiteralPath $stagingPath -Recurse -Force }
}
