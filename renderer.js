console.log("▶ renderer.js loaded");

window.addEventListener("DOMContentLoaded", async () => {
  console.log("▶ DOMContentLoaded in renderer");
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
    console.error("✖ window.electronAPI is not defined");
    return;
  } else {
    console.log("✔ window.electronAPI OK");
  }

  // 1) Button "Start System"
  startBtn.addEventListener("click", async () => {
    console.log("► Click on startButton");
    try {
      const res = await window.electronAPI.startAlerts();
      logMessage(res);
      logs.classList.remove("inactivo");
      logs.classList.add("activo");
    } catch (err) {
      console.error("✖ Error on startAlerts()", err);
    }
    startBtn.disabled = true;
    stopBtn.disabled = false;
  });

  // 2) Button "Stop System"
  stopBtn.addEventListener("click", async () => {
    console.log("► Click on stopButton");
    try {
      const res = await window.electronAPI.stopAlerts();
      logMessage(res);
      logs.classList.remove("activo");
      logs.classList.add("inactivo");
    } catch (err) {
      console.error("✖ Error on stopAlerts()", err);
    }
    startBtn.disabled = false;
    stopBtn.disabled = true;
  });

  // 3) Button "Close Application"
  exitBtn.addEventListener("click", () => {
    console.log("► Click on exitButton");
    window.electronAPI.send("exit-app");
  });

  // 4) Receive logs from main (stdout/stderr of index.js)
  window.electronAPI.onLog((message) => {
    const cleaned = message.trim();
    if (cleaned.length > 0) {
      console.log("◉ onLog callback:", cleaned);
      logMessage(cleaned);
    }
  });

  startBtn.disabled = false;
  stopBtn.disabled = true;

  logs.classList.add("inactivo");
});
