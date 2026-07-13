$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$port = 4173
$prefix = "http://localhost:$port/"

$rewriteTypes = @{
  "cac-thanh" = "saints"
  "nha-tho" = "churches"
  "bai-viet" = "articles"
  "su-kien" = "events"
  "cau-nguyen" = "prayers"
  "giao-ly" = "catechism"
}

$mimeTypes = @{
  ".html" = "text/html; charset=utf-8"
  ".css" = "text/css; charset=utf-8"
  ".js" = "application/javascript; charset=utf-8"
  ".json" = "application/json; charset=utf-8"
  ".xml" = "application/xml; charset=utf-8"
  ".txt" = "text/plain; charset=utf-8"
  ".png" = "image/png"
  ".jpg" = "image/jpeg"
  ".jpeg" = "image/jpeg"
  ".webp" = "image/webp"
  ".svg" = "image/svg+xml"
  ".ico" = "image/x-icon"
}

function Get-SafePath {
  param([string] $RequestPath)

  $decodedPath = [System.Uri]::UnescapeDataString($RequestPath.Split("?")[0]).TrimStart("/")
  if ([string]::IsNullOrWhiteSpace($decodedPath)) {
    $decodedPath = "index.html"
  }

  if ($decodedPath -eq "gui-loi-cau-nguyen") {
    $decodedPath = "prayer-request.html"
  }

  $segments = $decodedPath.Split("/")
  $firstSegment = $segments[0]
  if ($rewriteTypes.ContainsKey($firstSegment)) {
    $decodedPath = if ($segments.Length -eq 1) { "category.html" } else { "detail.html" }
  }

  $fullPath = [System.IO.Path]::GetFullPath((Join-Path $root $decodedPath))
  $rootPath = [System.IO.Path]::GetFullPath($root)
  if (-not $fullPath.StartsWith($rootPath, [System.StringComparison]::OrdinalIgnoreCase)) {
    return $null
  }
  return $fullPath
}

for ($candidatePort = $port; $candidatePort -lt ($port + 20); $candidatePort++) {
  try {
    $listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, $candidatePort)
    $listener.Start()
    $port = $candidatePort
    $prefix = "http://localhost:$port/"
    break
  }
  catch {
    $listener = $null
  }
}

if (-not $listener) {
  throw "Cannot find an available local port."
}

Write-Host "Local server is running at $prefix"
Write-Host "Test pretty URL: ${prefix}bai-viet/suc-manh-cua-loi-cau-nguyen"
Write-Host "Press Ctrl+C to stop."

try {
  while ($true) {
    $client = $listener.AcceptTcpClient()
    $stream = $client.GetStream()
    $reader = [System.IO.StreamReader]::new($stream, [System.Text.Encoding]::ASCII, $false, 1024, $true)
    $requestLine = $reader.ReadLine()
    while (($line = $reader.ReadLine()) -ne $null -and $line -ne "") {}

    if (-not $requestLine) {
      $client.Close()
      continue
    }

    $requestPath = ($requestLine -split " ")[1]
    $filePath = Get-SafePath $requestPath

    if (-not $filePath -or -not (Test-Path -LiteralPath $filePath -PathType Leaf)) {
      $bytes = [System.Text.Encoding]::UTF8.GetBytes("404 Not Found")
      $header = "HTTP/1.1 404 Not Found`r`nContent-Type: text/plain; charset=utf-8`r`nCache-Control: no-store, no-cache, must-revalidate`r`nPragma: no-cache`r`nExpires: 0`r`nContent-Length: $($bytes.Length)`r`nConnection: close`r`n`r`n"
      $headerBytes = [System.Text.Encoding]::ASCII.GetBytes($header)
      $stream.Write($headerBytes, 0, $headerBytes.Length)
      $stream.Write($bytes, 0, $bytes.Length)
      $client.Close()
      continue
    }

    $extension = [System.IO.Path]::GetExtension($filePath).ToLowerInvariant()
    $contentType = if ($mimeTypes.ContainsKey($extension)) { $mimeTypes[$extension] } else { "application/octet-stream" }

    $bytes = [System.IO.File]::ReadAllBytes($filePath)
    $header = "HTTP/1.1 200 OK`r`nContent-Type: $contentType`r`nCache-Control: no-store, no-cache, must-revalidate`r`nPragma: no-cache`r`nExpires: 0`r`nContent-Length: $($bytes.Length)`r`nConnection: close`r`n`r`n"
    $headerBytes = [System.Text.Encoding]::ASCII.GetBytes($header)
    $stream.Write($headerBytes, 0, $headerBytes.Length)
    $stream.Write($bytes, 0, $bytes.Length)
    $client.Close()
  }
}
finally {
  $listener.Stop()
}
