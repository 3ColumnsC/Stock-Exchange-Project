console.log("▶ renderer.js cargado");

window.addEventListener("DOMContentLoaded", async () => {
  console.log("▶ DOMContentLoaded en renderer");
  console.log("   window.electronAPI =", window.electronAPI);

  const startBtn = document.getElementById("startButton");
  const stopBtn = document.getElementById("stopButton");
  const exitBtn = document.getElementById("exitButton");
  const logs = document.getElementById("logs");

  function logMessage(msg) {
    const ts = new Date().toLocaleTimeString();
    logs.textContent += `[${ts}] ${msg}\n`;
    logs.scrollTop = logs.scrollHeight;
  }

  if (!window.electronAPI) {
    console.error("✖ window.electronAPI NO está definido");
    return;
  } else {
    console.log("✔ window.electronAPI OK");
  }

  // 1) Botón “Iniciar Sistema”
  startBtn.addEventListener("click", async () => {
    console.log("► Click en startButton");
    try {
      const res = await window.electronAPI.startAlerts();
      logMessage(res);
      logs.classList.remove("inactivo");
      logs.classList.add("activo");
    } catch (err) {
      console.error("✖ Error en startAlerts()", err);
    }
    startBtn.disabled = true;
    stopBtn.disabled = false;
  });

  // 2) Botón “Detener Sistema”
  stopBtn.addEventListener("click", async () => {
    console.log("► Click en stopButton");
    try {
      const res = await window.electronAPI.stopAlerts();
      logMessage(res);
      logs.classList.remove("activo");
      logs.classList.add("inactivo");
    } catch (err) {
      console.error("✖ Error en stopAlerts()", err);
    }
    startBtn.disabled = false;
    stopBtn.disabled = true;
  });

  // 3) Botón “Cerrar Aplicación”
  exitBtn.addEventListener("click", () => {
    console.log("► Click en exitButton");
    window.electron.send("exit-app");
  });

  // 4) Recibir logs del main (stdout/stderr de index.js)
  window.electronAPI.onLog((message) => {
    const cleaned = message.trim();
    if (cleaned.length > 0) {
      console.log("◉ onLog callback:", cleaned);
      logMessage(cleaned);
    }
  });

  // Configuración inicial de botones
  startBtn.disabled = false;
  stopBtn.disabled = true;

  // Estado visual inicial
  logs.classList.add("inactivo");
});
