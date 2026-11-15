# Release notes

## 1.0.1 — 16 November 2026

A shorter sign-up window, and "Published by SCAFFApps · www.scaffapps.com" in Settings.

### Downloads

| File | Size | SHA-256 |
|---|---|---|
| `SCAFFApps-Suite-Setup-1.0.1.exe` | 78.0 MB | `AE6C4181D457281CCBD715B325FAA6F2E3719CB0492EF08170566FED40C4B3A3` |

For 64-bit Windows 10 and 11. Not code-signed, so Windows SmartScreen may ask for confirmation on first run.

### Changed

- **The sign-up window** (your name and e-mail, asked once) ends with "Published by **SCAFFApps** · www.scaffapps.com", without the paragraph above it.
- **Settings > About** reads "Published by **SCAFFApps** · www.scaffapps.com".

### Updating from 1.0.0

- **Update** on the Updates page (the Suite says when 1.0.1 is out). Windows asks for permission; the Suite closes, is updated and opens again.

### Tested

- The installed Suite 1.0.0, against a stand-in for GitHub offering the new versions, with its own buttons: updated Smart Snap 1.1.0 to 1.1.1 (open at the time: closed and opened again), Instant Share 1.3.2 to 1.3.3 and Multi Screens 1.8.0 to 1.8.1, each downloaded, checked against both checksums and installed with Windows' permission; then **updated itself** to 1.0.1: closed, installed, opened again, in 11 seconds. Windows lists all four new versions.
- Microsoft Defender finds nothing in the installer. Settings > About in the new build: the line, SCAFFApps in bold.

## 1.0.0 — 16 November 2026

The first release: one window for every SCAFFApps app.

### Downloads

| File | Size | SHA-256 |
|---|---|---|
| `SCAFFApps-Suite-Setup-1.0.0.exe` | 78.0 MB | `055A5BF3A684189B2DCFF135F2CD4FCB0AB0C95CC0C4515E60FA9E2796D0B691` |

For 64-bit Windows 10 and 11. Not code-signed, so Windows SmartScreen may ask for confirmation on first run.

### What it does

- **Installs the SCAFFApps apps** (Multi Screens, Smart Snap, Instant Share, and any app added to `catalogue.json` later) into `C:\Program Files\SCAFFApps`, with a **SCAFFApps** folder in the Start menu.
- **Keeps them up to date.** It checks each app's Releases page when it starts and once a day, says when an update is ready (the scaffold tag turns yellow, a notification), and installs it: the installer is checked against both published SHA-256 checksums, the app is closed if open, Windows asks for permission, and the app opens again. **Update all** does every one.
- **Opens** the apps, their folders and their handbooks; **uninstalls** them.
- **Updates itself** the same way.
- Waits in the tray and starts with Windows (both can be turned off). Dark and light appearances.
- **Your name and e-mail, once,** shared with every SCAFFApps app on the Windows account, sent to SCAFFApps (`www.scaffapps.com`).

### Tested

- Installed without pages, with Windows' permission: in `C:\Program Files\SCAFFApps\SCAFFApps Suite`, Start menu and desktop shortcuts, Windows lists 1.0.0. Microsoft Defender finds nothing in the installer or the program.
- The installed Suite found Multi Screens 1.8.0, Smart Snap 1.1.0 and Instant Share 1.3.0 where their installers put them, and read their Releases pages.
- Installing an app end to end, against a stand-in for GitHub with a harmless test installer: downloaded, checked, installed, found afterwards. A release whose two checksums disagree was refused, and nothing was installed.
- The registration window first on a fresh account; empty details and a bad e-mail address refused.

### Not tested

- Updating the Suite itself (needs a later release).
