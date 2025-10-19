import { app, BrowserWindow, ipcMain, shell } from "electron";
import path from "path";
import { fileURLToPath } from "url";
import { spawn } from "child_process";
import yahooFinance from 'yahoo-finance2';
import fs from 'fs';
import dotenv from 'dotenv';

process.env.DEBUG = '';
process.env.DEBUG_LEVEL = 'NONE';

// Global yahoo-finance config
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

// Legacy stubs (to avoid errors if any renderer still calls them)
ipcMain.handle('get-user-assets', async () => {
  try {
    const { ASSETS } = await readAssetsModule();
    return ASSETS;
  } catch {
    return [];
  }
});

ipcMain.handle('save-assets', async () => {
  return { success: true };
});

// Reload renderer window on demand (light restart to refresh assets/UI)
ipcMain.handle('reload-app', async () => {
  try {
    const win = BrowserWindow.getAllWindows()?.[0];
    if (win && win.webContents) {
      if (typeof win.webContents.reloadIgnoringCache === 'function') {
        win.webContents.reloadIgnoringCache();
      } else {
        win.reload();
      }
    }
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
});
  
  if (typeof yahooFinance.suppressNotices === 'function') {
    yahooFinance.suppressNotices(['yahooSurvey']);
  }
} catch (error) {
  console.warn('Could not configure yahoo-finance2:', error.message);
}

// Function to read the .env file
const readEnvFile = () => {
  try {
    const envPath = path.join(__dirname, '.env');
    const exampleEnvPath = path.join(__dirname, '.env.example');
    
    // If .env doesn't exist but .env.example does, create .env from .env.example
    if (!fs.existsSync(envPath) && fs.existsSync(exampleEnvPath)) {
      fs.copyFileSync(exampleEnvPath, envPath);
    }
    
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf8');
      return dotenv.parse(envContent);
    }
    return {};
  } catch (error) {
    console.error('Error reading .env file:', error);
    return {};
  }
};

// Function to write to the .env file
const writeEnvFile = (config) => {
  try {
    const envPath = path.join(__dirname, '.env');
    let envContent = '';
    
    // Build the .env file content
    for (const [key, value] of Object.entries(config)) {
      // Escape quotes and newlines in values
      const escapedValue = String(value).replace(/[\n"]/g, (match) => 
        match === '\n' ? '\\n' : '\\"'
      );
      envContent += `${key}="${escapedValue}"\n`;
    }
    
    // Write the .env file
    fs.writeFileSync(envPath, envContent, 'utf8');
    
    // Reload environment variables
    dotenv.config({ path: envPath, override: true });
    
    return { success: true };
  } catch (error) {
    console.error('Error writing to .env file:', error);
    throw error;
  }
};

// IPC handlers for configuration
ipcMain.handle('read-env-file', async () => {
  return readEnvFile();
});

ipcMain.handle('write-env-file', async (_, config) => {
  return writeEnvFile(config);
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow;
let alertProcess = null;

// ───────────────────────────────────────────────────────────────────────
// assets.js read/write utilities
// ───────────────────────────────────────────────────────────────────────
const ASSETS_JS_PATH = path.join(__dirname, 'assets.js');

async function readAssetsModule() {
  const modPath = path.join(__dirname, 'assets.js').replace(/\\/g, '/');
  const url = `file://${modPath}?t=${Date.now()}`;
  const mod = await import(url);
  const STOCKS = Array.isArray(mod.STOCKS) ? mod.STOCKS : [];
  const CRYPTOS = Array.isArray(mod.CRYPTOS) ? mod.CRYPTOS : [];
  const ASSETS = Array.isArray(mod.ASSETS) ? mod.ASSETS : [...STOCKS, ...CRYPTOS];
  return { STOCKS, CRYPTOS, ASSETS };
}

function formatArray(name, arr) {
  const lines = (arr || [])
    .map(a => `  { symbol: "${a.symbol}", name: "${a.name}", type: "${a.type}" },`)
    .join('\n');
  return `export const ${name} = [\n${lines}\n];\n`;
}

function writeAssetsFile(stocks, cryptos) {
  const stocksArr = Array.isArray(stocks) ? stocks : [];
  const cryptosArr = Array.isArray(cryptos) ? cryptos : [];
  const header = '';
  const stocksBlock = formatArray('STOCKS', stocksArr);
  const cryptosBlock = `\n${formatArray('CRYPTOS', cryptosArr)}\n`;
  const tail = 'export const ASSETS = [...STOCKS, ...CRYPTOS];\n';
  const content = `${header}${stocksBlock}${cryptosBlock}${tail}`;
  fs.writeFileSync(ASSETS_JS_PATH, content, 'utf8');
}

// IPC: get-assets/add-asset/remove-asset
ipcMain.handle('get-assets', async () => {
  try {
    const { STOCKS, CRYPTOS, ASSETS } = await readAssetsModule();
    return { success: true, stocks: STOCKS, cryptos: CRYPTOS, assets: ASSETS };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('add-asset', async (_event, asset) => {
  try {
    const { symbol, name, type } = asset || {};
    if (!symbol || !name || !type) {
      return { success: false, error: 'Missing fields' };
    }
    const sym = String(symbol).trim();
    const nm = String(name).trim();
    const tp = String(type).trim();
    if (!sym || !nm || !tp) return { success: false, error: 'Invalid fields' };

    // Validate via Yahoo Finance
    try {
      const q = await yahooFinance.quote(sym);
      if (typeof q?.regularMarketPrice !== 'number') {
        return { success: false, error: 'Symbol not found on Yahoo Finance' };
      }
    } catch (e) {
      return { success: false, error: e.message };
    }

    const { STOCKS, CRYPTOS } = await readAssetsModule();
    const exists = [...STOCKS, ...CRYPTOS].some(a => String(a.symbol).toUpperCase() === sym.toUpperCase());
    if (exists) return { success: false, error: 'Symbol already exists' };

    if (tp === 'crypto') {
      const nextCryptos = [...CRYPTOS, { symbol: sym, name: nm, type: 'crypto' }];
      writeAssetsFile(STOCKS, nextCryptos);
    } else {
      const nextStocks = [...STOCKS, { symbol: sym, name: nm, type: 'stock' }];
      writeAssetsFile(nextStocks, CRYPTOS);
    }
    return { success: true, asset: { symbol: sym, name: nm, type: tp } };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('remove-asset', async (_event, symbol) => {
  try {
    if (!symbol) return { success: false, error: 'Invalid symbol' };
    const { STOCKS, CRYPTOS } = await readAssetsModule();
    const upper = String(symbol).toUpperCase();
    const nextStocks = STOCKS.filter(a => String(a.symbol).toUpperCase() !== upper);
    const nextCryptos = CRYPTOS.filter(a => String(a.symbol).toUpperCase() !== upper);
    if (nextStocks.length === STOCKS.length && nextCryptos.length === CRYPTOS.length) {
      return { success: false, error: 'Symbol not found' };
    }
    writeAssetsFile(nextStocks, nextCryptos);
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

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

/**
 * Get current price using direct fetch to Yahoo Finance API
 * Returns: { success: boolean, symbol: string, price: number | null, error?: string }
 */
ipcMain.handle('get-price', async (_event, symbol) => {
  if (!symbol || typeof symbol !== 'string') {
    return { success: false, symbol, price: null, error: 'Invalid symbol' };
  }
  
  try {
    // Use the v8/finance/chart endpoint for real-time data
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Accept': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    const result = data.chart.result?.[0];
    
    if (!result || !result.meta) {
      throw new Error('Invalid response format from Yahoo Finance');
    }
    
    const price = result.meta.regularMarketPrice;
    
    if (price == null) {
      return { 
        success: false, 
        symbol, 
        price: null, 
        error: 'No price data available' 
      };
    }
    
    return { 
      success: true, 
      symbol, 
      price 
    };
    
  } catch (err) {
    console.error(`Error fetching price for ${symbol}:`, err.message);
    return { 
      success: false, 
      symbol, 
      price: null, 
      error: `Failed to fetch price: ${err.message}` 
    };
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
