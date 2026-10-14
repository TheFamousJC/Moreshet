param(
  [string]$OutputDirectory = ".\backups\source"
)

$ErrorActionPreference = "Stop"
. (Join-Path $PSScriptRoot "file-hash.ps1")
$repositoryRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$git = Get-Command git -ErrorAction SilentlyContinue
if (-not $git) { throw "Git is not installed or not available on PATH." }

Push-Location $repositoryRoot
try {
  $dirty = & $git.Source status --porcelain
  if ($LASTEXITCODE -ne 0) { throw "Could not inspect the Git worktree." }
  if ($dirty) { throw "The worktree contains uncommitted changes. Commit or discard them before creating a recovery archive." }

  $commit = (& $git.Source rev-parse HEAD).Trim()
  $shortCommit = (& $git.Source rev-parse --short HEAD).Trim()
  $branch = (& $git.Source branch --show-current).Trim()
  $remote = (& $git.Source remote get-url origin 2>$null).Trim()
  $timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
  $resolvedOutput = [System.IO.Path]::GetFullPath((Join-Path $repositoryRoot $OutputDirectory))
  $setDirectory = Join-Path $resolvedOutput "moreshet-source-$timestamp-$shortCommit"
  New-Item -ItemType Directory -Path $setDirectory -Force | Out-Null

  $archiveName = "moreshet-source-$shortCommit.zip"
  $archivePath = Join-Path $setDirectory $archiveName
  & $git.Source archive --format=zip --output=$archivePath HEAD
  if ($LASTEXITCODE -ne 0 -or -not (Test-Path -LiteralPath $archivePath)) { throw "Git source archive creation failed." }

  $hash = Get-MoreshetFileSha256 -LiteralPath $archivePath
  $checksumPath = "$archivePath.sha256"
  Set-Content -LiteralPath $checksumPath -Value "$hash  $archiveName" -Encoding ascii

  $manifest = @(
    "Moreshet safe source backup"
    "Created UTC: $((Get-Date).ToUniversalTime().ToString('o'))"
    "Repository: $remote"
    "Branch: $branch"
    "Commit: $commit"
    "Archive: $archiveName"
    "SHA-256: $hash"
    ""
    "This archive contains committed source and documentation only."
    "It intentionally excludes live secrets, live .env files, node_modules, database data and Supabase Storage objects."
    "The non-secret .env.example template remains included for recovery configuration."
    "Pair it with a matching database dump, Storage export and encrypted configuration/secret inventory for complete recovery."
  )
  Set-Content -LiteralPath (Join-Path $setDirectory "BACKUP-MANIFEST.txt") -Value $manifest -Encoding utf8

  Write-Output "Safe source backup created: $setDirectory"
  Write-Output "Commit: $commit"
  Write-Output "Checksum: $checksumPath"
}
finally {
  Pop-Location
}
