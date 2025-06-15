import { app, BrowserWindow, ipcMain } from "electron";
import path from "path";
import { fileURLToPath } from "url";
import { spawn } from "child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow;
let alertProcess = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    fullscreen: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    },
    backgroundColor: "#1e1e2f"
  });

  mainWindow.loadFile(path.join(__dirname, "index.html"));
  // mainWindow.webContents.openDevTools(); // Descomentar para depurar en el main
}

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (alertProcess) {
    alertProcess.kill();
    alertProcess = null;
  }
  if (process.platform !== "darwin") app.quit();
});

/**
 * Arranca el backend (index.js) como proceso hijo.
 * Usamos process.execPath en lugar de "node" para evitar problemas con espacios en la ruta.
 */
ipcMain.handle("start-alerts", () => {
  console.log("IPC recibido: start-alerts");
  if (alertProcess) {
    return "⚠️ El backend ya está en marcha.";
  }

  const indexPath = path.join(__dirname, "index.js");
  alertProcess = spawn(process.execPath, [indexPath], {
    cwd: __dirname
  });

  alertProcess.stdout.on("data", (data) => {
    mainWindow.webContents.send("alert-log", data.toString());
  });
  alertProcess.stderr.on("data", (data) => {
    mainWindow.webContents.send("alert-log", `ERROR: ${data.toString()}`);
  });
  alertProcess.on("close", (code) => {
    mainWindow.webContents.send("alert-log", `Proceso de alertas finalizado (code: ${code})`);
    alertProcess = null;
  });
  alertProcess.on("error", (err) => {
    mainWindow.webContents.send("alert-log", `ERROR AL INICIAR: ${err.message}`);
    alertProcess = null;
  });

  return "🚀 Sistema de alertas iniciado.";
});

/**
 * Mata el proceso hijo del backend.
 */
ipcMain.handle("stop-alerts", () => {
  console.log("IPC recibido: stop-alerts");
  if (!alertProcess) {
    return "⚠️ No hay ningún backend corriendo.";
  }
  alertProcess.kill();
  alertProcess = null;
  return "⛔ Sistema de alertas detenido.";
});

/**
 * Recibe la orden de salir de la app.
 */
ipcMain.on("exit-app", () => {
  console.log("IPC recibido: exit-app");
  app.quit();
});
