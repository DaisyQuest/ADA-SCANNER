[CmdletBinding()]
param()

$tool = $null
$port = $null
$headless = $false
$scaArgs = @()
$stopParsing = $false

function Show-Usage {
    Write-Host "Usage: cli_launcher.ps1 [-p|--port <port>] [-h|--headless] [-t|--tool <listen|sca>] [-- <sca args>]"
}

for ($index = 0; $index -lt $args.Length; $index++) {
    $arg = $args[$index]
    switch ($arg) {
        "-t" {
            if ($index + 1 -ge $args.Length) { throw "Missing value for -t." }
            $tool = $args[$index + 1]
            $index++
            if ($tool -eq "sca") {
                if ($index + 1 -lt $args.Length) {
                    $scaArgs = $args[($index + 1)..($args.Length - 1)]
                }
                $stopParsing = $true
            }
        }
        "--tool" {
            if ($index + 1 -ge $args.Length) { throw "Missing value for --tool." }
            $tool = $args[$index + 1]
            $index++
            if ($tool -eq "sca") {
                if ($index + 1 -lt $args.Length) {
                    $scaArgs = $args[($index + 1)..($args.Length - 1)]
                }
                $stopParsing = $true
            }
        }
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
        "--" {
            if ($index + 1 -lt $args.Length) {
                $scaArgs = $args[($index + 1)..($args.Length - 1)]
            }
            $stopParsing = $true
        }
        "--help" { Show-Usage; exit 0 }
        default { throw "Unknown option: $arg" }
    }
    if ($stopParsing) {
        break
    }
}

if (-not $tool) {
    $tool = "listen"
}

if ($port -and -not ($port -match '^\d+$')) {
    throw "Port must be a number."
}

Write-Host "ADA Scanner CLI Launcher"
Write-Host "Selected tool: $tool"

if ($tool -eq "sca" -and $scaArgs.Length -gt 0 -and $scaArgs[0] -eq "--") {
    if ($scaArgs.Length -gt 1) {
        $scaArgs = $scaArgs[1..($scaArgs.Length - 1)]
    } else {
        $scaArgs = @()
    }
}

$scriptRoot = $PSScriptRoot
if ($tool -eq "sca") {
    if ($port -or $headless) {
        Write-Warning "--port/--headless ignored for sca."
    }
    if ($scaArgs.Length -eq 0) {
        Write-Host "Static analysis args: (none)"
    } else {
        Write-Host ("Static analysis args: " + ($scaArgs -join " "))
    }
    & "$scriptRoot\sca.ps1" @scaArgs
    exit $LASTEXITCODE
}

if ($tool -eq "listen") {
    if ($port) {
        Write-Host "Port override: $port"
    } else {
        Write-Host "Port override: (default)"
    }
    if ($headless) {
        Write-Host "Headless: enabled (monitoring console disabled)."
    } else {
        Write-Host "Headless: disabled"
    }
    $listenerArgs = @()
    if ($port) {
        $listenerArgs += "--port"
        $listenerArgs += $port
    }
    if ($headless) {
        $listenerArgs += "--headless"
    }
    & "$scriptRoot\listen.ps1" @listenerArgs
    exit $LASTEXITCODE
}

throw "Unknown tool: $tool (expected listen or sca)."
