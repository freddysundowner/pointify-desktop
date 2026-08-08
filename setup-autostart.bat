@echo off
setlocal enabledelayedexpansion

:: ============================================================
:: Pointify POS — Auto-start Setup
:: Run ONCE as Administrator.
:: After this, the POS server starts silently at every Windows
:: boot — no console window, no login required.
:: ============================================================

echo.
echo ============================================================
echo  Pointify POS -- Auto-start Setup
echo ============================================================
echo.

:: Must run as Administrator (Task Scheduler requires it)
net session >nul 2>&1
if errorlevel 1 (
    echo ERROR: This script must be run as Administrator.
    echo Right-click setup-autostart.bat and choose "Run as administrator".
    pause
    exit /b 1
)

:: Check required files are present
if not exist "%~dp0node.exe" (
    echo ERROR: node.exe not found. Make sure you extracted the full zip.
    pause
    exit /b 1
)
if not exist "%~dp0server\dist\index.cjs" (
    echo ERROR: server\dist\index.cjs not found. Make sure you extracted the full zip.
    pause
    exit /b 1
)
if not exist "%~dp0.env" (
    echo ERROR: .env file not found. Set it up before enabling auto-start.
    pause
    exit /b 1
)
if not exist "%~dp0run-background.vbs" (
    echo ERROR: run-background.vbs not found. Make sure you extracted the full zip.
    pause
    exit /b 1
)

:: Remove any existing task first (idempotent)
schtasks /delete /tn "PointifyPOS" /f >nul 2>&1

:: Register Task Scheduler entry:
::   - Runs at system startup (before login)
::   - Runs as SYSTEM so no user needs to be logged in
::   - 30 second delay gives the network time to come up
::   - Runs wscript.exe with the VBScript (no console window)
schtasks /create ^
  /tn "PointifyPOS" ^
  /tr "wscript.exe \"%~dp0run-background.vbs\"" ^
  /sc ONSTART ^
  /delay 0000:30 ^
  /ru SYSTEM ^
  /f >nul

if errorlevel 1 (
    echo ERROR: Failed to register the scheduled task.
    pause
    exit /b 1
)

echo  SUCCESS! Auto-start registered.
echo.
echo  The POS server will now start automatically every time
echo  this PC boots — no console window, no login needed.
echo.
echo  To start it right now without rebooting, double-click:
echo    "Start Pointify POS.bat"
echo.
echo  To stop or remove auto-start:
echo    schtasks /delete /tn "PointifyPOS" /f
echo.
pause
