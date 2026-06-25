// content_wa.js - Este script opera dentro de WhatsApp Web

console.log("GE_WA_BOT: Inicializado en WhatsApp Web.");

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

let isProcessing = false;
let gotoNavigating = false; // Guard: evita que el MutationObserver colisione con GOTO

// ─── Helpers multilingüe: no dependen del idioma configurado en WhatsApp ───────

/**
 * Botón de enviar: busca por icono SVG (data-icon) primero — funciona en
 * cualquier idioma. Luego recurre a una lista de aria-labels conocidos.
 */
function getSendButton() {
    return (
        document.querySelector('span[data-icon="send"]')?.closest('button') ||
        document.querySelector('button[aria-label="Enviar"]') ||   // ES
        document.querySelector('button[aria-label="Send"]') ||     // EN
        document.querySelector('button[aria-label="Enviar mensagem"]') || // PT
        document.querySelector('button[aria-label="Envoyer"]')     // FR
    );
}

/**
 * Caja de texto: tres selectores de fallback por si WhatsApp cambia data-tab.
 */
function getInputBox() {
    return (
        document.querySelector('div[contenteditable="true"][data-tab="10"]') ||
        document.querySelector('div[contenteditable="true"][data-tab="11"]') ||
        document.querySelector('#main div[contenteditable="true"]') ||
        document.querySelector('footer div[contenteditable="true"]') ||
        document.querySelector('div[contenteditable="true"][spellcheck="true"]')
    );
}

/**
 * Diálogo de número inválido: detecta el botón OK del popup de error.
 * Este data-testid es estable e independiente del idioma de WhatsApp.
 */
function getInvalidNumberDialog() {
    // 1. Intentar selector por testid (el más rápido y estable)
    const btn = document.querySelector('button[data-testid="popup-controls-ok"]');
    if (btn) return btn;

    // 2. Fallback multilingüe buscando el texto del popup en pantalla
    const popupTexts = [
        "is not on WhatsApp",           // EN
        "no está en WhatsApp",          // ES
        "não está no WhatsApp",         // PT
        "n'est pas sur WhatsApp",       // FR
        "El número de teléfono compartido" // ES alternativo
    ];
    
    const bodyText = document.body.innerText || "";
    for (const txt of popupTexts) {
        if (bodyText.includes(txt)) {
            // Si el texto está, buscar el botón OK dentro del modal (role="dialog")
            const dialog = document.querySelector('[role="dialog"]');
            if (dialog) {
                const okBtn = dialog.querySelector('button');
                if (okBtn) return okBtn;
            }
            // Si no encuentra role="dialog", buscar un botón "OK" o "Aceptar" en toda la pantalla
            const buttons = Array.from(document.querySelectorAll('button'));
            const fallbackBtn = buttons.find(b => b.innerText.includes('OK') || b.innerText.includes('Aceptar'));
            if (fallbackBtn) return fallbackBtn;
        }
    }
    
    return null;
}

// ────────────────────────────────────────────────────────────────────────────────

async function attemptSend() {
    if (isProcessing) return;
    isProcessing = true;
    
    console.log("GE_WA_BOT: Intentando ejecutar envío automático (Anti-Baneo On)");

    let attempts = 0;
    while(attempts < 60) { // Tolerancia grande de espera (60 segs) para PCs lentas

        // 1. Detectar popup de error (independiente del idioma)
        const invalidDialog = getInvalidNumberDialog();
        if (invalidDialog) {
            console.log("GE_WA_BOT: Popup de error detectado (número inválido). Saltando...");
            invalidDialog.click();
            await sleep(600);
            isProcessing = false;
            try {
                chrome.runtime.sendMessage({ action: "ITEM_ERROR" });
            } catch(e) {
                console.error("GE_WA_BOT: Service worker desconectado al reportar error.", e);
            }
            return;
        }

        // 2. Detectar caja de texto y botón de enviar
        let sendBtn   = getSendButton();
        const inputBox  = getInputBox();

        // 3. Inyectar texto manualmente si WhatsApp falló en auto-completarlo
        if (inputBox && !sendBtn) {
            const urlParams = new URLSearchParams(window.location.search);
            const msgText = urlParams.get('text');
            // Si hay texto en la URL, pero la caja de texto parece vacía y no aparece el botón de enviar
            if (msgText && inputBox.innerText.trim() === "") {
                console.log("GE_WA_BOT: El texto no cargó automáticamente. Inyectando manualmente...");
                inputBox.focus();
                
                // Método 1: insertText
                document.execCommand('insertText', false, msgText);
                inputBox.dispatchEvent(new Event('input', { bubbles: true }));
                
                // Método 2: paste fallback (por si usa Lexical o Draft.js y el anterior falla)
                if (inputBox.innerText.trim() === "") {
                     const dataTransfer = new DataTransfer();
                     dataTransfer.setData('text/plain', msgText);
                     inputBox.dispatchEvent(new ClipboardEvent('paste', {
                         clipboardData: dataTransfer,
                         bubbles: true,
                         cancelable: true
                     }));
                }
                
                await sleep(1000); // Esperar a que React renderice el botón de enviar
                sendBtn = getSendButton(); // Volver a buscar el botón
            }
        }

        if (sendBtn && inputBox) {
            console.log("GE_WA_BOT: Página cargada y botón detectado.");
            
            try {
                chrome.runtime.sendMessage({ action: "ITEM_TYPING" });
            } catch(e) {}
            
            // Pausa humanizada anti-baneo (Ajustado a Modo Rápido)
            const humanDelay = Math.floor(Math.random() * (2000 - 1000 + 1)) + 1000;
            await sleep(humanDelay);
            
            // Re-verificar por si cambió algo durante la pausa
            const btnFinal = getSendButton();
            if (btnFinal) {
                btnFinal.click();
                console.log("GE_WA_BOT: ENVIADO!");
                
                // Margen para confirmar entrega + Pausa de seguridad (4s a 8s — modo rápido)
                const safeDelay = Math.floor(Math.random() * (8000 - 4000 + 1)) + 4000;
                console.log(`GE_WA_BOT: Pausa rápida de ${(safeDelay/1000).toFixed(1)}s`);
                await sleep(safeDelay);
                
                isProcessing = false;
                try {
                    chrome.runtime.sendMessage({ action: "ITEM_SENT" });
                } catch(e) {
                    console.error("GE_WA_BOT: Service worker desconectado al reportar envío.", e);
                }
            } else {
                console.log("GE_WA_BOT: Botón desapareció durante pausa humanizada. Reportando error.");
                isProcessing = false;
                try {
                    chrome.runtime.sendMessage({ action: "ITEM_ERROR" });
                } catch(e) {
                    console.error("GE_WA_BOT: Service worker desconectado al reportar error.", e);
                }
            }
            return;
        }

        await sleep(1000);
        attempts++;
    }

    console.log("GE_WA_BOT: Timeout — botón o caja no encontrados. Saltando a siguiente.");
    isProcessing = false;
    try {
        chrome.runtime.sendMessage({ action: "ITEM_ERROR" });
    } catch(e) {
        console.error("GE_WA_BOT: Service worker desconectado al reportar timeout.", e);
    }
}

// NOTA: El disparador de carga inicial se maneja con el setTimeout al final del script.
// Se removió el listener 'load' para evitar doble ejecución al inyectar el script.

// Escucha instrucciones directas sin recargar página (Enrutamiento SPA)
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "GOTO") {
        console.log("GE_WA_BOT: Recibida orden GOTO SPA -> " + request.url);
        gotoNavigating = true; // Bloquear MutationObserver
        location.href = request.url;
        
        // Confirmar recepción para evitar error de canal cerrado
        sendResponse({ status: "navigated" });
        
        // Empezar ciclo nuevamente
        setTimeout(() => {
            gotoNavigating = false;
            attemptSend();
        }, 2000);
        return true; 
    }

    if (request.action === "BULK_FINISHED") {
        console.log("GE_WA_BOT: Proceso masivo finalizado.");
        sendResponse({ status: "acknowledged" });
        return true;
    }
});

let lastUrl = location.href;
new MutationObserver(() => {
  const url = location.href;
  if (url !== lastUrl) {
    lastUrl = url;
    // Solo disparar si el bot no está ya procesando y no fue una navegación GOTO
    if (url.includes("send?phone=") && !isProcessing && !gotoNavigating) {
      setTimeout(attemptSend, 1000);
    }
  }
}).observe(document, { subtree: true, childList: true });

// Solo disparar automáticamente si la URL ya contiene send?phone= (navegación directa del bot)
if (location.href.includes("send?phone=")) {
    setTimeout(attemptSend, 1000);
}
