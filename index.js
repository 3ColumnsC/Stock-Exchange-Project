import dotenv from "dotenv";
import yahooFinance from "yahoo-finance2";
import fs from "fs/promises";
import path from "path";
import { Resend } from "resend";
import cron from "node-cron";
import { ASSETS } from "./assets.js";

dotenv.config();

// ───────────────────────────────────────────────────────────────────────
// Security and file utilities
// ───────────────────────────────────────────────────────────────────────

/**
 * Sanitizes a filename to prevent path injection
 * @param {string} input - Filename to sanitize
 * @returns {string} - Sanitized filename
 */
const sanitizeFilename = (input) => {
  if (typeof input !== 'string') return '';
  return input.replace(/[^a-z0-9\-_.]/gi, '_');
};

/**
 * Ensures a directory exists, creates it if it doesn't
 * @param {string} dirPath - Path to directory
 */
async function ensureDirectoryExists(dirPath) {
  try {
    await fs.access(dirPath);
  } catch {
    logCode('DIRECTORY_CREATED', { dirPath });
    await fs.mkdir(dirPath, { recursive: true });
  }
}

// ───────────────────────────────────────────────────────────────────────
// App configuration and environment setup
// ───────────────────────────────────────────────────────────────────────

const {
  RESEND_API_KEY,
  ALERT_EMAIL,
  THRESHOLD,
  FROM_EMAIL,
  DISCORD_WEBHOOK_URL,
  COOLDOWN_MINUTES,
  CHECK_INTERVAL_MINUTES,
} = process.env;
const UMBRAL = parseFloat(THRESHOLD) || 5;
const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;

const ALERT_CACHE_FILE = path.resolve("./alert_cache.json");
const PRICE_DIR = path.resolve("./price_history");
const LOG_DIR = path.resolve("./diary_logs");
// Cache alerts based on configurable cooldown (in minutes). Default: 360 (6 hours)
const parsedCooldown = parseInt(COOLDOWN_MINUTES, 10);
const ALERT_TTL_MS = (Number.isFinite(parsedCooldown) && parsedCooldown > 0 ? parsedCooldown : 360) * 60 * 1000;
logCode('MINUTES_REFRESH_CONFIG', { COOLDOWN_MINUTES: parsedCooldown });

// Determine check interval (minutes) and cron expression (allowed: 5..60)
let parsedCheckInterval = parseInt(CHECK_INTERVAL_MINUTES, 10);
if (!Number.isFinite(parsedCheckInterval)) parsedCheckInterval = 5;
// Clamp to range 5..60
if (parsedCheckInterval < 5) parsedCheckInterval = 5;
if (parsedCheckInterval > 60) parsedCheckInterval = 60;

// Snap to nearest multiple of 5 to avoid invalid cron steps
if (parsedCheckInterval % 5 !== 0) {
  const snapped = Math.min(60, Math.max(5, Math.round(parsedCheckInterval / 5) * 5));
  logCode('CHECK_INTERVAL_INVALID', { provided: CHECK_INTERVAL_MINUTES, using: snapped });
  parsedCheckInterval = snapped;
}

// Build cron expression. For <60 use */N; for 60 use hourly.
let CRON_EXPR = `*/${parsedCheckInterval} * * * *`;
if (parsedCheckInterval === 60) {
  CRON_EXPR = "0 * * * *";
}

logCode('CHECK_INTERVAL_CONFIG', { minutes: parsedCheckInterval, cron: CRON_EXPR });

// Prevent multiple instances from running simultaneously
 let isRunning = false;

// Guard: some versions of yahoo-finance2 do not expose suppressNotices
try {
  if (typeof yahooFinance.suppressNotices === 'function') {
    yahooFinance.suppressNotices(["ripHistorical"]);
  }
} catch (e) {
  console.warn('yahooFinance.suppressNotices unavailable:', e.message);
}

// ───────────────────────────────────────────────────────────────────────
// Core utilities and helpers
// ───────────────────────────────────────────────────────────────────────

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function obtenerActivosFiltrados() {
  // Skip weekend filtering for now, return all assets
  return [...ASSETS];
}

function logCode(code, params = {}) {
  try {
    console.log(JSON.stringify({ code, params }));
  } catch {
    // If JSON stringify fails, just ignore it
  }
}

// ───────────────────────────────────────────────────────────────────────
// Alert management and caching
// ───────────────────────────────────────────────────────────────────────

async function loadAlertCache() {
  try {
    const data = await fs.readFile(ALERT_CACHE_FILE, "utf-8");
    const parsed = JSON.parse(data);
    // Normalize legacy structure that had a { date, alerts } shape
    if (parsed && typeof parsed === 'object') {
      if (parsed.alerts && typeof parsed.alerts === 'object') {
        return { alerts: parsed.alerts };
      }
      if (parsed.alerts == null) {
        // If file already is just the alerts map
        return { alerts: parsed };
      }
    }
    return { alerts: {} };
  } catch (error) {
    if (error.code !== 'ENOENT') {
      console.error('[ERROR] Failed to load alert cache:', error.message);
    }
    return { alerts: {} };
  }
}

async function saveAlertCache(cache) {
  try {
    // Persist only the alerts map for simplicity and cross-day persistence
    const toSave = cache && cache.alerts ? cache.alerts : {};
    await fs.writeFile(ALERT_CACHE_FILE, JSON.stringify(toSave, null, 2), "utf-8");
  } catch (error) {
    console.error('[ERROR] Failed to save alert cache:', error.message);
    throw error;
  }
}

function cleanOldAlertEntries(cache, maxAgeMs = ALERT_TTL_MS) {
  const now = Date.now();
  for (const symbol in cache.alerts) {
    if (now - cache.alerts[symbol] > maxAgeMs) {
      delete cache.alerts[symbol];
    }
  }
}

// ───────────────────────────────────────────────────────────────────────
// Logging functionality
// ───────────────────────────────────────────────────────────────────────

async function logAlert(symbol, name, changePct) {
  try {
    const date = new Date().toISOString().split("T")[0];
    const safeSymbol = sanitizeFilename(symbol);
    const logPath = path.join(LOG_DIR, `${date}.log`);
    
    const timeStr = new Date()
      .toLocaleTimeString("en-US", { hour12: false })
      .split(" ")[0];
    const direction = changePct > 0 ? "↑" : "↓";
    const line = `[${timeStr}] ${safeSymbol} (${name}) ${direction} ${Math.abs(changePct).toFixed(2)}%\n`;

    await ensureDirectoryExists(LOG_DIR);
    await fs.appendFile(logPath, line, "utf-8");
  } catch (error) {
    console.error("[ERROR] Failed to save alert log:", error.message);
  }
}

// ───────────────────────────────────────────────────────────────────────
// Price history storage
// ───────────────────────────────────────────────────────────────────────

async function savePriceData(symbol, data) {
  try {
    const safeSymbol = sanitizeFilename(symbol);
    if (!safeSymbol) {
      throw new Error('Invalid symbol');
    }

    await ensureDirectoryExists(PRICE_DIR);
    const filePath = path.join(PRICE_DIR, `${safeSymbol}.json`);
    
    const simplifiedPrices = data.map((entry) => ({
      date: entry.date.toISOString().split("T")[0],
      close: entry.close,
    }));

    await fs.writeFile(filePath, JSON.stringify(simplifiedPrices, null, 2), "utf-8");
    logCode('PRICE_SAVED', { symbol: safeSymbol });
  } catch (error) {
    console.error(`[ERROR] Failed to save prices for ${symbol}:`, error.message);
    throw error;
  }
}

// ───────────────────────────────────────────────────────────────────────
// Alert notifications
// ───────────────────────────────────────────────────────────────────────

async function sendEmail(name, symbol, changePct, currentPrice) {
 if (!resend || !FROM_EMAIL || !ALERT_EMAIL) {
  // Primero mostramos el mensaje de cambio significativo
  logCode('CHANGE_ABOVE_THRESHOLD', { 
    symbol, 
    pct: changePct.toFixed(2), 
    threshold: UMBRAL,
    currentPrice: currentPrice.toFixed(2)
  });
  // Luego mostramos que el correo está deshabilitado
  logCode('EMAIL_ALERT_DISABLED');
  return;
}
  const templatePath = path.resolve("./email-template.html");
  let html = await fs.readFile(templatePath, "utf-8");

  const clase = changePct > 0 ? "highlight-up" : "highlight-down";
  const direccion = changePct > 0 ? "↑" : "↓";
  const porcentaje = Math.abs(changePct).toFixed(2);

  html = html
    .replace(/{{TICKER}}/g, symbol)
    .replace(/{{NAME}}/g, name)
    .replace(/{{CLASE}}/g, clase)
    .replace(/{{DIRECCION}}/g, direccion)
    .replace(/{{PORCENTAJE}}/g, porcentaje)
    .replace(/{{CURRENT_PRICE}}/g, Number(currentPrice).toFixed(2));

  const subject = `${name} (${symbol}) ${direccion} ${porcentaje}%`;

  try {
    const message = await resend.emails.send({
      from: FROM_EMAIL,
      to: ALERT_EMAIL,
      subject,
      html,
    });
    logCode('ALERT_SENT_EMAIL', { subject });
  } catch (error) {
    console.error("[ERROR] Failed to send email alert:", error.message);
  }
}

async function sendDiscordAlert(name, symbol, changePct) {
  if (!DISCORD_WEBHOOK_URL) return;

  const direction1 = changePct > 0 ? "📈 ↑" : "📉 ↓";
  const percentage1 = Math.abs(changePct).toFixed(2);

  const now1 = new Date();
  const formatter1 = new Intl.DateTimeFormat("es-ES", {
    timeZone: "Europe/Madrid",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const fechaHoraMadrid = formatter1.format(now1);

  const direction = changePct > 0 ? "📈 rose" : "📉 fell";
  const percentage = Math.abs(changePct).toFixed(2);

  const now = new Date();
  const formatter = new Intl.DateTimeFormat("es-ES", {
    timeZone: "Europe/Madrid",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const madridTime = formatter.format(now);

  const message = `**${name} (${symbol})** ${direction} ${percentage}%\n🕒 Sent: ${madridTime} (Madrid, Spain)`;

  try {
    await fetch(DISCORD_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        content: message,
      }),
    });
    logCode('ALERT_SENT_DISCORD');
  } catch (err) {
    console.error("[ERROR] Failed to send Discord alert:", err.message);
  }
}

// ───────────────────────────────────────────────────────────────────────
// Data fetching with retry logic
// ───────────────────────────────────────────────────────────────────────

/**
 * Attempts to obtain daily historical data with a minimum of 2 closes, increasing the range up to maxDays.
 * initialDays: initial days back (e.g. 7). maxDays: maximum lookback (e.g. 60).
 */
async function fetchHistoricalWithBackoff(symbol, initialDays = 7, maxDays = 60) {
  const hasta = new Date();
  let daysBack = initialDays;
  while (daysBack <= maxDays) {
    const desde = new Date(hasta);
    desde.setDate(hasta.getDate() - daysBack);
    let rows = [];
    try {
      // Use JSON Chart API to avoid CSV download cookie/crumb requirements
      const res = await yahooFinance.chart(symbol, {
        period1: desde,
        period2: hasta,
        interval: '1d',
      });
      const ts = res?.timestamp || res?.timestamps || res?.meta?.regularMarketTime ? res.timestamp : [];
      const quote = res?.indicators?.quote?.[0];
      const closes = quote?.close || [];
      if (Array.isArray(ts) && Array.isArray(closes) && ts.length === closes.length) {
        rows = ts.map((t, i) => ({ date: new Date(t * 1000), close: closes[i] }))
                 .filter((r) => Number.isFinite(r.close));
      }
    } catch (err) {
      console.error(`Error histórico ${symbol} con ${daysBack}d retroceso:`, err.message);
    }
    if (rows && rows.length >= 2) {
      // Ensure chronological order
      rows.sort((a, b) => new Date(a.date) - new Date(b.date));
      return rows;
    }
    // Double the lookback period, but don't exceed maxDays
    daysBack = Math.min(daysBack * 2, maxDays + 1);
  }
  // If we couldn't get at least 2 data points, return empty array
  return [];
}

// ───────────────────────────────────────────────────────────────────────
// Main checking logic
// ───────────────────────────────────────────────────────────────────────

// Helper function to fetch price data from Yahoo Finance API
async function fetchYahooPrice(symbol) {
  try {
    // First try the v8/finance/chart endpoint
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=7d`;
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
    
    if (!result || !result.meta || !result.timestamp) {
      throw new Error('Invalid response format from Yahoo Finance');
    }
    
    // Get the last two data points
    const timestamps = result.timestamp || [];
    const closes = result.indicators.quote?.[0]?.close || [];
    
    if (closes.length < 2) {
      throw new Error('Not enough data points');
    }
    
    return {
      last: closes[closes.length - 1],
      prev: closes[closes.length - 2],
      timestamp: new Date(timestamps[timestamps.length - 1] * 1000)
    };
  } catch (error) {
    console.error(`Error fetching data for ${symbol}:`, error.message);
    throw error;
  }
}

async function checkAsset(symbol, name, type, alertCache) {
  logCode('CHECKING_SYMBOL', { symbol });
  
  try {
    const { last, prev, timestamp } = await fetchYahooPrice(symbol);
    
    if (last == null || prev == null || prev === 0) {
      logCode('INSUFFICIENT_QUOTE_FIELDS', { 
        symbol,
        hasLast: last != null,
        hasPrev: prev != null,
        prevIsZero: prev === 0
      });
      return;
    }
    
    // Persist minimal price history for visibility
    const today = timestamp || new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    await savePriceData(symbol, [
      { date: yesterday, close: prev },
      { date: today, close: last },
    ]);
    
    const cambioPct = ((last - prev) / prev) * 100;
    
    if (Math.abs(cambioPct) >= UMBRAL) {
      if (alertCache.alerts[symbol]) {
        logCode('ALERT_ALREADY_SENT', { symbol });
        return;
      }
      
      await sendEmail(name, symbol, cambioPct, last);
      await sendDiscordAlert(name, symbol, cambioPct);
      await logAlert(symbol, name, cambioPct);
      alertCache.alerts[symbol] = Date.now();
    } else {
      logCode('CHANGE_BELOW_THRESHOLD', { 
        symbol, 
        pct: cambioPct.toFixed(2), 
        threshold: UMBRAL 
      });
    }
  } catch (err) {
    console.error(`Error processing ${symbol}:`, err.message);
    logCode('ASSET_PROCESS_ERROR', { 
      symbol, 
      error: err.message 
    });
  }
}

async function fetchAndAlert() {
  if (isRunning) {
    return;
  }
  isRunning = true;
  try {
    logCode('VERIFY_START');

    const activosFiltrados = obtenerActivosFiltrados();
    if (activosFiltrados.length === 0) {
      logCode('WEEKEND_NOTICE');
    }

    const alertCache = await loadAlertCache();
    cleanOldAlertEntries(alertCache, ALERT_TTL_MS);

    for (const { symbol, name, type } of activosFiltrados) {
      await checkAsset(symbol, name, type, alertCache);
      await delay(1000);
    }

    await saveAlertCache(alertCache);

    logCode('VERIFY_DONE');
    console.log("───────────────────────────────────────────────────────────────────────");
  } finally {
    isRunning = false;
  }
}

// ───────────────────────────────────────────────────────────────────────
// App initialization and scheduling
// ───────────────────────────────────────────────────────────────────────

// Run the fetchAndAlert function immediately when the app starts
fetchAndAlert().catch(console.error);

cron.schedule(CRON_EXPR, async () => {
  if (isRunning) {
    return;
  }
  
  try {
    logCode('CRON_TICK');
    await fetchAndAlert();
  } catch (error) {
    console.error("Error in cron tick:", error);
    isRunning = false;
  }
});
