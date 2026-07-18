@echo off
REM Removes the Pointify Print Agent from Windows startup.
reg delete "HKCU\Software\Microsoft\Windows\CurrentVersion\Run" /v "PointifyPrintAgent" /f
echo Pointify Print Agent removed from startup. (It may still be running now —
echo close its window or restart the computer.)
pause
