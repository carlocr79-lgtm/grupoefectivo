  async function cartasCargarPendientes() {
    const rol = sessionStorage.getItem('ge_rol') || 'asesor';
    const tabPendientes = document.getElementById('tab-cartas-pendientes');
    if (rol !== 'admin') {
      if (tabPendientes) tabPendientes.style.display = 'none';
      return;
    }
    if (tabPendientes) tabPendientes.style.display = 'flex'; // Mostrar la pestaña para admins

    // FIX: caché de 30s — evita llamadas innecesarias al cambiar de sección
    const _ahora = Date.now();
    if (_ahora - _cartasPendientesTs < 30000) return;
    _cartasPendientesTs = _ahora;

    const container = document.getElementById('cartas-pendientes-container');
    const badge = document.getElementById('cartas-pendientes-badge');
    
    let skHTML = '';
    for(let i=0; i<2; i++) {
      skHTML += `<div class="skeleton-box" style="margin:16px;"><div class="skeleton sk-avatar"></div><div style="flex:1;"><div class="skeleton sk-line w-30"></div><div class="skeleton sk-line w-100"></div></div><div class="skeleton" style="width:120px;height:30px;border-radius:8px;"></div></div>`;
    }
    container.innerHTML = skHTML;

    try {
      // Al no enviar sedeContexto, el backend devolverá las solicitudes pendientes de TODAS las sedes
      const resp = await apiFetch({ admin: 'cartas_pendientes' });
      // FIX: console.log removido — no exponer datos de clientes en producción
      
      const numPendientes = (Array.isArray(resp)) ? resp.length : 0;
      
      // Actualizar el Badge de la pestaña
      if (badge) {
        if (numPendientes > 0) {
          badge.textContent = numPendientes;
          badge.style.display = 'inline-block';
        } else {
          badge.style.display = 'none';
        }
      }
      
      if (numPendientes === 0) {
        container.innerHTML = `
          <div class="empty">
            <div class="icon">
              <i data-lucide="circle-check" class="mi" style="font-size:40px;color:var(--azul);"></i>
            </div>
            <strong>Todo al día</strong><br>
            <small>No hay solicitudes de Cartas de No Adeudo pendientes de aprobación.</small>
          </div>
        `;
        return;
      }

      let html = `
        <div style="background:#fff0f0; border:1px solid rgba(222,53,11,0.2); border-radius:12px; overflow:hidden;">
          <div style="background:rgba(222,53,11,0.1); padding:10px 16px; font-weight:700; color:var(--rojo); display:flex; align-items:center; gap:8px; font-size:14px; border-bottom:1px solid rgba(222,53,11,0.2);">
            <i data-lucide="bell-ring" class="mi" style="font-size:18px;"></i> Solicitudes Pendientes (${resp.length})
          </div>
          <div style="padding:12px 16px; display:flex; flex-direction:column; gap:8px;">
      `;

      resp.forEach(p => {
        // FIX XSS: escapar todos los valores del servidor
        const eN = escHtml(p.nombres);
        const eC = escHtml(p.codCliente);
        const eCel = escHtml(p.celular || '');
        const eOf = escHtml(p.oficina);
        const eAs = escHtml(p.asesor);
        const eFe = escHtml(p.fecha);
        html += `
          <div style="background:white; border:1px solid var(--gris2); border-radius:8px; padding:12px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px; box-shadow:0 1px 3px rgba(0,0,0,0.05);">
            <div>
              <div style="font-weight:700; color:var(--texto); font-size:13px; display:flex; align-items:center; gap:6px;">
                <i data-lucide="alert-triangle" class="mi xs" style="color:var(--rojo);"></i> ${eN}
              </div>
              <div style="font-size:11px; color:var(--texto2); margin-top:4px; display:flex; gap:8px; flex-wrap:wrap;">
                <span style="background:var(--azul-claro); color:var(--azul); padding:2px 6px; border-radius:4px; font-weight:600;">Cód. ${eC}</span>
                <span>Oficina: <b>${eOf}</b></span>
                <span>Por: <b>${eAs}</b></span>
                <span>${eFe}</span>
              </div>
            </div>
            <button onclick="cartasSolicitarCarta('${eC}', '${eN}', '${eCel}', event)" style="background:var(--verde); color:white; border:none; padding:8px 12px; border-radius:8px; font-weight:600; font-size:12px; cursor:pointer; display:flex; align-items:center; gap:4px; box-shadow:0 2px 5px rgba(0,135,90,0.25);">
              <i data-lucide="check-circle" class="mi xs"></i> Aprobar y Generar
            </button>
          </div>
        `;
      });

      html += `</div></div>`;
      container.innerHTML = html;
      
    } catch (e) {
      console.error(e);
      container.innerHTML = `
        <div style="background:#fff0f0; border:1px solid rgba(222,53,11,0.2); border-radius:12px; padding:16px; text-align:center; color:var(--rojo);">
          <i data-lucide="alert-circle" class="mi" style="font-size:24px; margin-bottom:4px;"></i>
          <div style="font-weight:600; font-size:12px;">Error al cargar solicitudes</div>
          <div style="font-size:11px; opacity:0.8;">Por favor intente nuevamente</div>
        </div>
      `;
      container.style.display = 'block';
    }
  }

  let _cartasResultados = [];

  function cartasRenderResultados(data) {
    const container = document.getElementById('cartas-resultados');
    _cartasResultados = data || [];
    let html = '';

    data.forEach(function(c) {
      // FIX XSS: escapar todos los valores del servidor
      const eNombres    = escHtml(c.nombres);
      const eCodCliente = escHtml(c.codCliente);
      const eCelular    = escHtml(c.celular || '');
      const eFileId     = escHtml(c.fileId || '');
      const eCancelados = escHtml(c.cancelados || '');
      const eDiasReac   = escHtml(c.diasReactivacion || '0');

      // Color del icono basado en calificación
      const cal = (c.calificacion || '').toUpperCase();
      let iconBg = 'var(--gris2)';
      let iconColor = 'var(--texto2)';
      if (cal === 'PUNTUAL') {
        iconBg = 'var(--azul-claro)';
        iconColor = 'var(--azul)';
      } else if (cal === 'NORMAL') {
        iconBg = 'var(--naranja-claro)';
        iconColor = 'var(--naranja)';
      }

      // Construcción de botones de acción
      const esAdmin = (sessionStorage.getItem('ge_rol') || 'asesor') === 'admin';
      
      let btnWsp = '';
      let btnPreview = '';
      let btnAction = '';
      const waSvgDisabled = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" width="16" height="16" fill="var(--gris2)" style="pointer-events:none;"><path d="M380.9 97.1C339 55.1 283.2 32 223.9 32c-122.4 0-222 99.6-222 222 0 39.1 10.2 77.3 29.6 111L0 480l117.7-30.9c32.4 17.7 68.9 27 106.1 27h.1c122.3 0 224.1-99.6 224.1-222 0-59.3-25.2-115-67.1-157zm-157 341.6c-33.2 0-65.7-8.9-94-25.7l-6.7-4-69.8 18.3L72 359.2l-4.4-7c-18.5-29.4-28.2-63.3-28.2-98.2 0-101.7 82.8-184.5 184.6-184.5 49.3 0 95.6 19.2 130.4 54.1 34.8 34.9 56.2 81.2 56.1 130.5 0 101.8-84.9 184.6-186.6 184.6zm101.2-138.2c-5.5-2.8-32.8-16.2-37.9-18-5.1-1.9-8.8-2.8-12.5 2.8-3.7 5.6-14.3 18-17.6 21.8-3.2 3.7-6.5 4.2-12 1.4-32.6-16.3-54-29.1-75.5-66-5.7-9.8 5.7-9.1 16.3-30.3 1.8-3.7.9-6.9-.5-9.7-1.4-2.8-12.5-30.1-17.1-41.2-4.5-10.8-9.1-9.3-12.5-9.5-3.2-.2-6.9-.2-10.6-.2-3.7 0-9.7 1.4-14.8 6.9-5.1 5.6-19.4 19-19.4 46.3 0 27.3 19.9 53.7 22.6 57.4 2.8 3.7 39.1 59.7 94.8 83.8 35.2 15.2 49 16.5 66.6 13.9 10.7-1.6 32.8-13.4 37.4-26.4 4.6-13 4.6-24.1 3.2-26.4-1.3-2.5-5-3.9-10.5-6.6z"/></svg>`;
      const waSvgActive = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" width="16" height="16" fill="var(--texto2)" style="pointer-events:none;"><path d="M380.9 97.1C339 55.1 283.2 32 223.9 32c-122.4 0-222 99.6-222 222 0 39.1 10.2 77.3 29.6 111L0 480l117.7-30.9c32.4 17.7 68.9 27 106.1 27h.1c122.3 0 224.1-99.6 224.1-222 0-59.3-25.2-115-67.1-157zm-157 341.6c-33.2 0-65.7-8.9-94-25.7l-6.7-4-69.8 18.3L72 359.2l-4.4-7c-18.5-29.4-28.2-63.3-28.2-98.2 0-101.7 82.8-184.5 184.6-184.5 49.3 0 95.6 19.2 130.4 54.1 34.8 34.9 56.2 81.2 56.1 130.5 0 101.8-84.9 184.6-186.6 184.6zm101.2-138.2c-5.5-2.8-32.8-16.2-37.9-18-5.1-1.9-8.8-2.8-12.5 2.8-3.7 5.6-14.3 18-17.6 21.8-3.2 3.7-6.5 4.2-12 1.4-32.6-16.3-54-29.1-75.5-66-5.7-9.8 5.7-9.1 16.3-30.3 1.8-3.7.9-6.9-.5-9.7-1.4-2.8-12.5-30.1-17.1-41.2-4.5-10.8-9.1-9.3-12.5-9.5-3.2-.2-6.9-.2-10.6-.2-3.7 0-9.7 1.4-14.8 6.9-5.1 5.6-19.4 19-19.4 46.3 0 27.3 19.9 53.7 22.6 57.4 2.8 3.7 39.1 59.7 94.8 83.8 35.2 15.2 49 16.5 66.6 13.9 10.7-1.6 32.8-13.4 37.4-26.4 4.6-13 4.6-24.1 3.2-26.4-1.3-2.5-5-3.9-10.5-6.6z"/></svg>`;

      if (c.estadoCarta === 'SOLICITADA') {
        btnWsp = `<button disabled class="mov-btn" style="opacity:0.4; cursor:not-allowed;" title="No disponible">${waSvgDisabled}</button>`;
        btnPreview = `<button disabled class="mov-btn" style="opacity:0.4; cursor:not-allowed;" title="No disponible"><i data-lucide="eye" class="mi sm" style="color:var(--gris2);"></i></button>`;
        if (!esAdmin) {
          btnAction = `<div class="mov-btn" style="cursor:default; background:var(--naranja-claro); border-color:#fdba74;" title="Pendiente de Aprobación"><i data-lucide="clock-8" class="mi sm" style="color:var(--naranja); stroke-width:2.5;"></i></div>`;
        } else {
          btnAction = `<button onclick="cartasSolicitarCarta('${eCodCliente}', '${eNombres}', '${eCelular}', event)" class="mov-btn" style="background:linear-gradient(135deg, #22c55e, #16a34a); color:white; box-shadow:0 3px 8px rgba(22,163,74,0.25); border:none;" title="Aprobar y Generar Carta"><i data-lucide="check" class="mi sm" style="stroke-width:2.5;"></i></button>`;
        }
      } else if (c.estadoCarta === 'EMITIDA' && c.fileId) {
        btnWsp = `<button onclick="cartasEnviarWA('${eFileId}', '${eNombres}', '${eCelular}', event)" class="mov-btn" title="Enviar por WhatsApp">${waSvgActive}</button>`;
        btnPreview = `<button onclick="cartasAbrirPreview('${eFileId}', '${eNombres}', '${eCodCliente}', '${eCelular}', event)" class="mov-btn" title="Vista Previa"><i data-lucide="eye" class="mi sm" style="color:var(--azul-oscuro);"></i></button>`;
        btnAction = `<div class="mov-btn" style="cursor:default; background:#f0fdf4; border-color:#bbf7d0;" title="Carta Emitida"><i data-lucide="check-circle-2" class="mi sm" style="color:#10b981; stroke-width:2.5;"></i></div>`;
      } else {
        btnWsp = `<button disabled class="mov-btn" style="opacity:0.4; cursor:not-allowed;" title="No disponible">${waSvgDisabled}</button>`;
        btnPreview = `<button disabled class="mov-btn" style="opacity:0.4; cursor:not-allowed;" title="No disponible"><i data-lucide="eye" class="mi sm" style="color:var(--gris2);"></i></button>`;
        if (!esAdmin) {
          btnAction = `<button onclick="cartasSolicitarAprobacion('${eCodCliente}', '${eNombres}', event)" class="mov-btn" style="background:linear-gradient(135deg, var(--azul2), var(--azul)); color:white; box-shadow:0 3px 8px rgba(0,82,204,0.25); border:none;" title="Solicitar Carta"><i data-lucide="circle-plus" class="mi sm" style="stroke-width:2.5;"></i></button>`;
        } else {
          btnAction = `<button onclick="cartasSolicitarCarta('${eCodCliente}', '${eNombres}', '${eCelular}', event)" class="mov-btn" style="background:linear-gradient(135deg, var(--azul2), var(--azul)); color:white; box-shadow:0 3px 8px rgba(0,82,204,0.25); border:none;" title="Generar Carta Directamente"><i data-lucide="file-check-2" class="mi sm" style="stroke-width:2;"></i></button>`;
        }
      }

      let accionesHtml = `
        <div class="mov-acciones" style="display:flex; align-items:center; gap:8px;">
          ${btnAction}
          ${btnWsp}
          ${btnPreview}
          <button onclick="cartasAbrirDrawer('${eCodCliente}', event)" class="mov-btn" title="Ver detalles"><i data-lucide="chevron-right" class="mi sm"></i></button>
        </div>
      `;

      let cardStyle = '';

      if (c.estadoCarta === 'SOLICITADA') {
        cardStyle = 'background:linear-gradient(to right, #fff7ed, #ffffff); border:1px solid #fed7aa; box-shadow:0 2px 8px rgba(249,115,22,0.03);';
      } else if (c.estadoCarta === 'EMITIDA') {
        cardStyle = 'background:linear-gradient(to right, #f0fdf4, #ffffff); border:1px solid #bbf7d0; box-shadow:0 2px 8px rgba(34,197,94,0.03);';
      } else {
        cardStyle = 'background:#ffffff; border:1px solid var(--gris2); box-shadow:var(--shadow-sm);';
      }

      html += `
      <div class="mov-card" style="padding:14px 16px; display:flex; align-items:center; justify-content:space-between; gap:16px; ${cardStyle} transition:all 0.25s;">
        <div class="mov-left" style="overflow:hidden; cursor:pointer; flex:1; display:flex; align-items:center; gap:12px;" onclick="cartasAbrirDrawer('${eCodCliente}')">
          <div class="mov-icon" style="background:${iconBg}; color:${iconColor}; flex-shrink:0;"><i data-lucide="user" class="mi"></i></div>
          <div class="mov-info" style="display:flex; flex-direction:row; align-items:center; gap:12px; overflow:hidden;">
            <div style="font-size:11px; color:var(--texto2); font-weight:600; white-space:nowrap;">Código: ${eCodCliente}</div>
            <div class="mov-desc" style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis; font-weight:700; color:var(--texto); line-height:1; font-size:13px;">${eNombres}</div>
          </div>
        </div>
        <div class="mov-right" style="gap:12px; align-items:center; flex-shrink:0; display:flex; flex-direction:row;">
          ${accionesHtml}
        </div>
      </div>
      `;
    });

    container.innerHTML = html;
    if (window.lucide) lucide.createIcons();
  }

  function cartasAbrirDrawer(codCliente, event) {
    if (event) event.stopPropagation();
    const data = _cartasResultados.find(c => String(c.codCliente).trim() === String(codCliente).trim());
    if (!data) return;

    // Rellenar cabecera
    document.getElementById('dr-cartas-nombre').textContent = data.nombres || 'Sin nombre';
    document.getElementById('dr-cartas-sub').textContent = 'Código: ' + data.codCliente;

    // Rellenar detalles
    let drEstado = '<span style="color:var(--texto2);font-weight:700;">SIN SOLICITAR</span>';
    if (data.estadoCarta === 'EMITIDA') drEstado = '<span style="color:var(--verde);font-weight:700;">EMITIDA</span>';
    else if (data.estadoCarta === 'SOLICITADA') drEstado = '<span style="color:var(--naranja);font-weight:700;">SOLICITADA</span>';
    document.getElementById('dr-cartas-estado').innerHTML = drEstado;

    const cal = (data.calificacion || '').toUpperCase();
    let drCalif = `<span style="color:var(--texto2);font-weight:700;">${cal || 'NO REGISTRA'}</span>`;
    if (cal === 'PUNTUAL') drCalif = '<span style="color:var(--azul);font-weight:700;">PUNTUAL</span>';
    else if (cal === 'NORMAL') drCalif = '<span style="color:var(--naranja);font-weight:700;">NORMAL</span>';
    document.getElementById('dr-cartas-calif').innerHTML = drCalif;

    document.getElementById('dr-cartas-celular').textContent = data.celular || '-';
    document.getElementById('dr-cartas-ultcred').textContent = data.ultCreditos || '-';
    document.getElementById('dr-cartas-fdesemb').textContent = data.fDesembolso || '-';
    document.getElementById('dr-cartas-fcancel').textContent = data.fCancelacion || '-';
    
    const actBox = document.getElementById('dr-cartas-activos');
    if (data.activos && String(data.activos).toLowerCase() !== 'ninguno') {
      actBox.style.color = 'var(--rojo)';
      actBox.style.fontWeight = 'bold';
    } else {
      actBox.style.color = '';
      actBox.style.fontWeight = '';
    }
    actBox.textContent = data.activos || 'Ninguno';

    // Rellenar observaciones
    document.getElementById('dr-cartas-obs').textContent = data.observaciones || 'Sin observaciones';

    // Mostrar drawer
    document.getElementById('drawer-overlay-cartas').classList.add('open');
    document.getElementById('drawer-cartas').classList.add('open');
  }

  function cartasCerrarDrawer() {
    document.getElementById('drawer-overlay-cartas').classList.remove('open');
    document.getElementById('drawer-cartas').classList.remove('open');
  }

  async function cartasSolicitarCarta(codCliente, nombres, celular, event) {
    if (event) event.preventDefault();

    // 1. Abrir modal inmediatamente con el estado de carga Premium
    const box = document.querySelector('#modal-sustento .modal-sustento-box');
    if (box) {
      box.style.maxWidth = '760px';
      box.style.height = '92vh';
      box.style.display = 'flex';
      box.style.flexDirection = 'column';
    }

    const cont = document.getElementById('ms-contenido');
    cont.innerHTML = `
      <div id="preview-loader" style="flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; background:#f8fafc; border-radius:8px; transition:opacity 0.4s ease;">
        <div style="position:relative; width:48px; height:48px; display:flex; align-items:center; justify-content:center; margin-bottom:14px;">
          <div class="spinner-sm" style="position:absolute; width:100%; height:100%; border-color:#e2e8f0; border-right-color:var(--azul); border-width:2px; border-radius:50%;"></div>
          <div id="preview-percent" style="font-weight:700; font-size:12px; color:var(--azul);">0%</div>
        </div>
        <div style="color:var(--texto); font-size:13px; font-weight:600; letter-spacing:-0.2px;">Generando documento...</div>
      </div>
    `;
    document.getElementById('modal-sustento').classList.add('show');

    let perc = 0;
    const percEl = document.getElementById('preview-percent');
    const interval = setInterval(() => {
      if (perc < 92) {
        perc += Math.floor(Math.random() * 12) + 4;
        if (perc > 92) perc = 92;
        if (percEl) percEl.textContent = perc + '%';
      }
    }, 150);

    try {
      const resp = await apiPost({ 
        adminAction: 'cartas_solicitar', 
        cliente: nombres, 
        codigo: codCliente,
        sede: cajaSedeActual || '' 
      });

      clearInterval(interval);

      if (resp && resp.error) {
        cont.innerHTML = `
          <div style="flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; background:#fff0f0; border-radius:8px; border:1px solid rgba(222,53,11,0.2); color:var(--rojo);">
            <i data-lucide="alert-circle" class="mi" style="font-size:32px; margin-bottom:8px;"></i>
            <div style="font-weight:600;">Error: ${resp.error}</div>
          </div>
        `;
        if (window.lucide) lucide.createIcons();
        return;
      }

      if (resp && resp.success && resp.pdfBase64) {
        if (percEl) percEl.textContent = '100%';
        setTimeout(() => {
          cartasPreviewBase64(resp.pdfBase64, nombres, codCliente, resp.fileId, celular);
        }, 150);
        
        // Actualizar listas en segundo plano
        setTimeout(() => {
          _cartasPendientesTs = 0;
          cartasCargarPendientes();
          
          const searchBtn = document.getElementById('btn-search-cartas');
          const searchInp = document.getElementById('search-cartas');
          if (searchBtn && searchInp && searchInp.value.trim().length >= 3) {
            searchBtn.click(); // Refrescar vista de resultados
          }
        }, 500);
      } else {
         throw new Error("Respuesta inválida");
      }
    } catch (e) {
      clearInterval(interval);
      console.error(e);
      cont.innerHTML = `
        <div style="flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; background:#fff0f0; border-radius:8px; border:1px solid rgba(222,53,11,0.2); color:var(--rojo);">
          <i data-lucide="wifi-off" class="mi" style="font-size:32px; margin-bottom:8px;"></i>
          <div style="font-weight:600;">Ocurrió un error al generar la carta.</div>
        </div>
      `;
      if (window.lucide) lucide.createIcons();
    }
  }

  async function cartasSolicitarAprobacion(codCliente, nombres, event) {
    const btn = event.currentTarget;
    const originalHtml = btn.innerHTML;
    btn.innerHTML = '<i data-lucide="loader-circle" class="mi sm" style="animation:spin 1s linear infinite;"></i>';
    if (window.lucide) lucide.createIcons();
    btn.disabled = true;

    try {
      const resp = await apiPost({ 
        adminAction: 'cartas_solicitar_aprobacion', 
        codigo: codCliente,
        cliente: nombres
      });

      if (resp && resp.error) {
        alert('Error: ' + resp.error);
        btn.innerHTML = originalHtml;
        btn.disabled = false;
        return;
      }

      if (resp && resp.success) {
        btn.outerHTML = `<button disabled class="mov-btn" title="Pendiente de Aprobación"><i data-lucide="hourglass" class="mi sm"></i></button>`;
        lucide.createIcons();
      }
    } catch (e) {
      console.error(e);
      alert('Ocurrió un error al enviar la solicitud.');
      btn.innerHTML = originalHtml;
      btn.disabled = false;
    }
  }

  async function cartasDescargarExistente(fileId, nombres, codCliente, event) {
    const btn = event.currentTarget;
    const originalHtml = btn.innerHTML;
    btn.innerHTML = '<i data-lucide="loader-circle" class="mi sm" style="animation:spin 1s linear infinite;"></i>';
    if (window.lucide) lucide.createIcons();
    btn.disabled = true;

    try {
      const resp = await apiPost({ 
        adminAction: 'cartas_descargar_existente', 
        fileId: fileId
      });

      if (!resp) {
        // Fallback si la sesión expiró o hubo un error silencioso
        btn.innerHTML = originalHtml;
        btn.disabled = false;
        return;
      }

      if (resp.error) {
        alert('Error: ' + resp.error);
        btn.innerHTML = originalHtml;
        btn.disabled = false;
        return;
      }

      if (resp.success && resp.pdfBase64) {
        // Convertir Base64 a Blob y descargar
        const byteCharacters = atob(resp.pdfBase64);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], {type: 'application/pdf'});
        
        const link = document.createElement('a');
        link.href = window.URL.createObjectURL(blob);
        link.download = resp.filename || ('Carta_No_Adeudo_' + codCliente + '.pdf');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        btn.innerHTML = originalHtml;
        btn.disabled = false;
      } else {
        // Si no hubo error pero tampoco éxito o faltó el pdfBase64
        alert('No se pudo descargar el archivo. Respuesta incompleta.');
        btn.innerHTML = originalHtml;
        btn.disabled = false;
      }
    } catch (e) {
      console.error(e);
      alert('Ocurrió un error al descargar la carta. Verifica tu conexión o intenta nuevamente.');
      btn.innerHTML = originalHtml;
      btn.disabled = false;
    }
  }

  function cartasPreviewBase64(pdfBase64, nombres, codCliente, fileId, celular) {
    const byteCharacters = atob(pdfBase64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], {type: 'application/pdf'});
    if (_cartasBlobUrl) { URL.revokeObjectURL(_cartasBlobUrl); }
    _cartasBlobUrl = URL.createObjectURL(blob);
    const previewSrc = _cartasBlobUrl;

    // Aumentar el tamaño del modal para la carta y forzar altura completa
    const box = document.querySelector('#modal-sustento .modal-sustento-box');
    if (box) {
      box.style.maxWidth = '760px';
      box.style.height = '92vh';
      box.style.display = 'flex';
      box.style.flexDirection = 'column';
    }

    const cont = document.getElementById('ms-contenido');
    const iframeHtml = `
      <iframe src="${previewSrc}" id="preview-iframe" style="width:100%; height:100%; flex:1; border:none; border-radius:8px; background:#f8fafc; opacity:0; transition:opacity 0.6s ease;" allowfullscreen></iframe>
    `;

    const loader = document.getElementById('preview-loader');
    if (loader) {
      loader.style.opacity = '0';
      setTimeout(() => {
        cont.innerHTML = iframeHtml;
        setTimeout(() => {
          const frame = document.getElementById('preview-iframe');
          if (frame) frame.style.opacity = '1';
        }, 50);
      }, 400);
    } else {
      cont.innerHTML = iframeHtml;
      setTimeout(() => {
        const frame = document.getElementById('preview-iframe');
        if (frame) frame.style.opacity = '1';
      }, 50);
    }
    document.getElementById('modal-sustento').classList.add('show');
  }

  async function cartasAbrirPreview(fileId, nombres, codCliente, celular, event) {
    if (event && typeof event.stopPropagation === 'function') event.stopPropagation();
    
    // 1. Abrir modal instantáneamente
    const box = document.querySelector('#modal-sustento .modal-sustento-box');
    if (box) {
      box.style.maxWidth = '760px';
      box.style.height = '92vh';
      box.style.display = 'flex';
      box.style.flexDirection = 'column';
    }

    const cont = document.getElementById('ms-contenido');
    cont.innerHTML = `
      <div id="preview-loader" style="flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; background:#f8fafc; border-radius:8px; transition:opacity 0.4s ease;">
        <div style="position:relative; width:48px; height:48px; display:flex; align-items:center; justify-content:center; margin-bottom:14px;">
          <div class="spinner-sm" style="position:absolute; width:100%; height:100%; border-color:#e2e8f0; border-right-color:var(--azul); border-width:2px; border-radius:50%;"></div>
          <div id="preview-percent" style="font-weight:700; font-size:12px; color:var(--azul);">0%</div>
        </div>
        <div style="color:var(--texto); font-size:13px; font-weight:600; letter-spacing:-0.2px;">Abriendo documento...</div>
      </div>
    `;
    document.getElementById('modal-sustento').classList.add('show');

    // Simular progreso de descarga
    let perc = 0;
    const percEl = document.getElementById('preview-percent');
    const interval = setInterval(() => {
      if (perc < 92) {
        perc += Math.floor(Math.random() * 12) + 4; // Aumentar en saltos aleatorios
        if (perc > 92) perc = 92;
        if (percEl) percEl.textContent = perc + '%';
      }
    }, 150);

    // 2. Cargar en segundo plano
    try {
      const resp = await apiPost({ 
        adminAction: 'cartas_descargar_existente', 
        fileId: fileId
      });

      clearInterval(interval);

      if (resp && resp.success && resp.pdfBase64) {
        if (percEl) percEl.textContent = '100%';
        setTimeout(() => {
          cartasPreviewBase64(resp.pdfBase64, nombres, codCliente, fileId, celular);
        }, 150); // Pequeña pausa visual en el 100%
      } else {
        cont.innerHTML = `
          <div style="flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; background:#fff0f0; border-radius:8px; border:1px solid rgba(222,53,11,0.2); color:var(--rojo);">
            <i data-lucide="alert-circle" class="mi" style="font-size:32px; margin-bottom:8px;"></i>
            <div style="font-weight:600;">Error al cargar el documento.</div>
          </div>
        `;
        if (window.lucide) lucide.createIcons();
      }
    } catch(e) {
      clearInterval(interval);
      console.error(e);
      cont.innerHTML = `
        <div style="flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; background:#fff0f0; border-radius:8px; border:1px solid rgba(222,53,11,0.2); color:var(--rojo);">
          <i data-lucide="wifi-off" class="mi" style="font-size:32px; margin-bottom:8px;"></i>
          <div style="font-weight:600;">Error de conexión.</div>
        </div>
      `;
      if (window.lucide) lucide.createIcons();
    }
  }

  function cartasEnviarWA(fileId, nombres, celular, event) {
    // FIX #4: Manejo seguro de event para evitar errores en llamadas desde modal inline
    if (event && typeof event.stopPropagation === 'function') {
      event.stopPropagation();
    }
    
    let phone = (celular || '').toString().trim();
    if (!phone) {
      phone = prompt('El cliente no tiene celular registrado. Ingrese el número (ej. 987654321):');
      if (!phone) return; // Cancelado por el usuario
      phone = phone.replace(/\s/g, '');
    }

    // FIX #5: validar que el número tenga exactamente 9 dígitos
    if (!/^\d{9}$/.test(phone)) {
      alert('Número inválido. Debe tener exactamente 9 dígitos (ej. 987654321).');
      return;
    }

    // Sanitizar número
    if (!phone.startsWith('51') && phone.length === 9) {
      phone = '51' + phone;
    }

    const driveLink = `https://drive.google.com/file/d/${fileId}/view?usp=sharing`;
    const mensaje = `¡Hola *${nombres}*! Le saludamos de *Grupo Efectivo*. Adjuntamos su Carta de No Adeudo correspondiente: ${driveLink}`;

    const linkWA = `https://web.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(mensaje)}`;
    const linkWAMovil = `https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(mensaje)}`;

    enviarWA(linkWAMovil, linkWA);
  }



  // Hacer las funciones accesibles globalmente desde el HTML
  window.cartasBuscarDebounce = cartasBuscarDebounce;
  window.cartasBuscar = cartasBuscar;
  window.toggleCartasClearBtn = toggleCartasClearBtn;
  window.limpiarBuscadorCartas = limpiarBuscadorCartas;
  window.cartasAbrirDrawer = cartasAbrirDrawer;
  window.cartasCerrarDrawer = cartasCerrarDrawer;
  window.cartasSolicitarCarta = cartasSolicitarCarta;
  window.cartasSolicitarAprobacion = cartasSolicitarAprobacion;
  window.cartasDescargarExistente = cartasDescargarExistente;
  window.cartasAbrirPreview = cartasAbrirPreview;
  window.cartasPreviewBase64 = cartasPreviewBase64;
  window.cartasEnviarWA = cartasEnviarWA;
  window.cartasSwitchTab = cartasSwitchTab;

