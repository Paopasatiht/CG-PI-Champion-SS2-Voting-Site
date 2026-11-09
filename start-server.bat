@echo off
chcp 65001 >nul
cd /d "%~dp0"
title PI Champion S2 - Live Server (keep this window open)
where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo [!] Node.js not found. Install the LTS version from https://nodejs.org then run this file again.
  start "" https://nodejs.org/en/download
  pause
  exit /b 1
)
if not exist "data\judges.json" node server\generate-codes.mjs
echo.
echo  PI Champion Season 2 - Live server
echo  Keep this window open during the event. Closing it stops scoring.
echo  If Windows asks about the firewall: tick "Private networks" and click Allow.
echo.
start "" http://localhost:8080/admin
node server\server.mjs
echo.
echo Server stopped.
pause
