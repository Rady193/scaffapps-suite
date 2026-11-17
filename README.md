# SCAFFApps Suite

One window for every SCAFFApps app. The Suite installs the apps, opens them, keeps them up to date, opens their
handbooks, and keeps itself up to date the same way. It waits in the tray and can start with Windows.

Version 1.0.5 · Windows 10 and 11 (64-bit) · Published by SCAFFApps

## Contents

- [Install](#install)
- [The first start](#the-first-start)
- [The window](#the-window)
- [Installing and updating apps](#installing-and-updating-apps)
- [Updating the Suite](#updating-the-suite)
- [Settings](#settings)
- [What is sent over the internet](#what-is-sent-over-the-internet)
- [Where things are saved](#where-things-are-saved)
- [Adding an app](#adding-an-app)
- [Building from source](#building-from-source)
- [Project layout](#project-layout)
- [Licence](#licence)

## Install

Download `SCAFFApps-Suite-Setup-1.0.5.exe` from the [Releases page](https://github.com/Rady193/scaffapps-suite/releases/latest)
and run it. It installs for everyone on the computer in `C:\Program Files\SCAFFApps\SCAFFApps Suite`, beside the apps
it looks after, so Windows asks for administrator permission once. It adds a desktop shortcut and a Start menu
shortcut in the **SCAFFApps** folder, and can be removed from Windows Settings like any program.

The release notes list the installer's SHA-256 checksum, so you can check a download with `Get-FileHash <file>` in
PowerShell. The program is not code-signed, so the first time you run it Windows SmartScreen may show "Windows
protected your PC". Choose **More info**, then **Run anyway**.

## The first start

The first SCAFFApps app to start on a Windows account asks for your **name** and **e-mail address**. Both are required;
closing the window without them closes the app. You are asked once: the Suite and every other SCAFFApps app on the
same Windows account use the same details and do not ask again. See [What is sent](#what-is-sent-over-the-internet).

## The window

- **Home**: the scaffold shows your favourite apps, each in its own bay, and the scaffold tag says whether updates
  are ready. Each app has a card: **Open**, **Update** when a newer version is out, or **Install**. The star beside
  **Open** marks an installed app as a favourite, or takes it off the scaffold; until you change one, every installed
  app is a favourite. The **⋯** menu has the same choice, the release notes, the handbook, the app's folder and
  **Uninstall**.
  **What's new** lists each app's latest release; **Handbooks** opens their guides.
- **My apps**: every SCAFFApps app, its version, whether it is running, and where it is installed.
- **Updates**: the Suite itself and each app, the version you have and the newest one, and its release notes.
- **Handbooks**: each app's handbook, a PDF with pictures, downloaded the first time and opened in your PDF reader.
- **Settings**: see [Settings](#settings).

The sun and moon button in the title bar switches between the dark and light appearance; **Ctrl+K** searches the apps.

## Installing and updating apps

**Install** or **Update** downloads the app's installer from its GitHub Releases page and checks it against the
SHA-256 checksums published with the release: the one GitHub works out for the file and the one in the release notes.
They must agree; a file that does not match is thrown away and nothing is installed. Then:

1. If the app is open, it is closed (its card says so first).
2. Its installer runs without its pages. Windows asks for permission.
3. The app is installed in `C:\Program Files\SCAFFApps\<app>` with a Start menu shortcut in the SCAFFApps folder. An
   older copy in the old place (`C:\Program Files\<app>`) is moved there.
4. If it was open, it is opened again.

**Update all** does every app with an update, one after another. An app's own settings and saved files are kept.
Each app can also update itself from its own Settings, as before; the Suite and the app use the same release files.

## Updating the Suite

The Suite checks its own Releases page with the apps. When a newer version is out, the sidebar card and the Updates
page say so; **Update** downloads it, checks it the same way, and asks Windows for permission. The Suite closes,
the new version is installed in the same folder, and it opens again.

## Settings

| Setting | What it does |
|---|---|
| Check for updates automatically | When the Suite starts and once a day while it runs. Off: only when you press **Check for updates**. |
| Tell me when an update is ready | A Windows notification, once for each new version, when the window is not in front. |
| Start the Suite with Windows | It starts hidden, in the tray. Closing the window keeps it there; to quit, right-click the tray icon. |
| Appearance | Dark (the default) or light. |

**Registered to** shows the name and e-mail address you gave.

## What is sent over the internet

- **Your registration**, once per version of each SCAFFApps app: your name, e-mail address, a random number made for
  this Windows account (so your apps are counted as one person), the app's name and version, and the Windows version.
  It goes to `www.scaffapps.com/api/register` and is kept by SCAFFApps to know who uses its apps. Nothing else about
  you or the computer is sent.
- **Update checks** ask `www.scaffapps.com` for each app's latest release (else `releases.json` in this repository,
  on `raw.githubusercontent.com`, and only then GitHub's API, `api.github.com`), and `raw.githubusercontent.com` for
  the list of SCAFFApps apps (`catalogue.json` in this repository). These are ordinary web requests naming the Suite
  and its version.
- **Downloads** of installers and handbooks come from GitHub.

## Where things are saved

| What | Where |
|---|---|
| The program | `C:\Program Files\SCAFFApps\SCAFFApps Suite` |
| Your registration (shared by every SCAFFApps app) | `%APPDATA%\SCAFFApps\registration.json` |
| The Suite's settings and the last list of apps | `%APPDATA%\SCAFFApps Suite\settings.json` |
| Downloaded installers and handbooks | `%TEMP%\SCAFFApps Suite` (installers are deleted once installed) |

## Adding an app

The apps the Suite offers are listed in [`catalogue.json`](catalogue.json). The Suite reads the newest copy from this
repository's `main` branch, so a new app added there appears in every Suite without updating the Suite. Each entry
gives the app's GitHub repository, the pattern of its installer's and handbook's file names, its program file, and
the start of its name in Windows' list of installed programs. The app must publish a Windows installer (not only a
portable file) and list each file's SHA-256 in its release notes, like the other SCAFFApps apps. Its icon is shown
from `app/icons` if the Suite has it, else from the `iconUrl` given (on `raw.githubusercontent.com`).

## After publishing a release of any SCAFFApps app

Run `node make-releases.js` in this folder (it needs the GitHub CLI, `gh`, signed in), then commit and push
`releases.json`. Every SCAFFApps app reads its newest release from that file, through `www.scaffapps.com/api/releases/<app>`
(the website keeps a copy for five minutes) or straight from `raw.githubusercontent.com`, and asks GitHub's API only
when neither answers: the API answers only 60 questions an hour for each internet connection, shared by every
computer and app behind it. Until `releases.json` is pushed, the apps do not see the new release.

## Building from source

Needs Node.js. From this folder:

```
npm install
npm start               # run it from the source code
npm run dist            # the installer, in release\
```

With recent npm versions `npm install` may skip Electron's download step. Run `node node_modules/electron/install.js`
once; on Node.js 26 that can fail to unpack, in which case unzip the archive from `%LOCALAPPDATA%\electron\Cache`
into `node_modules\electron\dist` and create `node_modules\electron\path.txt` containing `electron.exe`.

For tests: `SUITE_GITHUB_API` (a stand-in for api.github.com), `SUITE_CATALOGUE_URL`, `SUITE_INSTALLED_JSON` (a file
listing installed apps instead of Windows' list), `SUITE_NO_ELEVATE=1` (run installers without the permission prompt),
and `SCAFFAPPS_REGISTRATION_FILE` / `SCAFFAPPS_REGISTER_URL` for the registration. Start Electron with
`--user-data-dir=<folder>` so your own settings are not touched.

## Project layout

| Path | Purpose |
|---|---|
| `main.js` | The window, tray and start with Windows; the catalogue; finding installed and running apps; GitHub releases, checked downloads, installing, uninstalling, handbooks; the Suite's own update. |
| `preload.js` | The small, fixed set of requests the window may make of `main.js`. |
| `releases.js` | Asks for an app's newest release: the website, then `releases.json`, then GitHub's API. The same file in every SCAFFApps Electron app. |
| `make-releases.js`, `releases.json` | The newest release of every SCAFFApps app, written after each release (see above). |
| `registration.js`, `registration-preload.js`, `app/registration.html` | The name and e-mail registration, the same files in every SCAFFApps Electron app. |
| `catalogue.json` | The SCAFFApps apps the Suite offers (the newest copy is read from GitHub). |
| `app/index.html`, `app/style.css`, `app/suite.css`, `app/renderer.js`, `app/theme-early.js` | The window. |
| `app/brand`, `app/icons`, `app/fonts` | The SCAFFApps logo files from the brand kit, the apps' icons, JetBrains Mono (SIL Open Font License). |
| `build/` | The icon (the SCAFFApps icon from the brand kit), the packaging hook, and `installer.nsh`. |

## Licence

See [LICENSE](LICENSE). Published by SCAFFApps.
