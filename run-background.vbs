Dim WshShell, scriptDir, envFile, fso, port

Set WshShell = CreateObject("WScript.Shell")
Set fso      = CreateObject("Scripting.FileSystemObject")

scriptDir = Left(WScript.ScriptFullName, InStrRev(WScript.ScriptFullName, "\"))
envFile   = scriptDir & ".env"
port      = "3000"

' Read PORT from .env if present
If fso.FileExists(envFile) Then
    Dim ts, line
    Set ts = fso.OpenTextFile(envFile, 1)
    Do While Not ts.AtEndOfStream
        line = Trim(ts.ReadLine())
        If Left(line, 1) <> "#" And InStr(line, "=") > 0 Then
            Dim key, val
            key = Trim(Left(line, InStr(line, "=") - 1))
            val = Trim(Mid(line, InStr(line, "=") + 1))
            If key = "PORT" Then port = val
        End If
    Loop
    ts.Close
End If

' Set STATIC_DIR so the server finds client/dist regardless of working directory
WshShell.Environment("Process")("STATIC_DIR") = scriptDir & "client\dist"
WshShell.Environment("Process")("UPLOADS_DIR") = scriptDir & "uploads"

' Start the server silently (window style 0 = hidden, bWaitOnReturn = False)
WshShell.Run Chr(34) & scriptDir & "node.exe" & Chr(34) & _
             " " & Chr(34) & scriptDir & "server\dist\index.cjs" & Chr(34), 0, False

' Give the server a moment to bind to its port
WScript.Sleep 2500

' Open the POS in the default browser
WshShell.Run "http://localhost:" & port
