; Pointify POS — Windows Installer Script (NSIS)
; Compiled by GitHub Actions on windows-latest.
; All source files are assembled into installer/package/ before this runs.

!include "MUI2.nsh"
!include "FileFunc.nsh"

;----- General ---------------------------------------------------------------
Name "Pointify POS"
OutFile "PointifyPOS-Setup.exe"
Unicode True
InstallDir "$PROGRAMFILES64\Pointify POS"
InstallDirRegKey HKLM "Software\PointifyPOS" "InstallDir"
RequestExecutionLevel admin
SetCompressor /SOLID lzma

;----- MUI Pages -------------------------------------------------------------
!define MUI_ABORTWARNING
!define MUI_ICON "${NSISDIR}\Contrib\Graphics\Icons\modern-install.ico"
!define MUI_UNICON "${NSISDIR}\Contrib\Graphics\Icons\modern-uninstall.ico"
!define MUI_FINISHPAGE_RUN "$INSTDIR\Start Pointify POS.bat"
!define MUI_FINISHPAGE_RUN_TEXT "Start Pointify POS now"
!define MUI_FINISHPAGE_SHOWREADME "$INSTDIR\README.txt"
!define MUI_FINISHPAGE_SHOWREADME_TEXT "Show setup guide"

!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH

!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES

!insertmacro MUI_LANGUAGE "English"

;----- Install Section -------------------------------------------------------
Section "Pointify POS" SecMain
  SectionIn RO   ; Required — cannot deselect

  SetOutPath "$INSTDIR"
  File "package\node.exe"
  File "package\.env"
  File "package\Start Pointify POS.bat"
  File "package\run-background.vbs"
  File "package\setup-autostart.bat"
  File "package\README.txt"

  SetOutPath "$INSTDIR\server\dist"
  File "package\server\dist\index.cjs"

  SetOutPath "$INSTDIR\server"
  File "package\server\package.json"

  ; Firebase-admin ecosystem (remaining external node_modules)
  SetOutPath "$INSTDIR\server\node_modules"
  File /r "package\server\node_modules\"

  ; Built frontend
  SetOutPath "$INSTDIR\client\dist"
  File /r "package\client\dist\"

  ; Desktop shortcut — launches silently via VBScript, opens browser automatically
  CreateShortcut "$DESKTOP\Pointify POS.lnk" \
    "$SYSDIR\wscript.exe" '"$INSTDIR\run-background.vbs"' \
    "$INSTDIR\node.exe" 0 SW_SHOWNORMAL "" "Start Pointify POS"

  ; Start Menu
  CreateDirectory "$SMPROGRAMS\Pointify POS"
  CreateShortcut "$SMPROGRAMS\Pointify POS\Pointify POS.lnk" \
    "$SYSDIR\wscript.exe" '"$INSTDIR\run-background.vbs"' \
    "$INSTDIR\node.exe" 0 SW_SHOWNORMAL "" "Start Pointify POS"
  CreateShortcut "$SMPROGRAMS\Pointify POS\Setup Auto-start.lnk" \
    "$INSTDIR\setup-autostart.bat" "" "" 0 "" "" \
    "Run once to start POS automatically at boot"
  CreateShortcut "$SMPROGRAMS\Pointify POS\Uninstall.lnk" \
    "$INSTDIR\Uninstall Pointify POS.exe"

  ; Registry — Add/Remove Programs
  WriteRegStr HKLM \
    "Software\Microsoft\Windows\CurrentVersion\Uninstall\PointifyPOS" \
    "DisplayName" "Pointify POS"
  WriteRegStr HKLM \
    "Software\Microsoft\Windows\CurrentVersion\Uninstall\PointifyPOS" \
    "UninstallString" '"$INSTDIR\Uninstall Pointify POS.exe"'
  WriteRegStr HKLM \
    "Software\Microsoft\Windows\CurrentVersion\Uninstall\PointifyPOS" \
    "InstallLocation" "$INSTDIR"
  WriteRegStr HKLM \
    "Software\Microsoft\Windows\CurrentVersion\Uninstall\PointifyPOS" \
    "Publisher" "Pointify"
  WriteRegDWORD HKLM \
    "Software\Microsoft\Windows\CurrentVersion\Uninstall\PointifyPOS" \
    "NoModify" 1
  WriteRegDWORD HKLM \
    "Software\Microsoft\Windows\CurrentVersion\Uninstall\PointifyPOS" \
    "NoRepair" 1

  WriteRegStr HKLM "Software\PointifyPOS" "InstallDir" "$INSTDIR"
  WriteUninstaller "$INSTDIR\Uninstall Pointify POS.exe"
SectionEnd

;----- Uninstall Section -----------------------------------------------------
Section "Uninstall"
  ; Stop any running server task first
  ExecWait 'schtasks /delete /tn "PointifyPOS" /f' $0

  Delete "$INSTDIR\node.exe"
  Delete "$INSTDIR\.env"
  Delete "$INSTDIR\Start Pointify POS.bat"
  Delete "$INSTDIR\run-background.vbs"
  Delete "$INSTDIR\setup-autostart.bat"
  Delete "$INSTDIR\README.txt"
  Delete "$INSTDIR\Uninstall Pointify POS.exe"

  RMDir /r "$INSTDIR\server"
  RMDir /r "$INSTDIR\client"
  RMDir "$INSTDIR"

  Delete "$DESKTOP\Pointify POS.lnk"
  Delete "$SMPROGRAMS\Pointify POS\Start Pointify POS.lnk"
  Delete "$SMPROGRAMS\Pointify POS\Setup Auto-start.lnk"
  Delete "$SMPROGRAMS\Pointify POS\Uninstall.lnk"
  RMDir  "$SMPROGRAMS\Pointify POS"

  DeleteRegKey HKLM \
    "Software\Microsoft\Windows\CurrentVersion\Uninstall\PointifyPOS"
  DeleteRegKey HKLM "Software\PointifyPOS"
SectionEnd
