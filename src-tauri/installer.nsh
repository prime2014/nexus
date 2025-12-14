; Custom hooks for Nexus Medical installer

!macro NSIS_HOOK_PREINSTALL
  ; Check for previous installation and prompt to reinstall
  ReadRegStr $0 HKCU "Software\Prime Ltd\nexus" "InstallPath"
  ${If} $0 != ""
    MessageBox MB_YESNO|MB_ICONQUESTION \
      "Nexus Medical is already installed at:$\r$\n$\r$\n$0$\r$\n$\r$\nWould you like to reinstall?" \
      IDYES continue IDNO abort
    abort:
      Quit
    continue:
  ${EndIf}
!macroend

!macro NSIS_HOOK_POSTINSTALL
  ; Show completion message after installation
  MessageBox MB_OK|MB_ICONINFORMATION \
    "Nexus Medical has been successfully installed.$\r$\n$\r$\n\
    The application can now be launched from the Start Menu or desktop (if created)."
!macroend

!macro NSIS_HOOK_PREUNINSTALL
  ; Ask for confirmation before uninstalling
  MessageBox MB_YESNO|MB_ICONQUESTION \
    "Are you sure you want to completely remove Nexus Medical?$\r$\n$\r$\n\
    This will delete all configuration files.$\r$\n$\r$\n\
    Patient data in the database will NOT be deleted." \
    IDYES continue IDNO abort
  abort:
    Quit
  continue:
!macroend

!macro NSIS_HOOK_POSTUNINSTALL
  ; Optional: Message after uninstall (rarely needed)
  ; MessageBox MB_OK "Nexus Medical has been removed."
!macroend