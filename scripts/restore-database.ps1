param(
  [Parameter(Mandatory = $true)][string]$BackupPath,
  [Parameter(Mandatory = $true)][ValidateSet("RESTORE")][string]$Confirmation
)

$ErrorActionPreference = "Stop"
if (-not $env:DATABASE_URL) { throw "Set DATABASE_URL to the intended recovery database before restoring." }
$resolvedBackup = [System.IO.Path]::GetFullPath((Join-Path (Get-Location) $BackupPath))
if (-not (Test-Path -LiteralPath $resolvedBackup -PathType Leaf)) { throw "Backup file not found: $resolvedBackup" }
$pgRestore = Get-Command pg_restore -ErrorAction SilentlyContinue
if (-not $pgRestore) { throw "pg_restore is not installed or not available on PATH." }

Write-Warning "This operation replaces database objects in the configured target. Confirm the target is a disposable recovery environment first."
& $pgRestore.Source --dbname $env:DATABASE_URL --clean --if-exists --no-owner --no-privileges --exit-on-error $resolvedBackup
if ($LASTEXITCODE -ne 0) { throw "pg_restore failed with exit code $LASTEXITCODE." }
Write-Output "Restore completed. Run migrations, authorization tests, counts and sampled content checks before declaring recovery successful."
