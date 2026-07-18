@echo off
REM Removes the Pointify Print Agent from Windows startup.
reg delete "HKCU\Software\Microsoft\Windows\CurrentVersion\Run" /v "PointifyPrintAgent" /f
taskkill /IM pointify-print-agent.exe /F >nul 2>&1
echo Pointify Print Agent stopped and removed from startup.
pause
