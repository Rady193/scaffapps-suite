// SCAFFApps Suite: one window for every SCAFFApps app. It lists the apps in the catalogue (catalogue.json, the newest
// copy read from the Suite's GitHub repository), finds which are installed (Windows' list of installed programs) and
// running, checks each app's GitHub Releases page for a newer version, installs and updates them with their own
// installers (checked against the SHA-256 published with each release), opens them, opens their handbooks, and keeps
// itself up to date the same way. It waits in the tray and can start with Windows.
//
// Tests: SUITE_GITHUB_API (a stand-in for api.github.com), SUITE_CATALOGUE_URL, SUITE_INSTALLED_JSON (a file listing
// installed apps instead of the registry), SUITE_NO_ELEVATE=1 (run installers without the Windows permission prompt),
// and registration.js's SCAFFAPPS_REGISTRATION_FILE / SCAFFAPPS_REGISTER_URL.
const { app, BrowserWindow, ipcMain, Menu, Tray, nativeImage, net, shell, Notification } = require('electron');
const { execFile, spawn } = require('child_process');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const registration = require('./registration');
const releases = require('./releases');

const SUITE_REPO = 'Rady193/scaffapps-suite';
const SUITE_PAGE = `https://github.com/${SUITE_REPO}/releases/latest`;
const GITHUB_API = process.env.SUITE_GITHUB_API || 'https://api.github.com';
const CATALOGUE_URL = process.env.SUITE_CATALOGUE_URL || `https://raw.githubusercontent.com/${SUITE_REPO}/main/catalogue.json`;
const SUITE_SETUP = /^SCAFFApps-Suite-Setup-\d+(\.\d+)*\.exe$/i;
const CHECK_EVERY = 24 * 60 * 60 * 1000;
const AGENT = `SCAFFAppsSuite/${app.getVersion()}`;
const STARTED_HIDDEN = process.argv.includes('--hidden') && !process.argv.includes('--updated');
const JUST_UPDATED = process.argv.includes('--updated');
const TITLE_BAR = { dark: { color: '#191a1b', symbolColor: '#cccccc' }, light: { color: '#ffffff', symbolColor: '#17141c' } };
const DOWNLOADS = path.join(app.getPath('temp'), 'SCAFFApps Suite');

if (!app.requestSingleInstanceLock()) app.quit();
app.on('second-instance', () => showMain());

// ------------------------------------------------------------------------------------------------ settings
const SETTINGS_FILE = path.join(app.getPath('userData'), 'settings.json');
let settings = null;
function loadSettings() {
  if (!settings) { try { settings = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8')) || {}; } catch { settings = {}; } }
  return settings;
}
function saveSettings() {
  try { fs.mkdirSync(path.dirname(SETTINGS_FILE), { recursive: true }); fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2)); } catch { /* next time */ }
}
const theme = () => (loadSettings().theme === 'light' ? 'light' : 'dark');

// ------------------------------------------------------------------------------------------------ the catalogue
function validApp(a) {
  return a && /^[a-z0-9][a-z0-9-]{0,39}$/.test(a.id) && typeof a.name === 'string' && a.name.length < 60
    && /^[\w.-]+\/[\w.-]+$/.test(a.repo) && typeof a.setup === 'string' && /^[^\\/:*?"<>|]+\.exe$/i.test(a.exe || '');
}
function bundledCatalogue() { return JSON.parse(fs.readFileSync(path.join(__dirname, 'catalogue.json'), 'utf8')).apps; }
let catalogue = (() => { const saved = loadSettings().catalogue; return Array.isArray(saved) && saved.length && saved.every(validApp) ? saved : bundledCatalogue(); })();

async function refreshCatalogue() {
  try {
    const res = await net.fetch(CATALOGUE_URL, { cache: 'no-store', headers: { 'User-Agent': AGENT } });
    if (!res.ok) return;
    const apps = (await res.json()).apps;
    if (Array.isArray(apps) && apps.length && apps.every(validApp)) { catalogue = apps; loadSettings().catalogue = apps; saveSettings(); }
  } catch { /* offline: the last one known */ }
}

// ------------------------------------------------------------------------------------------------ what is on this computer
function run(file, args, env) {
  return new Promise((resolve) => execFile(file, args, { windowsHide: true, maxBuffer: 8 << 20, env: { ...process.env, ...env } },
    (err, stdout) => resolve(err ? '' : String(stdout))));
}

// Windows' list of installed programs (both registry views, all users and this user): name, version, folder.
async function readInstalled() {
  if (process.env.SUITE_INSTALLED_JSON) { try { return JSON.parse(fs.readFileSync(process.env.SUITE_INSTALLED_JSON, 'utf8')); } catch { return []; } }
  const ps = "$k = 'HKLM:\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*','HKLM:\\Software\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*','HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*';"
    + " @(Get-ItemProperty $k -ErrorAction SilentlyContinue | Where-Object { $_.DisplayName } | Select-Object DisplayName, DisplayVersion, InstallLocation, UninstallString, DisplayIcon) | ConvertTo-Json -Compress";
  const out = await run('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', ps]);
  try { const list = JSON.parse(out || '[]'); return Array.isArray(list) ? list : [list]; } catch { return []; }
}

async function runningExes() {
  const out = await run('tasklist.exe', ['/FO', 'CSV', '/NH']);
  return new Set(out.split(/\r?\n/).map((l) => (l.match(/^"([^"]+)"/) || [])[1]).filter(Boolean).map((s) => s.toLowerCase()));
}

const state = new Map();      // id -> { installed, running, latest, busy, progress, error, message }
const appState = (id) => { if (!state.has(id)) state.set(id, { installed: null, running: false, latest: null, busy: null, progress: null, error: null }); return state.get(id); };

// Where an installed program is. The apps' own installer (Instant Share) records InstallLocation; Electron's
// (Multi Screens, Smart Snap, the Suite) does not, so it is the folder of the uninstaller or of the program's icon.
function folderOf(e) {
  if (e.InstallLocation) return String(e.InstallLocation).replace(/[\\/]+$/, '');
  const uninstall = String(e.UninstallString || '');
  const quoted = /^\s*"([^"]+\.exe)"/i.exec(uninstall) || /^\s*([^"]+?\.exe)\b/i.exec(uninstall);
  if (quoted) return path.dirname(quoted[1]);
  const icon = String(e.DisplayIcon || '').replace(/,\s*-?\d+\s*$/, '').replace(/^"|"$/g, '');
  return icon ? path.dirname(icon) : '';
}

async function scan() {
  const [installed, running] = await Promise.all([readInstalled(), runningExes()]);
  for (const a of catalogue) {
    const st = appState(a.id);
    // the newest entry whose program is really there (an old, half-removed entry is skipped)
    const entry = installed
      .filter((e) => String(e.DisplayName || '').toLowerCase().startsWith(String(a.uninstall || a.name).toLowerCase()))
      .map((e) => ({ ...e, folder: folderOf(e) }))
      .filter((e) => e.folder && fs.existsSync(path.join(e.folder, a.exe)))
      .sort((x, y) => (isNewer(x.DisplayVersion, y.DisplayVersion) ? -1 : 1))[0];
    st.installed = entry ? { version: String(entry.DisplayVersion || '').replace(/^v/i, ''), location: entry.folder, uninstall: entry.UninstallString || '' } : null;
    st.running = running.has(a.exe.toLowerCase());
  }
}

// ------------------------------------------------------------------------------------------------ GitHub releases
function versionParts(v) { return String(v).replace(/^v/i, '').split('-')[0].split('.').map((n) => parseInt(n, 10) || 0); }
function isNewer(a, b) {
  const x = versionParts(a), y = versionParts(b);
  for (let i = 0; i < Math.max(x.length, y.length); i++) if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) > (y[i] || 0);
  return false;
}

// The checksum a download must have: GitHub's own and the one in the release notes; where both exist they must agree.
function expectedChecksum(asset, notes) {
  const sums = new Set();
  const digest = /^sha256:([0-9a-f]{64})$/i.exec(asset.digest || '');
  if (digest) sums.add(digest[1].toLowerCase());
  for (const line of String(notes || '').split('\n')) {
    if (!line.includes(asset.name)) continue;
    const listed = /\b[0-9a-f]{64}\b/i.exec(line);
    if (listed) sums.add(listed[0].toLowerCase());
  }
  if (!sums.size) return null;
  return sums.size === 1 ? [...sums][0] : 'mismatch';
}

function fileOf(release, pattern) {
  if (!pattern) return null;
  const rx = pattern instanceof RegExp ? pattern : new RegExp(pattern, 'i');
  const a = (release.assets || []).find((x) => rx.test(x.name || ''));
  return a ? { name: a.name, url: a.browser_download_url, size: Number(a.size) || 0, sha256: expectedChecksum(a, release.body) } : null;
}

// Asked of the SCAFFApps website first (releases.js), GitHub's API last; a stand-in for GitHub (SUITE_GITHUB_API) is
// asked alone. null: the app has no release yet.
async function latestRelease(repo) {
  const r = await releases.latest(repo, { agent: AGENT, missing: 'null',
    test: process.env.SUITE_GITHUB_API ? `${GITHUB_API}/repos/${repo}/releases/latest` : null });
  if (!r) return null;
  const version = String(r.tag_name || '').replace(/^v/i, '');
  if (!/^\d+(\.\d+)*$/.test(version)) throw new Error('The latest release has no version number.');
  return { version, name: String(r.name || version), notes: String(r.body || ''), published: r.published_at || null,
    page: /^https:\/\/github\.com\//.test(r.html_url || '') ? r.html_url : `https://github.com/${repo}/releases/latest`, raw: r };
}

function netMessage(err) {
  const text = String((err && err.message) || err || '');
  return /ERR_INTERNET_DISCONNECTED|ERR_NAME_NOT_RESOLVED|ERR_CONNECTION|ERR_NETWORK|ERR_TIMED_OUT|ERR_PROXY|fetch failed/i.test(text)
    ? 'GitHub could not be reached. Check the internet connection and try again.' : (text || 'Something went wrong.');
}

const suite = { latest: null, busy: null, progress: null, error: null };
let checking = false;
let checkError = null;

async function checkAll({ quiet = false } = {}) {
  if (checking) return status();
  checking = true; checkError = null; send();
  await refreshCatalogue();
  await scan();
  const before = new Set(catalogue.filter((a) => hasUpdate(a.id)).map((a) => a.id));
  for (const a of catalogue) {
    const st = appState(a.id);
    try {
      const r = await latestRelease(a.repo);
      st.latest = r && { version: r.version, name: r.name, notes: r.notes, published: r.published, page: r.page,
        setup: fileOf(r.raw, a.setup), handbook: fileOf(r.raw, a.handbook) };
      st.error = null;
    } catch (err) { checkError = netMessage(err); }
  }
  try {
    const r = await latestRelease(SUITE_REPO);
    suite.latest = r && { version: r.version, name: r.name, notes: r.notes, published: r.published, page: r.page, setup: fileOf(r.raw, SUITE_SETUP) };
  } catch (err) { checkError = checkError || netMessage(err); }
  checking = false;
  loadSettings().checkedAt = Date.now(); saveSettings();
  send();
  // a newer version found by an automatic check, while the window is not in front: say so once
  const fresh = catalogue.filter((a) => hasUpdate(a.id) && !before.has(a.id) && loadSettings()[`told:${a.id}`] !== appState(a.id).latest.version);
  if (quiet && fresh.length && loadSettings().notify !== false && Notification.isSupported() && !(mainWin && mainWin.isVisible() && mainWin.isFocused())) {
    const n = new Notification({ title: fresh.length === 1 ? `${fresh[0].name} ${appState(fresh[0].id).latest.version} is ready` : `${fresh.length} updates are ready`,
      body: 'Open the SCAFFApps Suite to install.', icon: path.join(__dirname, 'app', 'icon.png') });
    n.on('click', () => showMain('updates'));
    n.show();
    for (const a of fresh) loadSettings()[`told:${a.id}`] = appState(a.id).latest.version;
    saveSettings();
  }
  return status();
}

function hasUpdate(id) {
  const st = appState(id);
  return !!(st.installed && st.latest && isNewer(st.latest.version, st.installed.version));
}

// ------------------------------------------------------------------------------------------------ downloads
function sha256File(file) {
  return new Promise((resolve) => {
    const hash = crypto.createHash('sha256');
    fs.createReadStream(file).on('error', () => resolve(null)).on('data', (c) => hash.update(c)).on('end', () => resolve(hash.digest('hex')));
  });
}

// Downloads a release file, written under a temporary name and only given its real name once its checksum is right.
async function downloadVerified(file, onProgress) {
  if (!file.sha256) throw new Error(`${file.name} has no published checksum, so the Suite will not install it. Use the release page.`);
  if (file.sha256 === 'mismatch') throw new Error(`The two published checksums of ${file.name} disagree, so the Suite will not install it.`);
  fs.mkdirSync(DOWNLOADS, { recursive: true });
  const dest = path.join(DOWNLOADS, file.name), part = dest + '.part';
  if (fs.existsSync(dest) && await sha256File(dest) === file.sha256) return dest;
  const handle = await fs.promises.open(part, 'w');
  try {
    const res = await net.fetch(file.url, { headers: { 'User-Agent': AGENT } });
    if (!res.ok || !res.body) throw new Error(`The download failed (error ${res.status}). Try again later.`);
    const total = file.size || Number(res.headers.get('content-length')) || 0;
    const hash = crypto.createHash('sha256'), reader = res.body.getReader();
    let received = 0, shown = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      hash.update(value); await handle.write(value); received += value.length;
      if (Date.now() - shown > 150) { shown = Date.now(); onProgress({ received, total }); }
    }
    await handle.close();
    if (total && received !== total) throw new Error('The download was incomplete. Try again.');
    if (hash.digest('hex') !== file.sha256) throw new Error('The download did not match its published checksum, so it was not used.');
    fs.renameSync(part, dest);
    return dest;
  } catch (err) {
    await handle.close().catch(() => {});
    try { fs.unlinkSync(part); } catch { /* gone */ }
    throw err;
  }
}

// An installer needs administrator rights: Windows asks for permission first. With wait, resolves with its exit code
// when it has finished; without, once it has started. 1223: permission was refused.
function runElevated(file, args, wait) {
  if (process.env.SUITE_NO_ELEVATE === '1') {
    return new Promise((resolve) => { const p = spawn(file, args, { windowsHide: true }); p.on('exit', (c) => resolve(c || 0)); p.on('error', () => resolve(1)); if (!wait) resolve(0); });
  }
  const command = `try { $p = Start-Process -FilePath $env:SUITE_RUN -ArgumentList ($env:SUITE_ARGS -split '\\|') -Verb RunAs ${wait ? '-Wait ' : ''}-PassThru -ErrorAction Stop;`
    + ` ${wait ? 'exit $p.ExitCode' : 'exit 0'} } catch { exit 1223 }`;
  return new Promise((resolve) => execFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', command],
    { env: { ...process.env, SUITE_RUN: file, SUITE_ARGS: args.join('|') }, windowsHide: true }, (err) => resolve(err ? (typeof err.code === 'number' ? err.code : 1) : 0)));
}

async function closeApp(a) {
  await run('taskkill.exe', ['/IM', a.exe, '/T']);
  for (let i = 0; i < 20; i++) {
    if (!(await runningExes()).has(a.exe.toLowerCase())) return;
    await new Promise((r) => setTimeout(r, 300));
  }
  await run('taskkill.exe', ['/IM', a.exe, '/T', '/F']);
}

function openApp(a) {
  const st = appState(a.id);
  if (!st.installed) return false;
  const exe = path.join(st.installed.location, a.exe);
  if (!fs.existsSync(exe)) return false;
  spawn(exe, [], { detached: true, stdio: 'ignore', cwd: st.installed.location }).unref();
  return true;
}

// Installs an app or updates it: download, check, close it if open, run its installer, open it again if it was open.
async function install(id) {
  const a = catalogue.find((x) => x.id === id), st = appState(id);
  if (!a || st.busy) return status();
  st.error = null;
  try {
    if (!st.latest) await checkAll();
    if (!st.latest || !st.latest.setup) throw new Error(`${a.name} has no installer on its release page yet.`);
    st.busy = 'downloading'; st.progress = { received: 0, total: st.latest.setup.size }; send();
    const file = await downloadVerified(st.latest.setup, (p) => { st.progress = p; send(); });
    await scan();
    const wasRunning = st.running;
    if (wasRunning) { st.busy = 'closing'; send(); await closeApp(a); }
    st.busy = 'installing'; st.progress = null; send();
    const code = await runElevated(file, ['/S'], true);
    if (code === 1223) throw new Error('Windows did not get permission to install. Choose the button again and answer Yes.');
    if (code !== 0) throw new Error(`The installer stopped with error ${code}.`);
    await scan();
    if (!st.installed) throw new Error(`The installer finished, but ${a.name} was not found among the installed programs.`);
    if (wasRunning) { st.busy = 'opening'; send(); openApp(a); }
    try { fs.unlinkSync(file); } catch { /* in use: left for next time */ }
    st.message = `${a.name} ${st.installed.version} is installed.`;
  } catch (err) {
    st.error = netMessage(err);
  }
  st.busy = null; st.progress = null;
  await scan();
  send();
  return status();
}

async function uninstall(id) {
  const a = catalogue.find((x) => x.id === id), st = appState(id);
  if (!a || !st.installed || !st.installed.uninstall || st.busy) return status();
  const m = /^\s*"([^"]+)"\s*(.*)$/.exec(st.installed.uninstall) || /^\s*(\S+)\s*(.*)$/.exec(st.installed.uninstall);
  if (!m) return status();
  if (st.running) await closeApp(a);
  st.busy = 'uninstalling'; send();
  const code = await runElevated(m[1], m[2] ? m[2].split(/\s+/) : [], true);
  st.busy = null;
  st.error = code === 1223 ? 'Windows did not get permission to uninstall.' : null;
  await scan(); send();
  return status();
}

async function openHandbook(id) {
  const a = catalogue.find((x) => x.id === id), st = appState(id);
  if (!a || !st.latest || !st.latest.handbook) return { ok: false, error: 'This app has no handbook on its release page yet.' };
  try {
    const file = await downloadVerified(st.latest.handbook, () => {});
    const err = await shell.openPath(file);
    return err ? { ok: false, error: err } : { ok: true };
  } catch (err) { return { ok: false, error: netMessage(err) }; }
}

// The Suite updates itself the same way: its installer, started with Windows' permission, closes this copy, installs
// the new version in the same folder and opens it (--force-run).
async function updateSuite() {
  if (suite.busy || !suite.latest || !isNewer(suite.latest.version, app.getVersion())) return status();
  suite.error = null;
  try {
    if (!app.isPackaged) throw new Error('This copy runs from its source code: update it with git.');
    if (!suite.latest.setup) throw new Error('The new version has no installer on its release page.');
    suite.busy = 'downloading'; send();
    const file = await downloadVerified(suite.latest.setup, (p) => { suite.progress = p; send(); });
    suite.busy = 'installing'; suite.progress = null; send();
    const code = await runElevated(file, ['--updated', '/S', '--force-run'], false);
    if (code === 1223) throw new Error('Windows did not get permission to install. Choose Update again and answer Yes.');
    quitting = true;
    setTimeout(() => app.quit(), 500);
  } catch (err) {
    suite.error = netMessage(err); suite.busy = null; suite.progress = null;
  }
  send();
  return status();
}

// ------------------------------------------------------------------------------------------------ what the window shows
function iconOf(a) {
  if (a.icon && fs.existsSync(path.join(__dirname, 'app', 'icons', a.icon))) return `icons/${a.icon}`;
  return /^https:\/\/raw\.githubusercontent\.com\//.test(a.iconUrl || '') ? a.iconUrl : 'brand/icon.svg';
}

function status() {
  const r = registration.read();
  return {
    version: app.getVersion(), packaged: app.isPackaged, justUpdated: JUST_UPDATED,
    user: r ? { name: r.name, email: r.email } : null,
    settings: { theme: theme(), auto: loadSettings().auto !== false, startup: loadSettings().startup !== false, notify: loadSettings().notify !== false },
    checking, checkError, checkedAt: loadSettings().checkedAt || 0,
    suite: { latest: suite.latest && { version: suite.latest.version, notes: suite.latest.notes, published: suite.latest.published, page: suite.latest.page },
      update: !!(suite.latest && isNewer(suite.latest.version, app.getVersion())), busy: suite.busy, progress: suite.progress, error: suite.error },
    apps: catalogue.map((a) => {
      const st = appState(a.id), l = st.latest;
      return { id: a.id, name: a.name, tagline: a.tagline || '', icon: iconOf(a), installed: st.installed && { version: st.installed.version, location: st.installed.location },
        running: st.running, update: hasUpdate(a.id), busy: st.busy, progress: st.progress, error: st.error, message: st.message || null,
        latest: l && { version: l.version, notes: l.notes, published: l.published, page: l.page, size: l.setup ? l.setup.size : 0,
          installer: !!l.setup, verified: !!(l.setup && l.setup.sha256 && l.setup.sha256 !== 'mismatch'), handbook: !!l.handbook } };
    }),
  };
}

let mainWin = null;
let tray = null;
let quitting = false;
let sendTimer = null;
function send() {
  if (sendTimer) return;
  sendTimer = setTimeout(() => { sendTimer = null; if (mainWin && !mainWin.isDestroyed()) mainWin.webContents.send('status', status()); }, 60);
}

function createMain(view) {
  const colors = TITLE_BAR[theme()];
  mainWin = new BrowserWindow({
    width: 1360, height: 860, minWidth: 1100, minHeight: 700, show: false, title: 'SCAFFApps Suite',
    icon: path.join(__dirname, 'app', 'icon.png'), backgroundColor: colors.color,
    titleBarStyle: 'hidden', titleBarOverlay: { ...colors, height: 44 },
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false, sandbox: true },
  });
  mainWin.setMenu(null);
  mainWin.loadFile(path.join(__dirname, 'app', 'index.html'), { query: { theme: theme(), view: view || '' } });
  mainWin.once('ready-to-show', () => { if (!STARTED_HIDDEN || view) mainWin.show(); });
  mainWin.on('close', (e) => {
    if (quitting) return;
    e.preventDefault();
    mainWin.hide();
    if (!loadSettings().toldTray && Notification.isSupported()) {
      new Notification({ title: 'The SCAFFApps Suite is still running', body: 'It waits in the tray and checks for updates. Right-click its icon to quit.', icon: path.join(__dirname, 'app', 'icon.png') }).show();
      loadSettings().toldTray = true; saveSettings();
    }
  });
  mainWin.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  mainWin.webContents.on('will-navigate', (e) => e.preventDefault());
}

function showMain(view) {
  if (!mainWin || mainWin.isDestroyed()) createMain(view);
  else { if (view) mainWin.webContents.send('go', view); if (mainWin.isMinimized()) mainWin.restore(); mainWin.show(); mainWin.focus(); }
}

function buildTray() {
  const img = nativeImage.createFromPath(path.join(__dirname, 'app', 'icon.png')).resize({ width: 32, height: 32, quality: 'best' });
  tray = new Tray(img);
  tray.setToolTip('SCAFFApps Suite');
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'Open SCAFFApps Suite', click: () => showMain() },
    { label: 'Check for updates', click: () => { showMain('updates'); checkAll(); } },
    { type: 'separator' },
    { label: 'Quit SCAFFApps Suite', click: () => { quitting = true; app.quit(); } },
  ]));
  tray.on('click', () => showMain());
}

function applyStartup() {
  if (!app.isPackaged) return;
  app.setLoginItemSettings({ openAtLogin: loadSettings().startup !== false, args: ['--hidden'] });
}

// ------------------------------------------------------------------------------------------------ requests from the window
ipcMain.handle('status', () => status());
ipcMain.handle('check', () => checkAll());
ipcMain.handle('install', (e, id) => install(String(id)));
ipcMain.handle('uninstall', (e, id) => uninstall(String(id)));
ipcMain.handle('open', (e, id) => { const a = catalogue.find((x) => x.id === id); return { ok: !!(a && openApp(a)) }; });
ipcMain.handle('handbook', (e, id) => openHandbook(String(id)));
ipcMain.handle('folder', (e, id) => { const st = appState(String(id)); if (st.installed) shell.openPath(st.installed.location); });
ipcMain.handle('release-page', (e, id) => {
  const page = id === 'suite' ? (suite.latest && suite.latest.page) || SUITE_PAGE : appState(String(id)).latest && appState(String(id)).latest.page;
  if (page && /^https:\/\/github\.com\//.test(page)) shell.openExternal(page);
});
ipcMain.handle('update-suite', () => updateSuite());
ipcMain.handle('setting', (e, key, value) => {
  const s = loadSettings();
  if (key === 'theme') {
    s.theme = value === 'light' ? 'light' : 'dark';
    if (mainWin && !mainWin.isDestroyed()) { const c = TITLE_BAR[s.theme]; mainWin.setTitleBarOverlay({ ...c, height: 44 }); mainWin.setBackgroundColor(c.color); }
  } else if (['auto', 'startup', 'notify'].includes(key)) {
    s[key] = !!value;
    if (key === 'startup') applyStartup();
  }
  saveSettings(); send();
  return status();
});

// ------------------------------------------------------------------------------------------------ start
app.on('before-quit', () => { quitting = true; });
app.on('window-all-closed', () => {});              // the tray keeps it running

if (app.hasSingleInstanceLock()) {
  app.whenReady().then(async () => {
    app.setAppUserModelId('com.scaffapps.suite');
    // the user's name and e-mail, asked once for every SCAFFApps app (registration.js); required, even when started hidden
    const who = await registration.ensure({ appId: 'suite', appName: 'SCAFFApps Suite', version: app.getVersion(),
      icon: path.join(__dirname, 'app', 'icon.png'), theme: theme() });
    if (!who) { quitting = true; app.quit(); return; }
    if (loadSettings().startupSet !== true) { loadSettings().startupSet = true; saveSettings(); applyStartup(); }
    buildTray();
    createMain(JUST_UPDATED ? 'updates' : '');
    await scan(); send();
    setTimeout(() => { if (loadSettings().auto !== false) checkAll({ quiet: true }); }, 4000);
    setInterval(() => { if (loadSettings().auto !== false) checkAll({ quiet: true }); }, CHECK_EVERY);
    setInterval(() => { if (!checking) scan().then(send); }, 15000);   // apps opened or closed meanwhile
  });
}
