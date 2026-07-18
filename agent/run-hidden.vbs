' Launches the Pointify Print Agent with no visible window.
Set fso = CreateObject("Scripting.FileSystemObject")
dir = fso.GetParentFolderName(WScript.ScriptFullName)
Set shell = CreateObject("WScript.Shell")
shell.Run """" & dir & "\pointify-print-agent.exe""", 0, False
