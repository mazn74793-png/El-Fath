// Electron Preload Script
// Used for secure context isolation and exposing native client interfaces safely
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Add custom desktop features here if needed in the future (e.g. printing, fiscal registries, physical cash drawer trigger)
  isDesktop: true,
  ping: () => ipcRenderer.invoke('ping')
});
