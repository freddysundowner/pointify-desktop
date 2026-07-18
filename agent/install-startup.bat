@echo off
REM Installs the Pointify Print Agent to run automatically when Windows starts.
REM Run this once, from the same folder as pointify-print-agent.exe.

set "AGENT_DIR=%~dp0"
set "AGENT_EXE=%AGENT_DIR%pointify-print-agent.exe"

if not exist "%AGENT_EXE%" (
  echo ERROR: pointify-print-agent.exe not found in this folder.
  pause
  exit /b 1
)

REM Register in the current user's startup (registry Run key), minimized
reg add "HKCU\Software\Microsoft\Windows\CurrentVersion\Run" /v "PointifyPrintAgent" /t REG_SZ /d "\"%AGENT_EXE%\"" /f

echo.
echo Pointify Print Agent will now start automatically when you log in.
echo Starting it now...
start "" /min "%AGENT_EXE%"
echo.
echo Done! You can close this window.
pause
