// content_crm.js - Se inyecta en todas las páginas, pero solo reacciona si el CRM lo invoca.
console.log("GE_WA_BOT: Extensión cargada en la página.");

window.addEventListener("GE_WA_BOT_SEND_BULK", (event) => {
  const data = event.detail;
  if (data && Array.isArray(data)) {
    console.log("GE_WA_BOT: Recibido lote de " + data.length + " mensajes. Iniciando...");
    
    // Cerrar modal de admin.html si existe
    if (typeof window.cerrarRecModal === 'function') {
        window.cerrarRecModal();
    } else {
        const adminModal = document.getElementById('modal-rec');
        if (adminModal) adminModal.style.display = 'none';
    }

    if (!chrome.runtime || !chrome.runtime.sendMessage) {
        alert("⚠️ La extensión se ha actualizado. Por favor, refresca esta página (F5) para continuar.");
        return;
    }

    showFloatingWidget(data.length);

    try {
        chrome.runtime.sendMessage({ action: "START_BULK", payload: data }, (response) => {
            if (chrome.runtime.lastError) {
                console.error("GE_WA_BOT Error:", chrome.runtime.lastError);
                alert("⚠️ Error de conexión con el robot. Por favor, refresca esta página (F5) para continuar.");
            } else {
                console.log("GE_WA_BOT: Respuesta del servidor ->", response);
            }
        });
    } catch (e) {
        console.error("GE_WA_BOT Exception:", e);
        alert("⚠️ La extensión se ha actualizado o desconectado. Por favor, refresca esta página (F5) para continuar.");
    }
  }
});

let currentBulkStats = null;
let currentFailedItems = [];

function injectBotStyles() {
    if (document.getElementById('ge-bot-styles')) return;
    const style = document.createElement('style');
    style.id = 'ge-bot-styles';
    style.innerHTML = `
        @keyframes pulseBot {
            0% { transform: translateY(-50%) scale(1); opacity: 1; }
            50% { transform: translateY(-50%) scale(1.15); opacity: 0.8; }
            100% { transform: translateY(-50%) scale(1); opacity: 1; }
        }
        @keyframes spinBot {
            100% { transform: translateY(-50%) rotate(360deg); }
        }
        #btn-notificaciones-container.bot-active {
            border-color: var(--azul) !important;
            background: var(--brand-light) !important;
            color: var(--brand-secondary) !important;
            cursor: default !important;
        }
        #btn-notificaciones-container.bot-active:hover {
            width: 220px !important;
        }
    `;
    document.head.appendChild(style);
}

function showFloatingWidget(totalItems) {
    injectBotStyles();
    
    const btn = document.getElementById('btn-notificaciones');
    if (!btn) return;
    
    // Guardar estado original
    if (!btn.dataset.originalHtml) {
        btn.dataset.originalHtml = btn.innerHTML;
        btn.dataset.originalBg = btn.style.background || '';
        btn.dataset.originalOnclick = btn.getAttribute('onclick') || '';
    }
    
    // Registrar el tiempo de inicio
    window.geBotStartTime = Date.now();
    
    const minutes = Math.ceil(totalItems * 15 / 60); // Asumiendo modo rápido
    
    btn.removeAttribute('onclick'); // Evitar que el main world dispare su evento
    btn.onclick = null; // deshabilitar
    // Se elimina pointerEvents='none' para permitir el hover CSS
    btn.innerHTML = `
        <div id="btn-notificaciones-container" class="bot-active">
            <i data-lucide="bot" class="mi sm" style="animation: pulseBot 1.5s infinite;"></i>
            <span id="btn-notificaciones-text">Abriendo WhatsApp... (~${minutes}m)</span>
        </div>
    `;
    if (window.lucide) window.lucide.createIcons();
}

function setWidgetFinished(stats, interrupted, failedItems) {
    const btn = document.getElementById('btn-notificaciones');
    if (btn) {
        // Restaurar estado original inmediatamente
        btn.style.pointerEvents = 'auto';
        if (btn.dataset.originalHtml) {
            btn.innerHTML = btn.dataset.originalHtml;
        }
        if (btn.dataset.originalOnclick) {
            btn.setAttribute('onclick', btn.dataset.originalOnclick);
        }
        btn.onclick = null;
        if (window.lucide) window.lucide.createIcons();
    }
    
    // Mostrar el resumen automáticamente
    showBulkSummaryModal(stats, interrupted, failedItems);
}

// Escuchar evento de finalización y progreso para mostrar el resumen en el CRM
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "BULK_PROGRESS") {
        const stats = request.stats;
        const totalProcessed = stats.sent + stats.error;
        const btn = document.getElementById('btn-notificaciones');
        if (btn) {
            const minutesLeft = Math.ceil(((stats.total - totalProcessed) * 15 + Math.floor((stats.total - totalProcessed)/15)*180)/60);
            
            let texto = `Enviados ${totalProcessed}/${stats.total}`;
            if (stats.error > 0) {
                texto += ` (${stats.error} error${stats.error > 1 ? 'es' : ''})`;
            }
            texto += ` (~${minutesLeft}m)`;

            btn.innerHTML = `
                <div id="btn-notificaciones-container" class="bot-active">
                    <i data-lucide="bot" class="mi sm" style="animation: pulseBot 1.5s infinite;"></i>
                    <span id="btn-notificaciones-text">${texto}</span>
                </div>
            `;
            if (window.lucide) window.lucide.createIcons();
        }
        sendResponse({ status: "progress_received" });
        return true;
    }

    if (request.action === "BULK_FINISHED") {
        const interrupted  = request.interrupted === true;
        const failedItems  = request.failedItems || [];
        console.log(`GE_WA_BOT: Proceso masivo ${interrupted ? 'INTERRUMPIDO' : 'finalizado'}.`);
        setWidgetFinished(request.stats || { total: 0, sent: 0, error: 0 }, interrupted, failedItems);
        window.dispatchEvent(new CustomEvent("GE_WA_BOT_COMPLETED", { 
            detail: { stats: request.stats, failedItems: failedItems, interrupted: interrupted } 
        }));
        sendResponse({ status: "modal_shown_in_crm" });
    }

    if (request.action === "BULK_TYPING") {
        const btn = document.getElementById('btn-notificaciones');
        if (btn && !btn.innerHTML.includes('Concluido')) {
            btn.innerHTML = `
                <div id="btn-notificaciones-container" class="bot-active">
                    <i data-lucide="bot" class="mi sm" style="animation: pulseBot 1.5s infinite;"></i>
                    <span id="btn-notificaciones-text">Escribiendo mensaje...</span>
                </div>
            `;
            if (window.lucide) window.lucide.createIcons();
        }
        sendResponse({ status: "typing_received" });
        return true;
    }
});

function showBulkSummaryModal(stats, interrupted = false, failedItems = []) {
    const existing = document.getElementById('ge-bulk-modal');
    if (existing) existing.remove();

    const timeTakenMs = Date.now() - (window.geBotStartTime || Date.now());
    const minutes = Math.floor(timeTakenMs / 60000);
    const seconds = Math.floor((timeTakenMs % 60000) / 1000);
    const timeStr = minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;

    const titleColor = interrupted ? '#d97706' : '#10b981'; // Naranja o Verde
    const headerIcon = interrupted 
        ? `<i data-lucide="alert-triangle" class="mi" style="font-size:40px; color:${titleColor};"></i>`
        : `<i data-lucide="check-circle" class="mi" style="font-size:40px; color:${titleColor};"></i>`;
    const headerTitle = interrupted ? 'Envío Interrumpido' : '¡Campaña Completada!';
    const headerSubtitle = interrupted
        ? 'Se cerró la pestaña de WhatsApp.'
        : 'Resumen de actividad del Robot';

    const modal = document.createElement('div');
    modal.id = 'ge-bulk-modal';
    modal.style.cssText = `
        position: fixed; inset: 0; background: rgba(11,20,26,0.6); backdrop-filter: blur(3px);
        z-index: 999999; display: flex; align-items: center; justify-content: center; padding: 12px;
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    `;

    modal.innerHTML = `
        <div style="background: #f0f2f5; border-radius: 20px; width: 100%; max-width: 350px; overflow: hidden; box-shadow: 0 15px 35px rgba(0,0,0,0.2); animation: gePopIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);">
            
            <div style="padding: 24px 20px 16px; background: white; text-align: center; border-bottom: 1px solid #e9edef;">
                <div style="margin-bottom: 12px; display:flex; justify-content:center;">
                    ${headerIcon}
                </div>
                <h2 style="margin: 0; font-size: 20px; font-weight: 700; color: #111b21;">${headerTitle}</h2>
                <p style="margin: 6px 0 0; color: #667781; font-size: 13px;">${headerSubtitle}</p>
            </div>

            <div style="padding: 20px; background: white;">
                
                <div style="display: flex; gap: 12px; margin-bottom: 20px;">
                    <div style="flex: 1; background: #f8fafb; border: 1px solid #e9edef; border-radius: 12px; padding: 16px 12px; text-align: center;">
                        <div style="font-size: 24px; font-weight: 800; color: #0052cc; line-height: 1;">${stats.sent}</div>
                        <div style="font-size: 10px; color: #8696a0; text-transform: uppercase; font-weight: 700; margin-top: 6px; letter-spacing: 0.5px;">Enviados</div>
                    </div>
                    <div style="flex: 1; background: #fff0f0; border: 1px solid #ffcccc; border-radius: 12px; padding: 16px 12px; text-align: center;">
                        <div style="font-size: 24px; font-weight: 800; color: #cc0000; line-height: 1;">${stats.error}</div>
                        <div style="font-size: 10px; color: #cc0000; text-transform: uppercase; font-weight: 700; margin-top: 6px; letter-spacing: 0.5px;">Errores</div>
                    </div>
                </div>

                <div style="display: flex; justify-content: space-between; align-items: center; padding: 0 4px 10px;">
                    <span style="color: #667781; font-weight: 600; font-size: 13px;"><i data-lucide="users" class="mi xs" style="vertical-align:text-bottom; margin-right:4px;"></i>Total Programado:</span>
                    <span style="color: #111b21; font-weight: 700; font-size: 15px;">${stats.total}</span>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 0 4px 20px; border-bottom: ${failedItems.length > 0 ? '1px solid #e9edef' : 'none'}; margin-bottom: ${failedItems.length > 0 ? '20px' : '0'};">
                    <span style="color: #667781; font-weight: 600; font-size: 13px;"><i data-lucide="clock" class="mi xs" style="vertical-align:text-bottom; margin-right:4px;"></i>Tiempo Tomado:</span>
                    <span style="color: #111b21; font-weight: 700; font-size: 15px;">${timeStr}</span>
                </div>

                ${interrupted ? `<div style="background: #fffbeb; border: 1px solid #fcd34d; border-radius: 10px; padding: 10px 14px; margin-bottom: 20px; font-size: 12px; color: #92400e; font-weight: 600;">
                    ⚠️ Faltaron ${stats.total - stats.sent - stats.error} por enviar
                </div>` : ''}

                ${failedItems.length > 0 ? `
                <div style="margin-bottom: 20px;">
                    <div style="font-size: 11px; color: #667781; text-transform: uppercase; font-weight: 700; letter-spacing: 0.5px; margin-bottom: 10px;">Detalle de Errores</div>
                    <div style="max-height: 130px; overflow-y: auto; border: 1px solid #e9edef; border-radius: 10px; margin-bottom: 12px; background: #fdfdfd;">
                        ${failedItems.map((item, i) => `
                        <div style="display: flex; align-items: center; padding: 8px 12px; ${i < failedItems.length - 1 ? 'border-bottom: 1px solid #e9edef;' : ''}">
                            <i data-lucide="x-circle" class="mi xs" style="color:#cc0000; margin-right:8px; flex-shrink:0;"></i>
                            <div style="min-width:0;">
                                ${item.name ? `<div style="font-size: 12px; font-weight: 600; color: #111b21; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%;">${item.name}</div>` : ''}
                                <div style="font-size: 11px; color: #8696a0;">+${item.phone}</div>
                            </div>
                        </div>`).join('')}
                    </div>
                    <button id="ge-download-errors" style="width: 100%; background: white; color: #cc0000; border: 1px solid #cc0000; border-radius: 10px; padding: 10px; font-size: 13px; font-weight: 600; cursor: pointer; transition: background 0.2s; display: flex; align-items: center; justify-content: center; gap: 6px;">
                        <i data-lucide="download" class="mi sm"></i> Descargar CSV
                    </button>
                </div>` : ''}

                <button id="ge-close-modal" style="width: 100%; background: #0052cc; color: white; border: none; border-radius: 10px; padding: 12px; font-size: 14px; font-weight: 600; cursor: pointer; transition: all 0.2s;">
                    Cerrar Resumen
                </button>
            </div>
        </div>
        <style>
            #ge-close-modal:hover { background: #0043a6 !important; transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,82,204,0.3); }
            #ge-close-modal:active { transform: translateY(0); box-shadow: none; }
            @keyframes gePopIn {
                0% { opacity: 0; transform: scale(0.95) translateY(10px); }
                100% { opacity: 1; transform: scale(1) translateY(0); }
            }
            #ge-close-modal:hover { background: #003087; }
            #ge-download-errors:hover { background: #fff0f0; }
        </style>
    `;

    document.body.appendChild(modal);
    if (window.lucide) window.lucide.createIcons();

    const closeBtn = document.getElementById('ge-close-modal');
    closeBtn.onclick = () => {
        modal.style.opacity = '0';
        modal.style.transform = 'scale(0.95)';
        modal.style.transition = 'all 0.2s ease';
        setTimeout(() => modal.remove(), 200);
    };

    const downloadBtn = document.getElementById('ge-download-errors');
    if (downloadBtn) {
        downloadBtn.onclick = () => {
            let csv = "Nombre,Telefono\n";
            failedItems.forEach(item => {
                csv += `"${item.name || ''}","${item.phone}"\n`;
            });
            const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement("a");
            const url = URL.createObjectURL(blob);
            link.setAttribute("href", url);
            link.setAttribute("download", `errores_whatsapp_${new Date().toISOString().slice(0,10)}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        };
    }
}
