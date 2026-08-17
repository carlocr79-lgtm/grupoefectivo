  window.cartasCargarPendientes = async function(forceRefresh = false) {
    const rol = sessionStorage.getItem('ge_rol') || 'asesor';
    const tabPendientes = document.getElementById('tab-clientes-cartas-pendientes');

    // FIX: caché de 30s — evita llamadas innecesarias al cambiar de sección
    const _ahora = Date.now();
    if (typeof window._cartasPendientesTs === 'undefined') window._cartasPendientesTs = 0;
    if (!forceRefresh && (_ahora - window._cartasPendientesTs < 30000)) return;
    window._cartasPendientesTs = _ahora;

    const container = document.getElementById('cartas-pendientes-container');
    const badge = document.getElementById('cartas-pendientes-badge');
    
    let skHTML = '';
    for(let i=0; i<2; i++) {
      skHTML += `<div class="cliente-card d-flex justify-between align-center" style="padding:12px 16px; margin-bottom:8px; cursor:default;"><div class="d-flex align-center gap-4"><div class="skeleton" style="width:36px; height:36px; border-radius:50%; flex-shrink:0;"></div><div class="d-flex flex-col" style="gap:8px;"><div class="skeleton sk-line" style="width:160px; margin:0;"></div><div class="skeleton sk-line" style="width:120px; height:10px; margin:0;"></div></div></div><div class="d-flex align-center gap-4 d-none d-sm-flex"><div class="skeleton sk-line" style="width:60px; margin:0;"></div><div class="d-flex gap-2"><div class="skeleton" style="width:32px; height:32px; border-radius:8px;"></div><div class="skeleton" style="width:32px; height:32px; border-radius:8px;"></div></div></div></div>`;
    }
    container.innerHTML = skHTML;

    try {
      // Usar la sede actual en la petición para filtrar por oficina
      const sedeReq = typeof cajaSedeActual !== 'undefined' ? cajaSedeActual : '';
      const resp = await apiFetch({ admin: 'cartas_pendientes', sedeContexto: sedeReq });
      window._cartasPendientesData = resp || [];
      
      window.renderCartasPendientes();
    } catch (e) {
      console.error(e);
      container.innerHTML = `
        <div class="text-center"  style="background:var(--alert-danger-light); border:1px solid rgba(222,53,11,0.2); border-radius:12px; padding:16px; color:var(--rojo);">
          <i class="mi mb-1" data-lucide="alert-circle"   style="font-size:24px;"></i>
          <div class="font-semibold text-base" >Error al cargar solicitudes</div>
          <div class="text-sm"  style="opacity:0.8;">Por favor intente nuevamente</div>
        </div>
      `;
      container.style.display = 'block';
    }
  }

  window.renderCartasPendientes = function() {
      const container = document.getElementById('cartas-pendientes-container');
      const badge = document.getElementById('cartas-pendientes-badge');
      const data = window._cartasPendientesData || [];
      
      window.filtroEstadoCartas = window.filtroEstadoCartas || 'SOLICITADA';

      const busqueda = document.getElementById('buscar-cartas') ? document.getElementById('buscar-cartas').value.toUpperCase() : '';
      
      let filteredData = data.filter(c => {
        const estadoC = (c.estado || '').toUpperCase().trim();
        const estadoFiltro = (window.filtroEstadoCartas || 'SOLICITADA').toUpperCase().trim();
        const matchEstado = estadoC === estadoFiltro;
        const matchBusqueda = !busqueda || 
                              (c.nombres && c.nombres.toUpperCase().includes(busqueda)) || 
                              (c.celular && c.celular.includes(busqueda)) ||
                              (c.codCliente && c.codCliente.toString().toUpperCase().includes(busqueda));
        return matchEstado && matchBusqueda;
      });

      // FIX: El número del badge debe reflejar solo las que están en estado "SOLICITADA" (sin filtrar)
      const soloPendientes = data.filter(p => p.estado === 'SOLICITADA').length;
      
      // Actualizar el contador de resultados
      const contador = document.getElementById('contador-cartas');
      if (contador) {
        if (filteredData.length > 0) {
          contador.innerHTML = `<span style="color:var(--brand-secondary);">${filteredData.length}</span>`;
        } else {
          contador.innerHTML = `<i data-lucide="file-text" class="mi sm"></i>`;
        }
        if (window.lucide) window.lucide.createIcons();
      }
      
      // Actualizar el Badge de la pestaña
      if (badge) {
        if (soloPendientes > 0) {
          badge.textContent = soloPendientes;
          badge.style.display = 'inline-block';
        } else {
          badge.style.display = 'none';
        }
      }
      
      if (filteredData.length === 0) {
          const mensajeVacio = window.filtroEstadoCartas === 'SOLICITADA' 
            ? 'Aún no hay solicitudes pendientes en esta categoría.' 
            : 'Aún no hay cartas emitidas en esta categoría.';
            
          container.innerHTML = `
            <div style="background-color: #fcedec; border: 1px solid #f5363e; padding: 12px; margin-top: 15px; border-radius: 4px; text-align: center;">
              <span style="color: #555; font-size: 0.9rem; font-weight: 500;">${mensajeVacio}</span>
            </div>
          `;
          return;
        }
      
      let html = `<div class="d-flex flex-col gap-2" >`;

      const esAdmin = (sessionStorage.getItem('ge_rol') || 'asesor') === 'admin';

      filteredData.forEach(p => {
        // FIX XSS: escapar todos los valores del servidor
        const eN = escHtml(p.nombres);
        const eC = escHtml(p.codCliente);
        const eCel = escHtml(p.celular || '');
        const eOf = escHtml(p.oficina);
        const eAs = escHtml(p.asesor);
        const eFe = escHtml(p.fecha);
        const estado = escHtml(p.estado || 'SOLICITADA');
        const fileId = escHtml(p.fileId || '');
        
        let cardBg = 'white';
        let cardBorder = 'var(--gris2)';
        let iconHtml = '';
        let estadoBadge = '';
        let btnHtml = '';

        if (estado === 'SOLICITADA') {
          cardBg = 'var(--alert-danger-light)';
          cardBorder = 'rgba(222,53,11,0.2)';
          iconHtml = `<i data-lucide="alert-triangle" class="mi xs" style="color:var(--rojo);"></i>`;
          estadoBadge = `<span class="text-white font-semibold text-xs"  style="background:var(--rojo); padding:2px 6px; border-radius:4px;">PENDIENTE</span>`;
          if (esAdmin) {
            btnHtml = `
              <button class="text-white font-semibold text-base cursor-pointer d-flex align-center gap-1" onclick="cartasSolicitarCarta('${eC}', '${eN}', '${eCel}', event)"  style="background:var(--verde); border:none; padding:8px 12px; border-radius:8px; box-shadow:0 2px 5px rgba(0,135,90,0.25);">
                <i data-lucide="check-circle" class="mi xs"></i> Aprobar
              </button>
            `;
          } else {
            btnHtml = `
              <div class="font-semibold text-base d-flex align-center gap-1"  style="background:var(--alert-warning-light); color:var(--alert-warning-dark); border:1px solid var(--alert-warning-border); padding:8px 12px; border-radius:8px; cursor:not-allowed; opacity:0.9;" title="Solo el administrador puede aprobar">
                <i data-lucide="clock-8" class="mi xs"></i> Pendiente
              </div>
            `;
          }
        } else if (estado === 'EMITIDA') {
          cardBg = 'var(--alert-success-light)';
          cardBorder = 'var(--alert-success-border)';
          iconHtml = `<i data-lucide="check-circle-2" class="mi xs" style="color:var(--alert-success);"></i>`;
          estadoBadge = `<span class="text-white font-semibold text-xs"  style="background:var(--alert-success); padding:2px 6px; border-radius:4px;">EMITIDA</span>`;
          
          const waSvgActive = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" width="14" height="14" fill="currentColor"><path d="M380.9 97.1C339 55.1 283.2 32 223.9 32c-122.4 0-222 99.6-222 222 0 39.1 10.2 77.3 29.6 111L0 480l117.7-30.9c32.4 17.7 68.9 27 106.1 27h.1c122.3 0 224.1-99.6 224.1-222 0-59.3-25.2-115-67.1-157zm-157 341.6c-33.2 0-65.7-8.9-94-25.7l-6.7-4-69.8 18.3L72 359.2l-4.4-7c-18.5-29.4-28.2-63.3-28.2-98.2 0-101.7 82.8-184.5 184.6-184.5 49.3 0 95.6 19.2 130.4 54.1 34.8 34.9 56.2 81.2 56.1 130.5 0 101.8-84.9 184.6-186.6 184.6zm101.2-138.2c-5.5-2.8-32.8-16.2-37.9-18-5.1-1.9-8.8-2.8-12.5 2.8-3.7 5.6-14.3 18-17.6 21.8-3.2 3.7-6.5 4.2-12 1.4-32.6-16.3-54-29.1-75.5-66-5.7-9.8 5.7-9.1 16.3-30.3 1.8-3.7.9-6.9-.5-9.7-1.4-2.8-12.5-30.1-17.1-41.2-4.5-10.8-9.1-9.3-12.5-9.5-3.2-.2-6.9-.2-10.6-.2-3.7 0-9.7 1.4-14.8 6.9-5.1 5.6-19.4 19-19.4 46.3 0 27.3 19.9 53.7 22.6 57.4 2.8 3.7 39.1 59.7 94.8 83.8 35.2 15.2 49 16.5 66.6 13.9 10.7-1.6 32.8-13.4 37.4-26.4 4.6-13 4.6-24.1 3.2-26.4-1.3-2.5-5-3.9-10.5-6.6z"/></svg>`;
          
          btnHtml = `
            <div class="d-flex gap-2 align-center" >
               <button class="text-secondary cursor-pointer d-flex align-center justify-center" onclick="cartasAbrirPreview('${fileId}', '${eN}', '${eC}', '${eCel}', event)"  style="width:26px; height:26px; border-radius:50%; background:white; border:1px solid var(--gris2); box-shadow:none; padding:0; transition:all 0.2s;" onmouseover="this.style.color='var(--azul)'; this.style.borderColor='var(--brand-light-active)'" onmouseout="this.style.color='var(--texto2)'; this.style.borderColor='var(--gris2)'" title="Ver PDF">
                 <i class="mi xs m-0" data-lucide="eye"  ></i>
               </button>
               <button class="text-secondary cursor-pointer d-flex align-center justify-center" onclick="cartasEnviarWA('${fileId}', '${eN}', '${eCel}', event)"  style="width:26px; height:26px; border-radius:50%; background:white; border:1px solid var(--gris2); box-shadow:none; padding:0; transition:all 0.2s;" onmouseover="this.style.color='var(--alert-success-dark)'; this.style.borderColor='var(--alert-success-border)'" onmouseout="this.style.color='var(--texto2)'; this.style.borderColor='var(--gris2)'" title="Enviar por WhatsApp">
                 ${waSvgActive.replace('width="14" height="14"', 'width="12" height="12"')}
               </button>
            </div>
          `;
        }

        let avatarBg = 'var(--alert-danger-light)';
        let avatarColor = 'var(--rojo)';
        let avatarIcon = 'file-clock';
        
        if (estado === 'EMITIDA') {
            avatarBg = 'var(--alert-success-light)';
            avatarColor = 'var(--alert-success)';
            avatarIcon = 'file-check-2';
        }

        html += `
          <div class="d-flex justify-between align-center gap-3 mb-1"  style="background:white; border:1px solid ${cardBorder}; border-radius:8px; padding:12px 16px; flex-wrap:wrap; box-shadow:0 1px 3px rgba(0,0,0,0.05);">
            <div class="d-flex align-center gap-4" >
              <div class="avatar d-flex align-center justify-center flex-shrink-0"   style="background:${avatarBg}; color:${avatarColor}; width:36px; height:36px; border-radius:50%;">
                <i data-lucide="${avatarIcon}" class="mi"></i>
              </div>
              <div>
                <div class="font-medium text-primary text-md uppercase"  style="letter-spacing:-0.2px;">
                  ${eN}
                </div>
                <div class="text-sm text-secondary mt-1 d-flex align-center gap-2" >
                  ${estadoBadge}
                  <span style="color:var(--gris2)">•</span>
                  <span><i data-lucide="calendar" class="mi xs" style="margin-right:2px; vertical-align:text-bottom;"></i> ${eFe.split(' ')[0]}</span>
                </div>
              </div>
            </div>
            ${btnHtml}
          </div>
        `;
      });

      html += `</div>`;
      container.innerHTML = html;
      
      if (window.lucide) {
        window.lucide.createIcons();
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
          btnAction = `<div class="mov-btn" style="cursor:default; background:var(--naranja-claro); border-color:var(--alert-warning-border);" title="Pendiente de Aprobación"><i data-lucide="clock-8" class="mi sm" style="color:var(--naranja); stroke-width:2.5;"></i></div>`;
        } else {
          btnAction = `<button class="mov-btn text-white" onclick="cartasSolicitarCarta('${eCodCliente}', '${eNombres}', '${eCelular}', event)"   style="background:linear-gradient(135deg, var(--alert-success), var(--alert-success)); box-shadow:0 3px 8px rgba(22,163,74,0.25); border:none;" title="Aprobar y Generar Carta"><i data-lucide="check" class="mi sm" style="stroke-width:2.5;"></i></button>`;
        }
      } else if (c.estadoCarta === 'EMITIDA' && c.fileId) {
        btnWsp = `<button onclick="cartasEnviarWA('${eFileId}', '${eNombres}', '${eCelular}', event)" class="mov-btn" title="Enviar por WhatsApp">${waSvgActive}</button>`;
        btnPreview = `<button onclick="cartasAbrirPreview('${eFileId}', '${eNombres}', '${eCodCliente}', '${eCelular}', event)" class="mov-btn" title="Vista Previa"><i data-lucide="eye" class="mi sm" style="color:var(--azul-oscuro);"></i></button>`;
        btnAction = `<div class="mov-btn" style="cursor:default; background:var(--alert-success-light); border-color:var(--alert-success-border);" title="Carta Emitida"><i data-lucide="check-circle-2" class="mi sm" style="color:var(--alert-success); stroke-width:2.5;"></i></div>`;
      } else {
        btnWsp = `<button disabled class="mov-btn" style="opacity:0.4; cursor:not-allowed;" title="No disponible">${waSvgDisabled}</button>`;
        btnPreview = `<button disabled class="mov-btn" style="opacity:0.4; cursor:not-allowed;" title="No disponible"><i data-lucide="eye" class="mi sm" style="color:var(--gris2);"></i></button>`;
        if (!esAdmin) {
          btnAction = `<button class="mov-btn text-white" onclick="cartasSolicitarAprobacion('${eCodCliente}', '${eNombres}', '${eCelular}', event)"   style="background:linear-gradient(135deg, var(--azul2), var(--azul)); box-shadow:0 3px 8px rgba(0,82,204,0.25); border:none;" title="Solicitar Carta"><i data-lucide="circle-plus" class="mi sm" style="stroke-width:2.5;"></i></button>`;
        } else {
          btnAction = `<button class="mov-btn text-white" onclick="cartasSolicitarCarta('${eCodCliente}', '${eNombres}', '${eCelular}', event)"   style="background:linear-gradient(135deg, var(--azul2), var(--azul)); box-shadow:0 3px 8px rgba(0,82,204,0.25); border:none;" title="Generar Carta Directamente"><i data-lucide="file-check-2" class="mi sm" style="stroke-width:2;"></i></button>`;
        }
      }

      let accionesHtml = `
        <div class="mov-acciones d-flex align-center gap-2"  >
          ${btnAction}
          ${btnWsp}
          ${btnPreview}
          <button onclick="cartasAbrirDrawer('${eCodCliente}', event)" class="mov-btn" title="Ver detalles"><i data-lucide="chevron-right" class="mi sm"></i></button>
        </div>
      `;

      let cardStyle = '';

      if (c.estadoCarta === 'SOLICITADA') {
        cardStyle = 'background:linear-gradient(to right, var(--alert-warning-light), var(--bg-surface)); border:1px solid #fed7aa; box-shadow:0 2px 8px rgba(249,115,22,0.03);';
      } else if (c.estadoCarta === 'EMITIDA') {
        cardStyle = 'background:linear-gradient(to right, var(--alert-success-light), var(--bg-surface)); border:1px solid var(--alert-success-border); box-shadow:0 2px 8px rgba(34,197,94,0.03);';
      } else {
        cardStyle = 'background:var(--bg-surface); border:1px solid var(--gris2); box-shadow:var(--shadow-sm);';
      }

      html += `
      <div class="mov-card d-flex align-center justify-between gap-4"   style="padding:12px 16px; ${cardStyle} transition:all 0.25s;">
        <div class="mov-left cursor-pointer flex-1 d-flex align-center gap-3"   style="overflow:hidden;" onclick="cartasAbrirDrawer('${eCodCliente}')">
          <div class="mov-icon flex-shrink-0"   style="background:${iconBg}; color:${iconColor};"><i data-lucide="user" class="mi"></i></div>
          <div class="mov-info d-flex flex-col"   style="gap:3px; overflow:hidden;">
            <div class="mov-desc font-bold text-primary text-md"   style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis; line-height:1;">${eNombres}</div>
          </div>
        </div>
        <div class="mov-right gap-3 align-center flex-shrink-0 d-flex"   style="flex-direction:row;">
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
    let drEstado = '<span class="text-secondary font-bold" >SIN SOLICITAR</span>';
    if (data.estadoCarta === 'EMITIDA') drEstado = '<span class="font-bold"  style="color:var(--verde);">EMITIDA</span>';
    else if (data.estadoCarta === 'SOLICITADA') drEstado = '<span class="font-bold"  style="color:var(--naranja);">SOLICITADA</span>';
    document.getElementById('dr-cartas-estado').innerHTML = drEstado;

    const cal = (data.calificacion || '').toUpperCase();
    let drCalif = `<span class="text-secondary font-bold" >${escHtml(cal) || 'NO REGISTRA'}</span>`;
    if (cal === 'PUNTUAL') drCalif = '<span class="font-bold"  style="color:var(--azul);">PUNTUAL</span>';
    else if (cal === 'NORMAL') drCalif = '<span class="font-bold"  style="color:var(--naranja);">NORMAL</span>';
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
      <div class="flex-1 d-flex flex-col align-center justify-center" id="preview-loader"  style="background:var(--bg-body); border-radius:8px; transition:opacity 0.4s ease;">
        <div class="d-flex align-center justify-center"  style="position:relative; width:48px; height:48px; margin-bottom:14px;">
          <div class="spinner-sm" style="position:absolute; width:100%; height:100%; border-color:var(--border-color); border-right-color:var(--azul); border-width:2px; border-radius:50%;"></div>
          <div class="font-bold text-base" id="preview-percent"  style="color:var(--azul);">0%</div>
        </div>
        <div class="text-primary text-md font-semibold"  style="letter-spacing:-0.2px;">Generando documento...</div>
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
        const box = document.querySelector('#modal-sustento .modal-sustento-box');
        if (box) {
          box.style.maxWidth = '420px';
          box.style.height = 'auto';
          box.style.padding = '32px 24px';
        }
        
        cont.innerHTML = `
          <div class="d-flex flex-col align-center justify-center text-center" >
            <div class="d-flex align-center justify-center mb-4"  style="width:64px; height:64px; border-radius:50%; background:var(--alert-danger-light); border:4px solid var(--bg-surface); box-shadow:0 0 0 1px #fee2e2;">
              <i data-lucide="shield-alert" class="mi" style="font-size:32px; color:var(--rojo);"></i>
            </div>
            <h3 class="text-primary font-bold"  style="margin:0 0 8px 0; font-size:18px;">Acción Denegada</h3>
            <p class="text-secondary text-lg"  style="margin:0 0 24px 0; line-height:1.5;">${resp.error}</p>
            <button class="text-primary font-semibold text-md cursor-pointer" onclick="document.getElementById('modal-sustento').classList.remove('show')"  style="background:var(--gris2); border:none; padding:10px 24px; border-radius:8px; width:100%;">Entendido, cerrar</button>
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
        <div class="flex-1 d-flex flex-col align-center justify-center"  style="background:var(--alert-danger-light); border-radius:8px; border:1px solid rgba(222,53,11,0.2); color:var(--rojo);">
          <i class="mi mb-2" data-lucide="wifi-off"   style="font-size:32px;"></i>
          <div class="font-semibold" >Ocurrió un error al generar la carta.</div>
        </div>
      `;
      if (window.lucide) lucide.createIcons();
    }
  }

  async function cartasSolicitarAprobacion(codCliente, nombres, celular, event) {
    const btn = event.currentTarget || (event.target ? event.target.closest('button') : null);
    if (!btn) return;
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
        if(typeof showToast === 'function') showToast('Error: ' + resp.error); else alert('Error: ' + resp.error);
        btn.innerHTML = originalHtml;
        btn.disabled = false;
        return;
      }

      if (resp && resp.success) {
        if (window._cartasStatusResultCache) {
          window._cartasStatusResultCache[codCliente] = { hasLetter: true, estado: 'SOLICITADA' };
        }
        const idx = typeof _cartasResultados !== 'undefined' ? _cartasResultados.findIndex(c => String(c.codCliente).trim() === String(codCliente).trim()) : -1;
        if (idx > -1) {
          _cartasResultados[idx].estadoCarta = 'SOLICITADA';
        }

        if (btn.classList.contains('mov-btn')) {
          btn.outerHTML = `<button disabled class="mov-btn" title="Pendiente de Aprobación" style="background:var(--alert-warning-light); border-color:#fed7aa;"><i data-lucide="hourglass" class="mi sm" style="color:var(--alert-warning);"></i></button>`;
        } else {
          btn.outerHTML = `<button class="flex-1 text-md font-bold d-flex flex-col align-center justify-center gap-1"  style="background:var(--border-color); color:var(--text-secondary); cursor:not-allowed; border:1px solid var(--border-color); box-shadow:none; padding: 10px 4px; border-radius: 12px;" disabled><i class="mi m-0" data-lucide="file-check"   style="font-size: 18px;"></i> Carta Solicitada</button>`;
        }
        if (window.lucide) lucide.createIcons();
      }
    } catch (e) {
      console.error(e);
      if(typeof showToast === 'function') showToast('Ocurrió un error al enviar la solicitud.'); else alert('Ocurrió un error al enviar la solicitud.');
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
        if(typeof showToast === 'function') showToast('Error: ' + resp.error); else alert('Error: ' + resp.error);
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
        if(typeof showToast === 'function') showToast('No se pudo descargar el archivo. Respuesta incompleta.'); else alert('No se pudo descargar el archivo. Respuesta incompleta.');
        btn.innerHTML = originalHtml;
        btn.disabled = false;
      }
    } catch (e) {
      console.error(e);
      if(typeof showToast === 'function') showToast('Ocurrió un error al descargar la carta. Verifica tu conexión o intenta nuevamente.'); else alert('Ocurrió un error al descargar la carta. Verifica tu conexión o intenta nuevamente.');
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
      <iframe class="flex-1" src="${previewSrc}" id="preview-iframe"  style="width:100%; height:100%; border:none; border-radius:8px; background:var(--bg-body); opacity:0; transition:opacity 0.6s ease;" allowfullscreen></iframe>
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
      <div class="flex-1 d-flex flex-col align-center justify-center" id="preview-loader"  style="background:var(--bg-body); border-radius:8px; transition:opacity 0.4s ease;">
        <div class="d-flex align-center justify-center"  style="position:relative; width:48px; height:48px; margin-bottom:14px;">
          <div class="spinner-sm" style="position:absolute; width:100%; height:100%; border-color:var(--border-color); border-right-color:var(--azul); border-width:2px; border-radius:50%;"></div>
          <div class="font-bold text-base" id="preview-percent"  style="color:var(--azul);">0%</div>
        </div>
        <div class="text-primary text-md font-semibold"  style="letter-spacing:-0.2px;">Abriendo documento...</div>
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
          <div class="flex-1 d-flex flex-col align-center justify-center"  style="background:var(--alert-danger-light); border-radius:8px; border:1px solid rgba(222,53,11,0.2); color:var(--rojo);">
            <i class="mi mb-2" data-lucide="alert-circle"   style="font-size:32px;"></i>
            <div class="font-semibold" >Error al cargar el documento.</div>
          </div>
        `;
        if (window.lucide) lucide.createIcons();
      }
    } catch (e) {
      clearInterval(interval);
      const box = document.querySelector('#modal-sustento .modal-sustento-box');
      if (box) {
        box.style.maxWidth = '420px';
        box.style.height = 'auto';
      }
      cont.innerHTML = `
        <div class="d-flex flex-col align-center justify-center text-center"  style="padding:24px 0;">
          <i class="mi mb-3" data-lucide="wifi-off"   style="font-size:40px; color:var(--rojo);"></i>
          <h3 class="text-primary text-xl"  style="margin:0 0 8px 0;">Error de Conexión</h3>
          <p class="text-secondary text-md"  style="margin:0 0 16px 0;">No se pudo completar la solicitud. Verifique su internet o intente de nuevo.</p>
          <button class="text-primary font-semibold text-md cursor-pointer" onclick="document.getElementById('modal-sustento').classList.remove('show')"  style="background:var(--gris2); border:none; padding:8px 20px; border-radius:8px;">Cerrar</button>
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
    
    let phone = (celular || '').toString();
    
    // Función extractora similar a Mora (coge el primer número válido de 9 dígitos que empiece con 9)
    function extractValidPhone(raw) {
      if (!raw) return "";
      let text = raw.replace(/[\s\-\(\)\.]/g, '');
      let match = text.match(/9\d{8}/);
      if (match) return "51" + match[0];
      let digits = text.replace(/\D/g, '');
      if (digits.length === 9) return "51" + digits;
      if (digits.startsWith('51') && digits.length === 11) return digits;
      return digits;
    }

    phone = extractValidPhone(phone);

    if (!phone || phone.length < 9) {
      let manualPhone = prompt('El cliente no tiene celular registrado o es inválido. Ingrese el número de 9 dígitos (ej. 987654321):');
      if (!manualPhone) return;
      phone = extractValidPhone(manualPhone);
    }

    if (!phone || phone.length < 9) {
      alert('Número inválido.');
      return;
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
  window.cartasCargarPendientes = cartasCargarPendientes;
  window.cartasRenderResultados = cartasRenderResultados;
  window.cartasSolicitarAprobacion = cartasSolicitarAprobacion;
  window.cartasDescargarExistente = cartasDescargarExistente;

  window.setFiltroCartas = function(estado) {
    window.filtroEstadoCartas = estado;
    
    // Update button styles
    const btnPendientes = document.getElementById('btn-filtro-cartas-pendientes');
    const btnEmitidas = document.getElementById('btn-filtro-cartas-emitidas');
    
    if (estado === 'SOLICITADA') {
      if (btnPendientes) btnPendientes.classList.add('active-subtab');
      if (btnEmitidas) btnEmitidas.classList.remove('active-subtab');
    } else {
      if (btnEmitidas) btnEmitidas.classList.add('active-subtab');
      if (btnPendientes) btnPendientes.classList.remove('active-subtab');
    }

    if(window.renderCartasPendientes) window.renderCartasPendientes();
  };

  window.cartasAbrirPreview = cartasAbrirPreview;
  window.cartasPreviewBase64 = cartasPreviewBase64;
  window.cartasEnviarWA = cartasEnviarWA;
  window.cartasSwitchTab = cartasSwitchTab;
  window.cartasCerrarDrawer = cartasCerrarDrawer;
  window.cartasSolicitarCarta = cartasSolicitarCarta;
