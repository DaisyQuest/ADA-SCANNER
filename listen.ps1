[CmdletBinding()]
param()

$port = $null
$headless = $false

function Show-Usage {
    Write-Host "Usage: listen.ps1 [--port <port>] [--headless]"
}

for ($index = 0; $index -lt $args.Length; $index++) {
    $arg = $args[$index]
    switch ($arg) {
        "-p" { 
            if ($index + 1 -ge $args.Length) { throw "Missing value for -p." }
            $port = $args[$index + 1]
            $index++
        }
        "--port" {
            if ($index + 1 -ge $args.Length) { throw "Missing value for --port." }
            $port = $args[$index + 1]
            $index++
        }
        "-h" { $headless = $true }
        "--headless" { $headless = $true }
        "--help" { Show-Usage; exit 0 }
        default { throw "Unknown option: $arg" }
    }
}

if ($port -and -not ($port -match '^\d+$')) {
    throw "Port must be a number."
}

$repoRoot = $PSScriptRoot
$rulesRoot = if ($env:ADA_RULES_ROOT) { $env:ADA_RULES_ROOT } else { Join-Path $repoRoot "rules" }
$nodeEngine = Join-Path $repoRoot "node_engine"

$env:RULES_ROOT = $rulesRoot
if ($port) {
    $env:PORT = $port
}
if ($headless) {
    $env:ADA_HEADLESS = "true"
}

Write-Host "ADA Scanner Listener Launcher"
Write-Host "Rules root: $rulesRoot"
if ($port) {
    Write-Host "Port: $port"
} else {
    Write-Host "Port: (default)"
}
if ($headless) {
    Write-Host "Headless: enabled (monitoring console disabled)."
} else {
    Write-Host "Headless: disabled"
}
Write-Host "Executing: npm --prefix $nodeEngine run start"

& npm --prefix $nodeEngine run start
