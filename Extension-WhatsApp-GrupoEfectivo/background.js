// background.js - Controla flujo persistente en Manifest V3

// ─── Configuración Anti-Baneo (MODO MODERADO — equilibrio velocidad/seguridad) ─
const AB_BATCH_SIZE      = 15;     // Mensajes por bloque antes de pausa larga
const AB_BATCH_PAUSE     = 120000; // Pausa larga entre bloques (ms) — 2 minutos
// Nota: La pausa aleatoria corta (8s-15s) se controla en content_wa.js
// ─────────────────────────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "START_BULK") {
    const stats = { total: request.payload.length, sent: 0, error: 0 };
    chrome.storage.local.set({ 
      messageQueue: request.payload, 
      currentTabId: null, 
      botCreatedTab: false,
      bulkStats: stats,
      failedItems: [],
      currentItem: null,
      crmTabId: sender.tab.id
    }, () => {
      sendResponse({ status: "ok", count: request.payload.length });
      processNextItem();
    });
    return true;
  }

  if (request.action === "ITEM_SENT" || request.action === "ITEM_ERROR") {
    const key = request.action === "ITEM_SENT" ? "sent" : "error";
    
    chrome.storage.local.get(["bulkStats", "currentItem", "failedItems"], (data) => {
      let stats = data.bulkStats || { total: 0, sent: 0, error: 0 };
      let failedItems = data.failedItems || [];
      stats[key]++;

      if (key === "error" && data.currentItem) {
        failedItems.push({
          phone: data.currentItem.phone,
          name:  data.currentItem.name || null
        });
      }

      chrome.storage.local.set({ bulkStats: stats, failedItems: failedItems }, () => {
        const totalProcessed = stats.sent + stats.error;

        // Notificar progreso al CRM
        chrome.storage.local.get("crmTabId", (res) => {
          if (res.crmTabId) {
            chrome.tabs.sendMessage(res.crmTabId, {
              action: "BULK_PROGRESS",
              stats: stats
            }, () => {
              if (chrome.runtime.lastError) {} // Ignorar si el CRM se cerró
            });
          }
        });

        // Nivel 2: Pausa larga cada AB_BATCH_SIZE
        if (totalProcessed > 0 && totalProcessed % AB_BATCH_SIZE === 0) {
          const pauseMinutes = AB_BATCH_PAUSE / 60000;
          console.log(`GE_WA_BOT: ⏸ Pausa larga (${pauseMinutes} min)`);
          chrome.alarms.create("NEXT_STEP", { delayInMinutes: pauseMinutes });
        } else {
          // Nivel 1: La pausa corta YA LA HIZO el content_script. Procedemos al instante.
          console.log(`GE_WA_BOT: ▶ Siguiente inmediato (Pausa ya gestionada en pestaña)`);
          processNextItem();
        }
      });
    });
    return true;
  }

  if (request.action === "ITEM_TYPING") {
    chrome.storage.local.get("crmTabId", (res) => {
      if (res.crmTabId) {
        chrome.tabs.sendMessage(res.crmTabId, { action: "BULK_TYPING" }, () => {
          if (chrome.runtime.lastError) {}
        });
      }
    });
    return true;
  }
});

// Listener para reanudar el proceso cuando suene la alarma (mantiene el bot vivo en MV3)
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "NEXT_STEP") {
    processNextItem();
  }
});

// --- Guard: Si el usuario cierra la pestaña de WhatsApp a mitad del proceso ---
chrome.tabs.onRemoved.addListener((tabId, removeInfo) => {
  chrome.storage.local.get(["currentTabId", "bulkStats", "crmTabId", "messageQueue", "failedItems"], (data) => {
    if (tabId !== data.currentTabId) return;
    if (!data.messageQueue || data.messageQueue.length === 0) return;

    console.log("GE_WA_BOT: Pestaña de WhatsApp cerrada manualmente. Deteniendo bot.");

    const stats      = data.bulkStats    || { total: 0, sent: 0, error: 0 };
    const failedItems = data.failedItems || [];
    const crmTabId   = data.crmTabId;

    chrome.storage.local.remove(["currentTabId", "botCreatedTab", "bulkStats", "crmTabId", "messageQueue", "failedItems", "currentItem"]);

    if (crmTabId) {
      chrome.tabs.sendMessage(crmTabId, {
        action: "BULK_FINISHED",
        stats: stats,
        failedItems: failedItems,
        interrupted: true
      }, () => {
        if (chrome.runtime.lastError) console.log("GE_WA_BOT: No se pudo notificar al CRM sobre interrupción.");
      });
    }
  });
});

function processNextItem() {
  chrome.storage.local.get(["messageQueue", "currentTabId", "botCreatedTab"], (data) => {
    let queue = data.messageQueue || [];
    
    // Si terminamos, notificar y resolver pestaña
    if (queue.length === 0) {
      chrome.storage.local.get(["bulkStats", "crmTabId", "failedItems"], (statsData) => {
        const stats       = statsData.bulkStats    || { total: 0, sent: 0, error: 0 };
        const failedItems  = statsData.failedItems  || [];
        const crmTabId    = statsData.crmTabId;
        
        chrome.notifications.create({
          type: "basic",
          iconUrl: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
          title: "WhatsApp Robot Efectivo",
          message: `¡Finalizado! Éxito: ${stats.sent}, Error: ${stats.error}`
        });
        
        if (crmTabId) {
          chrome.tabs.sendMessage(crmTabId, {
            action: "BULK_FINISHED",
            stats: stats,
            failedItems: failedItems
          }, (response) => {
            if (chrome.runtime.lastError) console.log("GE_WA_BOT: No se pudo enviar resumen al CRM.");
          });
        }
        
        chrome.storage.local.remove(["messageQueue", "currentTabId", "botCreatedTab", "bulkStats", "crmTabId", "failedItems", "currentItem"]);
      });
      return;
    }

    const nextItem = queue.shift();
    
    // Guardar la nueva cola Y el item actual antes de procesar
    chrome.storage.local.set({ messageQueue: queue, currentItem: nextItem }, () => {
      const url = `https://web.whatsapp.com/send?phone=${nextItem.phone}&text=${encodeURIComponent(nextItem.message)}`;
      
      let tabId = data.currentTabId;
      
      if (!tabId) {
        // Primera corrida: Buscamos si el usuario ya tiene WhatsApp Abierto
        chrome.tabs.query({ url: "*://web.whatsapp.com/*" }, (tabs) => {
          if (tabs.length > 0) {
            // Reutilizar pestaña existente
            tabId = tabs[0].id;
            chrome.storage.local.set({ currentTabId: tabId, botCreatedTab: false }, () => {
              // Ya no traemos al frente (active: false por defecto al no llamar update con active:true)
              chrome.tabs.sendMessage(tabId, { action: "GOTO", url: url }, fallbackUpdate);
            });
          } else {
            // Crear pestaña nueva en SEGUNDO PLANO
            chrome.tabs.create({ url: url, active: false }, (tab) => {
              chrome.storage.local.set({ currentTabId: tab.id, botCreatedTab: true });
            });
          }
        });
      } else {
        // Envíos subsecuentes: Enviar comando SPA
        chrome.tabs.sendMessage(tabId, { action: "GOTO", url: url }, fallbackUpdate);
      }

      function fallbackUpdate(response) {
         if(chrome.runtime.lastError) {
             console.log("GE_WA_BOT: Fallback a recarga completa por pérdida de conexión.");
             chrome.tabs.update(tabId, { url: url });
         }
      }

    }); // fin set
  }); // fin get
}
