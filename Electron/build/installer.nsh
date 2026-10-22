!define WLJS_SHELL_NEW_KEY "Software\Classes\.wln\ShellNew"
!define WLJS_SHELL_NEW_TEMPLATE "$INSTDIR\resources\app\Electron\Template.wln"

!macro customInstall
  ; Add "WLJS Notebook" to File Explorer's New submenu. FileName makes
  ; Explorer copy the notebook template instead of creating an empty file.
  WriteRegStr SHELL_CONTEXT "${WLJS_SHELL_NEW_KEY}" "FileName" "${WLJS_SHELL_NEW_TEMPLATE}"

  ; File Explorer caches file associations and the New submenu.
  System::Call 'shell32::SHChangeNotify(i 0x08000000, i 0x1000, i 0, i 0)'
!macroend

!macro customUnInstall
  ; Do not remove a ShellNew registration that another application replaced.
  ReadRegStr $0 SHELL_CONTEXT "${WLJS_SHELL_NEW_KEY}" "FileName"
  ${If} $0 == "${WLJS_SHELL_NEW_TEMPLATE}"
    DeleteRegValue SHELL_CONTEXT "${WLJS_SHELL_NEW_KEY}" "FileName"
    DeleteRegKey /ifempty SHELL_CONTEXT "${WLJS_SHELL_NEW_KEY}"
  ${EndIf}
!macroend
