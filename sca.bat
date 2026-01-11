@echo off
setlocal

set "REPO_ROOT=%~dp0"
set "NODE_ENGINE=%REPO_ROOT%node_engine"

echo ADA Scanner Static Analysis Launcher
if "%~1"=="" (
  echo Static analysis args: (none)
) else (
  echo Static analysis args: %*
)

echo Executing: npm --prefix %NODE_ENGINE% run static_analysis -- %*
npm --prefix "%NODE_ENGINE%" run static_analysis -- %*
