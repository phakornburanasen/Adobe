@echo off
setlocal

set "ROOT=%~dp0"
set "ROOT=%ROOT:~0,-1%"
set "WIN_OUT=%ROOT%\dist\windows"
set "LINUX_OUT=%ROOT%\dist\linux"

echo Building Adobe login backend...
cd /d "%ROOT%" || exit /b 1

where go >nul 2>nul || (
  echo Go is not installed or not available in PATH.
  exit /b 1
)

echo Tidying Go modules...
call go mod tidy || exit /b 1

if not exist "%WIN_OUT%" mkdir "%WIN_OUT%" || exit /b 1
if not exist "%LINUX_OUT%" mkdir "%LINUX_OUT%" || exit /b 1

echo Building Windows executable...
set "GOOS=windows"
set "GOARCH=386"
set "CGO_ENABLED=0"
call go build -ldflags "-s -w" -o "%WIN_OUT%\backend_login.exe" . || exit /b 1

echo Building Linux executable...
set "GOOS=linux"
set "GOARCH=amd64"
set "CGO_ENABLED=0"
call go build -ldflags "-s -w" -o "%LINUX_OUT%\backend_login" . || exit /b 1

set "GOOS="
set "GOARCH="
set "CGO_ENABLED="

echo Copying environment files...
if exist "%ROOT%\.env" (
  copy /Y "%ROOT%\.env" "%WIN_OUT%\.env" >nul
  copy /Y "%ROOT%\.env" "%LINUX_OUT%\.env" >nul
)
if exist "%ROOT%\.env.example" (
  copy /Y "%ROOT%\.env.example" "%WIN_OUT%\.env.example" >nul
  copy /Y "%ROOT%\.env.example" "%LINUX_OUT%\.env.example" >nul
)

echo Creating startup scripts...
(
  echo @echo off
  echo setlocal
  echo set "ROOT=%%~dp0"
  echo set "ROOT=%%ROOT:~0,-1%%"
  echo cd /d "%%ROOT%%"
  echo "%%ROOT%%\backend_login.exe"
  echo endlocal
) > "%WIN_OUT%\start-production.bat"

(
  echo #!/usr/bin/env bash
  echo set -euo pipefail
  echo cd "$$\(dirname "$$0"^)
  echo chmod +x "./backend_login" 2^>/dev/null ^|^| true
  echo exec "./backend_login"
) > "%LINUX_OUT%\start-production.sh"

echo.
echo Build complete.
echo Windows output: %WIN_OUT%\backend_login.exe
echo Linux output:   %LINUX_OUT%\backend_login
echo.
echo On Linux, run: chmod +x backend_login start-production.sh

endlocal
