// SCAFFApps Suite: the window. Draws what main.js reports (window.suite.status / onStatus) and asks it to act.
'use strict';
const $ = (id) => document.getElementById(id);
const $$ = (sel) => [...document.querySelectorAll(sel)];
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const WORDS = ['No', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten'];
const word = (n) => WORDS[n] || String(n);
const MB = (b) => (b / 1048576).toFixed(1) + ' MB';
const day = (iso) => (iso ? new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '');
const shortDay = (iso) => (iso ? new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) : '');
const ago = (t) => { if (!t) return 'not yet'; const m = Math.round((Date.now() - t) / 60000); return m < 1 ? 'just now' : m < 60 ? `${m} min ago` : m < 1440 ? `${Math.round(m / 60)} h ago` : day(t); };
// the release notes' first paragraph: the lines under the heading, before the Downloads table (a sentence may wrap)
const intro = (notes) => {
  const lines = String(notes || '').split(/\r?\n/).map((l) => l.trim());
  const isText = (l) => l && !/^[#|>-]/.test(l) && !/^\*\*/.test(l);
  const at = lines.findIndex(isText);
  if (at < 0) return '';
  const para = [];
  for (let i = at; i < lines.length && isText(lines[i]); i++) para.push(lines[i]);
  return para.join(' ');
};

const ico = {
  refresh: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 12a8 8 0 1 1-2.34-5.66"/><path d="M20 4v5h-5"/></svg>',
  down: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4v11m0 0-4.5-4.5M12 15l4.5-4.5M5 20h14"/></svg>',
  more: '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="19" cy="12" r="1.8"/></svg>',
  ext: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/></svg>',
  warn: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 7.5v5.5M12 16.5v.01"/></svg>',
  check: '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>',
  sun: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M4.6 4.6 6 6M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4"/></svg>',
  moon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/></svg>',
  play: '<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M7 4.5v15a1 1 0 0 0 1.5.86l12.5-7.5a1 1 0 0 0 0-1.72L8.5 3.64A1 1 0 0 0 7 4.5z"/></svg>',
  star: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z"/></svg>',
  starOn: '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z"/></svg>',
  spin: '<svg class="spin-me" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M12 3a9 9 0 1 1-9 9"/></svg>',
};

let S = null;               // the latest status from main.js
let view = 'home';
const seen = {};            // messages and errors already shown as a toast

// ------------------------------------------------------------------------------------------------ pieces
// The window is drawn again on every report from main.js: several a second while an app downloads. A part of it is
// rewritten only when its HTML changed. Rewriting it on every report restarted what moves in it: the card under the
// pointer rose again and again (it shook), the spinner and the progress bar's stripes jumped back. The progress itself
// is set in place (fillProgress), so the HTML stays the same while it moves.
const drawn = new WeakMap();
function setHTML(el, html) {
  if (drawn.get(el) === html) return;
  el.innerHTML = html;
  drawn.set(el, html);
}
const part = (id) => ({ set html(v) { setHTML($(id), v); } });
const installedApps = () => S.apps.filter((a) => a.installed);
const updates = () => S.apps.filter((a) => a.update);
const busyText = { downloading: 'Downloading', closing: 'Closing it', installing: 'Installing', opening: 'Opening it again', uninstalling: 'Uninstalling' };
const STEPS = ['Download', 'Verify', 'Install', 'Open'];

// An app's progress: the frame here; its words, numbers, bar and steps are set by fillProgress.
function progHTML(a) {
  return `<div class="prog" data-prog="${a.id}"><div class="prog-top"><span class="what"></span><span class="mono num"></span></div>
    <div class="bar"><i></i></div>
    <div class="steps">${STEPS.map((s) => `<span>${s}</span>`).join('')}</div></div>`;
}

function fillProgress() {
  for (const el of $$('.prog[data-prog]')) {
    const a = S.apps.find((x) => x.id === el.dataset.prog);
    if (!a || !a.busy) continue;
    const p = a.progress, b = a.busy;
    const pct = b === 'downloading' && p && p.total ? Math.min(1, p.received / p.total) * .7 : b === 'closing' ? .74 : b === 'installing' ? .85 : b === 'opening' ? .97 : .05;
    const step = b === 'downloading' ? 0 : b === 'closing' ? 1 : b === 'installing' ? 2 : 3;
    const num = b === 'downloading' && p && p.total ? `${MB(p.received)} of ${MB(p.total)}` : b === 'installing' ? 'Windows asks once' : '';
    el.querySelector('.what').textContent = busyText[b] || 'Working';
    el.querySelector('.num').textContent = num;
    el.querySelector('.bar i').style.width = Math.round(pct * 100) + '%';
    el.querySelectorAll('.steps span').forEach((x, i) => { x.className = i < step ? 'done' : i === step ? 'now' : ''; });
  }
}

function chipHTML(a) {
  if (!a.installed) return a.latest ? `<span class="chip dim">${esc(a.latest.version)} available</span>` : '<span class="chip dim">not installed</span>';
  if (a.update) return `<span class="chip upd">${esc(a.latest.version)} ready</span>`;
  return a.latest ? `<span class="chip ok">${ico.check}Up to date</span>` : '';
}

// the star beside Open: an installed app marked as a favourite stands on the scaffold
const favHTML = (a) => `<button class="btn fav ${a.favourite ? 'on' : ''}" data-fav="${a.id}" title="${a.favourite ? 'Favourite: on the scaffold. Click to take it off' : 'Add to favourites: it stands on the scaffold'}">${a.favourite ? ico.starOn : ico.star}</button>`;

function cardHTML(a) {
  const status = a.busy ? `<div class="status"><span class="dot upd"></span><b>${a.installed ? 'Updating' : 'Installing'}</b></div>`
    : !a.installed ? `<div class="status"><span class="dot"></span>Not installed${a.latest && !a.latest.installer ? ' · its installer is coming' : ''}</div>`
    : a.running ? '<div class="status"><span class="dot run"></span><b>Running</b></div>' : '<div class="status"><span class="dot"></span>Not running</div>';
  let foot;
  if (a.busy) foot = progHTML(a);
  else if (!a.installed && a.latest && !a.latest.installer) foot = `<div class="card-foot"><button class="btn" data-page="${a.id}">${ico.ext}Get it from its release page</button></div>`;
  else if (!a.installed) foot = `<div class="card-foot"><button class="btn primary" data-install="${a.id}" ${a.latest ? '' : 'disabled'}>${ico.down}Install</button></div>`;
  else if (a.update) foot = `${a.running ? `<div class="caution">${ico.warn}<span>${esc(a.name)} will close, update and open again.</span></div>` : ''}
      <div class="card-foot"><button class="btn" data-open="${a.id}">${a.running ? 'Open' : ico.play + 'Open'}</button><button class="btn upd" data-install="${a.id}">${ico.down}Update</button>${favHTML(a)}</div>`;
  else foot = `<div class="card-foot"><button class="btn ${a.running ? '' : 'primary'}" data-open="${a.id}">${a.running ? 'Open' : ico.play + 'Open'}</button>${favHTML(a)}</div>`;
  const err = a.error ? `<div class="note bad">${esc(a.error)}</div>` : '';
  const showTag = !a.busy && !(a.update && a.running) && !a.error;
  return `<article class="card ${a.update ? 'has-update' : ''} ${a.installed ? '' : 'not-installed'}" data-app="${a.id}">
    <div class="card-top"><img class="app-ic" src="${esc(a.icon)}" alt=""><div><h3>${esc(a.name)}</h3>
      <div class="ver">${a.installed ? `<span class="mono">${esc(a.installed.version)}</span>` : ''}${chipHTML(a)}</div></div>
      <button class="icon-btn" data-menu="${a.id}" title="More">${ico.more}</button></div>
    ${showTag ? `<p class="tagline">${esc(a.tagline)}</p>` : ''}
    ${status}${err}${foot}</article>`;
}

// ------------------------------------------------------------------------------------------------ home
function renderHome() {
  const name = S.user ? S.user.name.split(' ')[0] : '';
  const h = new Date().getHours();
  $('greet').textContent = h < 5 ? 'Working late' : h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
  part('greetName').html = name ? `, <span class="gold">${esc(name)}.</span>` : '.';
  const inst = installedApps(), run = inst.filter((a) => a.running), up = updates(), busy = S.apps.find((a) => a.busy);
  const missing = S.apps.filter((a) => !a.installed);
  let s = inst.length ? `${word(inst.length)} app${inst.length > 1 ? 's' : ''} on this laptop, ${run.length ? word(run.length).toLowerCase() : 'none'} running. ` : 'No SCAFFApps apps on this laptop yet. ';
  if (busy) s += `<b>${esc(busy.name)}</b> is ${busy.installed ? 'updating' : 'installing'}; you can keep working.`;
  else if (S.checking) s += 'Checking for updates…';
  else if (up.length === 1) s += `<b>${esc(up[0].name)} ${esc(up[0].latest.version)}</b> is ready to install.`;
  else if (up.length) s += `<b>${word(up.length)} updates</b> are ready to install.`;
  else if (inst.length) s += 'Everything is up to date.';
  if (!busy && missing.length && missing.some((a) => a.latest && a.latest.installer)) s += ` ${missing.length === 1 ? esc(missing[0].name) + ' is' : word(missing.length) + ' more apps are'} one click away.`;
  part('heroSub').html = s;
  let acts;
  if (busy) acts = `<button class="btn upd lg" disabled>${ico.spin}${busy.installed ? 'Updating' : 'Installing'} ${esc(busy.name)}</button>`;
  else if (up.length) acts = `<button class="btn upd lg" data-updall>${ico.down}${up.length === 1 ? 'Update ' + esc(up[0].name) : 'Update all (' + up.length + ')'}</button>`;
  else if (inst.length) acts = `<button class="btn lg done">${ico.check} All up to date</button>`;
  else acts = '';
  acts += `<button class="btn ghost lg" data-checkall ${S.checking ? 'disabled' : ''}>${S.checking ? ico.spin : ico.refresh}Check for updates</button>`;
  part('heroActs').html = acts;

  // each 64px icon in the middle of its bay: between the uprights (x 96, 206, 316, 426, 536, 6 wide) and between
  // the ledger above (y 140, 6 wide) and the deck board below (top at y 241)
  // the favourites stand on it, one to a bay; with none, a sign in the bays says how to put one there
  const X = [119, 229, 339, 449], Y = 160;
  const favs = inst.filter((a) => a.favourite).slice(0, X.length);
  part('bays').html = favs.length ? favs.map((a, i) => `<g transform="translate(${X[i]},${Y})"><g class="bay ${a.running ? 'run' : ''}" data-app="${a.id}">
      <image href="${esc(a.icon)}" width="64" height="64"/><circle class="lamp" cx="61" cy="3" r="5"/>
      <title>${esc(a.name)} ${esc(a.installed.version)}</title></g></g>`).join('')
    : `<g class="fav-sign"><rect x="131" y="176" width="260" height="32" rx="9"/>
      <text x="261" y="196" text-anchor="middle">${inst.length ? 'Star an app on its card to keep it here' : 'Your favourite apps stand here'}</text></g>`;
  const n = up.length, green = !n && !busy, now = new Date();
  const fill = green ? '#2fb673' : '#F5C518', ink = green ? '#ffffff' : '#2B1640';
  const l1 = busy ? 'UPDATING' : green ? 'ALL UP' : `${n} UPDATE${n > 1 ? 'S' : ''}`, l2 = busy ? '· · ·' : green ? 'TO DATE' : 'READY';
  part('tag').html = `<rect x="17" y="152" width="70" height="88" rx="7" fill="${fill}"/>
    <circle cx="52" cy="161" r="4" fill="var(--bg)" stroke="${ink}" stroke-opacity=".35"/>
    <rect x="17" y="170" width="70" height="15" fill="${ink}" fill-opacity=".14"/>
    <text x="52" y="181" text-anchor="middle" font-size="7.5" font-weight="700" fill="${ink}" letter-spacing=".9">SCAFFTAG</text>
    <text x="52" y="203" text-anchor="middle" font-size="10" font-weight="800" fill="${ink}">${l1}</text>
    <text x="52" y="216" text-anchor="middle" font-size="10" font-weight="800" fill="${ink}">${l2}</text>
    <text x="52" y="233" text-anchor="middle" font-size="6.8" fill="${ink}" fill-opacity=".8">checked ${S.checkedAt ? new Date(S.checkedAt).toTimeString().slice(0, 5) : String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0')}</text>`;

  const q = $('q').value.trim().toLowerCase();
  const list = S.apps.filter((a) => !q || (a.name + ' ' + a.tagline).toLowerCase().includes(q));
  part('cards').html = list.map(cardHTML).join('')
    + (q ? '' : `<article class="card next"><div class="next-plus">+</div><h3>More apps are coming</h3>
      <p>New SCAFFApps apps appear here by themselves when they are released. Nothing is installed until you choose it.</p></article>`)
    + (q && !list.length ? `<div class="empty">No app called “${esc(q)}”.</div>` : '');

  const released = S.apps.filter((a) => a.latest).sort((x, y) => String(y.latest.published).localeCompare(String(x.latest.published)));
  part('news').html = released.length ? released.slice(0, 3).map((a) => `<div class="tl-item"><span class="d mono">${esc(shortDay(a.latest.published))}</span><img src="${esc(a.icon)}" alt="">
      <div><b>${esc(a.name)} ${esc(a.latest.version)}</b><p>${esc(intro(a.latest.notes))}</p></div>
      <button class="icon-btn" data-page="${a.id}" title="Release notes on GitHub">${ico.ext}</button></div>`).join('')
    : `<div class="empty-row">${S.checking ? 'Checking GitHub…' : 'Check for updates to see what is new.'}</div>`;
  const books = S.apps.filter((a) => a.latest && a.latest.handbook);
  part('bookList').html = books.length ? books.map((a) => `<div class="bk-item"><img src="${esc(a.icon)}" alt=""><div><b>${esc(a.name)} Handbook</b><span>PDF · for ${esc(a.latest.version)}</span></div>
      <button class="icon-btn" data-book="${a.id}" title="Open the handbook">${ico.ext}</button></div>`).join('')
    : `<div class="empty-row">${S.checking ? 'Checking GitHub…' : 'The handbooks are on each app’s release page.'}</div>`;
}

// ------------------------------------------------------------------------------------------------ my apps
function renderApps() {
  const inst = installedApps();
  $('appsSub').textContent = `${word(inst.length)} of ${word(S.apps.length).toLowerCase()} SCAFFApps apps on this laptop. Each keeps its own settings; the Suite installs, opens, updates and removes them.`;
  part('rows').html = `<div class="row head"><span></span><span>APP</span><span>VERSION</span><span>STATE</span><span>WHERE</span><span></span><span></span></div>`
    + S.apps.map((a) => `<div class="row" data-app="${a.id}"><img src="${esc(a.icon)}" alt=""><div><b>${esc(a.name)}</b><div class="sub">${esc(a.tagline).slice(0, 70)}${a.tagline.length > 70 ? '…' : ''}</div></div>
      <div>${a.installed ? `<span class="mono">${esc(a.installed.version)}</span>${a.update ? ` <span class="chip upd">${esc(a.latest.version)}</span>` : ''}` : '<span class="sub">—</span>'}</div>
      <div class="sub">${a.busy ? esc(busyText[a.busy] || '') : !a.installed ? 'Not installed' : a.running ? '<span class="dot run" style="display:inline-block;margin-right:6px"></span>Running' : 'Not running'}</div>
      <div class="path mono" title="${esc(a.installed ? a.installed.location : '')}">${a.installed ? esc(a.installed.location) : ''}</div>
      <div></div>
      <div class="acts">${a.busy ? ico.spin : !a.installed ? `<button class="btn primary" data-install="${a.id}" ${a.latest && a.latest.installer ? '' : 'disabled'}>Install</button>`
        : `${a.update ? `<button class="btn upd" data-install="${a.id}">Update</button>` : ''}<button class="btn" data-open="${a.id}">Open</button>`}<button class="icon-btn" data-menu="${a.id}">${ico.more}</button></div></div>`).join('');
}

// ------------------------------------------------------------------------------------------------ updates
function renderUpdates() {
  const up = updates();
  $('upSub').textContent = S.checking ? 'Checking GitHub for newer versions…'
    : `${up.length ? `${word(up.length)} update${up.length > 1 ? 's' : ''} ready.` : 'Everything installed is up to date.'} Checked ${ago(S.checkedAt)}.`;
  part('upActs').html = `<button class="btn ghost" data-checkall ${S.checking ? 'disabled' : ''}>${S.checking ? ico.spin : ico.refresh}Check now</button>`
    + (up.length ? `<button class="btn upd" data-updall>${ico.down}Update all (${up.length})</button>` : '');
  const su = S.suite;
  part('upSuite').html = `<div class="up-row"><img src="brand/icon.svg" alt=""><div><h4>SCAFFApps Suite ${su.update ? '<span class="chip upd">Update ready</span>' : su.latest ? `<span class="chip ok">${ico.check}Up to date</span>` : ''}</h4>
      <div class="meta">${su.update ? `<span class="mono">${esc(S.version)}</span><span class="arrow">→</span><span class="mono">${esc(su.latest.version)}</span> · released ${esc(day(su.latest.published))}`
        : `<span class="mono">${esc(S.version)}</span> · checks itself when it starts and once a day, and updates itself the same way it updates your apps.`}</div></div>
      <div class="r">${su.busy ? ico.spin : su.update ? `<button class="btn upd" data-suite-update>${ico.down}Update</button>` : ''}</div>
      ${su.update && su.latest ? `<div class="up-notes"><p>${esc(intro(su.latest.notes))}</p></div>` : ''}
      ${su.error ? `<div class="note bad">${esc(su.error)}</div>` : ''}</div>`;
  part('upApps').html = S.apps.map((a) => {
    const l = a.latest;
    const head = !a.installed ? `<span class="chip dim">Not installed</span>` : a.update ? '<span class="chip upd">Update ready</span>' : l ? `<span class="chip ok">${ico.check}Up to date</span>` : '';
    const meta = a.installed && a.update ? `<span class="mono">${esc(a.installed.version)}</span><span class="arrow">→</span><span class="mono">${esc(l.version)}</span>${l.size ? ' · ' + MB(l.size) : ''} · released ${esc(day(l.published))}`
      : l ? `<span class="mono">${esc(l.version)}</span> · released ${esc(day(l.published))}` : 'No release found yet.';
    const action = a.busy ? '' : a.update ? `<button class="btn upd" data-install="${a.id}">${ico.down}Update</button>`
      : !a.installed && l && l.installer ? `<button class="btn primary" data-install="${a.id}">${ico.down}Install</button>` : '';
    const noInstaller = l && !l.installer ? `<div class="note">This release has no installer the Suite can use. <button class="more" data-page="${a.id}">Open the release page →</button></div>` : '';
    return `<div class="up-row"><img src="${esc(a.icon)}" alt=""><div><h4>${esc(a.name)} ${head}</h4><div class="meta">${meta}</div></div>
      <div class="r">${l ? `<button class="btn ghost" data-page="${a.id}">${ico.ext}Notes</button>` : ''}${action}</div>
      ${a.busy ? progHTML(a) : ''}${l ? `<div class="up-notes"><p>${esc(intro(l.notes))}</p></div>` : ''}${noInstaller}
      ${a.error ? `<div class="note bad">${esc(a.error)}</div>` : ''}</div>`;
  }).join('');
}

// ------------------------------------------------------------------------------------------------ handbooks, settings, rail
const COVERS = ['linear-gradient(150deg,#5B2C83,#45215F)', 'linear-gradient(150deg,#45215F,#2B1640)', 'linear-gradient(150deg,#5B2C83,#2B1640)'];
function renderBooks() {
  part('books').html = S.apps.map((a, i) => `<div class="book"><div class="cover" style="background:${COVERS[i % 3]}"><img src="${esc(a.icon)}" alt="">
      <span class="k">SCAFFApps${a.latest ? ' · ' + esc(a.latest.version) : ''}</span><h3>${esc(a.name)}<span>Handbook</span></h3></div>
    <div class="foot"><span class="sub">${a.latest && a.latest.handbook ? 'PDF, with pictures' : 'Not published yet'}</span>
      <button class="btn" data-book="${a.id}" ${a.latest && a.latest.handbook ? '' : 'disabled'}>${ico.ext}Open</button></div></div>`).join('');
}

function renderSettings() {
  $$('[data-setting]').forEach((b) => b.classList.toggle('on', !!S.settings[b.dataset.setting]));
  $$('#seg button').forEach((b) => b.classList.toggle('on', b.dataset.t === S.settings.theme));
  $('regName').textContent = S.user ? S.user.name : '';
  $('regMail').textContent = S.user ? S.user.email : '';
  $('aboutVer').textContent = S.version;
}

function renderRail() {
  $('appCount').textContent = installedApps().length;
  const n = updates().length + (S.suite.update ? 1 : 0);
  $('upBadge').textContent = n; $('upBadge').hidden = !n;
  $('suiteVer').textContent = S.version;
  // the card's second line only when there is news: up to date says nothing, and while checking the arrow spins
  const say = S.suite.update ? `${S.suite.latest.version} is ready` : S.checkError && !S.checking ? 'Could not check' : '';
  $('suiteStRow').hidden = !say;
  $('suiteDot').style.background = S.suite.update ? 'var(--upd)' : 'var(--danger)';
  $('suiteSt').textContent = say;
  $('suiteCheck').classList.toggle('spin', !!S.checking);
  $('tbCheck').classList.toggle('spin', !!S.checking);
  $('who').textContent = S.user ? `Registered to ${S.user.name}` : '';
}

function render() {
  if (!S) return;
  renderRail(); renderHome(); renderApps(); renderUpdates(); renderBooks(); renderSettings();
  fillProgress();
  for (const a of S.apps) {                       // a finished install or a failure, said once
    if (a.message && seen['m' + a.id] !== a.message) { seen['m' + a.id] = a.message; if (seen.ready) toast(a.message, '', a.icon); }
    if (a.error && seen['e' + a.id] !== a.error) { seen['e' + a.id] = a.error; if (seen.ready) toast(`${a.name}`, a.error, a.icon); }
  }
  if (S.checkError && seen.check !== S.checkError) { seen.check = S.checkError; if (seen.ready) toast('Could not check for updates', S.checkError); }
  seen.ready = true;
}

// ------------------------------------------------------------------------------------------------ toasts, menus, dialogs
function toast(title, text, icon) {
  const el = document.createElement('div'); el.className = 'toast';
  el.innerHTML = `<img src="${esc(icon || 'brand/icon.svg')}" alt=""><div class="t"><b>${esc(title)}</b>${text ? `<span>${esc(text)}</span>` : ''}</div>`;
  $('toasts').appendChild(el);
  setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 260); }, 5200);
}

function closeMenu() { $$('.menu').forEach((m) => m.remove()); }
function openMenu(btn, id) {
  closeMenu();
  const a = S.apps.find((x) => x.id === id); if (!a) return;
  const m = document.createElement('div'); m.className = 'menu';
  m.innerHTML = (a.installed ? `<button data-open="${id}">Open ${esc(a.name)}</button><button data-fav="${id}">${a.favourite ? 'Remove from favourites' : 'Add to favourites'}</button>`
      : `<button data-install="${id}" ${a.latest && a.latest.installer ? '' : 'disabled'}>Install ${esc(a.name)}</button>`)
    + `<button data-page="${id}">Release notes</button><button data-book="${id}">Handbook</button>`
    + (a.installed ? `<button data-folder="${id}">Open its folder</button><hr><button class="danger" data-uninstall="${id}">Uninstall…</button>` : '');
  const r = btn.getBoundingClientRect();
  m.style.left = Math.max(8, r.right - 214) + 'px'; m.style.top = (r.bottom + 6) + 'px';
  document.body.appendChild(m);
}

function confirmBox(title, text, yes) {
  return new Promise((resolve) => {
    const back = document.createElement('div'); back.className = 'modal-back';
    back.innerHTML = `<div class="modal"><h3>${esc(title)}</h3><p>${esc(text)}</p><div class="acts"><button class="btn" data-no>Cancel</button><button class="btn danger" data-yes>${esc(yes)}</button></div></div>`;
    back.addEventListener('click', (e) => { if (e.target === back || e.target.closest('[data-no]')) { back.remove(); resolve(false); } if (e.target.closest('[data-yes]')) { back.remove(); resolve(true); } });
    document.body.appendChild(back);
  });
}

function go(v) {
  view = ['home', 'apps', 'updates', 'books', 'settings'].includes(v) ? v : 'home';
  $$('.nav button').forEach((b) => b.classList.toggle('on', b.dataset.view === view));
  $$('.view').forEach((s) => s.classList.toggle('on', s.id === 'v-' + view));
  $('main').scrollTop = 0; closeMenu();
}

function setTheme(t) {
  document.documentElement.dataset.theme = t;
  $('tbTheme').innerHTML = t === 'dark' ? ico.sun : ico.moon;
  $('tbTheme').title = t === 'dark' ? 'Switch to light appearance' : 'Switch to dark appearance';
}

const take = (p) => p.then((s) => { if (s && s.apps) { S = s; render(); } return s; });

// ------------------------------------------------------------------------------------------------ clicks
document.addEventListener('click', async (e) => {
  const t = e.target.closest('button,[data-app]');
  if (!t) { closeMenu(); return; }
  const d = t.dataset;
  if (d.menu) { e.stopPropagation(); openMenu(t, d.menu); return; }
  closeMenu();
  if (t.disabled) return;
  if (d.view) return go(d.view);
  if (d.install) { go(view === 'home' || view === 'apps' || view === 'updates' ? view : 'home'); return take(window.suite.install(d.install)); }
  if ('updall' in d) { for (const a of updates()) await take(window.suite.install(a.id)); return; }
  if ('checkall' in d) return take(window.suite.check());
  if ('suiteUpdate' in d) return take(window.suite.updateSuite());
  if (d.fav) { const a = S.apps.find((x) => x.id === d.fav); return take(window.suite.favourite(d.fav, !(a && a.favourite))); }
  if (d.open) { const r = await window.suite.open(d.open); if (!r.ok) toast('Could not open it', 'It may have been moved or removed. Check for updates to look again.'); return; }
  if (d.book) { toast('Opening the handbook…', 'It is downloaded the first time, then opens in your PDF reader.'); const r = await window.suite.handbook(d.book); if (!r.ok) toast('The handbook did not open', r.error); return; }
  if (d.page) return window.suite.releasePage(d.page);
  if (d.folder) return window.suite.folder(d.folder);
  if (d.uninstall) {
    const a = S.apps.find((x) => x.id === d.uninstall);
    if (await confirmBox(`Uninstall ${a.name}?`, `${a.name} is removed from this laptop${a.running ? ' (it is closed first)' : ''}. Its own settings and saved files are kept. Windows asks for permission.`, 'Uninstall')) take(window.suite.uninstall(a.id));
    return;
  }
  if (d.setting) return take(window.suite.setting(d.setting, !t.classList.contains('on')));
  if (d.t) { setTheme(d.t); return take(window.suite.setting('theme', d.t)); }
  if (t.id === 'tbTheme') { const n = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'; setTheme(n); return take(window.suite.setting('theme', n)); }
  if (t.id === 'tbCheck' || t.id === 'suiteCheck') return take(window.suite.check());
  if (t.classList.contains('bay') && d.app) { go('home'); const c = document.querySelector(`.card[data-app="${d.app}"]`); if (c) c.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
});
document.addEventListener('mouseover', (e) => {
  const el = e.target.closest('[data-app]'); $$('.hot').forEach((x) => x.classList.remove('hot'));
  if (el) $$(`[data-app="${el.dataset.app}"]`).forEach((x) => { if (x !== el) x.classList.add('hot'); });
});
document.addEventListener('keydown', (e) => {
  if (e.ctrlKey && e.key.toLowerCase() === 'k') { e.preventDefault(); $('q').focus(); }
  if (e.key === 'Escape') { closeMenu(); $('q').value = ''; render(); }
});
$('q').addEventListener('input', () => { go('home'); render(); });

// ------------------------------------------------------------------------------------------------ start
setTheme(document.documentElement.dataset.theme);
window.suite.onStatus((s) => { S = s; render(); });
window.suite.onGo((v) => go(v));
const startView = new URLSearchParams(location.search).get('view');
take(window.suite.status()).then(() => { if (startView) go(startView); });
setInterval(() => { if (S) { renderRail(); } }, 60000);   // "checked 3 min ago"
