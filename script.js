// =============================================
// DEMO MODE CONFIGURATION
// =============================================
const DEMO_MODE = true;
const DEMO_CODE = "1234";
const ADMIN_PASSWORD = "1234";

// Configurazioni con valori di default
let MAX_CLICKS = parseInt(localStorage.getItem("max_clicks")) || 5;
let TIME_LIMIT_MINUTES =
  parseInt(localStorage.getItem("time_limit_minutes")) || 1;
let CORRECT_CODE = localStorage.getItem("secret_code") || DEMO_CODE;

// Variabili per l'orario di check-in (range)
let CHECKIN_START_TIME = localStorage.getItem("checkin_start_time") || "14:00";
let CHECKIN_END_TIME = localStorage.getItem("checkin_end_time") || "22:00";
let CHECKIN_TIME_ENABLED = localStorage.getItem("checkin_time_enabled");
if (CHECKIN_TIME_ENABLED === null) {
  CHECKIN_TIME_ENABLED = true;
} else {
  CHECKIN_TIME_ENABLED = CHECKIN_TIME_ENABLED === "true";
}

// Variabili di stato
let timeCheckInterval;
let currentDevice = null;

// Gestione versione codice
const CODE_VERSION_KEY = "code_version";
let currentCodeVersion = parseInt(localStorage.getItem(CODE_VERSION_KEY)) || 1;

// Dispositivi demo
const DEVICES = [
  {
    id: "demo-device-1",
    storage_key: "clicks_MainDoor",
    button_id: "MainDoor",
    visible: true,
  },
  {
    id: "demo-device-2",
    storage_key: "clicks_AptDoor",
    button_id: "AptDoor",
    visible: true,
  },
  {
    id: "demo-device-3",
    storage_key: "clicks_ExtraDoor1",
    button_id: "ExtraDoor1",
    visible: false,
  },
  {
    id: "demo-device-4",
    storage_key: "clicks_ExtraDoor2",
    button_id: "ExtraDoor2",
    visible: false,
  },
];

// =============================================
// FUNZIONI DI SUPPORTO PER DEMO
// =============================================

function demoSimulateCode() {
  document.getElementById("authCode").value = DEMO_CODE;
  handleCodeSubmit();
  showDemoNotification("Codice inserito: " + DEMO_CODE);
}

function demoReset() {
  // Resetta tutto il localStorage relativo all'app
  const keysToRemove = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (
      key.startsWith("clicks_") ||
      key === "usage_start_time" ||
      key === "usage_hash" ||
      key === "max_clicks" ||
      key === "time_limit_minutes" ||
      key === "secret_code" ||
      key === "code_version" ||
      key === "checkin_start_time" ||
      key === "checkin_end_time" ||
      key === "checkin_time_enabled"
    ) {
      keysToRemove.push(key);
    }
  }

  keysToRemove.forEach((key) => localStorage.removeItem(key));

  // Resetta l'interfaccia
  document.getElementById("controlPanel").style.display = "none";
  document.getElementById("authCode").style.display = "block";
  document.getElementById("auth-form").style.display = "block";
  document.getElementById("btnCheckCode").style.display = "block";
  document.getElementById("important").style.display = "block";
  document.getElementById("sessionExpired").classList.add("hidden");
  document.getElementById("expiredOverlay").classList.add("hidden");
  document.getElementById("authCode").value = "";

  // Ricarica le variabili con i valori di default
  MAX_CLICKS = 3;
  TIME_LIMIT_MINUTES = 50000;
  CORRECT_CODE = DEMO_CODE;
  CHECKIN_START_TIME = "14:00";
  CHECKIN_END_TIME = "22:00";
  CHECKIN_TIME_ENABLED = true;

  showDemoNotification("Demo resettata con successo");

  // Aggiorna lo stato dei pulsanti
  DEVICES.forEach(updateButtonState);
}

function demoExpireSession() {
  // Imposta il tempo di inizio a 24 ore fa per forzare la scadenza
  const yesterday = Date.now() - 24 * 60 * 60 * 1000;
  localStorage.setItem("usage_start_time", yesterday.toString());

  // Forza il controllo
  checkTimeLimit();
  showDemoNotification("Sessione scaduta simulata");
}

function showDemoNotification(message) {
  // Crea una notifica temporanea
  const notification = document.createElement("div");
  notification.textContent = message;
  notification.style.position = "fixed";
  notification.style.bottom = "20px";
  notification.style.left = "50%";
  notification.style.transform = "translateX(-50%)";
  notification.style.backgroundColor = "var(--demo)";
  notification.style.color = "white";
  notification.style.padding = "10px 20px";
  notification.style.borderRadius = "5px";
  notification.style.zIndex = "10000";
  notification.style.boxShadow = "0 3px 10px rgba(0,0,0,0.3)";

  document.body.appendChild(notification);

  // Rimuovi la notifica dopo 3 secondi
  setTimeout(() => {
    document.body.removeChild(notification);
  }, 3000);
}

// =============================================
// FUNZIONI DI STORAGE (localStorage e cookie)
// =============================================

function setStorage(key, value, minutes) {
  try {
    localStorage.setItem(key, value);
    const expirationDate = new Date();
    expirationDate.setTime(expirationDate.getTime() + minutes * 60 * 1000);
    const expires = "expires=" + expirationDate.toUTCString();
    document.cookie = `${key}=${value}; ${expires}; path=/; SameSite=Strict`;
  } catch (error) {
    console.error("Errore nel salvataggio dei dati:", error);
  }
}

function getStorage(key) {
  try {
    const localValue = localStorage.getItem(key);
    if (localValue !== null) return localValue;

    const cookies = document.cookie.split(";");
    for (let cookie of cookies) {
      const [name, value] = cookie.trim().split("=");
      if (name === key) return value;
    }
  } catch (error) {
    console.error("Errore nel recupero dei dati:", error);
  }
  return null;
}

function clearStorage(key) {
  try {
    localStorage.removeItem(key);
    document.cookie = `${key}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
  } catch (error) {
    console.error("Errore nella rimozione dei dati:", error);
  }
}

// =============================================
// FUNZIONI DI SICUREZZA E CRITTOGRAFIA
// =============================================

async function generateHash(str) {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

// =============================================
// GESTIONE TEMPO E SESSIONE
// =============================================

async function setUsageStartTime() {
  const now = Date.now().toString();
  const hash = await generateHash(now + "demo_secret_key");
  setStorage("usage_start_time", now, TIME_LIMIT_MINUTES);
  setStorage("usage_hash", hash, TIME_LIMIT_MINUTES);
}

async function checkTimeLimit() {
  const startTime = getStorage("usage_start_time");
  const storedHash = getStorage("usage_hash");

  if (!startTime || !storedHash) return false;

  // const calcHash = await generateHash(startTime + "demo_secret_key");
  // if (calcHash !== storedHash) {
  //   showFatalError("⚠️ Violazione di sicurezza rilevata!");
  //   return true;
  // }

  const now = Date.now();
  const minutesPassed = (now - parseInt(startTime, 10)) / (1000 * 60);

  if (minutesPassed >= TIME_LIMIT_MINUTES) {
    showSessionExpired();
    return true;
  }

  return false;
}

function showFatalError(message) {
  clearInterval(timeCheckInterval);
  document.body.innerHTML = `
                <div style="
                    position: fixed; top: 0; left: 0; width: 100%; height: 100vh;
                    display: flex; justify-content: center; align-items: center;
                    background: #121111; color: #ff6b6b; font-size: 24px; text-align: center;
                    padding: 20px; z-index: 9999;">
                    ${message}
                </div>`;
}

function showSessionExpired() {
  clearInterval(timeCheckInterval);

  document.getElementById("expiredOverlay").classList.remove("hidden");
  document.getElementById("controlPanel").classList.add("hidden");
  document.getElementById("sessionExpired").classList.remove("hidden");
  document.getElementById("test2").style.display = "none";

  DEVICES.forEach((device) => {
    const btn = document.getElementById(device.button_id);
    if (btn) {
      btn.disabled = true;
      btn.classList.add("btn-error");
    }
  });
}

// =============================================
// GESTIONE ORARIO DI CHECK-IN (RANGE)
// =============================================

/**
 * Verifica se l'orario corrente è nel range di check-in configurato
 * @returns {boolean} True se è possibile fare check-in
 */
function isCheckinTime() {
  // Se il controllo orario è disattivato, consentiamo sempre il check-in
  if (!CHECKIN_TIME_ENABLED) return true;

  const now = new Date();
  const currentHours = now.getHours();
  const currentMinutes = now.getMinutes();
  const currentTimeInMinutes = currentHours * 60 + currentMinutes;

  const [startHours, startMinutes] = CHECKIN_START_TIME.split(":").map(Number);
  const [endHours, endMinutes] = CHECKIN_END_TIME.split(":").map(Number);

  const startTimeInMinutes = startHours * 60 + startMinutes;
  const endTimeInMinutes = endHours * 60 + endMinutes;

  return (
    currentTimeInMinutes >= startTimeInMinutes &&
    currentTimeInMinutes <= endTimeInMinutes
  );
}

/**
 * Formatta l'orario per la visualizzazione
 * @param {string} timeString - Stringa orario nel formato "HH:MM"
 * @returns {string} Orario formattato
 */
function formatTime(timeString) {
  const [hours, minutes] = timeString.split(":");
  return `${hours}:${minutes}`;
}

/**
 * Aggiorna la visualizzazione del range orario di check-in
 */
function updateCheckinTimeDisplay() {
  const startEl = document.getElementById("checkinStartDisplay");
  const endEl = document.getElementById("checkinEndDisplay");
  const startPopup = document.getElementById("checkinStartPopup");
  const endPopup = document.getElementById("checkinEndPopup");
  const currentStart = document.getElementById("currentCheckinStartTime");
  const currentEnd = document.getElementById("currentCheckinEndTime");

  if (startEl) startEl.textContent = formatTime(CHECKIN_START_TIME);
  if (endEl) endEl.textContent = formatTime(CHECKIN_END_TIME);
  if (startPopup) startPopup.textContent = formatTime(CHECKIN_START_TIME);
  if (endPopup) endPopup.textContent = formatTime(CHECKIN_END_TIME);
  if (currentStart) currentStart.textContent = formatTime(CHECKIN_START_TIME);
  if (currentEnd) currentEnd.textContent = formatTime(CHECKIN_END_TIME);

  // Aggiorna lo stato corrente
  const statusElement = document.getElementById("currentTimeStatus");
  if (statusElement) {
    if (!CHECKIN_TIME_ENABLED) {
      statusElement.innerHTML =
        '<i class="fas fa-power-off" style="color:orange;"></i> Time control disabled — check-in allowed at any time';
    } else if (isCheckinTime()) {
      statusElement.innerHTML =
        '<i class="fas fa-check-circle" style="color:green;"></i> Check-in now available';
    } else {
      const now = new Date();
      const currentHours = now.getHours();
      const currentMinutes = now.getMinutes();
      const currentTimeInMinutes = currentHours * 60 + currentMinutes;

      const [startHours, startMinutes] =
        CHECKIN_START_TIME.split(":").map(Number);
      const [endHours, endMinutes] = CHECKIN_END_TIME.split(":").map(Number);

      const startTimeInMinutes = startHours * 60 + startMinutes;
      const endTimeInMinutes = endHours * 60 + endMinutes;

      if (currentTimeInMinutes < startTimeInMinutes) {
        // Prima dell'orario di inizio
        const timeDiff = startTimeInMinutes - currentTimeInMinutes;
        const hoursLeft = Math.floor(timeDiff / 60);
        const minutesLeft = timeDiff % 60;

        statusElement.innerHTML = `<i class="fas fa-clock" style="color:orange;"></i> Check-in will be available in ${hoursLeft}h ${minutesLeft}m`;
      } else {
        // Dopo l'orario di fine
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(startHours, startMinutes, 0, 0);

        const timeDiff = tomorrow - now;
        const hoursLeft = Math.floor(timeDiff / (1000 * 60 * 60));
        const minutesLeft = Math.floor(
          (timeDiff % (1000 * 60 * 60)) / (1000 * 60)
        );

        statusElement.innerHTML = `<i class="fas fa-clock" style="color:orange;"></i> Check-in will be available tomorrow in ${hoursLeft}h ${minutesLeft}m`;
      }
    }
  }
}

/**
 * Mostra il popup per check-in troppo presto
 */
function showEarlyCheckinPopup() {
  document.getElementById("earlyCheckinPopup").style.display = "flex";
}

/**
 * Chiude il popup per check-in troppo presto
 */
function closeEarlyCheckinPopup() {
  document.getElementById("earlyCheckinPopup").style.display = "none";
}

// =============================================
// GESTIONE INTERFACCIA E STATO
// =============================================

function getClicksLeft(key) {
  const stored = getStorage(key);
  return stored === null ? MAX_CLICKS : parseInt(stored, 10);
}

function setClicksLeft(key, count) {
  setStorage(key, count.toString(), TIME_LIMIT_MINUTES);
}

function updateButtonState(device) {
  const btn = document.getElementById(device.button_id);
  if (!btn) return;

  const clicksLeft = getClicksLeft(device.storage_key);
  btn.disabled = clicksLeft <= 0 || !isCheckinTime();

  if (clicksLeft <= 0) {
    btn.classList.add("btn-error");
    btn.classList.remove("btn-success");
  } else if (!isCheckinTime()) {
    btn.classList.remove("btn-error", "btn-success");
  } else {
    btn.classList.add("btn-success");
    btn.classList.remove("btn-error");
  }
}

function updateDoorVisibility() {
  DEVICES.forEach((device) => {
    const container = document.getElementById(`${device.button_id}Container`);
    if (container) {
      container.style.display = device.visible ? "block" : "none";
    }
  });
}

// =============================================
// GESTIONE POPUP E INTERAZIONI
// =============================================

function showConfirmationPopup(device) {
  // Verifica l'orario di check-in prima di mostrare la conferma
  if (!isCheckinTime()) {
    showEarlyCheckinPopup();
    return;
  }

  currentDevice = device;
  const doorName = device.button_id
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (str) => str.toUpperCase());

  document.getElementById(
    "confirmationMessage"
  ).textContent = `Are you sure you want to unlock the ${doorName}?`;
  document.getElementById("confirmationPopup").style.display = "flex";
}

function closeConfirmationPopup() {
  document.getElementById("confirmationPopup").style.display = "none";
  currentDevice = null;
}

function showDevicePopup(device, clicksLeft) {
  const popup = document.getElementById(`popup-${device.button_id}`);
  if (!popup) {
    console.error(`Popup per ${device.button_id} non trovato`);
    return;
  }

  const text = document.getElementById(`popup-text-${device.button_id}`);
  if (text) {
    if (clicksLeft > 0) {
      text.innerHTML = `
                        <i class="fas fa-check-circle" style="color:#4CAF50;font-size:2.5rem;margin-bottom:15px;"></i>
                        <div><strong>${clicksLeft}</strong> Click Left</div>
                        <div style="margin-top:10px;font-size:1rem;">Door Unlocked!</div>`;
    } else {
      text.innerHTML = `
                        <i class="fas fa-exclamation-triangle" style="color:#FFC107;font-size:2.5rem;margin-bottom:15px;"></i>
                        <div><strong>No more clicks left!</strong></div>
                        <div style="margin-top:10px;font-size:1rem;">Contact for Assistance.</div>`;
    }
  }

  popup.style.display = "flex";
  if (clicksLeft > 0) setTimeout(() => closePopup(device.button_id), 3000);
}

function closePopup(buttonId) {
  const popup = document.getElementById(`popup-${buttonId}`);
  if (popup) popup.style.display = "none";
}

// =============================================
// COMUNICAZIONE CON DISPOSITIVI (SIMULATA)
// =============================================

async function activateDevice(device) {
  if (await checkTimeLimit()) return;

  // Verifica l'orario di check-in
  if (!isCheckinTime()) {
    showEarlyCheckinPopup();
    return;
  }

  let clicksLeft = getClicksLeft(device.storage_key);
  if (clicksLeft <= 0) {
    showDevicePopup(device, clicksLeft);
    updateButtonState(device);
    return;
  }

  clicksLeft--;
  setClicksLeft(device.storage_key, clicksLeft);
  updateButtonState(device);

  // SIMULAZIONE PER DEMO (nessuna chiamata API reale)
  showDemoNotification("Simulazione apertura: " + device.button_id);

  // Mostra il popup dopo un breve ritardo per simulare l'attivazione
  setTimeout(() => {
    showDevicePopup(device, clicksLeft);
  }, 1000);
}

// =============================================
// GESTIONE AMMINISTRAZIONE
// =============================================

function showAdminPanel() {
  document.getElementById("adminLogin").style.display = "none";
  document.getElementById("adminPanel").style.display = "block";
  document.getElementById("currentCode").textContent = CORRECT_CODE;
  document.getElementById("currentCodeVersion").textContent =
    currentCodeVersion;
  document.getElementById("currentMaxClicks").textContent = MAX_CLICKS;
  document.getElementById("currentTimeLimit").textContent = TIME_LIMIT_MINUTES;
  document.getElementById("newMaxClicks").value = MAX_CLICKS;
  document.getElementById("newTimeLimit").value = TIME_LIMIT_MINUTES;

  // Imposta l'orario di check-in
  document.getElementById("checkinStartTime").value = CHECKIN_START_TIME;
  document.getElementById("checkinEndTime").value = CHECKIN_END_TIME;
  document.getElementById("currentCheckinStartTime").textContent =
    formatTime(CHECKIN_START_TIME);
  document.getElementById("currentCheckinEndTime").textContent =
    formatTime(CHECKIN_END_TIME);

  // Aggiorna stato del toggle (se presente)
  const btnToggle = document.getElementById("btnToggleCheckinTime");
  if (btnToggle) {
    if (CHECKIN_TIME_ENABLED) {
      btnToggle.textContent = "✅ Check-in Time ON";
      btnToggle.classList.remove("btn-error");
      btnToggle.classList.add("btn-success");
    } else {
      btnToggle.textContent = "❌ Check-in Time OFF";
      btnToggle.classList.remove("btn-success");
      btnToggle.classList.add("btn-error");
    }
  }
}

function handleAdminLogin() {
  const pass = document.getElementById("adminPass").value.trim();
  if (pass === ADMIN_PASSWORD) {
    showAdminPanel();
  } else {
    alert("Password admin errata! Usa 1122");
  }
}

function handleCodeUpdate() {
  const newCode = document.getElementById("newCode").value.trim();
  if (!newCode) {
    alert("Inserisci un codice valido");
    return;
  }

  CORRECT_CODE = newCode;
  localStorage.setItem("secret_code", newCode);
  currentCodeVersion += 1;
  localStorage.setItem(CODE_VERSION_KEY, currentCodeVersion.toString());

  document.getElementById("currentCode").textContent = CORRECT_CODE;
  document.getElementById("currentCodeVersion").textContent =
    currentCodeVersion;

  clearStorage("usage_start_time");
  clearStorage("usage_hash");
  DEVICES.forEach((device) => {
    clearStorage(device.storage_key);
  });

  document.getElementById("controlPanel").style.display = "none";
  document.getElementById("authCode").style.display = "block";
  document.getElementById("auth-form").style.display = "block";
  document.getElementById("btnCheckCode").style.display = "block";
  document.getElementById("important").style.display = "block";

  alert(
    "Codice aggiornato con successo! Tutti gli utenti dovranno inserire il nuovo codice."
  );
}

function handleSettingsUpdate() {
  const newMaxClicks = document.getElementById("newMaxClicks").value.trim();
  const newTimeLimit = document.getElementById("newTimeLimit").value.trim();

  if (!newMaxClicks || isNaN(newMaxClicks) || parseInt(newMaxClicks) <= 0) {
    alert("Inserisci un numero valido per i click massimi");
    return;
  }

  if (!newTimeLimit || isNaN(newTimeLimit) || parseInt(newTimeLimit) <= 0) {
    alert("Inserisci un numero valido per il tempo limite");
    return;
  }

  MAX_CLICKS = parseInt(newMaxClicks);
  TIME_LIMIT_MINUTES = parseInt(newTimeLimit);

  localStorage.setItem("max_clicks", MAX_CLICKS);
  localStorage.setItem("time_limit_minutes", TIME_LIMIT_MINUTES);

  DEVICES.forEach((device) => {
    const currentClicks = getClicksLeft(device.storage_key);
    if (currentClicks > MAX_CLICKS) {
      setClicksLeft(device.storage_key, MAX_CLICKS);
    }
    updateButtonState(device);
  });

  document.getElementById("currentMaxClicks").textContent = MAX_CLICKS;
  document.getElementById("currentTimeLimit").textContent = TIME_LIMIT_MINUTES;

  alert("Impostazioni aggiornate con successo!");
}

// FUNZIONE AGGIUNTA: Gestione orario di check-in (range)
function handleCheckinTimeUpdate() {
  const newCheckinStartTime = document.getElementById("checkinStartTime").value;
  const newCheckinEndTime = document.getElementById("checkinEndTime").value;

  if (!newCheckinStartTime || !newCheckinEndTime) {
    alert("Inserisci orari validi");
    return;
  }

  // Converti in minuti per il confronto
  const [startHours, startMinutes] = newCheckinStartTime.split(":").map(Number);
  const [endHours, endMinutes] = newCheckinEndTime.split(":").map(Number);

  const startTimeInMinutes = startHours * 60 + startMinutes;
  const endTimeInMinutes = endHours * 60 + endMinutes;

  // Verifica che l'orario di fine sia dopo l'orario di inizio
  if (endTimeInMinutes <= startTimeInMinutes) {
    document.getElementById("timeRangeError").style.display = "block";
    return;
  }

  document.getElementById("timeRangeError").style.display = "none";

  CHECKIN_START_TIME = newCheckinStartTime;
  CHECKIN_END_TIME = newCheckinEndTime;

  localStorage.setItem("checkin_start_time", newCheckinStartTime);
  localStorage.setItem("checkin_end_time", newCheckinEndTime);

  // Aggiorna la visualizzazione
  updateCheckinTimeDisplay();
  DEVICES.forEach(updateButtonState);

  alert("Orario di check-in aggiornato con successo!");
}

async function updateGlobalCodeVersion() {
  const savedVersion = parseInt(localStorage.getItem(CODE_VERSION_KEY)) || 1;
  if (savedVersion < currentCodeVersion) {
    localStorage.setItem(CODE_VERSION_KEY, currentCodeVersion.toString());

    clearStorage("usage_start_time");
    clearStorage("usage_hash");
    DEVICES.forEach((device) => {
      clearStorage(device.storage_key);
    });

    document.getElementById("controlPanel").style.display = "none";
    document.getElementById("authCode").style.display = "block";
    document.getElementById("auth-form").style.display = "block";
    document.getElementById("btnCheckCode").style.display = "block";
    document.getElementById("important").style.display = "block";

    return true;
  }
  return false;
}

// =============================================
// AUTENTICAZIONE UTENTE
// =============================================

async function handleCodeSubmit() {
  const insertedCode = document.getElementById("authCode").value.trim();
  if (insertedCode !== CORRECT_CODE) {
    alert("Codice errato! Riprova. Usa 2245 per la demo.");
    return;
  }

  await setUsageStartTime();
  if (await checkTimeLimit()) return;

  document.getElementById("controlPanel").style.display = "block";
  document.getElementById("authCode").style.display = "none";
  document.getElementById("auth-form").style.display = "none";
  document.getElementById("btnCheckCode").style.display = "none";
  document.getElementById("important").style.display = "none";

  // Mostra informazioni sull'orario di check-in
  document.getElementById("checkinTimeInfo").style.display = "block";
  updateCheckinTimeDisplay();

  DEVICES.forEach(updateButtonState);
}

// =============================================
// INIZIALIZZAZIONE DELL'APPLICAZIONE
// =============================================

async function init() {
  // Verifica se la versione del codice è cambiata
  const savedCodeVersion =
    parseInt(localStorage.getItem(CODE_VERSION_KEY)) || 1;
  if (savedCodeVersion < currentCodeVersion) {
    clearStorage("usage_start_time");
    clearStorage("usage_hash");
    DEVICES.forEach((device) => {
      clearStorage(device.storage_key);
    });
    localStorage.setItem(CODE_VERSION_KEY, currentCodeVersion.toString());

    document.getElementById("controlPanel").style.display = "none";
    document.getElementById("authCode").style.display = "block";
    document.getElementById("auth-form").style.display = "block";
    document.getElementById("btnCheckCode").style.display = "block";
    document.getElementById("important").style.display = "block";
  }

  // Configura gli event listener
  const btnCheck = document.getElementById("btnCheckCode");
  if (btnCheck) btnCheck.addEventListener("click", handleCodeSubmit);

  DEVICES.forEach((device) => {
    const btn = document.getElementById(device.button_id);
    if (btn) {
      btn.addEventListener("click", () => {
        showConfirmationPopup(device);
      });
    }
  });

  document.getElementById("confirmYes").addEventListener("click", () => {
    if (currentDevice) {
      activateDevice(currentDevice);
      closeConfirmationPopup();
    }
  });

  document
    .getElementById("confirmNo")
    .addEventListener("click", closeConfirmationPopup);

  document.querySelectorAll(".popup .btn").forEach((button) => {
    button.addEventListener("click", function () {
      const popup = this.closest(".popup");
      if (popup) {
        const id = popup.id.replace("popup-", "");
        closePopup(id);
      }
    });
  });

  const btnAdminLogin = document.getElementById("btnAdminLogin");
  if (btnAdminLogin) btnAdminLogin.addEventListener("click", handleAdminLogin);

  const btnCodeUpdate = document.getElementById("btnCodeUpdate");
  if (btnCodeUpdate) btnCodeUpdate.addEventListener("click", handleCodeUpdate);

  const btnSettingsUpdate = document.getElementById("btnSettingsUpdate");
  if (btnSettingsUpdate)
    btnSettingsUpdate.addEventListener("click", handleSettingsUpdate);

  // Event listener per il pulsante dell'orario di check-in
  const btnUpdateCheckinTime = document.getElementById("btnUpdateCheckinTime");
  if (btnUpdateCheckinTime) {
    btnUpdateCheckinTime.addEventListener("click", handleCheckinTimeUpdate);
  }

  // Toggle per abilitare/disabilitare il controllo orario
  const btnToggleCheckinTime = document.getElementById("btnToggleCheckinTime");
  if (btnToggleCheckinTime) {
    btnToggleCheckinTime.addEventListener("click", () => {
      CHECKIN_TIME_ENABLED = !CHECKIN_TIME_ENABLED;
      localStorage.setItem(
        "checkin_time_enabled",
        CHECKIN_TIME_ENABLED.toString()
      );

      if (CHECKIN_TIME_ENABLED) {
        btnToggleCheckinTime.textContent = "✅ Check-in Time ON";
        btnToggleCheckinTime.classList.remove("btn-error");
        btnToggleCheckinTime.classList.add("btn-success");
      } else {
        btnToggleCheckinTime.textContent = "❌ Check-in Time OFF";
        btnToggleCheckinTime.classList.remove("btn-success");
        btnToggleCheckinTime.classList.add("btn-error");
      }

      updateCheckinTimeDisplay();
      DEVICES.forEach(updateButtonState);
    });

    // Imposta stato iniziale del pulsante
    if (CHECKIN_TIME_ENABLED) {
      btnToggleCheckinTime.textContent = "✅ Check-in Time ON";
      btnToggleCheckinTime.classList.add("btn-success");
    } else {
      btnToggleCheckinTime.textContent = "❌ Check-in Time OFF";
      btnToggleCheckinTime.classList.add("btn-error");
    }
  }

  const expired = await checkTimeLimit();
  if (!expired) {
    const startTime = getStorage("usage_start_time");
    if (startTime) {
      document.getElementById("controlPanel").style.display = "block";
      document.getElementById("authCode").style.display = "none";
      document.getElementById("auth-form").style.display = "none";
      document.getElementById("btnCheckCode").style.display = "none";
      document.getElementById("important").style.display = "none";

      // Mostra informazioni sull'orario di check-in
      document.getElementById("checkinTimeInfo").style.display = "block";
      updateCheckinTimeDisplay();

      DEVICES.forEach(updateButtonState);
    }
  }

  timeCheckInterval = setInterval(async () => {
    const expired = await checkTimeLimit();
    if (!expired) {
      await updateGlobalCodeVersion();
      updateCheckinTimeDisplay();
    }
  }, 1000);

  // Aggiorna l'orario ogni minuto
  setInterval(updateCheckinTimeDisplay, 60000);

  document.addEventListener("contextmenu", (e) => e.preventDefault());

  const toggleBtn = document.getElementById("toggleAdmin");
  if (toggleBtn) {
    toggleBtn.addEventListener("click", () => {
      const adminArea = document.getElementById("adminArea");
      if (
        adminArea.style.display === "none" ||
        adminArea.style.display === ""
      ) {
        adminArea.style.display = "block";
      } else {
        adminArea.style.display = "none";
      }
    });
  }

  // Inizializza la visualizzazione dell'orario
  updateCheckinTimeDisplay();
  updateDoorVisibility();

  // Mostra notifica di demo
  setTimeout(() => {
    showDemoNotification(
      "Modalità demo attivata. Usa i controlli in alto a destra."
    );
  }, 1000);
}

// =============================================
// AVVIO DELL'APPLICAZIONE
// =============================================

document.addEventListener("DOMContentLoaded", init);
