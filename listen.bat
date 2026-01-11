@echo off
setlocal enabledelayedexpansion

set "PORT="
set "HEADLESS=false"

:parse
if "%~1"=="" goto validate
if /I "%~1"=="-p" (
  if "%~2"=="" (
    echo Missing value for -p.
    exit /b 2
  )
  set "PORT=%~2"
  shift
  shift
  goto parse
)
if /I "%~1"=="--port" (
  if "%~2"=="" (
    echo Missing value for --port.
    exit /b 2
  )
  set "PORT=%~2"
  shift
  shift
  goto parse
)
if /I "%~1"=="-h" (
  set "HEADLESS=true"
  shift
  goto parse
)
if /I "%~1"=="--headless" (
  set "HEADLESS=true"
  shift
  goto parse
)
if /I "%~1"=="--help" (
  echo Usage: listen.bat [--port ^<port^>] [--headless]
  exit /b 0
)

echo Unknown option: %~1
exit /b 2

:validate
if defined PORT (
  for /f "delims=0123456789" %%A in ("%PORT%") do (
    echo Port must be a number.
    exit /b 2
  )
)

set "REPO_ROOT=%~dp0"
set "RULES_ROOT=%ADA_RULES_ROOT%"
if "%RULES_ROOT%"=="" set "RULES_ROOT=%REPO_ROOT%rules"
set "NODE_ENGINE=%REPO_ROOT%node_engine"

set "RULES_ROOT=%RULES_ROOT%"
if defined PORT set "PORT=%PORT%"
if /I "%HEADLESS%"=="true" set "ADA_HEADLESS=true"

echo ADA Scanner Listener Launcher
echo Rules root: %RULES_ROOT%
if defined PORT (
  echo Port: %PORT%
) else (
  echo Port: (default)
)
if /I "%HEADLESS%"=="true" (
  echo Headless: enabled (monitoring console disabled).
) else (
  echo Headless: disabled
)

echo Executing: npm --prefix %NODE_ENGINE% run start
npm --prefix "%NODE_ENGINE%" run start
