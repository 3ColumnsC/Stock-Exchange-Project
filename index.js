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
} = process.env;
const UMBRAL = parseFloat(THRESHOLD) || 5;
const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;

const ALERT_CACHE_FILE = path.resolve("./alert_cache.json");
const PRICE_DIR = path.resolve("./price_history");
const LOG_DIR = path.resolve("./diary_logs");
// Cache alerts for 6 hours before sending again for the same symbol
const ALERT_TTL_MS = 6 * 60 * 60 * 1000;

// Prevent multiple instances from running simultaneously
 let isRunning = false;

yahooFinance.suppressNotices(["ripHistorical"]);

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
  const today = new Date().toISOString().split("T")[0];
  try {
    const data = await fs.readFile(ALERT_CACHE_FILE, "utf-8");
    const parsed = JSON.parse(data);
    if (parsed.date !== today) {
      return { date: today, alerts: {} };
    }
    return parsed;
  } catch (error) {
    if (error.code !== 'ENOENT') {
      console.error('[ERROR] Failed to load alert cache:', error.message);
    }
    return { date: today, alerts: {} };
  }
}

async function saveAlertCache(cache) {
  try {
    await fs.writeFile(ALERT_CACHE_FILE, JSON.stringify(cache, null, 2), "utf-8");
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
    logCode('📧 Email alert disabled', { reason: 'missing_env_file_config' });
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
        username: "Alerts Bot",
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
    let data = [];
    try {
      data = await yahooFinance.historical(symbol, {
        period1: desde,
        period2: hasta,
        interval: "1d",
      });
    } catch (err) {
      console.error(`Error histórico ${symbol} con ${daysBack}d retroceso:`, err.message);
    }
    if (data && data.length >= 2) {
      // Make sure the data is in chronological order
      data.sort((a, b) => new Date(a.date) - new Date(b.date));
      return data;
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

async function checkAsset(symbol, name, type, alertCache) {
  logCode('CHECKING_SYMBOL', { symbol });
  const data = await fetchHistoricalWithBackoff(symbol, 7, 60);
  if (!data || data.length < 2) {
    logCode('INSUFFICIENT_HISTORY', { symbol });
    return;
  }

  await savePriceData(symbol, data);

  const penultimo = data[data.length - 2];
  const ultimo = data[data.length - 1];
  if (penultimo.close == null || ultimo.close == null) {
    console.warn(`⚠️ Price not available for ${symbol}`);
    return;
  }

  const cambioPct = ((ultimo.close - penultimo.close) / penultimo.close) * 100;
  if (Math.abs(cambioPct) >= UMBRAL) {
    if (alertCache.alerts[symbol]) {
      logCode('ALERT_ALREADY_SENT', { symbol });
      return;
    }
    await sendEmail(name, symbol, cambioPct, ultimo.close);
    await sendDiscordAlert(name, symbol, cambioPct);
    await logAlert(symbol, name, cambioPct);
    alertCache.alerts[symbol] = Date.now();
  } else {
    logCode('CHANGE_BELOW_THRESHOLD', { symbol, pct: cambioPct.toFixed(2), threshold: UMBRAL });
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

cron.schedule("*/5 * * * *", async () => {
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
