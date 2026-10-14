param(
  [Parameter(Position = 0)]
  [ValidateSet('build', 'start', 'stop', 'status', 'migrate', 'test')]
  [string]$Command = 'status'
)

$ErrorActionPreference = 'Stop'

$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$dockerCli = (Get-Command docker -ErrorAction Stop).Source
$helperImage = 'moreshet-supabase-cli:2.112.0'
$projectId = 'moreshet_mvp_rebuild'
$supabaseNetwork = "supabase_network_$projectId"
$databaseContainer = "supabase_db_$projectId"
$internalDatabaseUrl = "postgresql://postgres:postgres@${databaseContainer}:5432/postgres?sslmode=disable"

if (-not (Test-Path -LiteralPath $dockerCli)) {
  throw 'Docker Desktop was not found. Install or start Docker Desktop first.'
}

function Build-HelperImage {
  & $dockerCli build `
    --file (Join-Path $projectRoot 'Dockerfile.supabase-cli') `
    --tag $helperImage `
    $projectRoot

  if ($LASTEXITCODE -ne 0) {
    throw 'The local Supabase helper image could not be built.'
  }
}

function Test-HelperImage {
  & $dockerCli image inspect $helperImage *> $null
  return $LASTEXITCODE -eq 0
}

function Invoke-Supabase([string[]]$SupabaseArguments) {
  & $dockerCli run --rm `
    --mount "type=bind,source=$projectRoot,target=/work" `
    --mount 'type=bind,source=/var/run/docker.sock,target=/var/run/docker.sock' `
    --env 'SUPABASE_SERVICES_HOSTNAME=host.docker.internal' `
    --workdir /work `
    $helperImage @SupabaseArguments

  if ($LASTEXITCODE -ne 0) {
    throw "Supabase command failed: $($SupabaseArguments -join ' ')"
  }
}

function Invoke-DatabaseMigration {
  & $dockerCli run --rm `
    --network $supabaseNetwork `
    --mount "type=bind,source=$projectRoot,target=/work" `
    --mount 'type=bind,source=/var/run/docker.sock,target=/var/run/docker.sock' `
    --workdir /work `
    $helperImage migration up --db-url $internalDatabaseUrl

  if ($LASTEXITCODE -ne 0) {
    throw 'Local database migration failed.'
  }
}

function Invoke-DatabaseTests {
  $testFiles = Get-ChildItem -LiteralPath (Join-Path $projectRoot 'supabase\tests') -Filter '*.sql' | Sort-Object Name

  if ($testFiles.Count -eq 0) {
    throw 'No SQL database tests were found.'
  }

  foreach ($testFile in $testFiles) {
    Write-Host "Running $($testFile.Name)..."
    $testSql = Get-Content -LiteralPath $testFile.FullName -Raw
    $testSql | & $dockerCli exec -i $databaseContainer psql -U postgres -d postgres -v ON_ERROR_STOP=1

    if ($LASTEXITCODE -ne 0) {
      throw "Database test failed: $($testFile.Name)"
    }
  }
}

switch ($Command) {
  'build' {
    Build-HelperImage
  }
  'start' {
    if (-not (Test-HelperImage)) {
      Build-HelperImage
    }

    # Edge Functions are excluded because the containerized CLI cannot pass the
    # Windows project path through Docker Desktop as a Linux bind mount.
    Invoke-Supabase @('start', '--exclude', 'edge-runtime')
  }
  'stop' {
    Invoke-Supabase @('stop')
  }
  'status' {
    Invoke-Supabase @('status')
  }
  'migrate' {
    Invoke-DatabaseMigration
  }
  'test' {
    Invoke-DatabaseTests
  }
}

