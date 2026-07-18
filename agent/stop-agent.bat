@echo off
REM Stops the Pointify Print Agent if it is running in the background.
taskkill /IM pointify-print-agent.exe /F >nul 2>&1
echo Pointify Print Agent stopped (if it was running).
pause
