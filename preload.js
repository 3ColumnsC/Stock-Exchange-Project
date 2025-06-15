const { contextBridge, ipcRenderer } = require("electron");

console.log("▶ preload.js cargado");

contextBridge.exposeInMainWorld("electronAPI", {
  startAlerts: () => {
    console.log("► electronAPI.startAlerts() llamado");
    return ipcRenderer.invoke("start-alerts");
  },
  stopAlerts: () => {
    console.log("► electronAPI.stopAlerts() llamado");
    return ipcRenderer.invoke("stop-alerts");
  },
  onLog: (callback) => {
    console.log("► electronAPI.onLog() registrado");
    ipcRenderer.on("alert-log", (_event, message) => callback(message));
  }
});

// Exponer canal para enviar mensajes genéricos (exit-app y select-asset)
contextBridge.exposeInMainWorld("electron", {
  send: (channel, data) => {
    ipcRenderer.send(channel, data);
  }
});
