// Configurazione Demo
const ADMIN_PASSWORD = "1234";
const DEMO_SETTINGS = {
  secret_code: "2245",
  max_clicks: 2,
  time_limit_minutes: 720,
  checkin_start_time: "14:00",
  checkin_end_time: "22:00",
  checkin_time_enabled: true,
  extra_door_1: false,
  extra_door_2: false,
};

// Elementi DOM
const loginModal = document.getElementById("loginModal");
const adminContainer = document.getElementById("adminContainer");
const adminPasswordInput = document.getElementById("adminPassword");
const loginError = document.getElementById("loginError");
const btnLogin = document.getElementById("btnLogin");

// Carica le impostazioni all'avvio
document.addEventListener("DOMContentLoaded", function () {
  // Verifica se l'utente è già autenticato
  const isAuthenticated = localStorage.getItem("adminAuthenticated") === "true";

  if (isAuthenticated) {
    // Se autenticato, nascondi il modale e mostra il contenuto
    loginModal.style.display = "none";
    adminContainer.style.display = "block";
    loadSettings();
  }

  // Focus sul campo password
  adminPasswordInput.focus();
});

// Gestione del login
btnLogin.addEventListener("click", function () {
  const password = adminPasswordInput.value.trim();
  if (password === ADMIN_PASSWORD) {
    // Password corretta
    localStorage.setItem("adminAuthenticated", "true");
    loginModal.style.display = "none";
    adminContainer.style.display = "block";
    loadSettings();

    // Mostra notifica di benvenuto
    showNotification("Accesso effettuato con successo!", "success");
  } else {
    // Password errata
    loginError.style.display = "block";
    adminPasswordInput.value = "";
    adminPasswordInput.focus();

    // Aggiungi effetto shake al modale
    loginModal.classList.add("shake");
    setTimeout(() => {
      loginModal.classList.remove("shake");
    }, 500);
  }
});

// Permetti di premere Invio per effettuare il login
adminPasswordInput.addEventListener("keypress", function (e) {
  if (e.key === "Enter") {
    btnLogin.click();
  }
});

// Funzione per caricare le impostazioni
function loadSettings() {
  // Carica le impostazioni dal localStorage o usa i valori predefiniti
  const secretCode =
    localStorage.getItem("secret_code") || DEMO_SETTINGS.secret_code;
  const maxClicks =
    localStorage.getItem("max_clicks") || DEMO_SETTINGS.max_clicks;
  const timeLimit =
    localStorage.getItem("time_limit_minutes") ||
    DEMO_SETTINGS.time_limit_minutes;
  const checkinStartTime =
    localStorage.getItem("checkin_start_time") ||
    DEMO_SETTINGS.checkin_start_time;
  const checkinEndTime =
    localStorage.getItem("checkin_end_time") || DEMO_SETTINGS.checkin_end_time;
  const checkinTimeEnabled =
    localStorage.getItem("checkin_time_enabled") ||
    DEMO_SETTINGS.checkin_time_enabled;
  const extraDoor1 =
    localStorage.getItem("extra_door_1") === "true" ||
    DEMO_SETTINGS.extra_door_1;
  const extraDoor2 =
    localStorage.getItem("extra_door_2") === "true" ||
    DEMO_SETTINGS.extra_door_2;

  // Aggiorna l'interfaccia
  document.getElementById("currentCode").value = secretCode;
  document.getElementById("currentMaxClicks").value = maxClicks;
  document.getElementById("currentTimeLimit").value = timeLimit;
  document.getElementById(
    "currentCheckinTimeRange"
  ).value = `${checkinStartTime} - ${checkinEndTime}`;
  document.getElementById("checkinStartTime").value = checkinStartTime;
  document.getElementById("checkinEndTime").value = checkinEndTime;
  document.getElementById("extraDoor1Visible").checked = extraDoor1;
  document.getElementById("extraDoor2Visible").checked = extraDoor2;

  // Aggiorna lo stato del controllo orario
  if (checkinTimeEnabled === "true" || checkinTimeEnabled === true) {
    document.getElementById("checkinTimeStatus").innerHTML =
      '<span class="status-indicator status-on"></span> Attivo';
    document
      .getElementById("btnToggleCheckinTime")
      .classList.add("btn-success");
    document.getElementById("btnToggleCheckinTime").innerHTML =
      '<i class="fas fa-toggle-on"></i> Disattiva Controllo Orario';
  } else {
    document.getElementById("checkinTimeStatus").innerHTML =
      '<span class="status-indicator status-off"></span> Disattivato';
    document.getElementById("btnToggleCheckinTime").classList.add("btn-error");
    document.getElementById("btnToggleCheckinTime").innerHTML =
      '<i class="fas fa-toggle-off"></i> Attiva Controllo Orario';
  }

  // Carica i link attivi e statistiche
  updateActiveLinksList();
  updateLinkStatistics();
}

// Aggiorna il codice segreto
document.getElementById("btnCodeUpdate").addEventListener("click", function () {
  const newCode = document.getElementById("newCode").value.trim();
  if (!newCode) {
    showNotification("Inserisci un codice valido", "error");
    return;
  }

  // Salva nel localStorage
  localStorage.setItem("secret_code", newCode);

  // Aggiorna l'interfaccia
  document.getElementById("currentCode").value = newCode;
  document.getElementById("newCode").value = "";

  showNotification("Codice aggiornato con successo!", "success");
});

// Aggiorna le impostazioni di sistema
document
  .getElementById("btnSettingsUpdate")
  .addEventListener("click", function () {
    const newMaxClicks = document.getElementById("newMaxClicks").value.trim();
    const newTimeLimit = document.getElementById("newTimeLimit").value.trim();

    if (!newMaxClicks || isNaN(newMaxClicks) || parseInt(newMaxClicks) <= 0) {
      showNotification(
        "Inserisci un numero valido per i click massimi",
        "error"
      );
      return;
    }

    if (!newTimeLimit || isNaN(newTimeLimit) || parseInt(newTimeLimit) <= 0) {
      showNotification(
        "Inserisci un numero valido per il limite di tempo",
        "error"
      );
      return;
    }

    // Salva nel localStorage
    localStorage.setItem("max_clicks", newMaxClicks);
    localStorage.setItem("time_limit_minutes", newTimeLimit);

    // Aggiorna l'interfaccia
    document.getElementById("currentMaxClicks").value = newMaxClicks;
    document.getElementById("currentTimeLimit").value = newTimeLimit;

    showNotification("Impostazioni aggiornate con successo!", "success");
  });

// Aggiorna l'orario di check-in
document
  .getElementById("btnUpdateCheckinTime")
  .addEventListener("click", function () {
    const newCheckinStartTime =
      document.getElementById("checkinStartTime").value;
    const newCheckinEndTime = document.getElementById("checkinEndTime").value;

    if (!newCheckinStartTime || !newCheckinEndTime) {
      showNotification("Inserisci orari validi", "error");
      return;
    }

    // Converti in minuti per il confronto
    const [startHours, startMinutes] = newCheckinStartTime
      .split(":")
      .map(Number);
    const [endHours, endMinutes] = newCheckinEndTime.split(":").map(Number);

    const startTimeInMinutes = startHours * 60 + startMinutes;
    const endTimeInMinutes = endHours * 60 + endMinutes;

    // Verifica che l'orario di fine sia dopo l'orario di inizio
    if (endTimeInMinutes <= startTimeInMinutes) {
      document.getElementById("timeRangeError").style.display = "block";
      return;
    }

    document.getElementById("timeRangeError").style.display = "none";

    // Salva nel localStorage
    localStorage.setItem("checkin_start_time", newCheckinStartTime);
    localStorage.setItem("checkin_end_time", newCheckinEndTime);

    // Aggiorna l'interfaccia
    document.getElementById(
      "currentCheckinTimeRange"
    ).value = `${newCheckinStartTime} - ${newCheckinEndTime}`;

    showNotification("Orario di check-in aggiornato con successo!", "success");
  });

// Attiva/disattiva il controllo orario
document
  .getElementById("btnToggleCheckinTime")
  .addEventListener("click", function () {
    const currentStatus = localStorage.getItem("checkin_time_enabled");
    let newStatus;

    if (currentStatus === null) {
      newStatus = false;
    } else {
      newStatus = currentStatus !== "true";
    }

    // Salva nel localStorage
    localStorage.setItem("checkin_time_enabled", newStatus.toString());

    // Aggiorna l'interfaccia
    if (newStatus) {
      document.getElementById("checkinTimeStatus").innerHTML =
        '<span class="status-indicator status-on"></span> Attivo';
      this.classList.remove("btn-error");
      this.classList.add("btn-success");
      this.innerHTML =
        '<i class="fas fa-toggle-on"></i> Disattiva Controllo Orario';
    } else {
      document.getElementById("checkinTimeStatus").innerHTML =
        '<span class="status-indicator status-off"></span> Disattivato';
      this.classList.remove("btn-success");
      this.classList.add("btn-error");
      this.innerHTML =
        '<i class="fas fa-toggle-off"></i> Attiva Controllo Orario';
    }

    showNotification(
      `Controllo orario ${
        newStatus ? "attivato" : "disattivato"
      } con successo!`,
      "success"
    );
  });

// Gestione visibilità porte extra
document
  .getElementById("btnExtraDoorsVisibility")
  .addEventListener("click", function () {
    const extraDoor1Visible =
      document.getElementById("extraDoor1Visible").checked;
    const extraDoor2Visible =
      document.getElementById("extraDoor2Visible").checked;

    // Salva nel localStorage
    localStorage.setItem("extra_door_1", extraDoor1Visible.toString());
    localStorage.setItem("extra_door_2", extraDoor2Visible.toString());

    showNotification(
      "Visibilità porte extra aggiornata con successo!",
      "success"
    );
  });

// Generazione link sicuri
document
  .getElementById("btnGenerateSecureLink")
  .addEventListener("click", function () {
    const expirationHours = parseInt(
      document.getElementById("linkExpiration").value
    );
    const maxUsage = parseInt(document.getElementById("linkUsage").value);
    const customCode = document.getElementById("linkCustomCode").value.trim();

    // Genera ID unico
    const linkId = "demo_link_" + Date.now();
    const expirationTime = Date.now() + expirationHours * 60 * 60 * 1000;

    // Genera il link
    const secureLink = `${window.location.origin}/index.html?token=${linkId}`;

    document.getElementById("generatedSecureLink").value = secureLink;

    // Salva i dati del link
    saveSecureLink(
      linkId,
      expirationTime,
      maxUsage,
      expirationHours,
      customCode
    );

    // Aggiorna la lista dei link attivi
    updateActiveLinksList();
    updateLinkStatistics();

    showNotification("Link sicuro generato con successo!", "success");
  });

// Copia il link sicuro
document
  .getElementById("btnCopySecureLink")
  .addEventListener("click", function () {
    const linkInput = document.getElementById("generatedSecureLink");

    if (!linkInput.value) {
      showNotification("Genera prima un link", "error");
      return;
    }

    linkInput.select();
    document.execCommand("copy");

    // Feedback visivo
    const btn = document.getElementById("btnCopySecureLink");
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-check"></i> Copiato!';
    btn.style.background = "var(--success)";

    setTimeout(() => {
      btn.innerHTML = originalText;
      btn.style.background = "";
    }, 2000);

    showNotification("Link copiato negli appunti!", "success");
  });

// Salva i dati del link sicuro
function saveSecureLink(
  linkId,
  expirationTime,
  maxUsage,
  expirationHours,
  customCode
) {
  const linkData = {
    id: linkId,
    created: Date.now(),
    expiration: expirationTime,
    maxUsage: maxUsage,
    usedCount: 0,
    expirationHours: expirationHours,
    status: "active",
    customCode: customCode || null,
  };

  // Recupera i link esistenti
  const secureLinks = JSON.parse(localStorage.getItem("secure_links") || "{}");
  secureLinks[linkId] = linkData;
  localStorage.setItem("secure_links", JSON.stringify(secureLinks));
}

// Aggiorna la lista dei link attivi
function updateActiveLinksList() {
  const container = document.getElementById("activeLinksList");

  // Recupera i link dal localStorage
  const secureLinks = JSON.parse(localStorage.getItem("secure_links") || "{}");
  const activeLinks = Object.values(secureLinks).filter(
    (link) => link.status === "active" && link.expiration > Date.now()
  );

  if (activeLinks.length === 0) {
    container.innerHTML =
      '<p style="text-align: center; color: #666; padding: 20px;">Nessun link attivo</p>';
    return;
  }

  container.innerHTML = "";
  activeLinks
    .sort((a, b) => b.created - a.created)
    .forEach((link) => {
      const linkElement = document.createElement("div");
      linkElement.className = "link-item";

      const expiresIn = Math.max(
        0,
        Math.floor((link.expiration - Date.now()) / (1000 * 60 * 60))
      );
      const usageText = `${link.usedCount}/${link.maxUsage} utilizzi`;

      linkElement.innerHTML = `
                    <div style="font-size: 11px; color: #666;">
                        Creato: ${new Date(link.created).toLocaleString(
                          "it-IT"
                        )}
                    </div>
                    <div style="font-weight: bold; margin: 3px 0; color: var(--dark);">
                        Scade in: ${expiresIn}h • ${usageText}
                    </div>
                    <div style="font-size: 12px; overflow: hidden; text-overflow: ellipsis; margin-bottom: 5px;">
                        ${link.id}
                    </div>
                    ${
                      link.customCode
                        ? `<div style="font-size: 11px; color: var(--primary);">Codice: ${link.customCode}</div>`
                        : ""
                    }
                    <div class="link-actions">
                        <button onclick="copySecureLink('${
                          link.id
                        }')" class="btn" style="padding: 5px 10px; font-size: 12px;">
                            <i class="fas fa-copy"></i> Copia
                        </button>
                        <button onclick="revokeSecureLink('${
                          link.id
                        }')" class="btn btn-error" style="padding: 5px 10px; font-size: 12px;">
                            <i class="fas fa-ban"></i> Revoca
                        </button>
                    </div>
                `;

      container.appendChild(linkElement);
    });
}

// Copia link sicuro
function copySecureLink(linkId) {
  const secureLinks = JSON.parse(localStorage.getItem("secure_links") || "{}");
  const link = secureLinks[linkId];

  if (link) {
    const secureLink = `${window.location.origin}/index.html?token=${linkId}`;

    const tempInput = document.createElement("input");
    tempInput.value = secureLink;
    document.body.appendChild(tempInput);
    tempInput.select();
    document.execCommand("copy");
    document.body.removeChild(tempInput);

    showNotification("Link copiato negli appunti!", "success");
  }
}

// Revoca link
function revokeSecureLink(linkId) {
  const secureLinks = JSON.parse(localStorage.getItem("secure_links") || "{}");

  if (secureLinks[linkId]) {
    secureLinks[linkId].status = "revoked";
    secureLinks[linkId].expiration = Date.now();
    localStorage.setItem("secure_links", JSON.stringify(secureLinks));

    updateActiveLinksList();
    updateLinkStatistics();

    showNotification("Link revocato con successo!", "success");
  }
}

// Aggiorna le statistiche
function updateLinkStatistics() {
  const secureLinks = JSON.parse(localStorage.getItem("secure_links") || "{}");
  const links = Object.values(secureLinks);

  document.getElementById("totalLinks").textContent = links.length;
  document.getElementById("activeLinks").textContent = links.filter(
    (link) => link.status === "active" && link.expiration > Date.now()
  ).length;
  document.getElementById("usedLinks").textContent = links.filter(
    (link) => link.status === "used"
  ).length;
  document.getElementById("expiredLinks").textContent = links.filter(
    (link) => link.status === "expired" || link.status === "revoked"
  ).length;
}

// Reset demo
document.getElementById("btnResetDemo").addEventListener("click", function () {
  if (
    confirm("Sei sicuro di voler resettare tutte le impostazioni della demo?")
  ) {
    // Rimuovi tutte le impostazioni
    localStorage.removeItem("secret_code");
    localStorage.removeItem("max_clicks");
    localStorage.removeItem("time_limit_minutes");
    localStorage.removeItem("checkin_start_time");
    localStorage.removeItem("checkin_end_time");
    localStorage.removeItem("checkin_time_enabled");
    localStorage.removeItem("extra_door_1");
    localStorage.removeItem("extra_door_2");
    localStorage.removeItem("secure_links");

    // Ricarica le impostazioni
    loadSettings();

    showNotification("Demo resettata con successo!", "success");
  }
});

// Funzione per mostrare notifiche
function showNotification(message, type) {
  // Rimuovi notifiche precedenti
  const existingNotification = document.getElementById("adminNotification");
  if (existingNotification) {
    existingNotification.remove();
  }

  // Crea una nuova notifica
  const notification = document.createElement("div");
  notification.id = "adminNotification";
  notification.style.cssText = `
                position: fixed;
                top: 60px;
                right: 20px;
                background: ${
                  type === "success" ? "var(--success)" : "var(--error)"
                };
                color: white;
                padding: 15px 20px;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.1);
                z-index: 10000;
                display: flex;
                align-items: center;
                gap: 10px;
                max-width: 300px;
            `;

  notification.innerHTML = `
                <i class="fas fa-${
                  type === "success" ? "check-circle" : "exclamation-circle"
                }"></i>
                <span>${message}</span>
                <button onclick="this.parentElement.remove()" style="
                    background: none;
                    border: none;
                    color: white;
                    margin-left: 10px;
                    cursor: pointer;
                ">
                    <i class="fas fa-times"></i>
                </button>
            `;

  document.body.appendChild(notification);

  // Rimuovi automaticamente dopo 5 secondi
  setTimeout(() => {
    if (notification.parentElement) {
      notification.remove();
    }
  }, 5000);
}

// Carica i link attivi all'avvio
document.addEventListener("DOMContentLoaded", function () {
  updateActiveLinksList();
  updateLinkStatistics();
});
