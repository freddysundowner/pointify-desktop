' Pointify POS — Silent background launcher
' Starts the POS server with no console window.
' Used by Task Scheduler for auto-start on boot.
Dim shell, dir
Set shell = CreateObject("WScript.Shell")
dir = Left(WScript.ScriptFullName, InStrRev(WScript.ScriptFullName, "\") - 1)
shell.Run """" & dir & "\node.exe"" """ & dir & "\server\dist\index.cjs""", 0, False
