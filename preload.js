// What the Suite's window may ask of main.js, and nothing else.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('suite', {
  status: () => ipcRenderer.invoke('status'),
  check: () => ipcRenderer.invoke('check'),
  install: (id) => ipcRenderer.invoke('install', id),
  uninstall: (id) => ipcRenderer.invoke('uninstall', id),
  open: (id) => ipcRenderer.invoke('open', id),
  handbook: (id) => ipcRenderer.invoke('handbook', id),
  folder: (id) => ipcRenderer.invoke('folder', id),
  releasePage: (id) => ipcRenderer.invoke('release-page', id),
  updateSuite: () => ipcRenderer.invoke('update-suite'),
  setting: (key, value) => ipcRenderer.invoke('setting', key, value),
  onStatus: (fn) => ipcRenderer.on('status', (e, s) => fn(s)),
  onGo: (fn) => ipcRenderer.on('go', (e, view) => fn(view)),
});
