[CmdletBinding()]
param()

$repoRoot = $PSScriptRoot
$nodeEngine = Join-Path $repoRoot "node_engine"

Write-Host "ADA Scanner Static Analysis Launcher"
if ($args.Length -eq 0) {
    Write-Host "Static analysis args: (none)"
} else {
    Write-Host ("Static analysis args: " + ($args -join " "))
}
Write-Host "Executing: npm --prefix $nodeEngine run static_analysis -- $($args -join ' ')"

$scaArgs = $args
& npm --prefix $nodeEngine run static_analysis -- @scaArgs
