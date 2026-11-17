# Release notes

## 1.0.5 — 18 November 2026

An app's card no longer shakes while it updates.

### Downloads

| File | Size | SHA-256 |
|---|---|---|
| `SCAFFApps-Suite-Setup-1.0.5.exe` | 71.1 MB | `7858E5582898090C5E4FCE242F66C403A2CBC21A924ECAF6934C64C57B545765` |
| `SCAFFApps-Suite-Handbook-1.0.5.pdf` | 4.1 MB | `12EDD85252E7F6E3376DFD813863BF720F51D2C4F69C20FB0852816B6FCFA1A0` |

For 64-bit Windows 10 and 11. Not code-signed, so Windows SmartScreen may ask for confirmation on first run.

### Fixed

- **An app's card no longer shakes while the app updates.** The Suite drew its whole window again on every report of the download, several a second, and each time the card under the pointer began its small rise again, so it shook; the progress bar's stripes and the spinner jumped back as well. Now a part of the window is drawn again only when it has changed, and the progress bar and its numbers move in place.

### Changed

- **The handbook**, `SCAFFApps-Suite-Handbook-1.0.5.pdf`: 1.0.4's pages and pictures, with the new version.

### Updating from 1.0.4

- **Update** on the Updates page, or the Suite's card in the sidebar. Windows asks for permission; the Suite closes, is updated and opens again.

### Tested

- The Suite's window in Edge, with stand-ins for the rest of the Suite, the pointer resting on Smart Snap's card while it downloads (40 progress reports, 60 ms apart): with 1.0.4's code the card was drawn anew on every report and moved between four heights, 1.2 pixels apart; with this version it is the same card throughout and does not move, while the bar goes from 0 to 70 % and the numbers count up to 71.1 MB of 71.1 MB.
- The SCAFFApps design-language check passes. Microsoft Defender finds nothing in the installer.

### Not tested

- The packaged Suite was not started: a test copy would set itself to start with Windows, in place of the Suite installed on the computer. This installer over 1.0.4, and a real update watched through it.

## 1.0.4 — 16 November 2026

The keyboard's place shown, as in every SCAFFApps app.

### Downloads

| File | Size | SHA-256 |
|---|---|---|
| `SCAFFApps-Suite-Setup-1.0.4.exe` | 71.1 MB | `DA5B13366853571591B5DB4A224FF751149589EBC2B513477AA9E25959962874` |
| `SCAFFApps-Suite-Handbook-1.0.4.pdf` | 4.1 MB | `8FA3E965D608E22FF58B30EFBB1FC1E9BBC3EC4049A8D28DE61F4DC8259F0384` |

For 64-bit Windows 10 and 11. Not code-signed, so Windows SmartScreen may ask for confirmation on first run.

### Changed

- **Moving with Tab shows where you are**: a gold ring (purple in the light appearance) round the button, as in the other SCAFFApps apps; never on a click.
- **The handbook**, `SCAFFApps-Suite-Handbook-1.0.4.pdf`: 1.0.3's pages and pictures, with the new version.

### Updating from 1.0.3

- **Update** on the Updates page, or the Suite's card in the sidebar. Windows asks for permission; the Suite closes, is updated and opens again.

### Tested

- The SCAFFApps design-language check: colours, scrollbars, the focus ring, the title bar, the appearance button, the tray menu and its Quit, the shared files.
- Installed over 1.0.3 on a working computer the way it updates itself (silently, with Windows' permission): Windows lists 1.0.4 and the Suite opened again.
- Microsoft Defender finds nothing in the installer.

## 1.0.3 — 16 November 2026

Your favourite apps on the scaffold, and a smaller Suite card in the sidebar.

### Downloads

| File | Size | SHA-256 |
|---|---|---|
| `SCAFFApps-Suite-Setup-1.0.3.exe` | 78.0 MB | `7ED13213358E0B8B62FD4EC78212EBD17FE0D11F10FAAB845CA4289424112EDD` |
| `SCAFFApps-Suite-Handbook-1.0.3.pdf` | 4.1 MB | `F49F84124484EC2E2B59E39A36DB20FD8B67C0012B00F3FE387E10F9A5B80193` |

For 64-bit Windows 10 and 11. Not code-signed, so Windows SmartScreen may ask for confirmation on first run.

### Added

- **Favourites.** The star beside an installed app's **Open** makes it a favourite, or takes it off; the app's **⋯** menu has **Add to favourites** and **Remove from favourites** too, so it also works from **My apps**. The scaffold on the home view shows your favourites, one to a bay. Until you change one, every installed app is a favourite, so the scaffold looks as before; with none, a sign on the scaffold says how to put one there.

### Changed

- **The scaffold**: each app stands in the middle of its bay, and the dashed places marked + are gone.
- **The Suite's card in the sidebar** is smaller: the check-for-updates arrow sits beside the version, and the card says something only when an update for the Suite is ready or a check failed.
- **The handbook**, `SCAFFApps-Suite-Handbook-1.0.3.pdf`, with favourites; its pictures retaken, mixed between the dark and light appearance.

### Updating from 1.0.2

- **Update** on the Updates page, or the Suite's card in the sidebar. Windows asks for permission; the Suite closes, is updated and opens again.

### Tested

- From the source code in a test profile, in the dark and light appearance: the star and the ⋯ menu put each app on the scaffold and take it off, the choice is kept in the Suite's settings, the scaffold follows the catalogue's order, and with no favourites the sign shows. The sidebar card with an update ready.
- Builds of these changes installed over 1.0.2 on a working computer, the way the Suite updates itself (silently, with Windows' permission): installed, and the Suite opened again.
- Microsoft Defender finds nothing in the installer.
- The handbook's pictures were taken from this version, in a test profile, with a stand-in for GitHub and a made-up list of installed apps.

### Not tested

- The Suite updating itself to 1.0.3 with its own **Update** button.

## 1.0.2 — 16 November 2026

Its own handbook, scrollbars in the SCAFFApps colours, and a home view that fits a small laptop.

### Downloads

| File | Size | SHA-256 |
|---|---|---|
| `SCAFFApps-Suite-Setup-1.0.2.exe` | 78.0 MB | `84D9DEE414DB3EEAEBD0A1EDB2E15031E346EDE2A0FEEE2276DBA6911EF286DC` |
| `SCAFFApps-Suite-Handbook-1.0.2.pdf` | 3.8 MB | `9E0A7C925B4E016CB5C77AE9458BA98655A24856992FFFFE2BC467D6F25BA237` |

For 64-bit Windows 10 and 11. Not code-signed, so Windows SmartScreen may ask for confirmation on first run.

### Changed

- **Its own handbook**, `SCAFFApps-Suite-Handbook-1.0.2.pdf`: 11 pages with pictures in the SCAFFApps brochure style. The apps' handbooks (Multi Screens 1.8.2, Smart Snap 1.1.2, Instant Share 1.3.4) are now on their releases, so **Handbooks** opens them.
- **Scrollbars in the SCAFFApps style**: a slim purple bar on no track, wider under the pointer; never the grey Windows bar.
- **The home view fits a small laptop** (1366 × 768) without scrolling.
- **"Published by SCAFFApps - www.scaffapps.com"** in Settings > About and at the foot of the sign-up window.

### Updating from 1.0.0 or 1.0.1

- **Update** on the Updates page, or the Suite's card in the sidebar. Windows asks for permission; the Suite closes, is updated and opens again.

### Tested

- The installed Suite 1.0.1, against a stand-in for GitHub offering the new versions, updated Smart Snap, Instant Share and Multi Screens with its own buttons (each downloaded, checked against both published checksums and installed with Windows' permission, in 9 to 10 seconds), then **updated itself** to 1.0.2: closed, installed and opened again, in 10 seconds. Windows lists all four new versions.
- Microsoft Defender finds nothing in the installer.
- The handbook's pictures were taken from this version, in a test profile, with a stand-in for GitHub and a made-up list of installed apps.

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
