; The SCAFFApps Suite installer. electron-builder writes the rest; this only adds:

; Crisp text on a scaled screen (125%, 150%...): without this Windows draws the
; installer and uninstaller at 100% and stretches them, which blurs them.
ManifestDPIAware true

; menuCategory in package.json installs it in "Program Files\SCAFFApps\SCAFFApps Suite", beside the apps it looks
; after, with its Start menu shortcut in the SCAFFApps folder.
