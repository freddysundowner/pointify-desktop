@echo off
setlocal enabledelayedexpansion
title Pointify POS Server

:: Set working directory to the package root so process.cwd() resolves
:: client/dist, uploads/, etc. correctly regardless of where this bat was launched.
cd /d "%~dp0"

if not exist "%~dp0.env" (
    echo ERROR: .env file not found next to this script.
    pause & exit /b 1
)

for /f "usebackq tokens=1,* delims==" %%A in ("%~dp0.env") do (
    set "ln=%%A"
    if not "!ln:~0,1!"=="#" if not "%%A"=="" set "%%A=%%B"
)

echo.
echo  ============================================
echo   Pointify POS  ^|  Port %PORT%
echo  ============================================
echo   Other tills: open a browser and go to
for /f "tokens=2 delims=:" %%I in ('ipconfig ^| findstr /R "IPv4"') do (
    set "ip=%%I"
    set "ip=!ip: =!"
    if not "!ip!"=="127.0.0.1" echo     http://!ip!:%PORT%
)
echo  ============================================
echo   Keep this window open. Press Ctrl+C to stop.
echo.

"%~dp0node.exe" "%~dp0server\dist\index.cjs"
pause
