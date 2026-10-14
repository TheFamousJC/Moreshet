function Get-MoreshetFileSha256 {
  param(
    [Parameter(Mandatory = $true)][string]$LiteralPath
  )

  $resolvedPath = [System.IO.Path]::GetFullPath($LiteralPath)
  if (-not [System.IO.File]::Exists($resolvedPath)) {
    throw "File not found for SHA-256 calculation: $resolvedPath"
  }

  $stream = $null
  $algorithm = $null
  try {
    $stream = [System.IO.File]::OpenRead($resolvedPath)
    $algorithm = [System.Security.Cryptography.SHA256]::Create()
    $bytes = $algorithm.ComputeHash($stream)
    return ([System.BitConverter]::ToString($bytes)).Replace('-', '').ToLowerInvariant()
  }
  finally {
    if ($algorithm) { $algorithm.Dispose() }
    if ($stream) { $stream.Dispose() }
  }
}
