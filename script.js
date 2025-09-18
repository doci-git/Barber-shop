// =============================================
// DEMO MODE CONFIGURATION - NO LOCALSTORAGE
// =============================================
const DEMO_MODE = true;
const DEMO_CODE = "1234";
const ADMIN_PASSWORD = "1234";

// Configurazioni con valori di default (in memoria)
let MAX_CLICKS = 2;
let TIME_LIMIT_MINUTES = 2;
let CORRECT_CODE = DEMO_CODE;

// Variabili per l'orario di check-in (range)
let CHECKIN_START_TIME = "14:00";
let CHECKIN_END_TIME = "22:00";
let CHECKIN_TIME_ENABLED = true;

// Stato dell'applicazione (in memoria invece di localStorage)
let appState = {
  usageStartTime: null,
  clicks: {
    MainDoor: MAX_CLICKS,
    AptDoor: MAX_CLICKS,
    ExtraDoor1: MAX_CLICKS,
    ExtraDoor2: MAX_CLICKS,
  },
  codeVersion: 1,
};

// Variabili di stato
let timeCheckInterval;
let currentDevice = null;

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
// FUNZIONI DI SUPPORTO PER DEMO (MIGLIORATE)
// =============================================

function demoSimulateCode() {
  document.getElementById("authCode").value = DEMO_CODE;
  handleCodeSubmit();
  showDemoNotification("Codice inserito: " + DEMO_CODE);
}

function demoAddClicks() {
  DEVICES.forEach((device) => {
    if (appState.clicks[device.button_id] !== undefined) {
      appState.clicks[device.button_id] += 2;
      updateButtonState(device);
    }
  });
  showDemoNotification("+2 click aggiunti a tutte le porte");
}

function demoExtendTime() {
  TIME_LIMIT_MINUTES += 30;

  // Se c'è una sessione attiva, estendi il tempo
  if (appState.usageStartTime) {
    const now = Date.now();
    const elapsed = (now - appState.usageStartTime) / (1000 * 60);
    const remaining = TIME_LIMIT_MINUTES - elapsed;

    if (remaining > 0) {
      showDemoNotification(
        `Tempo esteso: ${Math.round(remaining)} minuti rimanenti`
      );
    } else {
      showDemoNotification("Tempo esteso di 30 minuti");
    }
  } else {
    showDemoNotification(
      "Tempo limite esteso a " + TIME_LIMIT_MINUTES + " minuti"
    );
  }
}

function forceReset() {
  demoReset();
}

function demoReset() {
  // Resetta tutto lo stato
  MAX_CLICKS = 2;
  TIME_LIMIT_MINUTES = 2;
  CORRECT_CODE = DEMO_CODE;
  CHECKIN_START_TIME = "14:00";
  CHECKIN_END_TIME = "22:00";
  CHECKIN_TIME_ENABLED = true;
location.reload();

  appState = {
    usageStartTime: null,
    clicks: {
      MainDoor: MAX_CLICKS,
      AptDoor: MAX_CLICKS,
      ExtraDoor1: MAX_CLICKS,
      ExtraDoor2: MAX_CLICKS,
    },
    codeVersion: 1,
  };

  // Resetta l'interfaccia
  document.getElementById("controlPanel").style.display = "none";
  document.getElementById("authCode").style.display = "block";
  document.getElementById("auth-form").style.display = "block";
  document.getElementById("btnCheckCode").style.display = "block";
  document.getElementById("important").style.display = "block";
  document.getElementById("sessionExpired").classList.add("hidden");
  document.getElementById("expiredOverlay").classList.add("hidden");
  document.getElementById("authCode").value = "";

  // Aggiorna lo stato dei pulsanti
  DEVICES.forEach(updateButtonState);

  // Aggiorna pannello admin se visibile
  if (document.getElementById("adminPanel").style.display === "block") {
    document.getElementById("currentCode").textContent = CORRECT_CODE;
    document.getElementById("currentMaxClicks").textContent = MAX_CLICKS;
    document.getElementById("currentTimeLimit").textContent =
      TIME_LIMIT_MINUTES;
    updateCheckinTimeDisplay();
  }

  showDemoNotification("Demo resettata con successo");
}

function demoExpireSession() {
  // Imposta il tempo di inizio a 24 ore fa per forzare la scadenza
  appState.usageStartTime = Date.now() - 24 * 60 * 60 * 1000;

  // Forza il controllo
  checkTimeLimit();
  showDemoNotification("Sessione scaduta simulata");
}

function showDemoNotification(message) {
  const notification = document.getElementById("demoNotification");
  const notificationText = document.getElementById("demoNotificationText");

  notificationText.textContent = message;
  notification.classList.remove("hidden");

  // Rimuovi la notifica dopo 3 secondi
  setTimeout(() => {
    notification.classList.add("hidden");
  }, 3000);
}

// =============================================
// FUNZIONI DI GESTIONE STATO (IN MEMORIA)
// =============================================

function getClicksLeft(deviceId) {
  return appState.clicks[deviceId] !== undefined
    ? appState.clicks[deviceId]
    : MAX_CLICKS;
}

function setClicksLeft(deviceId, count) {
  if (appState.clicks[deviceId] !== undefined) {
    appState.clicks[deviceId] = count;
  }
}

async function setUsageStartTime() {
  appState.usageStartTime = Date.now();
}

async function checkTimeLimit() {
  if (!appState.usageStartTime) return false;

  const now = Date.now();
  const minutesPassed = (now - appState.usageStartTime) / (1000 * 60);

  if (minutesPassed >= TIME_LIMIT_MINUTES) {
    showSessionExpired();
    return true;
  }

  return false;
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

function updateButtonState(device) {
  const btn = document.getElementById(device.button_id);
  if (!btn) return;

  const clicksLeft = getClicksLeft(device.button_id);
  btn.disabled = clicksLeft <= 0 || !isCheckinTime();

  // Aggiungi effetto visivo per click esauriti
  if (clicksLeft <= 0) {
    btn.classList.add("btn-error");
    btn.classList.remove("btn-success");
    btn.innerHTML = `<i class="fas fa-lock"></i> No Clicks Left`;
  } else if (!isCheckinTime()) {
    btn.classList.remove("btn-error", "btn-success");
    btn.innerHTML = `<i class="fas fa-clock"></i> Check-in Time Only`;
  } else {
    btn.classList.add("btn-success");
    btn.classList.remove("btn-error");
    btn.innerHTML = `<i class="fas fa-key"></i> Unlock (${clicksLeft} left)`;
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

  let clicksLeft = getClicksLeft(device.button_id);
  if (clicksLeft <= 0) {
    showDevicePopup(device, clicksLeft);
    updateButtonState(device);
    return;
  }

  clicksLeft--;
  setClicksLeft(device.button_id, clicksLeft);
  updateButtonState(device);

  // Aggiungi effetto di animazione al pulsante
  const btn = document.getElementById(device.button_id);
  if (btn) {
    btn.classList.add("click-effect");
    setTimeout(() => btn.classList.remove("click-effect"), 500);
  }

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
    appState.codeVersion;
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
    // Aggiungi effetto shake per password errata
    const input = document.getElementById("adminPass");
    input.classList.add("shake");
    setTimeout(() => input.classList.remove("shake"), 500);
    showDemoNotification("Password admin errata! Usa 1234");
  }
}

function handleCodeUpdate() {
  const newCode = document.getElementById("newCode").value.trim();
  if (!newCode) {
    showDemoNotification("Inserisci un codice valido");
    return;
  }

  CORRECT_CODE = newCode;
  appState.codeVersion += 1;

  // Resetta lo stato dell'applicazione
  appState.usageStartTime = null;
  DEVICES.forEach((device) => {
    appState.clicks[device.button_id] = MAX_CLICKS;
  });

  document.getElementById("currentCode").textContent = CORRECT_CODE;
  document.getElementById("currentCodeVersion").textContent =
    appState.codeVersion;

  document.getElementById("controlPanel").style.display = "none";
  document.getElementById("authCode").style.display = "block";
  document.getElementById("auth-form").style.display = "block";
  document.getElementById("btnCheckCode").style.display = "block";
  document.getElementById("important").style.display = "block";

  showDemoNotification(
    "Codice aggiornato! Tutti gli utenti dovranno inserire il nuovo codice."
  );
}

function handleSettingsUpdate() {
  const newMaxClicks = document.getElementById("newMaxClicks").value.trim();
  const newTimeLimit = document.getElementById("newTimeLimit").value.trim();

  if (!newMaxClicks || isNaN(newMaxClicks) || parseInt(newMaxClicks) <= 0) {
    showDemoNotification("Inserisci un numero valido per i click massimi");
    return;
  }

  if (!newTimeLimit || isNaN(newTimeLimit) || parseInt(newTimeLimit) <= 0) {
    showDemoNotification("Inserisci un numero valido per il tempo limite");
    return;
  }

  const oldMaxClicks = MAX_CLICKS;
  MAX_CLICKS = parseInt(newMaxClicks);
  TIME_LIMIT_MINUTES = parseInt(newTimeLimit);

  // Aggiorna i click rimanenti in proporzione
  DEVICES.forEach((device) => {
    const currentClicks = getClicksLeft(device.button_id);
    const newClicks = Math.max(
      0,
      Math.floor(currentClicks * (MAX_CLICKS / oldMaxClicks))
    );
    setClicksLeft(device.button_id, newClicks);
    updateButtonState(device);
  });

  document.getElementById("currentMaxClicks").textContent = MAX_CLICKS;
  document.getElementById("currentTimeLimit").textContent = TIME_LIMIT_MINUTES;

  showDemoNotification("Impostazioni aggiornate con successo!");
}

// FUNZIONE AGGIUNTA: Gestione orario di check-in (range)
function handleCheckinTimeUpdate() {
  const newCheckinStartTime = document.getElementById("checkinStartTime").value;
  const newCheckinEndTime = document.getElementById("checkinEndTime").value;

  if (!newCheckinStartTime || !newCheckinEndTime) {
    showDemoNotification("Inserisci orari validi");
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

  // Aggiorna la visualizzazione
  updateCheckinTimeDisplay();
  DEVICES.forEach(updateButtonState);

  showDemoNotification("Orario di check-in aggiornato con successo!");
}

// =============================================
// AUTENTICAZIONE UTENTE
// =============================================

async function handleCodeSubmit() {
  const insertedCode = document.getElementById("authCode").value.trim();
  if (insertedCode !== CORRECT_CODE) {
    // Aggiungi effetto shake per codice errato
    const input = document.getElementById("authCode");
    input.classList.add("shake");
    setTimeout(() => input.classList.remove("shake"), 500);
    showDemoNotification("Codice errato! Riprova. Usa 1234 per la demo.");
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

  showDemoNotification("Accesso autorizzato! Benvenuto.");
}

// =============================================
// INIZIALIZZAZIONE DELL'APPLICAZIONE
// =============================================

async function init() {
  // Configura gli event listener
  const btnCheck = document.getElementById("btnCheckCode");
  if (btnCheck) btnCheck.addEventListener("click", handleCodeSubmit);

  // Permetti l'invio con il tasto Enter
  document
    .getElementById("authCode")
    .addEventListener("keypress", function (e) {
      if (e.key === "Enter") {
        handleCodeSubmit();
      }
    });

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

  // Permetti l'invio della password admin con Enter
  document
    .getElementById("adminPass")
    .addEventListener("keypress", function (e) {
      if (e.key === "Enter") {
        handleAdminLogin();
      }
    });

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

      showDemoNotification(
        CHECKIN_TIME_ENABLED
          ? "Controllo orario attivato"
          : "Controllo orario disattivato"
      );
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

  // Verifica se c'è una sessione attiva
  if (appState.usageStartTime) {
    const expired = await checkTimeLimit();
    if (!expired) {
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
    await checkTimeLimit();
    updateCheckinTimeDisplay();
  }, 1000);

  // Aggiorna l'orario ogni minuto
  setInterval(updateCheckinTimeDisplay, 60000);

  // Disabilita il tasto destro per una migliore esperienza demo
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
        document.getElementById("adminLogin").style.display = "block";
        document.getElementById("adminPanel").style.display = "none";
        document.getElementById("adminPass").value = "";
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
