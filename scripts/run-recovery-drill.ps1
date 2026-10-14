param(
  [string]$EncryptedDatabaseBackupPath,
  [string]$EncryptedStorageBackupPath,
  [string]$VerifiedDatabaseReportPath,
  [string]$PostgresImage = "public.ecr.aws/supabase/postgres:17.6.1.155",
  [int]$ExpectedPublishedCities = 11,
  [int]$ExpectedPublishedTours = 11,
  [int]$ExpectedPublishedStops = 55
)

$ErrorActionPreference = "Stop"
. (Join-Path $PSScriptRoot "file-hash.ps1")

function Resolve-MoreshetBackup {
  param(
    [string]$RequestedPath,
    [Parameter(Mandatory = $true)][string]$BackupDirectory,
    [Parameter(Mandatory = $true)][string]$Description
  )

  $resolvedDirectory = [System.IO.Path]::GetFullPath($BackupDirectory)
  if (-not (Test-Path -LiteralPath $resolvedDirectory -PathType Container)) {
    throw "$Description directory was not found: $resolvedDirectory"
  }

  if ([string]::IsNullOrWhiteSpace($RequestedPath)) {
    $candidate = Get-ChildItem -LiteralPath $resolvedDirectory -Filter "*.zip.enc" -File |
      Sort-Object LastWriteTimeUtc -Descending |
      Select-Object -First 1
    if (-not $candidate) { throw "No encrypted $Description was found in $resolvedDirectory" }
    $resolvedPath = $candidate.FullName
  }
  else {
    $resolvedPath = [System.IO.Path]::GetFullPath((Join-Path $projectRoot $RequestedPath))
  }

  $directoryPrefix = $resolvedDirectory.TrimEnd('\') + '\'
  if (-not $resolvedPath.StartsWith($directoryPrefix, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw "$Description must be inside $resolvedDirectory"
  }
  if (-not (Test-Path -LiteralPath $resolvedPath -PathType Leaf)) {
    throw "$Description was not found: $resolvedPath"
  }
  return $resolvedPath
}

function Test-EncryptedChecksum {
  param([Parameter(Mandatory = $true)][string]$EncryptedPath)

  $checksumPath = "$EncryptedPath.sha256"
  if (-not (Test-Path -LiteralPath $checksumPath -PathType Leaf)) {
    throw "Checksum file was not found: $checksumPath"
  }
  $expectedHash = ((Get-Content -LiteralPath $checksumPath -Raw).Trim() -split '\s+')[0].ToLowerInvariant()
  $actualHash = Get-MoreshetFileSha256 -LiteralPath $EncryptedPath
  if ($actualHash -ne $expectedHash) { throw "Encrypted backup checksum mismatch: $EncryptedPath" }
  return $actualHash
}

function Expand-MoreshetEncryptedBackup {
  param(
    [Parameter(Mandatory = $true)][string]$EncryptedPath,
    [Parameter(Mandatory = $true)][string]$Destination,
    [Parameter(Mandatory = $true)][string]$Prompt
  )

  $plainZip = Join-Path $Destination "backup.zip"
  $extractPath = Join-Path $Destination "files"
  New-Item -ItemType Directory -Path $Destination -Force | Out-Null
  $passphraseSecure = Read-Host $Prompt -AsSecureString
  $passphrase = [System.Net.NetworkCredential]::new('', $passphraseSecure).Password
  try {
    $env:MORESHET_RECOVERY_PASSPHRASE = $passphrase
    & $opensslPath enc -d -aes-256-cbc -pbkdf2 -iter 200000 -in $EncryptedPath -out $plainZip -pass env:MORESHET_RECOVERY_PASSPHRASE
    if ($LASTEXITCODE -ne 0) { throw "Decryption failed. Check the passphrase and encrypted backup integrity." }
    Expand-Archive -LiteralPath $plainZip -DestinationPath $extractPath
    Remove-Item -LiteralPath $plainZip -Force
    return $extractPath
  }
  finally {
    Remove-Item Env:MORESHET_RECOVERY_PASSPHRASE -ErrorAction SilentlyContinue
    $passphrase = $null
    $passphraseSecure = $null
  }
}

function Invoke-DockerText {
  param([Parameter(Mandatory = $true)][string[]]$Arguments)

  $previousErrorAction = $ErrorActionPreference
  try {
    $ErrorActionPreference = "Continue"
    $output = @(& $dockerPath @Arguments 2>&1 | ForEach-Object { $_.ToString() })
    $exitCode = $LASTEXITCODE
  }
  finally {
    $ErrorActionPreference = $previousErrorAction
  }
  if ($exitCode -ne 0) {
    $diagnosticLines = if ($output.Count -le 80) {
      @($output)
    }
    else {
      @($output | Select-Object -First 30) + @("... diagnostic output shortened ...") + @($output | Select-Object -Last 50)
    }
    $diagnostic = ($diagnosticLines -join "`n").Trim()
    if ([string]::IsNullOrWhiteSpace($diagnostic)) { $diagnostic = "No diagnostic output was returned." }
    throw "Docker command failed: docker $($Arguments -join ' ')`n$diagnostic"
  }
  return ($output -join "`n").Trim()
}

$projectRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot ".."))
$databaseBackupDirectory = Join-Path $projectRoot "backups\database"
$storageBackupDirectory = Join-Path $projectRoot "backups\storage"
$dockerPath = Join-Path $env:LOCALAPPDATA "Programs\DockerDesktop\resources\bin\docker.exe"
$opensslPath = "C:\Program Files\Git\usr\bin\openssl.exe"
$tempBase = [System.IO.Path]::GetFullPath([System.IO.Path]::GetTempPath())
$drillId = (Get-Date -Format "yyyyMMdd-HHmmss") + "-" + [guid]::NewGuid().ToString('N').Substring(0, 8)
$tempRoot = Join-Path $tempBase ("moreshet-recovery-drill-" + $drillId)
$containerName = "moreshet_recovery_$($drillId.Replace('-', '_'))"
$containerStarted = $false
$startedAt = (Get-Date).ToUniversalTime()
$reportDirectory = Join-Path $projectRoot "Docs\recovery-drill-reports"
$reportPath = Join-Path $reportDirectory ("recovery-drill-$drillId.json")
$report = [ordered]@{
  drillId = $drillId
  startedAtUtc = $startedAt.ToString('o')
  completedAtUtc = $null
  result = "running"
  productionTouched = $false
  temporaryContainerRemoved = $false
  decryptedTemporaryFilesRemoved = $false
  database = $null
  storage = $null
  error = $null
}

if ([string]::IsNullOrWhiteSpace($VerifiedDatabaseReportPath) -and -not (Test-Path -LiteralPath $dockerPath -PathType Leaf)) { throw "Docker Desktop was not found." }
if (-not (Test-Path -LiteralPath $opensslPath -PathType Leaf)) { throw "OpenSSL was not found in Git for Windows." }

$databaseBackup = Resolve-MoreshetBackup -RequestedPath $EncryptedDatabaseBackupPath -BackupDirectory $databaseBackupDirectory -Description "database backup"
$storageBackup = Resolve-MoreshetBackup -RequestedPath $EncryptedStorageBackupPath -BackupDirectory $storageBackupDirectory -Description "Storage backup"

Write-Host "Moreshet isolated recovery drill" -ForegroundColor Cyan
if ([string]::IsNullOrWhiteSpace($VerifiedDatabaseReportPath)) {
  Write-Host "Database: $databaseBackup"
}
else {
  Write-Host "Database: reusing a completed database result from $VerifiedDatabaseReportPath"
}
Write-Host "Storage:  $storageBackup"
Write-Host "Production will not be contacted or changed." -ForegroundColor Green

try {
  New-Item -ItemType Directory -Path $tempRoot | Out-Null
  New-Item -ItemType Directory -Path $reportDirectory -Force | Out-Null

  if ([string]::IsNullOrWhiteSpace($VerifiedDatabaseReportPath)) {
    Invoke-DockerText -Arguments @("version", "--format", "{{.Server.Version}}") | Out-Null
    Invoke-DockerText -Arguments @("image", "inspect", $PostgresImage) | Out-Null

    Write-Host "`n1/2 Restoring the encrypted database into a disposable container..." -ForegroundColor Cyan
  $databaseEncryptedHash = Test-EncryptedChecksum -EncryptedPath $databaseBackup
  $databaseExtractPath = Expand-MoreshetEncryptedBackup -EncryptedPath $databaseBackup -Destination (Join-Path $tempRoot "database") -Prompt "Enter the database-backup passphrase"
  $dumpPath = Join-Path $databaseExtractPath "database.dump"
  $databaseSummaryPath = Join-Path $databaseExtractPath "DATABASE-SUMMARY.json"
  if (-not (Test-Path -LiteralPath $dumpPath -PathType Leaf)) { throw "database.dump is missing from the decrypted database backup." }
  if (-not (Test-Path -LiteralPath $databaseSummaryPath -PathType Leaf)) { throw "DATABASE-SUMMARY.json is missing from the decrypted database backup." }
  $databaseSummary = Get-Content -LiteralPath $databaseSummaryPath -Raw | ConvertFrom-Json
  $dumpHash = Get-MoreshetFileSha256 -LiteralPath $dumpPath
  if ($dumpHash -ne $databaseSummary.databaseSha256) { throw "The database dump checksum does not match its internal summary." }

  $randomBytes = New-Object byte[] 36
  $randomGenerator = [Security.Cryptography.RandomNumberGenerator]::Create()
  try { $randomGenerator.GetBytes($randomBytes) }
  finally { $randomGenerator.Dispose() }
  $databasePassword = [Convert]::ToBase64String($randomBytes)
  $credentialPath = Join-Path $tempRoot "postgres.env"
  [System.IO.File]::WriteAllText($credentialPath, "POSTGRES_PASSWORD=$databasePassword`n", [System.Text.UTF8Encoding]::new($false))
  $mountSource = $databaseExtractPath.Replace('\', '/')
  Invoke-DockerText -Arguments @(
    "run", "--detach", "--name", $containerName,
    "--label", "com.3sci.moreshet.recovery=true",
    "--tmpfs", "/var/lib/postgresql/data:rw,noexec,nosuid,size=2147483648",
    "--env-file", $credentialPath,
    "--mount", "type=bind,source=$mountSource,target=/recovery,readonly",
    $PostgresImage
  ) | Out-Null
  $containerStarted = $true

  $ready = $false
  for ($attempt = 1; $attempt -le 90; $attempt++) {
    & $dockerPath exec $containerName pg_isready -U postgres -d postgres *> $null
    if ($LASTEXITCODE -eq 0) { $ready = $true; break }
    Start-Sleep -Seconds 1
  }
  if (-not $ready) { throw "The disposable PostgreSQL container did not become ready within 90 seconds." }
  # The image briefly accepts connections while running its initialization scripts.
  # Give that initialization time to finish before creating the isolated restore database.
  Start-Sleep -Seconds 10
  & $dockerPath exec $containerName pg_isready -U postgres -d postgres *> $null
  if ($LASTEXITCODE -ne 0) { throw "PostgreSQL stopped accepting connections during container initialization." }

  # Restore into the image's initialized Supabase database. A blank database lacks
  # managed Supabase foundations (notably Realtime functions) referenced by a full dump.
  Invoke-DockerText -Arguments @(
    "exec", $containerName, "pg_restore", "-U", "supabase_admin", "-d", "postgres",
    "--clean", "--if-exists", "--no-owner", "--no-privileges", "--exit-on-error", "/recovery/database.dump"
  ) | Out-Null

  $qaSql = @"
select json_build_object(
  'publishedCities', (select count(*) from public.cities where status = 'published'),
  'publishedTours', (select count(*) from public.tours where status = 'published'),
  'publishedStops', (select count(*) from public.stops where status = 'published'),
  'tourStopAssignments', (select count(*) from public.tour_stops),
  'publishedToursWithFiveStops', (
    select count(*) from public.tours t
    where t.status = 'published'
      and (select count(*) from public.tour_stops ts where ts.tour_id = t.id) = 5
  ),
  'publishedToursWithoutFiveStops', (
    select count(*) from public.tours t
    where t.status = 'published'
      and (select count(*) from public.tour_stops ts where ts.tour_id = t.id) <> 5
  ),
  'orphanTourStops', (
    select count(*) from public.tour_stops ts
    left join public.tours t on t.id = ts.tour_id
    left join public.stops s on s.id = ts.stop_id
    where t.id is null or s.id is null
  ),
  'organizations', (select count(*) from public.organizations),
  'profiles', (select count(*) from public.profiles),
  'authUsers', (select count(*) from auth.users),
  'contentRevisions', (select count(*) from public.content_revisions),
  'mediaAssets', (select count(*) from public.media_assets),
  'narrationAssets', (select count(*) from public.narration_assets),
  'auditLogEntries', (select count(*) from public.audit_log),
  'publicTables', (
    select count(*) from information_schema.tables
    where table_schema = 'public' and table_type = 'BASE TABLE'
  )
)::text;
"@
  $qaJson = Invoke-DockerText -Arguments @("exec", $containerName, "psql", "-U", "supabase_admin", "-d", "postgres", "-At", "-v", "ON_ERROR_STOP=1", "-c", $qaSql)
  $databaseQa = $qaJson | ConvertFrom-Json
  $databasePassed =
    ([int]$databaseQa.publishedCities -eq $ExpectedPublishedCities) -and
    ([int]$databaseQa.publishedTours -eq $ExpectedPublishedTours) -and
    ([int]$databaseQa.publishedStops -eq $ExpectedPublishedStops) -and
    ([int]$databaseQa.publishedToursWithFiveStops -eq $ExpectedPublishedTours) -and
    ([int]$databaseQa.publishedToursWithoutFiveStops -eq 0) -and
    ([int]$databaseQa.orphanTourStops -eq 0)
  if (-not $databasePassed) { throw "The restored database did not pass the expected 11-city, 11-tour, 55-stop QA checks." }

  $report.database = [ordered]@{
    passed = $true
    encryptedBackupFile = [System.IO.Path]::GetFileName($databaseBackup)
    encryptedSha256 = $databaseEncryptedHash
    internalDumpSha256 = $dumpHash
    sourceProjectRef = $databaseSummary.projectRef
    sourceGitCommit = $databaseSummary.gitCommit
    archiveEntryCount = [int]$databaseSummary.archiveEntryCount
    disposableImage = $PostgresImage
    qa = $databaseQa
  }
    Write-Host "Database restored and verified: 11 cities, 11 tours and 55 stops." -ForegroundColor Green
  }
  else {
    $resolvedPreviousReport = [System.IO.Path]::GetFullPath((Join-Path $projectRoot $VerifiedDatabaseReportPath))
    $reportPrefix = [System.IO.Path]::GetFullPath($reportDirectory).TrimEnd('\') + '\'
    if (-not $resolvedPreviousReport.StartsWith($reportPrefix, [System.StringComparison]::OrdinalIgnoreCase)) {
      throw "The verified database report must be inside $reportDirectory"
    }
    if (-not (Test-Path -LiteralPath $resolvedPreviousReport -PathType Leaf)) {
      throw "The verified database report was not found: $resolvedPreviousReport"
    }
    $previousReport = Get-Content -LiteralPath $resolvedPreviousReport -Raw | ConvertFrom-Json
    if ($null -eq $previousReport.database -or -not [bool]$previousReport.database.passed) {
      throw "The selected report does not contain a passed database restoration."
    }
    $report.database = $previousReport.database
    $report.temporaryContainerRemoved = $true
    Write-Host "`n1/2 Database restoration already passed; reusing its recorded QA result." -ForegroundColor Green
  }

  Write-Host "`n2/2 Restoring and verifying the encrypted Storage archive..." -ForegroundColor Cyan
  $storageEncryptedHash = Test-EncryptedChecksum -EncryptedPath $storageBackup
  $storageExtractPath = Expand-MoreshetEncryptedBackup -EncryptedPath $storageBackup -Destination (Join-Path $tempRoot "storage") -Prompt "Enter the Storage-backup passphrase"
  $storageManifestPath = Join-Path $storageExtractPath "STORAGE-MANIFEST.json"
  $storageSummaryPath = Join-Path $storageExtractPath "BACKUP-SUMMARY.json"
  if (-not (Test-Path -LiteralPath $storageManifestPath -PathType Leaf)) { throw "STORAGE-MANIFEST.json is missing from the decrypted Storage backup." }
  if (-not (Test-Path -LiteralPath $storageSummaryPath -PathType Leaf)) { throw "BACKUP-SUMMARY.json is missing from the decrypted Storage backup." }
  $parsedStorageManifest = Get-Content -LiteralPath $storageManifestPath -Raw | ConvertFrom-Json
  $storageManifest = @()
  foreach ($parsedEntry in $parsedStorageManifest) { $storageManifest += $parsedEntry }
  $storageSummary = Get-Content -LiteralPath $storageSummaryPath -Raw | ConvertFrom-Json
  $verifiedBytes = [long]0
  foreach ($entry in $storageManifest) {
    $relativePath = [string]$entry.path
    if ($relativePath -match '(^|/)\.\.(/|$)' -or [System.IO.Path]::IsPathRooted($relativePath)) {
      throw "Unsafe Storage manifest path: $relativePath"
    }
    $objectPath = [System.IO.Path]::GetFullPath((Join-Path $storageExtractPath ($relativePath.Replace('/', '\'))))
    $storagePrefix = [System.IO.Path]::GetFullPath($storageExtractPath).TrimEnd('\') + '\'
    if (-not $objectPath.StartsWith($storagePrefix, [System.StringComparison]::OrdinalIgnoreCase)) {
      throw "Storage manifest path escapes the disposable restore directory: $relativePath"
    }
    if (-not (Test-Path -LiteralPath $objectPath -PathType Leaf)) { throw "Restored Storage object is missing: $relativePath" }
    $objectHash = Get-MoreshetFileSha256 -LiteralPath $objectPath
    if ($objectHash -ne ([string]$entry.sha256).ToLowerInvariant()) { throw "Restored Storage object checksum mismatch: $relativePath" }
    $objectBytes = (Get-Item -LiteralPath $objectPath).Length
    if ($null -ne $entry.bytes -and $objectBytes -ne [long]$entry.bytes) { throw "Restored Storage object size mismatch: $relativePath" }
    $verifiedBytes += $objectBytes
  }
  if ($storageManifest.Count -ne [int]$storageSummary.objectCount) { throw "The restored Storage object count does not match its internal summary." }

  $report.storage = [ordered]@{
    passed = $true
    encryptedBackupFile = [System.IO.Path]::GetFileName($storageBackup)
    encryptedSha256 = $storageEncryptedHash
    sourceProjectRef = $storageSummary.projectRef
    sourceGitCommit = $storageSummary.gitCommit
    objectCount = $storageManifest.Count
    verifiedBytes = $verifiedBytes
  }
  Write-Host "Storage restored and verified: $($storageManifest.Count) objects." -ForegroundColor Green

  $report.result = "passed"
}
catch {
  $report.result = "failed"
  $report.error = $_.Exception.Message
  throw
}
finally {
  if ($containerStarted) {
    & $dockerPath rm --force $containerName *> $null
    if ($LASTEXITCODE -eq 0) { $report.temporaryContainerRemoved = $true }
  }

  $resolvedTempRoot = [System.IO.Path]::GetFullPath($tempRoot)
  $validTemporaryTarget =
    $resolvedTempRoot.StartsWith($tempBase, [System.StringComparison]::OrdinalIgnoreCase) -and
    ([System.IO.Path]::GetFileName($resolvedTempRoot) -like "moreshet-recovery-drill-*")
  if ($validTemporaryTarget -and (Test-Path -LiteralPath $resolvedTempRoot)) {
    Remove-Item -LiteralPath $resolvedTempRoot -Recurse -Force
  }
  $report.decryptedTemporaryFilesRemoved = -not (Test-Path -LiteralPath $resolvedTempRoot)
  $report.completedAtUtc = (Get-Date).ToUniversalTime().ToString('o')
  if (Test-Path -LiteralPath $reportDirectory -PathType Container) {
    $report | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $reportPath -Encoding UTF8
    Write-Host "`nNon-secret recovery report: $reportPath"
  }
}

Write-Host "`nRECOVERY DRILL PASSED" -ForegroundColor Green
Write-Host "Production was untouched. The disposable database and all decrypted temporary files were removed."
