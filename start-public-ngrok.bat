@echo off
chcp 65001 >nul
cd /d "%~dp0"
title PI Champion S2 - Public link (ngrok) - keep this window open

rem ---- find or install ngrok ----
set "NGROK="
for /f "delims=" %%i in ('where ngrok 2^>nul') do if not defined NGROK set "NGROK=%%i"
if not defined NGROK if exist "%LOCALAPPDATA%\Microsoft\WinGet\Links\ngrok.exe" set "NGROK=%LOCALAPPDATA%\Microsoft\WinGet\Links\ngrok.exe"
if not defined NGROK (
  echo ngrok not found - installing with winget...
  winget install --id Ngrok.Ngrok -e --accept-source-agreements --accept-package-agreements
)
if not defined NGROK if exist "%LOCALAPPDATA%\Microsoft\WinGet\Links\ngrok.exe" set "NGROK=%LOCALAPPDATA%\Microsoft\WinGet\Links\ngrok.exe"
if not defined NGROK (
  echo [!] Could not install ngrok. Download it from https://ngrok.com/download then run this file again.
  start "" https://ngrok.com/download
  pause
  exit /b 1
)

rem ---- auth token: data\ngrok-authtoken.txt (git-ignored) ----
set "NGROK_TOKEN="
if exist "data\ngrok-authtoken.txt" set /p NGROK_TOKEN=<"data\ngrok-authtoken.txt"
if defined NGROK_TOKEN "%NGROK%" config add-authtoken %NGROK_TOKEN% >nul

rem ---- make sure the scoring server is running ----
powershell -NoProfile -Command "try{Invoke-WebRequest -UseBasicParsing http://localhost:8080/api/health -TimeoutSec 2 | Out-Null; exit 0}catch{exit 1}"
if errorlevel 1 (
  echo Starting the scoring server...
  start "PI Champion S2 - Live Server" cmd /c start-server.bat
  timeout /t 5 /nobreak >nul
)

echo.
echo  Public link = the "Forwarding" https address below
echo  Judges: that link    Admin: that link + /admin
echo  Keep this window open. Close it to take the public link offline.
echo.
"%NGROK%" http 8080
pause
