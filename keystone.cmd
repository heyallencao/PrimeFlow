@echo off
setlocal
set SCRIPT_DIR=%~dp0

where node >nul 2>nul
if errorlevel 1 (
  echo Keystone requires Node.js ^(>=18^).
  exit /b 1
)

set SCRIPT_ROOT=%SCRIPT_DIR:~0,-1%

if /I "%CD%"=="%SCRIPT_ROOT%" (
  if exist "%SCRIPT_DIR%.git" (
    node "%SCRIPT_DIR%bin\keystone.mjs" --project-root "%SCRIPT_ROOT%" %*
    exit /b %errorlevel%
  )
)

node "%SCRIPT_DIR%bin\keystone.mjs" %*
