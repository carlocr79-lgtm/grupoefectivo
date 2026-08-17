  async function cargarClientes() {
    try {
      const resp = await apiFetch({ admin: 'clientes' });
      if (!Array.isArray(resp)) {
        console.error('Respuesta inesperada:', resp);
        document.getElementById('lista-clientes').innerHTML = '<div class="empty"><div class="icon"><i data-lucide="alert-triangle" class="mi" style="font-size:40px;color:var(--naranja);"></i></div>Error: ' + (resp && resp.error ? resp.error : 'Respuesta inválida') + '</div>';
        return;
      }
      
      // FILTRO DEFENSIVO FRONTEND: Ignorar cualquier cliente asignado a "CARTERA"
      clientes = resp.filter(c => {
        if (!c.asesor) return true;
        return c.asesor.toUpperCase().indexOf('CARTERA') < 0;
      });
      
      renderAsesoresFiltros();
      renderClientes();
    } catch(e) {
      console.error('Error clientes:', e);
      document.getElementById('lista-clientes').innerHTML = '<div class="empty"><div class="icon"><i data-lucide="alert-triangle" class="mi" style="font-size:40px;color:var(--naranja);"></i></div>Error: ' + e.message + '</div>';
    }
  }

  function renderAsesoresFiltros() {
    const asesores = [...new Set(clientes.map(c => c.asesor.split(' ')[0]))].filter(Boolean);
    const selCartas = document.getElementById('filtros-asesores-cartas');
    if(selCartas) {
      selCartas.innerHTML = '<option value="">Todos</option>';
      asesores.forEach(a => {
        selCartas.innerHTML += `<option value="${escapeHtml(a)}">${escapeHtml(a)}</option>`;
      });
    }
  }

  window.setFiltroAsesor = function(asesor) {
    filtroAsesor = asesor;
    renderClientes();
  };

  window.volverAGridAsesores = function() {
    filtroAsesor = '';
    renderClientes();
    if (typeof window.switchMoraSubTab === 'function') window.switchMoraSubTab('pendientes');
  };

  const avatarColors = ['#FF4B4B', '#FF8F00', '#00C853', 'var(--brand-secondary)', '#AA00FF', '#00BFA5', '#FF4081', '#3D5AFE'];
  function getColorForName(name) {
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return avatarColors[Math.abs(hash) % avatarColors.length];
  }
  function getInitials(name) {
    const parts = name.trim().split(' ').filter(Boolean);
    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }

  window.getClasificacionRiesgoHTML = function(dias) {
    if (dias < 0) return '';
    let text = ''; let color = ''; let bg = ''; let border = '';
    if (dias <= 8) { text = 'Normal'; color = 'var(--azul)'; bg = '#e0eaff'; border = 'var(--brand-light-border)'; }
    else if (dias <= 30) { text = 'CPP'; color = '#92400e'; bg = 'var(--alert-warning-light)'; border = '#fbbf24'; }
    else if (dias <= 60) { text = 'Deficiente'; color = '#c2410c'; bg = 'var(--alert-warning-light)'; border = '#fb923c'; }
    else if (dias <= 120) { text = 'Dudoso'; color = 'var(--alert-danger-dark)'; bg = '#fee2e2'; border = 'var(--alert-danger-hover)'; }
    else { text = 'Pérdida'; color = 'white'; bg = 'var(--alert-danger-dark)'; border = 'var(--alert-danger-dark)'; }
    return `<span class="font-medium uppercase"  style="background:${bg}; color:${color}; padding:2px 6px; border-radius:4px; font-size:9.5px; letter-spacing:0.3px; border: 1px solid ${border};">${text}</span>`;
  };

  window.ejecutarBusquedaGlobal = async function() {
    const query = document.getElementById('input-busqueda-global').value.trim();
    if (query.length < 2) return;

    const btnClear = document.getElementById('btn-clear-busqueda');
    if (btnClear) btnClear.dataset.estado = 'loading';

    const container = document.getElementById('resultados-busqueda-global');
    container.innerHTML = '<div class="cliente-card d-flex justify-between align-center" style="padding:12px 16px; margin-bottom:8px; cursor:default;"><div class="d-flex align-center gap-4"><div class="skeleton" style="width:36px; height:36px; border-radius:50%; flex-shrink:0;"></div><div class="d-flex flex-col" style="gap:8px;"><div class="skeleton sk-line" style="width:160px; margin:0;"></div><div class="skeleton sk-line" style="width:120px; height:10px; margin:0;"></div></div></div><div class="d-flex align-center gap-4 d-none d-sm-flex"><div class="skeleton sk-line" style="width:60px; margin:0;"></div><div class="d-flex gap-2"><div class="skeleton" style="width:32px; height:32px; border-radius:8px;"></div><div class="skeleton" style="width:32px; height:32px; border-radius:8px;"></div></div></div></div>';
    
    try {
      const sedeReq = typeof cajaSedeActual !== 'undefined' ? cajaSedeActual : '';
      const resp = await apiFetch({ admin: 'clientes_buscar_global', q: query, sedeContexto: sedeReq });
      
      if (!Array.isArray(resp)) {
        console.error("Backend Error:", resp);
        const errMsg = resp.error ? escapeHtml(resp.error) : 'El backend no está actualizado. Por favor, asegúrate de guardar e implementar Codigo.gs.txt en Google Apps Script.';
        container.innerHTML = '<div class="empty" style="color:var(--alert-danger); max-width:80%; margin:auto; word-wrap:break-word;">Error: ' + errMsg + '</div>';
        return;
      }

      if (resp.length === 0) {
        container.innerHTML = `
          <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; padding: 60px 20px; text-align:center; animation: fadeIn 0.4s ease-out;">
            <div style="background: var(--brand-light); width: 80px; height: 80px; border-radius: 50%; display:flex; align-items:center; justify-content:center; margin-bottom: 20px; box-shadow: 0 4px 15px rgba(15,98,254,0.15);">
              <i data-lucide="folder-search" style="width:40px; height:40px; color:var(--brand-secondary); stroke-width:1.5;"></i>
            </div>
            <h3 style="color:var(--texto); font-size:1.15rem; font-weight:600; margin:0 0 8px 0;">No encontramos coincidencias</h3>
            <p style="color:var(--texto2); font-size:0.9rem; max-width:350px; line-height:1.5; margin:0;">Intenta buscar con otros términos o verifica que el nombre o DNI estén escritos correctamente.</p>
          </div>
        `;
        const contador = document.getElementById('contador-clientes-busqueda');
        if(contador) { contador.innerHTML = `<i data-lucide="users" class="mi sm"></i>`; if(window.lucide) window.lucide.createIcons(); }
        const btnClear = document.getElementById('btn-clear-busqueda');
        if (btnClear) btnClear.dataset.estado = 'ready';
        return;
      }

      // Reutilizamos la lógica de renderizado de tarjetas, pero insertamos en el contenedor de búsqueda
      let html = '';
      resp.forEach((c, idx) => {
        const phone = window.extractValidPhone ? window.extractValidPhone(c.celular) : c.celular;
        const linkWA = phone ? `https://web.whatsapp.com/send?phone=${phone}` : '';
        const linkWAMovil = phone ? `https://api.whatsapp.com/send?phone=${phone}` : '';
        const waSvg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="12" height="12" fill="currentColor"><path d="M16 0C7.163 0 0 7.163 0 16c0 2.822.736 5.472 2.027 7.774L0 32l8.454-2.01A15.938 15.938 0 0016 32c8.837 0 16-7.163 16-16S24.837 0 16 0zm0 29.333a13.27 13.27 0 01-6.748-1.833l-.484-.287-5.02 1.194 1.271-4.874-.317-.502A13.267 13.267 0 012.667 16C2.667 8.636 8.636 2.667 16 2.667S29.333 8.636 29.333 16 23.364 29.333 16 29.333zm7.27-9.862c-.398-.199-2.354-1.162-2.72-1.294-.365-.133-.631-.199-.897.199-.266.398-1.029 1.294-1.262 1.56-.232.266-.465.299-.863.1-.398-.2-1.681-.619-3.203-1.977-1.184-1.057-1.983-2.362-2.215-2.76-.232-.398-.025-.613.174-.811.179-.178.398-.465.598-.698.199-.232.265-.398.398-.664.133-.266.066-.498-.033-.697-.1-.2-.897-2.162-1.229-2.96-.324-.777-.653-.672-.897-.684l-.764-.013c-.266 0-.697.1-1.063.498-.365.398-1.395 1.362-1.395 3.323s1.428 3.854 1.627 4.12c.2.266 2.81 4.287 6.808 6.014.951.41 1.694.656 2.273.839.955.304 1.824.261 2.511.158.766-.114 2.354-.962 2.687-1.891.332-.929.332-1.726.232-1.891-.099-.166-.365-.266-.763-.465z"/></svg>';
        
        const montoReal = (c.dias <= 0 && c.cuota > 0) ? c.cuota : c.deuda;
        const deudaFmt = c.tipo === 'INACTIVO' ? '-' : 'S/. ' + parseFloat(montoReal || 0).toLocaleString('es-PE',{minimumFractionDigits:2});
        const vencimientoStr = c.vencimiento ? c.vencimiento : '-';
        let estadoInfo = '';
        if (c.tipo === 'INACTIVO') {
          estadoInfo = `<span class="text-xs font-medium"  style="padding:2px 6px; border-radius:4px; background:var(--bg-body); color:var(--text-secondary); letter-spacing:0.3px;">SCAL</span>`;
        } else if (c.dias > 0) {
          estadoInfo = `<span class="font-semibold text-sm d-flex align-center gap-1"  style="color:var(--rojo);"><i data-lucide="triangle-alert" class="mi xs"></i> ${c.dias} días de mora</span> <span style="color:var(--gris2); margin:0 4px;">•</span> ${window.getClasificacionRiesgoHTML(c.dias)}`;
        } else {
          estadoInfo = `<span class="font-semibold text-sm d-flex align-center gap-1"  style="color:var(--azul);"><i data-lucide="check-circle" class="mi xs"></i> AL DÍA</span> <span style="color:var(--gris2); margin:0 4px;">•</span> ${window.getClasificacionRiesgoHTML(c.dias)}`;
        }

        const bgColor = getColorForName(c.nombre);
        const iniciales = getInitials(c.nombre);

        let avatarBg = 'var(--alert-danger-light)';
        let avatarColor = 'var(--rojo)';
        if (c.tipo === 'INACTIVO') {
          avatarBg = 'var(--bg-body)';
          avatarColor = 'var(--texto2)';
        } else if (c.dias <= 0) {
          avatarBg = 'rgba(77,159,255,0.12)';
          avatarColor = 'var(--azul)';
        }

        html += `
        <div class="cliente-card d-flex justify-between align-center cursor-pointer mb-2"   style="padding:12px 16px; background:white;" onclick="abrirClienteDrawerFromSearch(${idx})">
          
          <div class="d-flex align-center gap-4" >
            <div class="avatar d-flex align-center justify-center flex-shrink-0"   style="background:${avatarBg}; color:${avatarColor}; width:36px; height:36px;"><i data-lucide="user" class="mi"></i></div>
            <div class="d-flex flex-col" >
              <div class="cliente-nombre text-md uppercase font-medium text-primary"   style="letter-spacing:-0.2px;">${escapeHtml(c.nombre)}</div>
              <div class="d-flex align-center gap-3 mt-1" >
                ${estadoInfo}
              </div>
            </div>
          </div>

          <div class="d-flex align-center gap-3" >
            <div class="cliente-monto text-primary text-lg font-bold"  >${deudaFmt}</div>
            <div class="d-flex align-center gap-2" >
              ${c.celular ? `<button class="btn-call text-secondary cursor-pointer"   style="width:26px; height:26px; border-radius:50%; background:white; border:1px solid var(--gris2); box-shadow:none;" onclick="window.location.href='tel:${c.celular.replace(/\s+/g,'')}'; event.stopPropagation();"><i class="mi xs m-0" data-lucide="smartphone"  ></i></button>` : ''}
              ${linkWA ? `<button class="btn-wa text-secondary cursor-pointer"   style="width:26px; height:26px; border-radius:50%; background:white; border:1px solid var(--gris2); box-shadow:none; animation:none;" onclick="window.open('${linkWA}', '_blank'); event.stopPropagation();">${waSvg}</button>` : ''}
            </div>
          </div>

        </div>`;
      });
      container.innerHTML = html;
      lucide.createIcons();

      // Guardamos la data global por si se necesita ver detalles
      window._ultimoResultadoBusqueda = resp;

      // PRE-FETCH DE CARTAS: Consultar el estado de las cartas en 2do plano silenciosamente
      window._cartasStatusResultCache = window._cartasStatusResultCache || {};
      resp.forEach(c => {
        if (c.tipo === 'INACTIVO' && !window._cartasStatusResultCache[c.cod]) {
          apiFetch({ admin: 'cartas_check_status', codigo: c.cod })
            .then(status => {
              window._cartasStatusResultCache[c.cod] = status;
              // Si el panel de este cliente ESTÁ ABIERTO esperando, lo forzamos a actualizar
              const cont = document.getElementById(`dr-btn-carta-${c.cod}`);
              if (cont && cont.getAttribute('data-pending') === 'true') {
                 cont.innerHTML = window._generarBotonCartaHTML(c, status);
                 if (window.lucide) lucide.createIcons();
              }
            })
            .catch(() => {});
        }
      });

      // Actualizar contador
      const contador = document.getElementById('contador-clientes-busqueda');
      if (contador) {
        if (resp.length > 0) {
          contador.innerHTML = `<span style="color:var(--brand-secondary);">${resp.length}</span>`;
        } else {
          contador.innerHTML = `<i data-lucide="users" class="mi sm"></i>`;
        }
        if(window.lucide) window.lucide.createIcons();
      }

      const btnClear = document.getElementById('btn-clear-busqueda');
      if (btnClear) btnClear.dataset.estado = 'ready';

    } catch (e) {
      console.error("Frontend Error:", e);
      container.innerHTML = '<div class="empty">Error de Frontend: ' + (e.message || "desconocido") + '</div>';
      const btnClear = document.getElementById('btn-clear-busqueda');
      if (btnClear) btnClear.dataset.estado = 'ready';
    }
  }

  window.manejarBusquedaGlobal = function() {
    const val = document.getElementById('input-busqueda-global').value.trim();
    if (val !== '') {
      ejecutarBusquedaGlobal();
    } else {
      window.onInputBusquedaGlobal('');
    }
  };

  let _busquedaTimeout = null;

  window.onInputBusquedaGlobal = function(val) {
    const btnClear = document.getElementById('btn-clear-busqueda');
    
    clearTimeout(_busquedaTimeout);

    if (val.trim() !== '') {
      if(btnClear) { 
        btnClear.style.opacity = '1'; 
        btnClear.style.pointerEvents = 'auto'; 
        btnClear.dataset.estado = 'ready';
      }
      
      _busquedaTimeout = setTimeout(() => {
        ejecutarBusquedaGlobal();
      }, 600);
      
    } else {
      if(btnClear) { 
        btnClear.style.opacity = '0'; 
        btnClear.style.pointerEvents = 'none'; 
        btnClear.dataset.estado = 'ready';
      }
      document.getElementById('resultados-busqueda-global').innerHTML = '';
      const contador = document.getElementById('contador-clientes-busqueda');
      if(contador) { contador.innerHTML = `<i data-lucide="users" class="mi sm"></i>`; if(window.lucide) window.lucide.createIcons(); }
    }
  };

  window.abrirClienteDrawerFromSearch = function(idx) {
    if (!window._ultimoResultadoBusqueda || !window._ultimoResultadoBusqueda[idx]) return;
    
    // Inyectar temporalmente el cliente seleccionado en clientesFiltrados (que usa abrirClienteDrawer)
    // para poder reutilizar el mismo drawer sin reescribir su lógica interna.
    const c = window._ultimoResultadoBusqueda[idx];
    clientesFiltrados = [c];
    abrirClienteDrawer(0);
  }

  function filtrarClientes() { renderClientes(); }

  let clientesFiltrados = [];

  window.renderClientes = function renderClientes() {
    const gridContainer = document.getElementById('mora-content-grid-asesores');
    const clientesContainer = document.getElementById('mora-content-clientes');
    const busqueda = document.getElementById('buscar-cliente').value.toUpperCase();
    const rol = sessionStorage.getItem('ge_rol');
    const isMoraActive = (window.currentMainTab === 'mora' && window.currentMoraSubTab === 'pendientes');
    
    // 1. Resolver visibilidad primero para que aplique incluso durante la carga (skeletons)
    if (rol !== 'asesor' && !filtroAsesor && !busqueda) {
      if (gridContainer) {
         gridContainer.classList.remove('d-none');
         if (isMoraActive) gridContainer.style.display = 'block';
      }
      if (clientesContainer) {
         clientesContainer.classList.add('d-none');
         clientesContainer.style.display = 'none';
      }
    } else {
      if (gridContainer) {
         gridContainer.classList.add('d-none');
         gridContainer.style.display = 'none';
      }
      if (clientesContainer) {
         clientesContainer.classList.remove('d-none');
         if (isMoraActive) clientesContainer.style.display = 'block';
      }
    }
    
    // 2. Si no hay datos, renderizar skeletons en el contenedor que corresponda
    if (!window.datosCargados) {
        if (gridContainer && gridContainer.style.display !== 'none') {
            document.getElementById('grid-asesores').innerHTML = `
              <div class="cliente-card d-flex flex-col" style="padding: 18px; border-radius: 12px; border: 1px solid var(--gris2); background: white;">
                 <div class="d-flex flex-col mb-3">
                    <div class="d-flex align-center gap-2 mb-2">
                       <div class="skeleton" style="width:24px; height:24px; border-radius:50%;"></div>
                       <div class="skeleton sk-line" style="width:140px; margin:0;"></div>
                    </div>
                    <div class="skeleton sk-line" style="width:80px; height:18px; margin:0; border-radius:12px;"></div>
                 </div>
                 <div class="d-flex justify-between align-center pt-3" style="border-top: 1px dashed var(--gris2); margin-top: auto;">
                    <div class="skeleton sk-line" style="width:80px; height:12px; margin:0;"></div>
                    <div class="skeleton sk-line" style="width:100px; margin:0;"></div>
                 </div>
              </div>
            `.repeat(4);
        }
        if (clientesContainer && clientesContainer.style.display !== 'none') {
            document.getElementById('lista-clientes').innerHTML = `
              <div class="cliente-card d-flex justify-between align-center" style="padding:12px 16px; margin-bottom:8px; cursor:default;"><div class="d-flex align-center gap-4"><div class="skeleton" style="width:36px; height:36px; border-radius:50%; flex-shrink:0;"></div><div class="d-flex flex-col" style="gap:8px;"><div class="skeleton sk-line" style="width:160px; margin:0;"></div><div class="skeleton sk-line" style="width:120px; height:10px; margin:0;"></div></div></div><div class="d-flex align-center gap-4 d-none d-sm-flex"><div class="skeleton sk-line" style="width:60px; margin:0;"></div><div class="d-flex gap-2"><div class="skeleton" style="width:32px; height:32px; border-radius:8px;"></div><div class="skeleton" style="width:32px; height:32px; border-radius:8px;"></div></div></div></div>
            `.repeat(4);
        }
        return;
    }

    let baseData = clientes;
    
    const btnBack = document.getElementById('btn-back-asesores');
    const contadorEl = document.getElementById('contador-clientes-mora');

    if (rol !== 'asesor' && !filtroAsesor && !busqueda) {
      const asesoresData = {};
      baseData.forEach(c => {
        let esValido = true;
        if (c.vencimiento && c.vencimiento !== '-') {
          const partes = c.vencimiento.split('/');
          if (partes.length === 3) {
            const hoyDate = new Date(); hoyDate.setHours(0,0,0,0);
            const vDate = new Date(partes[2], partes[1] - 1, partes[0]); vDate.setHours(0,0,0,0);
            const diasReales = Math.round((hoyDate.getTime() - vDate.getTime()) / 86400000);
            if (diasReales < 0) esValido = false; 
          }
        }
        if (!esValido) return;

        const asesorNombre = c.asesor ? c.asesor.trim() : 'Sin Asesor';
        if (!asesoresData[asesorNombre]) {
          asesoresData[asesorNombre] = { 
             nombre: asesorNombre, 
             count: 0, 
             monto: 0,
             riesgo: { normal:0, cpp:0, deficiente:0, dudoso:0, perdida:0 }
          };
        }
        asesoresData[asesorNombre].count++;
        
        let d = parseInt(c.dias, 10);
        if (isNaN(d)) d = 0;
        
        if (d <= 8) asesoresData[asesorNombre].riesgo.normal++;
        else if (d <= 30) asesoresData[asesorNombre].riesgo.cpp++;
        else if (d <= 60) asesoresData[asesorNombre].riesgo.deficiente++;
        else if (d <= 120) asesoresData[asesorNombre].riesgo.dudoso++;
        else asesoresData[asesorNombre].riesgo.perdida++;
        
        const montoReal = (c.dias <= 0 && c.cuota > 0) ? c.cuota : c.deuda;
        asesoresData[asesorNombre].monto += (parseFloat(montoReal) || 0);
      });
      
      let gridHTML = '';
      const asesoresKeys = Object.keys(asesoresData).sort((a,b) => asesoresData[b].monto - asesoresData[a].monto);
      
      asesoresKeys.forEach(key => {
        const data = asesoresData[key];
        let riesgoHTML = '';
        if (data.riesgo.normal > 0) riesgoHTML += `<span title="Normal (0-8 días)" style="background:#e0eaff; color:var(--azul); padding: 2px 6px; border-radius:4px; font-size:10px; font-weight:600; border: 1px solid var(--brand-light-border); display:inline-block; margin-bottom:2px;">N: ${data.riesgo.normal}</span>`;
        if (data.riesgo.cpp > 0) riesgoHTML += `<span title="CPP (9-30 días)" style="background:var(--alert-warning-light); color:#92400e; padding: 2px 6px; border-radius:4px; font-size:10px; font-weight:600; border: 1px solid #fbbf24; display:inline-block; margin-bottom:2px;">C: ${data.riesgo.cpp}</span>`;
        if (data.riesgo.deficiente > 0) riesgoHTML += `<span title="Deficiente (31-60 días)" style="background:var(--alert-warning-light); color:#c2410c; padding: 2px 6px; border-radius:4px; font-size:10px; font-weight:600; border: 1px solid #fb923c; display:inline-block; margin-bottom:2px;">D: ${data.riesgo.deficiente}</span>`;
        if (data.riesgo.dudoso > 0) riesgoHTML += `<span title="Dudoso (61-120 días)" style="background:#fee2e2; color:var(--alert-danger-dark); padding: 2px 6px; border-radius:4px; font-size:10px; font-weight:600; border: 1px solid var(--alert-danger-hover); display:inline-block; margin-bottom:2px;">Du: ${data.riesgo.dudoso}</span>`;
        if (data.riesgo.perdida > 0) riesgoHTML += `<span title="Pérdida (>120 días)" style="background:var(--alert-danger-dark); color:white; padding: 2px 6px; border-radius:4px; font-size:10px; font-weight:600; border: 1px solid var(--alert-danger-dark); display:inline-block; margin-bottom:2px;">P: ${data.riesgo.perdida}</span>`;

        gridHTML += `
          <div class="cliente-card asesor-card-summary cursor-pointer d-flex flex-col" onclick="setFiltroAsesor('${escapeHtml(data.nombre)}')" style="padding: 18px; border-radius: 12px; border: 1px solid var(--gris2); background: white; transition: all 0.2s ease; align-items: stretch;">
            <div class="d-flex flex-col mb-3">
               <div class="d-flex align-center gap-2 mb-2">
                 <i data-lucide="user" class="mi" style="margin:0; color:var(--brand-secondary);"></i>
                 <div class="font-bold text-base" style="color:var(--texto); line-height: 1.2;">${escapeHtml(data.nombre)}</div>
               </div>
               <div class="d-flex align-center flex-wrap gap-1" style="margin-top: 2px;">
                 <span class="text-xs font-semibold" style="color:var(--texto2); background: var(--bg-body); padding: 2px 8px; border-radius: 6px; display:inline-block; margin-bottom:2px; margin-right:4px;">Total: ${data.count}</span>
                 ${riesgoHTML}
               </div>
            </div>
            <div class="d-flex justify-between align-center pt-3" style="border-top: 1px dashed var(--gris2); margin-top: auto;">
               <div class="text-xs font-semibold" style="color:var(--texto2);">Saldo en riesgo</div>
               <div class="font-bold text-lg" style="color:var(--rojo);">S/. ${data.monto.toLocaleString('es-PE', {minimumFractionDigits:2})}</div>
            </div>
          </div>
        `;
      });
      
      document.getElementById('grid-asesores').innerHTML = gridHTML || '<div class="empty">No hay clientes en mora</div>';
      if (window.lucide) window.lucide.createIcons();
      
      if (contadorEl) {
         let totalClientesGlobal = 0;
         asesoresKeys.forEach(k => totalClientesGlobal += asesoresData[k].count);
         contadorEl.innerHTML = `<span style="color:var(--brand-secondary);">${totalClientesGlobal}</span>`;
         contadorEl.title = "Total de clientes en riesgo de todos los asesores";
      }
      
      const subtabAsesores = document.getElementById('subtab-mora-asesores');
      const subtabAsesoresText = document.querySelector('#subtab-mora-asesores .subtab-text');
      const subtabAsesoresIcon = document.querySelector('#subtab-mora-asesores .icon-main');
      if (subtabAsesoresText) subtabAsesoresText.textContent = 'Asesores';
      if (subtabAsesoresIcon) {
          const newIcon = document.createElement('i');
          newIcon.className = 'mi xs icon-main m-0';
          newIcon.setAttribute('data-lucide', 'user');
          subtabAsesoresIcon.replaceWith(newIcon);
      }
      if (subtabAsesores) {
          subtabAsesores.style.background = '';
          subtabAsesores.style.border = '';
          subtabAsesores.style.color = '';
          subtabAsesores.onclick = function() {
              if (typeof window.switchMoraSubTab === 'function') window.switchMoraSubTab('pendientes');
          };
      }
      if (window.lucide) window.lucide.createIcons();
      
      clientesFiltrados = baseData; // Asegurar que la memoria del botón tenga acceso a todos los clientes al estar en la vista global
      return;
    }

    if (gridContainer) {
       gridContainer.classList.add('d-none');
       gridContainer.style.display = 'none';
    }
    if (clientesContainer) {
       clientesContainer.classList.remove('d-none');
       if (isMoraActive) clientesContainer.style.display = 'block';
    }
    
    const subtabAsesores = document.getElementById('subtab-mora-asesores');
    const subtabAsesoresText = document.querySelector('#subtab-mora-asesores .subtab-text');
    const subtabAsesoresIcon = document.querySelector('#subtab-mora-asesores .icon-main');

    if (rol !== 'asesor' && filtroAsesor && !busqueda) {
        if (subtabAsesoresText) {
            let firstName = filtroAsesor.split(' ')[0].toLowerCase();
            let shortName = firstName.charAt(0).toUpperCase() + firstName.slice(1);
            subtabAsesoresText.textContent = shortName;
        }
        if (subtabAsesoresIcon) {
            const newIcon = document.createElement('i');
            newIcon.className = 'mi xs icon-main m-0';
            newIcon.setAttribute('data-lucide', 'arrow-left');
            subtabAsesoresIcon.replaceWith(newIcon);
        }
        if (subtabAsesores) {
            subtabAsesores.style.background = 'white';
            subtabAsesores.style.border = '1px solid var(--gris2)';
            subtabAsesores.style.color = 'var(--texto)';
            subtabAsesores.onclick = function() {
                window.volverAGridAsesores();
            };
        }
    } else {
        if (subtabAsesoresText) subtabAsesoresText.textContent = (rol === 'asesor') ? ((sessionStorage.getItem('ge_nombre') || '').split(' ')[0] || 'Mi Cartera') : 'Asesores';
        if (subtabAsesoresIcon) {
            const newIcon = document.createElement('i');
            newIcon.className = 'mi xs icon-main m-0';
            newIcon.setAttribute('data-lucide', 'user');
            subtabAsesoresIcon.replaceWith(newIcon);
        }
        if (subtabAsesores) {
            subtabAsesores.style.background = '';
            subtabAsesores.style.border = '';
            subtabAsesores.style.color = '';
            subtabAsesores.onclick = function() {
                if (typeof window.switchMoraSubTab === 'function') window.switchMoraSubTab('pendientes');
            };
        }
    }
    if (window.lucide) window.lucide.createIcons();
    
    if (btnBack) {
       btnBack.classList.add('d-none');
       btnBack.classList.remove('d-inline-flex');
       btnBack.style.display = 'none';
    }
    
    let lista = baseData.filter(c => {
      const matchAsesor = !filtroAsesor || (c.asesor && c.asesor.includes(filtroAsesor));
      const matchBusqueda = !busqueda || 
                            (c.nombre && c.nombre.toUpperCase().includes(busqueda)) || 
                            (c.celular && c.celular.includes(busqueda)) ||
                            (c.cod && c.cod.toString().toUpperCase().includes(busqueda));

      // FILTRO DE SEGURIDAD FRONTEND: Bloquear fechas futuras estrictamente
      let esValido = true;
      if (c.vencimiento && c.vencimiento !== '-') {
        const partes = c.vencimiento.split('/');
        if (partes.length === 3) {
          const hoyDate = new Date();
          hoyDate.setHours(0,0,0,0);
          const vDate = new Date(partes[2], partes[1] - 1, partes[0]);
          vDate.setHours(0,0,0,0);
          const diasReales = Math.round((hoyDate.getTime() - vDate.getTime()) / 86400000);
          if (diasReales < 0) esValido = false; // Vence en el futuro
        }
      }

      return matchAsesor && matchBusqueda && esValido;
    });

    if (lista.length === 0) {
      document.getElementById('lista-clientes').innerHTML = `
        <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; padding: 60px 20px; text-align:center; animation: fadeIn 0.4s ease-out;">
          <div style="background: var(--brand-light); width: 80px; height: 80px; border-radius: 50%; display:flex; align-items:center; justify-content:center; margin-bottom: 20px; box-shadow: 0 4px 15px rgba(15,98,254,0.15);">
            <i data-lucide="folder-open" style="width:40px; height:40px; color:var(--brand-secondary); stroke-width:1.5;"></i>
          </div>
          <h3 style="color:var(--texto); font-size:1.15rem; font-weight:600; margin:0 0 8px 0;">Todo al día</h3>
          <p style="color:var(--texto2); font-size:0.9rem; max-width:350px; line-height:1.5; margin:0;">Actualmente no hay clientes en mora registrados para esta cartera o filtro.</p>
        </div>
      `;
      if(contadorEl) { contadorEl.innerHTML = `<i data-lucide="users" class="mi sm"></i>`; if(window.lucide) window.lucide.createIcons(); }
      return;
    }

    // Ordenar por dias de atraso desc
    lista.sort((a, b) => b.dias - a.dias);
    clientesFiltrados = lista;

    if (contadorEl) {
      if (lista.length > 0) {
        contadorEl.innerHTML = `<span style="color:var(--brand-secondary);">${lista.length}</span>`;
      } else {
        contadorEl.innerHTML = `<i data-lucide="users" class="mi sm"></i>`;
      }
      if (window.lucide) window.lucide.createIcons();
    }

    const cardsHTML = clientesFiltrados.map((c, idx) => {
      const isNotificado = esNotificado(c.telefono || c.celular);
      const rowStyle = isNotificado ? 'background-color:#f9fbff;' : '';
      
      const phone = window.extractValidPhone ? window.extractValidPhone(c.telefono) : c.telefono;
      const linkWA = phone ? `https://web.whatsapp.com/send?phone=${phone}${c.mensaje ? '&text=' + encodeURIComponent(c.mensaje) : ''}` : '';
      const linkWAMovil = phone ? `https://api.whatsapp.com/send?phone=${phone}${c.mensaje ? '&text=' + encodeURIComponent(c.mensaje) : ''}` : '';
      const waSvg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="12" height="12" fill="currentColor"><path d="M16 0C7.163 0 0 7.163 0 16c0 2.822.736 5.472 2.027 7.774L0 32l8.454-2.01A15.938 15.938 0 0016 32c8.837 0 16-7.163 16-16S24.837 0 16 0zm0 29.333a13.27 13.27 0 01-6.748-1.833l-.484-.287-5.02 1.194 1.271-4.874-.317-.502A13.267 13.267 0 012.667 16C2.667 8.636 8.636 2.667 16 2.667S29.333 8.636 29.333 16 23.364 29.333 16 29.333zm7.27-9.862c-.398-.199-2.354-1.162-2.72-1.294-.365-.133-.631-.199-.897.199-.266.398-1.029 1.294-1.262 1.56-.232.266-.465.299-.863.1-.398-.2-1.681-.619-3.203-1.977-1.184-1.057-1.983-2.362-2.215-2.76-.232-.398-.025-.613.174-.811.179-.178.398-.465.598-.698.199-.232.265-.398.398-.664.133-.266.066-.498-.033-.697-.1-.2-.897-2.162-1.229-2.96-.324-.777-.653-.672-.897-.684l-.764-.013c-.266 0-.697.1-1.063.498-.365.398-1.395 1.362-1.395 3.323s1.428 3.854 1.627 4.12c.2.266 2.81 4.287 6.808 6.014.951.41 1.694.656 2.273.839.955.304 1.824.261 2.511.158.766-.114 2.354-.962 2.687-1.891.332-.929.332-1.726.232-1.891-.099-.166-.365-.266-.763-.465z"/></svg>';

      const montoReal = (c.dias <= 0 && c.cuota > 0) ? c.cuota : c.deuda;
      const deudaFmt = 'S/. ' + parseFloat(montoReal || 0).toLocaleString('es-PE',{minimumFractionDigits:2});
      const vencimientoStr = c.vencimiento ? c.vencimiento : '-';

      let avatarBg = 'var(--alert-danger-light)';
      let avatarColor = 'var(--rojo)';
      if (c.tipo === 'INACTIVO') {
        avatarBg = 'var(--bg-body)';
        avatarColor = 'var(--texto2)';
      } else if (c.dias < 0 || (c.dias === 0 && !c.vencimiento)) {
        avatarBg = 'rgba(77,159,255,0.12)';
        avatarColor = 'var(--azul)';
      } else if (c.dias === 0) {
        avatarBg = 'rgba(77,159,255,0.12)'; // HOY
        avatarColor = 'var(--azul)';
      }

      return `
      <div class="cliente-card d-flex justify-between align-center cursor-pointer"   style="padding:12px 16px; ${rowStyle};" onclick="abrirClienteDrawer(${idx})">
        
        <div class="d-flex align-center gap-4" >
          <div class="avatar d-flex align-center justify-center flex-shrink-0"   style="background:${avatarBg}; color:${avatarColor}; width:36px; height:36px;"><i data-lucide="user" class="mi"></i></div>
          <div class="d-flex flex-col" >
            <div class="cliente-nombre text-md uppercase font-medium text-primary"   style="letter-spacing:-0.2px;">${escapeHtml(c.nombre)}</div>
            <div class="d-flex align-center gap-2 mt-1" >
              ${c.dias === 0 ? 
                `<span class="font-semibold text-sm d-flex align-center gap-1"  style="color:var(--azul);"><i data-lucide="calendar" class="mi xs"></i> AL DÍA / HOY</span>` : 
                `<span class="font-semibold text-sm d-flex align-center gap-1"  style="color:var(--rojo);"><i data-lucide="triangle-alert" class="mi xs"></i> ${c.dias} días de mora</span>`
              }
              <span style="color:var(--gris2)">•</span>
              ${window.getClasificacionRiesgoHTML(c.dias)}
            </div>
          </div>
        </div>

        <div class="d-flex align-center gap-3" >
          <div class="cliente-monto text-primary text-lg font-bold"  >${deudaFmt}</div>
          <div class="d-flex align-center gap-2" >
            ${c.celular ? `<button class="btn-call text-secondary"   style="width:26px; height:26px; border-radius:50%; background:white; border:1px solid var(--gris2); box-shadow:none;" onclick="window.location.href='tel:${c.celular.replace(/\s+/g,'')}'; event.stopPropagation();"><i class="mi xs m-0" data-lucide="smartphone"  ></i></button>` : ''}
            ${linkWA ? `<button class="btn-wa text-secondary"   style="width:26px; height:26px; border-radius:50%; background:white; border:1px solid var(--gris2); box-shadow:none; animation:none;" onclick="enviarWA('${linkWAMovil}','${linkWA}'); event.stopPropagation();">${waSvg}</button>` : ''}
          </div>
        </div>

      </div>`;
    }).join('');

    if (cardsHTML.length > 0) {
      document.getElementById('lista-clientes').innerHTML = `
        <div class="movimientos-list" style="padding-bottom:40px;">
          ${cardsHTML}
        </div>
      `;
    } else {
      document.getElementById('lista-clientes').innerHTML = '<div class="empty">No hay clientes en mora</div>';
    }
    
    // Inicializar los iconos de lucide recien inyectados
    if (typeof lucide !== 'undefined') {
      lucide.createIcons();
    }
  }

  function abrirClienteDrawer(idx) {
    const c = clientesFiltrados[idx];
    if (!c) return;

    // Configurar avatar y color
    let avatarBg = 'var(--alert-danger-light)';
    let avatarColor = 'var(--rojo)';
    if (c.tipo === 'INACTIVO') {
      avatarBg = 'var(--bg-body)';
      avatarColor = 'var(--texto2)';
    } else if (c.dias <= 0) {
      avatarBg = 'rgba(77,159,255,0.12)';
      avatarColor = 'var(--azul)';
    }
    const avatarEl = document.getElementById('dr-avatar');
    avatarEl.innerHTML = '<i data-lucide="user" class="mi" style="font-size:22px;"></i>';
    avatarEl.style.background = avatarBg;
    avatarEl.style.color = avatarColor;
    
    document.getElementById('dr-nombre').textContent = escapeHtml(c.nombre);
    
    // Configurar tags rápidos de cabecera
    let diasTag = '';
    let riskBadge = '';
    if (c.tipo === 'INACTIVO') {
       diasTag = '';
       riskBadge = `<span class="text-xs font-medium"  style="padding:2px 6px; border-radius:4px; background:var(--bg-body); color:var(--text-secondary); letter-spacing:0.3px;">SCAL</span>`;
    } else {
       diasTag = c.dias > 90 ? `<span class="font-medium text-base d-flex align-center"  style="color:var(--rojo);"><i data-lucide="alert-circle" class="mi xs" style="margin-right:4px;"></i> ${c.dias} días</span>` :
                 c.dias > 0  ? `<span class="font-medium text-base d-flex align-center"  style="color:var(--naranja);"><i data-lucide="alert-triangle" class="mi xs" style="margin-right:4px;"></i> ${c.dias} días</span>` :
                               `<span class="font-medium text-base d-flex align-center"  style="color:var(--verde);"><i data-lucide="check-circle" class="mi xs" style="margin-right:4px;"></i> Al día</span>`;
       riskBadge = window.getClasificacionRiesgoHTML(c.dias);
    }
    
    document.getElementById('dr-tags').innerHTML = `<div class="d-flex align-center mt-1"  style="flex-wrap:wrap; gap:10px;">${diasTag} ${riskBadge} ${c.voucher ? `<span class="font-medium text-base d-flex align-center"  style="color:#cc8800; border-left:1px solid var(--border-color); padding-left:10px;"><i data-lucide="hourglass" class="mi xs" style="margin-right:4px;"></i> Voucher</span>` : ''}</div>`;

    // Finanzas
    document.getElementById('dr-deuda').textContent = 'S/. ' + parseFloat(c.deuda || 0).toLocaleString('es-PE',{minimumFractionDigits:2});
    document.getElementById('dr-cuota').textContent = c.cuota ? 'S/. ' + parseFloat(c.cuota).toLocaleString('es-PE',{minimumFractionDigits:2}) : '-';
    const numCuotas = c.cuotas > 0 ? `<span style="color:var(--rojo);font-weight:900;background:var(--alert-danger-light);padding:2px 8px;border-radius:12px;">${c.cuotas} cuota(s)</span>` : '0 cuotas';
    document.getElementById('dr-cuotas').innerHTML = numCuotas;
    document.getElementById('dr-dias').textContent = c.dias + ' día(s)';

    // Datos Generales
    document.getElementById('dr-cod').textContent = escapeHtml(c.cod);
    document.getElementById('dr-cel').textContent = escapeHtml(c.celular || '-');
    document.getElementById('dr-dir').textContent = escapeHtml(c.direccion || '-');
    document.getElementById('dr-venc').textContent = c.vencimiento ? c.vencimiento : '-';

    // Interno
    document.getElementById('dr-asesor').textContent = escapeHtml(c.asesor || '-');
    document.getElementById('dr-ofi').textContent = escapeHtml(c.oficina || '-');
    document.getElementById('dr-tipo').textContent = escapeHtml(c.tipo || '-');

    // Observaciones (si las hay)
    const obsContainer = document.getElementById('dr-obs-container');
    if (c.obs) {
      obsContainer.innerHTML = `<div class="dr-obs"><i data-lucide="info" class="mi" style="font-size:18px;"></i><div>${escapeHtml(c.obs)}</div></div>`;
    } else {
      obsContainer.innerHTML = '';
    }

    // Acciones Grandes
    let accionesHTML = '';
    const btnStyle = "flex: 1; padding: 10px 4px; font-size:var(--text-md); font-weight: 700; border-radius: 12px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; border: none; width: 100%;";
    const iconStyle = "margin: 0; font-size: 18px;";
    
    if(c.celular) {
       accionesHTML += `<button class="text-white cursor-pointer"  style="background:var(--azul); ${btnStyle};" onclick="window.location.href='tel:${c.celular.replace(/\s+/g,'')}'"><i data-lucide="phone" class="mi" style="${iconStyle}"></i> Llamar</button>`;
    }
    const phone = window.extractValidPhone ? window.extractValidPhone(c.telefono || c.celular) : (c.telefono || c.celular);
    const linkWA = phone ? `https://web.whatsapp.com/send?phone=${phone}${c.mensaje ? '&text=' + encodeURIComponent(c.mensaje) : ''}` : '';
    const linkWAMovil = phone ? `https://api.whatsapp.com/send?phone=${phone}${c.mensaje ? '&text=' + encodeURIComponent(c.mensaje) : ''}` : '';
    if(linkWA) {
       accionesHTML += `<button class="text-white cursor-pointer"  style="background:var(--azul2); ${btnStyle};" onclick="enviarWA('${linkWAMovil}','${linkWA}')"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="18" height="18" fill="white" style="${iconStyle}"><path d="M16 0C7.163 0 0 7.163 0 16c0 2.822.736 5.472 2.027 7.774L0 32l8.454-2.01A15.938 15.938 0 0016 32c8.837 0 16-7.163 16-16S24.837 0 16 0zm0 29.333a13.27 13.27 0 01-6.748-1.833l-.484-.287-5.02 1.194 1.271-4.874-.317-.502A13.267 13.267 0 012.667 16C2.667 8.636 8.636 2.667 16 2.667S29.333 8.636 29.333 16 23.364 29.333 16 29.333zm7.27-9.862c-.398-.199-2.354-1.162-2.72-1.294-.365-.133-.631-.199-.897.199-.266.398-1.029 1.294-1.262 1.56-.232.266-.465.299-.863.1-.398-.2-1.681-.619-3.203-1.977-1.184-1.057-1.983-2.362-2.215-2.76-.232-.398-.025-.613.174-.811.179-.178.398-.465.598-.698.199-.232.265-.398.398-.664.133-.266.066-.498-.033-.697-.1-.2-.897-2.162-1.229-2.96-.324-.777-.653-.672-.897-.684l-.764-.013c-.266 0-.697.1-1.063.498-.365.398-1.395 1.362-1.395 3.323s1.428 3.854 1.627 4.12c.2.266 2.81 4.287 6.808 6.014.951.41 1.694.656 2.273.839.955.304 1.824.261 2.511.158.766-.114 2.354-.962 2.687-1.891.332-.929.332-1.726.232-1.891-.099-.166-.365-.266-.763-.465z"/></svg> WhatsApp</button>`;
    }
    if(c.tipo === 'INACTIVO') {
       const btnId = `dr-btn-carta-${c.cod}`;
       
       if (window._cartasStatusResultCache && window._cartasStatusResultCache[c.cod]) {
           // Ya tenemos la respuesta precargada, lo renderizamos síncronamente al instante
           const status = window._cartasStatusResultCache[c.cod];
           accionesHTML += `<div class="flex-1 d-flex" id="${btnId}" >${window._generarBotonCartaHTML(c, status)}</div>`;
       } else {
           // No ha llegado aún. Ponemos el neutral y esperamos a que el prefetch llame a la actualización
           accionesHTML += `<div class="flex-1 d-flex" id="${btnId}" data-pending="true" ><button style="background:var(--bg-body); color:var(--text-muted); border:1px solid var(--border-color); box-shadow:none; cursor:default; ${btnStyle}" disabled><i data-lucide="file-text" class="mi" style="${iconStyle}"></i> Cartas</button></div>`;
           
           // Lanzamos fetch de respaldo por si acaso el prefetch falló
           setTimeout(async () => {
             try {
               const status = await apiFetch({ admin: 'cartas_check_status', codigo: c.cod });
               window._cartasStatusResultCache = window._cartasStatusResultCache || {};
               window._cartasStatusResultCache[c.cod] = status;
               const cont = document.getElementById(btnId);
               if (cont && cont.getAttribute('data-pending') === 'true') {
                  cont.innerHTML = window._generarBotonCartaHTML(c, status);
                  if (window.lucide) lucide.createIcons();
               }
             } catch(e) {}
           }, 50);
       }
    }
    
    // Set flex parent styling safely
    const drActions = document.getElementById('dr-actions');
    drActions.innerHTML = accionesHTML;
    drActions.style.display = 'flex';
    drActions.style.gap = '8px';
    drActions.style.flexWrap = 'wrap';
    drActions.style.justifyContent = 'space-between';

    // Show Drawer
    document.getElementById('drawer-overlay').classList.add('open');
    document.getElementById('drawer-panel').classList.add('open');
    document.body.style.overflow = 'hidden'; // Evitar scroll de fondo
  }

  // --- Helper para no repetir el HTML de las cartas ---
  window._generarBotonCartaHTML = function(c, status) {
     const btnStyle = "flex: 1; padding: 10px 4px; font-size:var(--text-md); font-weight: 700; border-radius: 12px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; border: none; width: 100%;";
     const iconStyle = "margin: 0; font-size: 18px;";
     const rol = sessionStorage.getItem('ge_rol') || 'asesor';
     const esAdmin = (rol === 'admin');
     const onClickFn = esAdmin 
        ? `window.cartasSolicitarCarta('${c.cod}', '${escapeHtml(c.nombre)}', '${c.celular||c.telefono||''}', event)`
        : `window.cartasSolicitarAprobacion('${c.cod}', '${escapeHtml(c.nombre)}', event)`;

     if (status && status.error) {
         return `<button class="text-white cursor-pointer"  style="background:var(--alert-warning); ${btnStyle};" onclick="alert('Error: ' + '${status.error}')"><i data-lucide="alert-circle" class="mi" style="${iconStyle}"></i> Error Oculto</button>`;
     } else if (status && status.hasLetter) {
         if (status.estado === 'EMITIDA' && status.fileId) {
            return `
              <button class="text-white cursor-pointer"  style="background:var(--verde); box-shadow:0 3px 8px rgba(0,135,90,0.25); ${btnStyle};" title="Abrir Documento" onclick="window.cerrarClienteDrawer(); window.cartasAbrirPreview('${status.fileId}', '${escapeHtml(c.nombre)}', '${c.cod}', '${c.celular||c.telefono||''}', event)">
                <i data-lucide="file-check-2" class="mi" style="${iconStyle}"></i> Ver Carta
              </button>
            `;
         } else {
            const btnText = status.estado === 'EMITIDA' ? 'Carta Emitida' : 'Carta Solicitada';
            return `<button style="background:var(--border-color); color:var(--text-secondary); cursor:not-allowed; border:1px solid var(--border-color); box-shadow:none; ${btnStyle}" disabled><i data-lucide="file-check" class="mi" style="${iconStyle}"></i> ${btnText}</button>`;
         }
     } else {
         const lblBtn = esAdmin ? 'Generar Carta' : 'Solicitar Carta';
         return `<button class="text-white cursor-pointer"  style="background:var(--verde); box-shadow:0 3px 8px rgba(0,135,90,0.25); ${btnStyle};" onclick="${onClickFn}"><i data-lucide="file-text" class="mi" style="${iconStyle}"></i> ${lblBtn}</button>`;
     }
  };

  function cerrarClienteDrawer() {
    document.getElementById('drawer-overlay').classList.remove('open');
    document.getElementById('drawer-panel').classList.remove('open');
    document.body.style.overflow = '';
  }

  function enviarWA(linkMovil, linkWeb) {
    const esMobil = /Android|iPhone|iPad/i.test(navigator.userAgent);
    window.open(esMobil ? linkMovil : linkWeb, '_blank');
  }

  // â”€â”€ RECORDATORIOS MASIVOS â”€â”€
  let _recLista = [];
  let _recIdx = 0;
  let _recEnviados = [];

  function iniciarRecordatorios() {
    // Primero, igualamos la lista a lo que se ve visualmente (solo vencidos o que vencen hoy)
    let listaReal = clientesFiltrados.filter(c => {
      if (c.vencimiento && c.vencimiento !== '-') {
        const partes = c.vencimiento.split('/');
        if (partes.length === 3) {
          const hoyDate = new Date(); hoyDate.setHours(0,0,0,0);
          const vDate = new Date(partes[2], partes[1] - 1, partes[0]); vDate.setHours(0,0,0,0);
          const diasReales = Math.round((hoyDate.getTime() - vDate.getTime()) / 86400000);
          if (diasReales < 0) return false;
        }
      }
      return true;
    });

    const totalLista = listaReal.length;
    let sinTelefono = 0;
    let sinMensaje = 0;
    
    listaReal.forEach(c => {
      const tieneNum = c.telefono || c.celular;
      if (!tieneNum) sinTelefono++;
      else if (!c.mensaje) sinMensaje++;
    });

    const conWA = listaReal.filter(c => (c.telefono || c.celular) && c.mensaje);
    if (!conWA.length) {
      alert(`Revisados: ${totalLista} clientes en mora.\n\nNinguno puede recibir WhatsApp.\nFaltan números de celular: ${sinTelefono}\nFalta texto de mensaje: ${sinMensaje}`);
      return;
    }
    
    if (conWA.length < totalLista) {
      alert(`Información de Envíos Masivos:\n\nTotal de clientes en mora: ${totalLista}\nSe enviarán WhatsApps a: ${conWA.length}\n\nOmitidos automáticamente:\n- Sin número registrado en Excel: ${sinTelefono}\n- Sin texto de cobro asignado: ${sinMensaje}`);
    }

    _recLista = conWA;
    _recIdx = 0;
    _recEnviados = [];
    document.getElementById('modal-rec').style.display = 'flex';
    renderRecModal();
  }

  function renderRecModal() {
    const total = _recLista.length;
    const c = _recLista[_recIdx];
    const yaEnviado = _recEnviados.includes(_recIdx);
    document.getElementById('rec-contador').textContent = `${_recIdx + 1}/${total}`;
    document.getElementById('rec-progreso').style.width = `${((_recIdx + 1) / total) * 100}%`;
    document.getElementById('rec-nombre').textContent = c.nombre || '-';
    // El avatar ahora es estático con el ícono estándar de usuario (Lucide)
    // document.getElementById('rec-avatar').textContent = c.nombre ? c.nombre.trim().split(' ').map(w=>w[0]).join('').toUpperCase().substring(0,2) : '?';
    document.getElementById('rec-tel').textContent = c.celular || c.telefono || '-';
    document.getElementById('rec-msg').textContent = c.mensaje;
    document.getElementById('rec-btn-ant').style.opacity = _recIdx > 0 ? '1' : '0.2';
    document.getElementById('rec-btn-ant').style.pointerEvents = _recIdx > 0 ? 'auto' : 'none';
    
    // Calcular tiempo estimado (15s por msj + 2 min pausa cada 15) - MODO RÁPIDO
    const timeSecs = (total * 15) + (Math.floor(total / 15) * 120);
    const totalMinutes = Math.ceil(timeSecs / 60);
    document.getElementById('rec-tiempo').textContent = '~' + totalMinutes + ' min' + (totalMinutes <= 1 ? ' o menos' : '');
  }

  function exportarWhatsAppCSV() {
    if(!_recLista || !_recLista.length) {
      alert("No hay clientes para exportar.");
      return;
    }
    
    // Configurar Payload para nuestra Extensión de Chrome
    let exportData = [];
    
    // Text CSV Fallback
    let csvContent = "Phone,Message\n";
    
    _recLista.forEach(c => {
      let rawPhone = c.telefono || c.celular;
      let phone = window.extractValidPhone ? window.extractValidPhone(rawPhone) : (rawPhone || "").toString().replace(/\D/g, "");
      if(!phone.startsWith("51") && phone.length === 9) phone = "51" + phone;
      let msg = (c.mensaje || "").replace(/"/g, '""');
      
      exportData.push({ phone: phone, message: c.mensaje, name: c.nombre || null });
      csvContent += `"${phone}","${msg}"\n`;
    });

    // Intentar comunicarse con la Extensión primero:
    // Guardamos la lista en memoria para poder deducir cuáles fallaron después.
    window._lastBulkPayload = exportData;
    // Disparamos un evento personalizado que el content_crm.js estará escuchando.
    let evt = new CustomEvent("GE_WA_BOT_SEND_BULK", { detail: exportData });
    window.dispatchEvent(evt);
    
    // (Opcional) Si quisieramos descargar el CSV como backup, lo hacemos aquí, 
    // pero para no confundir al robot, ignoraremos el backup a menos que aprieten otro botón.
  }

  function descargarCSVBackup() {
    if(!_recLista || !_recLista.length) return;
    let csvContent = "Phone,Message\n";
    _recLista.forEach(c => {
      let phone = (c.telefono || c.celular || "").toString().replace(/\D/g, "");
      if(!phone.startsWith("51") && phone.length === 9) phone = "51" + phone;
      let msg = (c.mensaje || "").replace(/"/g, '""');
      csvContent += `"${phone}","${msg}"\n`;
    });
    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Clientes_WhatsApp_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  function cerrarRecModal() {
    document.getElementById('modal-rec').style.display = 'none';
  }
  window.cerrarRecModal = cerrarRecModal;

  window.recAvanzar = function(dir) {
    if (dir === -1) {
      if (_recIdx > 0) _recIdx--;
    } else {
      if (_recIdx < _recLista.length - 1) _recIdx++;
      else _recIdx = 0;
    }
    renderRecModal();
  };

  // â”€â”€ GESTIÓN DE NOTIFICADOS (LOCALSTORAGE) â”€â”€
  function getNotificadosKey() {
    const today = new Date().toISOString().slice(0,10);
    return 'ge_wa_notificados_' + today;
  }

  function limpiarNotificadosAntiguos() {
    const keyPrefix = 'ge_wa_notificados_';
    const todayKey = getNotificadosKey();
    let keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      let k = localStorage.key(i);
      if (k && k.startsWith(keyPrefix) && k !== todayKey) {
        keysToRemove.push(k);
      }
    }
    keysToRemove.forEach(k => localStorage.removeItem(k));
  }
  
  // Ejecutar limpieza al cargar
  limpiarNotificadosAntiguos();

  function marcarComoNotificados(lista) {
    const key = getNotificadosKey();
    let guardados = JSON.parse(localStorage.getItem(key) || '[]');
    lista.forEach(c => {
      if (!guardados.includes(c.phone)) {
        guardados.push(c.phone);
      }
    });
    localStorage.setItem(key, JSON.stringify(guardados));
  }
  
  function esNotificado(telefono) {
    if (!telefono) return false;
    let phoneStr = telefono.toString().replace(/\D/g, "");
    if (!phoneStr.startsWith("51") && phoneStr.length === 9) phoneStr = "51" + phoneStr;
    const key = getNotificadosKey();
    let guardados = JSON.parse(localStorage.getItem(key) || '[]');
    return guardados.includes(phoneStr);
  }

  window.addEventListener('GE_WA_BOT_COMPLETED', (e) => {
    const data = e.detail;
    if (!window._lastBulkPayload) return;
    
    // Extraer teléfonos que fallaron
    const failedPhones = (data.failedItems || []).map(item => item.phone);
    
    // Filtrar los que sí se enviaron (estaban en el payload pero no en failedItems)
    const exitosos = window._lastBulkPayload.filter(item => !failedPhones.includes(item.phone));
    
    if (exitosos.length > 0) {
      marcarComoNotificados(exitosos);
      renderClientes(); // Re-render para mostrar los tags
    }
    
    window._lastBulkPayload = null; // Limpiar memoria
    
    if(typeof showToast === 'function') {
      showToast(`Envíos masivos completados: ${exitosos.length} enviados, ${failedPhones.length} fallidos.`);
    } else {
      alert(`Envíos masivos completados: ${exitosos.length} enviados, ${failedPhones.length} fallidos.`);
    }
    cerrarRecModal();
  });

  // â”€â”€ VOUCHERS â”€â”€
