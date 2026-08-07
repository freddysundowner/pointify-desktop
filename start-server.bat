@echo off
setlocal enabledelayedexpansion

:: ============================================================
:: Pointify POS — Server Till Startup Script
:: Double-click this file to start the POS server.
:: All other tills connect via browser: http://<this-PC-ip>:3000
:: ============================================================

:: Check Node.js is installed
where node >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js is not installed.
    echo Please download and install Node.js from https://nodejs.org ^(LTS version^).
    pause
    exit /b 1
)

:: Check .env file exists
if not exist "%~dp0.env" (
    echo ERROR: .env file not found.
    echo Please copy .env.example to .env and fill in your settings.
    pause
    exit /b 1
)

:: Install server dependencies if node_modules is missing or incomplete
if not exist "%~dp0server\node_modules\.package-lock.json" (
    echo Installing server dependencies ^(first run only^)...
    cd /d "%~dp0server"
    npm install --omit=dev
    if errorlevel 1 (
        echo ERROR: Failed to install dependencies. Check your internet connection and try again.
        pause
        exit /b 1
    )
    cd /d "%~dp0"
)

:: Load environment variables from .env
for /f "usebackq tokens=1,* delims==" %%A in ("%~dp0.env") do (
    set "line=%%A"
    if not "!line:~0,1!"=="#" if not "%%A"=="" (
        set "%%A=%%B"
    )
)

:: Show IP addresses so you know what other tills should browse to
echo.
echo ============================================================
echo  Pointify POS Server
echo ============================================================
echo  Other tills open a browser to one of these addresses:
for /f "tokens=2 delims=:" %%I in ('ipconfig ^| findstr /R "IPv4"') do (
    set "ip=%%I"
    set "ip=!ip: =!"
    echo   http://!ip!:%PORT%
)
echo ============================================================
echo.

:: Start the server
node "%~dp0server\dist\index.cjs"

pause
