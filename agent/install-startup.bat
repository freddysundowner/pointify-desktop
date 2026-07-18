@echo off
REM Installs the Pointify Print Agent to run automatically when Windows starts.
REM Run this once, from the same folder as pointify-print-agent.exe.

set "AGENT_DIR=%~dp0"
set "AGENT_EXE=%AGENT_DIR%pointify-print-agent.exe"
set "AGENT_VBS=%AGENT_DIR%run-hidden.vbs"

if not exist "%AGENT_EXE%" (
  echo ERROR: pointify-print-agent.exe not found in this folder.
  pause
  exit /b 1
)
if not exist "%AGENT_VBS%" (
  echo ERROR: run-hidden.vbs not found in this folder.
  pause
  exit /b 1
)

REM Register in the current user's startup (registry Run key).
REM The VBS launcher runs the agent with NO visible window.
reg add "HKCU\Software\Microsoft\Windows\CurrentVersion\Run" /v "PointifyPrintAgent" /t REG_SZ /d "wscript.exe \"%AGENT_VBS%\"" /f

echo.
echo Pointify Print Agent will now start automatically (hidden) when you log in.
echo Starting it now in the background...
taskkill /IM pointify-print-agent.exe /F >nul 2>&1
wscript.exe "%AGENT_VBS%"
echo.
echo Done! You can close this window.
pause
