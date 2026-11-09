@echo off
chcp 65001 >nul
cd /d "%~dp0"
title PI Champion S2 - Restart server
echo.
echo  Restarting the PI Champion live server (scores in data\ are kept)...
for /f "tokens=5" %%p in ('netstat -ano ^| findstr /r /c:":8080 .*LISTENING"') do (
  tasklist /fi "PID eq %%p" /fo csv /nh | find /i "node.exe" >nul && (
    echo  Stopping old server, PID %%p
    taskkill /PID %%p /F >nul
  )
)
timeout /t 2 /nobreak >nul
start "" "%~dp0start-server.bat"
echo  New server window opened. This window closes in 3 seconds.
timeout /t 3 /nobreak >nul
exit /b 0
