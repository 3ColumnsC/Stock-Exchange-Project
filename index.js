import dotenv from "dotenv";
import yahooFinance from "yahoo-finance2";
import fs from "fs/promises";
import path from "path";
import { Resend } from "resend";
import cron from "node-cron";
import { ASSETS } from "./assets.js";

dotenv.config();

// ───────────────────────────────────────────────────────────────────────
// 1. CONFIGURACIÓN Y CONSTANTES
// ───────────────────────────────────────────────────────────────────────

const {
  RESEND_API_KEY,
  ALERT_EMAIL,
  THRESHOLD,
  FROM_EMAIL,
  DISCORD_WEBHOOK_URL,
} = process.env;
const UMBRAL = parseFloat(THRESHOLD) || 5;
const resend = new Resend(RESEND_API_KEY);

const ALERT_CACHE_FILE = path.resolve("./alert_cache.json");
const LOG_DIR = path.resolve("./diary_logs");
const PRICE_DIR = path.resolve("./price_history");

yahooFinance.suppressNotices(["ripHistorical"]);

// ───────────────────────────────────────────────────────────────────────
// 2. UTILIDADES GENERALES
// ───────────────────────────────────────────────────────────────────────

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function esFinDeSemanaMadrid() {
  const now = new Date();
  const options = { timeZone: "Europe/Madrid", weekday: "short" };
  const dia = new Intl.DateTimeFormat("en-US", options).format(now);
  return dia === "Sat" || dia === "Sun";
}

function obtenerActivosFiltrados() {
  const esFin = esFinDeSemanaMadrid();
  return ASSETS.filter((asset) => {
    if (esFin && asset.type === "stock") return false;
    return true;
  });
}

// ───────────────────────────────────────────────────────────────────────
// 3. CACHÉ DE ALERTAS
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
  } catch {
    return { date: today, alerts: {} };
  }
}

async function saveAlertCache(cache) {
  await fs.writeFile(ALERT_CACHE_FILE, JSON.stringify(cache, null, 2), "utf-8");
}

function cleanOldAlertEntries(cache, maxAgeMs = 24 * 60 * 60 * 1000) {
  const now = Date.now();
  for (const symbol in cache.alerts) {
    if (now - cache.alerts[symbol] > maxAgeMs) {
      delete cache.alerts[symbol];
    }
  }
}

// ───────────────────────────────────────────────────────────────────────
// 4. LOGS
// ───────────────────────────────────────────────────────────────────────

function logPriceExecutionTime() {
  const ahora = new Date().toISOString().replace("T", " ").split(".")[0];
  const logPath = path.join("logs", "price_logs.txt");
  fs.appendFile(logPath, `📊 Precios ejecutados a las ${ahora}\n`).catch((err) => {
    console.error("Error guardando log de precios:", err);
  });
}

async function cleanupOldLogs() {
  try {
    await fs.mkdir(LOG_DIR, { recursive: true });
    const files = await fs.readdir(LOG_DIR);
    const ahora = Date.now();
    const limiteMs = 30 * 24 * 60 * 60 * 1000; // 30 días

    for (const file of files) {
      if (!file.endsWith(".log")) continue;
      const filePath = path.join(LOG_DIR, file);
      const stats = await fs.stat(filePath);
      if (ahora - stats.mtime.getTime() > limiteMs) {
        await fs.unlink(filePath);
        console.log(`🧹 Log antiguo eliminado: ${file}`);
      }
    }
  } catch (error) {
    console.error("❌ Error limpiando logs antiguos:", error.message);
  }
}

async function logAlert(symbol, name, changePct) {
  await cleanupOldLogs();
  const date = new Date().toISOString().split("T")[0];
  const logPath = path.join(LOG_DIR, `${date}.log`);
  const timeStr = new Date()
    .toLocaleTimeString("es-ES", { hour12: false })
    .split(" ")[0];
  const direccion = changePct > 0 ? "subió" : "bajó";
  const linea = `[${timeStr}] ${symbol} (${name}) ${direccion} ${Math.abs(
    changePct
  ).toFixed(2)}%\n`;

  await fs.mkdir(LOG_DIR, { recursive: true });
  await fs.appendFile(logPath, linea, "utf-8");
}

// ───────────────────────────────────────────────────────────────────────
// 5. GUARDADO DE HISTÓRICOS
// ───────────────────────────────────────────────────────────────────────

async function savePriceData(symbol, data) {
  try {
    await fs.mkdir(PRICE_DIR, { recursive: true });
    const preciosSimplificados = data.map((entry) => ({
      date: entry.date.toISOString().split("T")[0],
      close: entry.close,
    }));
    const filePath = path.join(PRICE_DIR, `${symbol}.json`);
    await fs.writeFile(filePath, JSON.stringify(preciosSimplificados, null, 2), "utf-8");
    console.log(`📁 Precios guardados para ${symbol}`);
  } catch (err) {
    console.error(`❌ Error guardando precios para ${symbol}:`, err.message);
  }
}

// ───────────────────────────────────────────────────────────────────────
// 6. ENVÍO DE ALERTAS
// ───────────────────────────────────────────────────────────────────────

async function sendEmail(name, symbol, changePct) {
  const templatePath = path.resolve("./email-template.html");
  let html = await fs.readFile(templatePath, "utf-8");

  const clase = changePct > 0 ? "highlight-up" : "highlight-down";
  const direccion = changePct > 0 ? "subió" : "bajó";
  const porcentaje = Math.abs(changePct).toFixed(2);

  html = html
    .replace(/{{TICKER}}/g, symbol)
    .replace(/{{CLASE}}/g, clase)
    .replace(/{{DIRECCION}}/g, direccion)
    .replace(/{{PORCENTAJE}}/g, porcentaje);

  const subject = `Alerta: ${name} (${symbol}) ${direccion} ${porcentaje}%`;

  try {
    const message = await resend.emails.send({
      from: FROM_EMAIL,
      to: ALERT_EMAIL,
      subject,
      html,
    });
    console.log(`  ✅ Correo enviado → ${subject} (id: ${message.id})`);
  } catch (error) {
    console.error("❌ Error enviando email:", error);
  }
}

async function sendDiscordAlert(name, symbol, changePct) {
  if (!DISCORD_WEBHOOK_URL) return;

  const direccion = changePct > 0 ? "📈 subió" : "📉 bajó";
  const porcentaje = Math.abs(changePct).toFixed(2);

  const ahora = new Date();
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
  const fechaHoraMadrid = formatter.format(ahora);

  const mensaje = `**${name} (${symbol})** ${direccion} un ${porcentaje}%\n🕒 Enviado: ${fechaHoraMadrid} (Madrid)`;

  try {
    await fetch(DISCORD_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: mensaje }),
    });
    console.log(`  ✅ Discord alert enviado → ${mensaje}`);
  } catch (err) {
    console.error("❌ Error enviando alerta a Discord:", err.message);
  }
}

// ───────────────────────────────────────────────────────────────────────
// 7. FETCH HISTÓRICO CON BACKOFF DINÁMICO
// ───────────────────────────────────────────────────────────────────────

/**
 * Intenta obtener histórico diario mínimo de 2 cierres, aumentando el rango hasta maxDays.
 * initialDays: días iniciales atrás (p.ej. 7). maxDays: máximo retroceso (p.ej. 60).
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
      // Asegurar orden ascendente por fecha
      data.sort((a, b) => new Date(a.date) - new Date(b.date));
      return data;
    }
    // Aumentar retroceso (doblar), pero no exceder maxDays
    daysBack = Math.min(daysBack * 2, maxDays + 1);
  }
  // Si no se logró ≥2 cierres, retornar lo obtenido (posiblemente <2)
  return [];
}

// ───────────────────────────────────────────────────────────────────────
// 8. LÓGICA PRINCIPAL DE CHEQUEO
// ───────────────────────────────────────────────────────────────────────

async function checkAsset(symbol, name, type, alertCache) {
  console.log(" - Consultando", symbol);
  const data = await fetchHistoricalWithBackoff(symbol, 7, 60);
  if (!data || data.length < 2) {
    console.log(`⚠️ ${symbol}: histórico insuficiente (menos de 2 cierres tras buscar hasta 60 días).`);
    return;
  }

  await savePriceData(symbol, data);

  const penultimo = data[data.length - 2];
  const ultimo = data[data.length - 1];
  if (penultimo.close == null || ultimo.close == null) {
    console.warn(`⚠️ Precio de cierre no disponible para ${symbol}`);
    return;
  }

  const cambioPct = ((ultimo.close - penultimo.close) / penultimo.close) * 100;
  if (Math.abs(cambioPct) >= UMBRAL) {
    if (alertCache.alerts[symbol]) {
      console.log(`ℹ️ ${symbol}: alerta ya enviada anteriormente.`);
      return;
    }
    await sendEmail(name, symbol, cambioPct);
    await sendDiscordAlert(name, symbol, cambioPct);
    await logAlert(symbol, name, cambioPct);
    alertCache.alerts[symbol] = Date.now();
  } else {
    console.log(`ℹ️ ${symbol}: cambio ${cambioPct.toFixed(2)}% < umbral ${UMBRAL}%`);
  }
}

async function fetchAndAlert() {
  logPriceExecutionTime();
  console.log(new Date().toLocaleString(), "▶ Iniciando verificación de precios…");

  const activosFiltrados = obtenerActivosFiltrados();
  if (activosFiltrados.length === 0) {
    console.log(
      "🛑 Bolsas cerradas por fin de semana: solo se examinarán criptomonedas."
    );
  }

  const alertCache = await loadAlertCache();
  cleanOldAlertEntries(alertCache);

  for (const { symbol, name, type } of activosFiltrados) {
    await checkAsset(symbol, name, type, alertCache);
    await delay(1000);
  }

  await saveAlertCache(alertCache);

  console.log("▶ Proceso de verificación completado correctamente");
  console.log("───────────────────────────────────────────────────────────────────────");
}

// ───────────────────────────────────────────────────────────────────────
// 9. ARRANQUE Y CRON
// ───────────────────────────────────────────────────────────────────────

// Primera ejecución al arrancar
fetchAndAlert().catch(console.error);

// Programar cada 5 minutos de lunes a viernes (Madrid)
// Ajusta la expresión cron u horas según prefieras (por ej. solo tras cierre).
cron.schedule(
  "*/5 * * * *",
  () => {
    console.log("\n⏰ Tarea programada (5 min): revisando precios…");
    fetchAndAlert().catch(console.error);
  },
);
