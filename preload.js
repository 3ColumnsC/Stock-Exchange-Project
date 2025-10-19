const { contextBridge, ipcRenderer } = require("electron");

console.log("▶ preload.js loaded");

// Close variables
let isAppQuitting = false;

contextBridge.exposeInMainWorld('electronAPI', {
  // Configuración del entorno
  readEnvFile: () => ipcRenderer.invoke('read-env-file'),
  writeEnvFile: (config) => ipcRenderer.invoke('write-env-file', config),
  
  startAlerts: () => ipcRenderer.invoke('start-alerts'),
  stopAlerts: () => ipcRenderer.invoke('stop-alerts'),
  onAlertLog: (callback) => {
    const listener = (event, message) => callback(message);
    ipcRenderer.on('alert-log', listener);
    return () => ipcRenderer.removeListener('alert-log', listener);
  },
  removeAllAlertLogListeners: () => {
    ipcRenderer.removeAllListeners('alert-log');
  },
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),
  
  getConfig: () => ipcRenderer.invoke('get-config'),
  saveConfig: (config) => ipcRenderer.invoke('save-config', config),

  // Current price
  getPrice: (symbol) => ipcRenderer.invoke('get-price', symbol),

  validateSymbol: (symbol) => ipcRenderer.invoke('validate-symbol', symbol),
  // User assets management
  getUserAssets: () => ipcRenderer.invoke('get-user-assets'),
  addAsset: (asset) => ipcRenderer.invoke('add-asset', asset),
  removeAsset: (symbol) => ipcRenderer.invoke('remove-asset', symbol),
  saveAssets: (assets) => ipcRenderer.invoke('save-assets', assets),
  // Light reload of renderer to refresh UI after asset changes
  reloadApp: () => ipcRenderer.invoke('reload-app'),
  
  // Safe app shutdown
  onAppWillQuit: (callback) => {
    const listener = () => {
      isAppQuitting = true;
      callback();
    };
    ipcRenderer.on('app-will-quit', listener);
    return () => ipcRenderer.removeListener('app-will-quit', listener);
  },
  isAppQuitting: () => isAppQuitting
});

// Expose IPC methods for the renderer
contextBridge.exposeInMainWorld('ipcRenderer', {
  invoke: (channel, ...args) => ipcRenderer.invoke(channel, ...args),
  on: (channel, listener) => {
    const subscription = (event, ...args) => listener(event, ...args);
    ipcRenderer.on(channel, subscription);
    return () => ipcRenderer.removeListener(channel, subscription);
  },
  removeListener: (channel, listener) => {
    ipcRenderer.removeListener(channel, listener);
  },
  removeAllListeners: (channel) => {
    ipcRenderer.removeAllListeners(channel);
  }
});
