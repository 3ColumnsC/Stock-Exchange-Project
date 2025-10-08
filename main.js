// Keep the console clean by filtering out yahoo-finance2 debug noise
// const originalYF2ConsoleLog = console.log;
// const originalYF2ConsoleError = console.error;
// const originalYF2ConsoleWarn = console.warn;
// const originalYF2ConsoleDebug = console.debug;

// console.log = function(...args) {
//   const message = args[0];
//   if (typeof message === 'string' && message.includes('yahoo-finance2')) {
//     return;
//   }
//   originalYF2ConsoleLog.apply(console, args);
// };

// console.error = function(...args) {
//   const message = args[0];
//   if (typeof message === 'string' && message.includes('yahoo-finance2')) {
//     return;
//   }
//   originalYF2ConsoleError.apply(console, args);
// };

// console.warn = function(...args) {
//   const message = args[0];
//   if (typeof message === 'string' && message.includes('yahoo-finance2')) {
//     return;
//   }
//   originalYF2ConsoleWarn.apply(console, args);
// };

// console.debug = function(...args) {
//   const message = args[0];
//   if (typeof message === 'string' && message.includes('yahoo-finance2')) {
//     return;
//   }
//   originalYF2ConsoleDebug.apply(console, args);
// };

import { app, BrowserWindow, ipcMain, shell } from "electron";
import path from "path";
import fs from 'fs/promises';
import { fileURLToPath } from "url";
import { spawn } from "child_process";
import yahooFinance from 'yahoo-finance2';

// Configuración de yahoo-finance2
// Deshabilitar logs de depuración
process.env.DEBUG = '';
process.env.DEBUG_LEVEL = 'NONE';

// Configuración global de yahoo-finance2
try {
  yahooFinance.setGlobalConfig({
    queue: {
      concurrency: 1,
      timeout: 60000
    },
    validation: {
      logErrors: false,
      logOptionsErrors: false
    }
  });
  
  // Suprimir notificaciones no deseadas
  if (typeof yahooFinance.suppressNotices === 'function') {
    yahooFinance.suppressNotices(['yahooSurvey']);
  }
} catch (error) {
  console.warn('Could not configure yahoo-finance2:', error.message);
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow;
let alertProcess = null;

// Check if we're running in development mode
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

// Set up the main application window with all its settings
function createWindow() {
  mainWindow = new BrowserWindow({
    fullscreen: true,
    // These dimensions are used if the user exits fullscreen mode
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    autoHideMenuBar: true,
    show: false,
    backgroundColor: "#1e1e2f",
    icon: path.join(__dirname, "assets", "icon.ico", "icon.icns", "icon.png"),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: !isDev,
    },
  });

// Check if a stock symbol exists on Yahoo Finance
ipcMain.handle('validate-symbol', async (_event, symbol) => {
  try {
    if (!symbol || typeof symbol !== 'string') {
      return { success: false, error: 'Símbolo inválido' };
    }
    const quote = await yahooFinance.quote(symbol);
    const price = quote?.regularMarketPrice;
    if (typeof price === 'number') {
      return { success: true };
    }
    return { success: false, error: 'Símbolo no encontrado en Yahoo Finance' };
  } catch (err) {
    return { success: false, error: err.message };
  }
});



  // Load the application in the appropriate mode
  if (isDev) {
    // In development, connect to Vite's dev server
    mainWindow.loadURL('http://localhost:3000');
  } else {
    // In production, load the built files
    mainWindow.loadFile(path.join(__dirname, 'dist', 'index.html'));
  }

  // Show the window once everything is loaded
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Handle external links by opening them in the default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });
}

// Start the application when Electron is ready
app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Close variables
let isQuitting = false;

// Close handler
const handleAppQuit = async () => {
  if (isQuitting) return;
  isQuitting = true;
  
  console.log('Starting safe app shutdown...');
  
  try {
    // Notify the renderer process that the app is closing
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('app-will-quit');
      // Wait for the renderer process to receive the message
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    // Stop any alert process
    if (alertProcess) {
      console.log('Stopping alert process...');
      try {
        // Send a termination signal to the process
        alertProcess.kill('SIGTERM');
        // Wait for the process to close correctly
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        console.error('Error stopping alert process:', error);
      } finally {
        alertProcess = null;
      }
    }
    
    // Close all windows
    const windows = BrowserWindow.getAllWindows();
    for (const window of windows) {
      if (!window.isDestroyed()) {
        window.removeAllListeners();
        window.close();
      }
    }
    
    console.log('Resources released. Closing app...');
    
    // Force close after a timeout if necessary
    setTimeout(() => {
      console.log('Forcing app close...');
      app.exit(0);
    }, 2000);
    
  } catch (error) {
    console.error('Error during app shutdown:', error);
    app.exit(1);
  }
};

// Close handlers
app.on('window-all-closed', (event) => {
  event.preventDefault();
  handleAppQuit();
});

app.on('before-quit', (event) => {
  if (!isQuitting) {
    event.preventDefault();
    handleAppQuit();
    alertProcess.kill();
  }
});

// IPC handlers

// Start the background process that handles price alerts
ipcMain.handle('start-alerts', async () => {
  console.log('IPC received: start-alerts');
  
  if (alertProcess) {
    // Emit structured log for renderer i18n
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('alert-log', { code: 'ALERTS_ALREADY_RUNNING' });
    }
    return { success: false, message: '⚠️ The backend is already running.' };
  }

  try {
    const indexPath = path.join(__dirname, 'index.js');
    alertProcess = spawn(process.execPath, [indexPath], {
      cwd: __dirname,
      env: { ...process.env, NODE_ENV: isDev ? 'development' : 'production' },
    });

    alertProcess.stdout.on('data', (data) => {
      const chunk = data.toString();
      const lines = chunk.split(/\r?\n/);
      if (!mainWindow || mainWindow.isDestroyed()) return;

      // Helper that finds complete JSON objects in a string, even if they're mixed with other text
      const extractJsonSegments = (s) => {
        const segs = [];
        let depth = 0, inStr = false, esc = false, start = -1;
        for (let i = 0; i < s.length; i++) {
          const ch = s[i];
          if (inStr) {
            if (esc) { esc = false; continue; }
            if (ch === '\\') { esc = true; continue; }
            if (ch === '"') { inStr = false; continue; }
            continue;
          }
          if (ch === '"') { inStr = true; continue; }
          if (ch === '{') { if (depth === 0) start = i; depth++; continue; }
          if (ch === '}') { depth--; if (depth === 0 && start !== -1) { segs.push(s.slice(start, i + 1)); start = -1; } continue; }
        }
        return segs;
      };

      for (const rawLine of lines) {
        try {
          const line = rawLine.trim();
          if (!line) continue;
          // First try to parse the entire line as a single JSON object
          try {
            const obj = JSON.parse(line);
            mainWindow.webContents.send('alert-log', obj);
            continue;
          } catch {}

          // If that fails, look for JSON objects within the line
          const parts = extractJsonSegments(line);
          if (parts.length > 0) {
            // Send any text that appears before the first JSON object
            const firstIdx = line.indexOf(parts[0]);
            const leading = line.slice(0, firstIdx).trim();
            if (leading) mainWindow.webContents.send('alert-log', leading);

            // Only send successfully parsed objects to avoid polluting the UI
            for (const p of parts) {
              try {
                const obj = JSON.parse(p);
                mainWindow.webContents.send('alert-log', obj);
              } catch {
                // Skip any malformed JSON to keep the UI clean
              }
            }
          } else {
            // Fallback raw string
            mainWindow.webContents.send('alert-log', line);
          }
        } catch {}
      }
    });

    alertProcess.stderr.on('data', (data) => {
      const chunk = data.toString();
      const lines = chunk.split(/\r?\n/);
      for (const rawLine of lines) {
        const errorLine = rawLine.trim();
        if (!errorLine) continue;
        console.error('Error en el proceso de alertas:', errorLine);
        if (mainWindow && !mainWindow.isDestroyed()) {
          // Also emit a structured error code
          mainWindow.webContents.send('alert-log', { code: 'ALERT_PROCESS_ERROR', params: { error: errorLine } });
        }
      }
    });

    const handleAlertProcessExit = (code) => {
      console.log(`Alerts process exited with code ${code}`);
      if (mainWindow && !mainWindow.isDestroyed()) {
        try {
          mainWindow.webContents.send('alert-log', { code: 'ALERT_PROCESS_EXIT', params: { code } });
        } catch (error) {
          console.warn('Could not send alert process exit notification:', error);
        }
      }
      alertProcess = null;
    };

    if (alertProcess) {
      alertProcess.on('close', handleAlertProcessExit);
    }

    // Let the UI know the alerts are up and running
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('alert-log', { code: 'ALERTS_STARTED' });
    }
    return { success: true, message: '✅ Alert system started successfully' };
  } catch (error) {
    console.error('Error starting alert process:', error);
    return { success: false, message: `❌ Error starting alert system: ${error.message}` };
  }
});

// Stop the background alerts process
ipcMain.handle('stop-alerts', () => {
  console.log('IPC received: stop-alerts');
  
  if (alertProcess) {
    alertProcess.kill();
    alertProcess = null;
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('alert-log', { code: 'ALERTS_STOPPED' });
    }
    return { success: true, message: '🛑 Alert system stopped successfully' };
  }
  
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('alert-log', { code: 'ALERTS_NOT_RUNNING' });
  }
  return { success: false, message: '⚠️ Alert system not running' };
});

// Get the current app version
ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});

// Handle window control commands from the renderer
ipcMain.on('window-minimize', () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.on('window-maximize', () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  }
});

ipcMain.on('window-close', () => {
  if (mainWindow) mainWindow.close();
});

/** Obteain price (in USD) */
ipcMain.handle('get-price', async (_event, symbol) => {
  try {
    if (!symbol || typeof symbol !== 'string') {
      return { success: false, error: 'Invalid symbol' };
    }
    const quote = await yahooFinance.quote(symbol);
    const price = quote?.regularMarketPrice ?? null;
    return { success: true, symbol, price };
  } catch (err) {
    console.error('Error fetching price for', symbol, err);
    return { success: false, error: err.message };
  }
});

/** Receive the order to exit the app */
ipcMain.on("exit-app", () => {
  console.log("IPC received: exit-app");
  if (alertProcess) {
    alertProcess.kill();
    alertProcess = null;
  }
  app.quit();
});
