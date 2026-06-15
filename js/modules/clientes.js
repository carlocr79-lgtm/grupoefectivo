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
    const sel = document.getElementById('filtros-asesores');
    if(!sel) return;
    sel.innerHTML = '<option value="">Todos</option>';
    asesores.forEach(a => {
      sel.innerHTML += `<option value="${escapeHtml(a)}">${escapeHtml(a)}</option>`;
    });
    // Conservar seleccion previa si existe
    if (filtroAsesor && asesores.includes(filtroAsesor)) {
      sel.value = filtroAsesor;
    } else {
      filtroAsesor = '';
      sel.value = '';
    }
  }

  function setFiltroAsesor(asesor) {
    filtroAsesor = asesor;
    renderClientes();
  }

  const avatarColors = ['#FF4B4B', '#FF8F00', '#00C853', '#2962FF', '#AA00FF', '#00BFA5', '#FF4081', '#3D5AFE'];
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
    if (dias <= 8) { text = 'Normal'; color = 'var(--azul)'; bg = '#e0eaff'; border = '#bfdbfe'; }
    else if (dias <= 30) { text = 'CPP'; color = '#92400e'; bg = '#fef3c7'; border = '#fbbf24'; }
    else if (dias <= 60) { text = 'Deficiente'; color = '#c2410c'; bg = '#ffedd5'; border = '#fb923c'; }
    else if (dias <= 120) { text = 'Dudoso'; color = '#b91c1c'; bg = '#fee2e2'; border = '#f87171'; }
    else { text = 'Pérdida'; color = 'white'; bg = '#991b1b'; border = '#7f1d1d'; }
    return `<span style="background:${bg}; color:${color}; padding:2px 6px; border-radius:4px; font-size:9.5px; font-weight:500; text-transform:uppercase; letter-spacing:0.3px; border: 1px solid ${border};">${text}</span>`;
  };

  window.ejecutarBusquedaGlobal = async function() {
    const query = document.getElementById('input-busqueda-global').value.trim();
    if (query.length < 2) return;

    const container = document.getElementById('resultados-busqueda-global');
    container.innerHTML = '<div class="skeleton-box"><div class="skeleton sk-avatar"></div><div style="flex:1;"><div class="skeleton sk-line w-50"></div><div class="skeleton sk-line w-80"></div></div></div>';
    
    try {
      const sedeReq = window.cajaSedeActual || '';
      const resp = await apiFetch({ admin: 'clientes_buscar_global', q: query, sedeContexto: sedeReq });
      
      if (!Array.isArray(resp)) {
        console.error("Backend Error:", resp);
        const errMsg = resp.error ? escapeHtml(resp.error) : 'El backend no está actualizado. Por favor, asegúrate de guardar e implementar Codigo.gs.txt en Google Apps Script.';
        container.innerHTML = '<div class="empty" style="color:#ef4444; max-width:80%; margin:auto; word-wrap:break-word;">Error: ' + errMsg + '</div>';
        return;
      }

      if (resp.length === 0) {
        container.innerHTML = '<div class="empty"><div class="icon"><i data-lucide="search-x" class="mi" style="font-size:40px;"></i></div>Sin resultados</div>';
        const contador = document.getElementById('contador-clientes-busqueda');
        if(contador) contador.style.display = 'none';
        lucide.createIcons();
        return;
      }

      // Reutilizamos la lógica de renderizado de tarjetas, pero insertamos en el contenedor de búsqueda
      let html = '';
      resp.forEach((c, idx) => {
        const linkWA = c.celular ? `https://web.whatsapp.com/send?phone=${c.celular}` : '';
        const linkWAMovil = c.celular ? `https://api.whatsapp.com/send?phone=${c.celular}` : '';
        const waSvg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="12" height="12" fill="currentColor"><path d="M16 0C7.163 0 0 7.163 0 16c0 2.822.736 5.472 2.027 7.774L0 32l8.454-2.01A15.938 15.938 0 0016 32c8.837 0 16-7.163 16-16S24.837 0 16 0zm0 29.333a13.27 13.27 0 01-6.748-1.833l-.484-.287-5.02 1.194 1.271-4.874-.317-.502A13.267 13.267 0 012.667 16C2.667 8.636 8.636 2.667 16 2.667S29.333 8.636 29.333 16 23.364 29.333 16 29.333zm7.27-9.862c-.398-.199-2.354-1.162-2.72-1.294-.365-.133-.631-.199-.897.199-.266.398-1.029 1.294-1.262 1.56-.232.266-.465.299-.863.1-.398-.2-1.681-.619-3.203-1.977-1.184-1.057-1.983-2.362-2.215-2.76-.232-.398-.025-.613.174-.811.179-.178.398-.465.598-.698.199-.232.265-.398.398-.664.133-.266.066-.498-.033-.697-.1-.2-.897-2.162-1.229-2.96-.324-.777-.653-.672-.897-.684l-.764-.013c-.266 0-.697.1-1.063.498-.365.398-1.395 1.362-1.395 3.323s1.428 3.854 1.627 4.12c.2.266 2.81 4.287 6.808 6.014.951.41 1.694.656 2.273.839.955.304 1.824.261 2.511.158.766-.114 2.354-.962 2.687-1.891.332-.929.332-1.726.232-1.891-.099-.166-.365-.266-.763-.465z"/></svg>';
        
        const montoReal = (c.dias <= 0 && c.cuota > 0) ? c.cuota : c.deuda;
        const deudaFmt = c.tipo === 'INACTIVO' ? '-' : 'S/. ' + parseFloat(montoReal || 0).toLocaleString('es-PE',{minimumFractionDigits:2});
        const vencimientoStr = c.vencimiento ? c.vencimiento : '-';
        let estadoInfo = '';
        if (c.tipo === 'INACTIVO') {
          estadoInfo = `<span style="font-size:10px; font-weight:500; padding:2px 6px; border-radius:4px; background:#f1f5f9; color:#64748b; letter-spacing:0.3px;">SCAL</span>`;
        } else if (c.dias > 0) {
          estadoInfo = `<span style="color:var(--texto2); font-weight:500; font-size:11px; display:flex; align-items:center;"><i data-lucide="activity" class="mi xs" style="margin-right:4px;"></i> ACTIVO</span><span style="color:var(--rojo); font-weight:500; font-size:11px; display:flex; align-items:center;"><i data-lucide="triangle-alert" class="mi xs" style="margin-right:4px;"></i> ${c.dias} días</span>${window.getClasificacionRiesgoHTML(c.dias)}`;
        } else {
          estadoInfo = `<span style="color:var(--texto2); font-weight:500; font-size:11px; display:flex; align-items:center;"><i data-lucide="activity" class="mi xs" style="margin-right:4px;"></i> ACTIVO</span><span style="color:var(--azul); font-weight:500; font-size:11px; display:flex; align-items:center;"><i data-lucide="check-circle" class="mi xs" style="margin-right:4px;"></i> AL DÍA</span>${window.getClasificacionRiesgoHTML(c.dias)}`;
        }

        const bgColor = getColorForName(c.nombre);
        const iniciales = getInitials(c.nombre);

        let avatarBg = '#ffe6e6';
        let avatarColor = 'var(--rojo)';
        if (c.tipo === 'INACTIVO') {
          avatarBg = '#f1f5f9';
          avatarColor = 'var(--texto2)';
        } else if (c.dias <= 0) {
          avatarBg = 'rgba(77,159,255,0.12)';
          avatarColor = 'var(--azul)';
        }

        html += `
        <div class="cliente-card" style="display:flex; justify-content:space-between; align-items:center; padding:10px 16px; cursor:pointer; background:white; margin-bottom:8px;" onclick="abrirClienteDrawerFromSearch(${idx})">
          
          <div style="display:flex; align-items:center; gap:16px;">
            <div class="avatar" style="background:${avatarBg}; color:${avatarColor}; width:36px; height:36px; display:flex; align-items:center; justify-content:center; flex-shrink:0;"><i data-lucide="user" class="mi"></i></div>
            <div style="display:flex; flex-direction:column;">
              <div class="cliente-nombre" style="font-size:14px; text-transform:uppercase; font-weight:500; color:var(--texto); letter-spacing:-0.2px;">${escapeHtml(c.nombre)}</div>
              <div style="display:flex; align-items:center; gap:12px; margin-top:4px;">
                ${estadoInfo}
                <span class="cliente-cod" style="margin-top:0; font-size:11px; font-weight:500; color:var(--texto2);">Cód. ${escapeHtml(c.cod)}</span>
                ${c.tipo !== 'INACTIVO' && c.asesor ? `<span class="cliente-cod" style="margin-top:0; font-size:11px; font-weight:500; color:var(--texto2); display:flex; align-items:center;"><i data-lucide="user" class="mi xs" style="margin-right:4px;"></i> ${escapeHtml(c.asesor.split(' ')[0])}</span>` : ''}
              </div>
            </div>
          </div>

          <div style="display:flex; flex-direction:column; align-items:flex-end;">
            <div class="cliente-monto" style="color:var(--texto); font-size:15px; font-weight:500; margin-bottom:6px;">${deudaFmt}</div>
            <div style="display:flex; align-items:center; gap:8px;">
              <span style="color:var(--texto2); font-size:10.5px; font-weight:500; margin-right:8px;">${c.tipo === 'INACTIVO' ? 'Cancelado:' : 'Vence:'} ${vencimientoStr}</span>
              ${c.celular ? `<button class="btn-call" style="width:26px; height:26px; border-radius:50%; background:white; color:var(--texto2); border:1px solid var(--gris2); box-shadow:none; cursor:pointer;" onclick="window.location.href='tel:${c.celular.replace(/\s+/g,'')}'; event.stopPropagation();"><i data-lucide="phone" class="mi xs" style="margin:0;"></i></button>` : ''}
              ${linkWA ? `<button class="btn-wa" style="width:26px; height:26px; border-radius:50%; background:white; color:var(--texto2); border:1px solid var(--gris2); box-shadow:none; animation:none; cursor:pointer;" onclick="window.open('${linkWA}', '_blank'); event.stopPropagation();">${waSvg}</button>` : ''}
              <button style="width:26px; height:26px; border-radius:50%; background:white; border:1px solid var(--gris2); color:var(--texto2); display:flex; align-items:center; justify-content:center; cursor:pointer;" onclick="event.stopPropagation(); abrirClienteDrawerFromSearch(${idx});"><i data-lucide="chevron-right" class="mi xs" style="margin:0;"></i></button>
            </div>
          </div>

        </div>`;
      });
      container.innerHTML = html;
      lucide.createIcons();

      // Guardamos la data global por si se necesita ver detalles (verDetalleCliente usa clientes o clientesFiltrados,
      // así que temporalmente la unimos o la gestionamos, pero verDetalleCliente busca en baseData. 
      // Si fallase, habría que inyectar el arreglo).
      // Solución temporal segura: Guardar en window._ultimoResultadoBusqueda
      window._ultimoResultadoBusqueda = resp;

      // Actualizar contador
      const contador = document.getElementById('contador-clientes-busqueda');
      if (contador) {
        contador.style.display = 'flex';
        contador.innerHTML = `<i data-lucide="users" class="mi" style="color:var(--texto2);"></i> <span style="color:var(--azul); font-weight:500;">${resp.length}</span>`;
        lucide.createIcons();
      }

      // Actualizar botón a estado "Limpiar"
      const btn = document.getElementById('btn-busqueda-global');
      if (btn) {
        btn.innerHTML = '<i data-lucide="trash-2" class="mi" style="margin:0;"></i>';
        btn.style.background = '#fee2e2'; // subtle red bg
        btn.style.color = '#dc2626'; // strong red icon
        btn.dataset.estado = 'limpiar';
        lucide.createIcons();
      }

    } catch (e) {
      console.error("Frontend Error:", e);
      container.innerHTML = '<div class="empty">Error de Frontend: ' + (e.message || "desconocido") + '</div>';
    }
  }

  window.manejarBusquedaGlobal = function() {
    const btn = document.getElementById('btn-busqueda-global');
    if (btn && btn.dataset.estado === 'limpiar') {
      // Acción de Limpiar
      document.getElementById('input-busqueda-global').value = '';
      document.getElementById('resultados-busqueda-global').innerHTML = '';
      const contador = document.getElementById('contador-clientes-busqueda');
      if(contador) contador.style.display = 'none';
      btn.innerHTML = '<i data-lucide="arrow-right" class="mi" style="margin:0;"></i>';
      btn.style.background = 'var(--azul)';
      btn.style.color = 'white';
      btn.dataset.estado = 'buscar';
      if(window.lucide) window.lucide.createIcons();
    } else {
      // Acción de Buscar
      ejecutarBusquedaGlobal();
    }
  };

  window.onInputBusquedaGlobal = function(val) {
    const btn = document.getElementById('btn-busqueda-global');
    if (val.trim() === '' && btn && btn.dataset.estado === 'limpiar') {
      btn.innerHTML = '<i data-lucide="arrow-right" class="mi" style="margin:0;"></i>';
      btn.style.background = 'var(--azul)';
      btn.style.color = 'white';
      btn.dataset.estado = 'buscar';
      document.getElementById('resultados-busqueda-global').innerHTML = '';
      const contador = document.getElementById('contador-clientes-busqueda');
      if(contador) contador.style.display = 'none';
      if(window.lucide) window.lucide.createIcons();
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
    const busqueda = document.getElementById('buscar-cliente').value.toUpperCase();
    let baseData = clientes;
    
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
      document.getElementById('lista-clientes').innerHTML = '<div class="empty"><div class="icon"><i data-lucide="search-x" class="mi" style="font-size:40px;"></i></div>Sin resultados</div>';
      const contadorEl = document.getElementById('contador-clientes-mora');
      if (contadorEl) contadorEl.style.display = 'none';
      return;
    }

    // Ordenar por dias de atraso desc
    lista.sort((a, b) => b.dias - a.dias);
    clientesFiltrados = lista;

    const contadorEl = document.getElementById('contador-clientes-mora');
    if (contadorEl) {
      contadorEl.style.display = 'flex';
      contadorEl.innerHTML = `<i data-lucide="users" class="mi" style="font-size:16px; margin-right:4px;"></i> <span style="color:var(--azul); font-weight:500; font-size:15px;">${lista.length}</span>`;
      if (window.lucide) window.lucide.createIcons();
    }

    const cardsHTML = clientesFiltrados.map((c, idx) => {
      const isNotificado = esNotificado(c.telefono || c.celular);
      const rowStyle = isNotificado ? 'background-color:#f9fbff;' : '';
      
      const linkWA = c.telefono ? `https://web.whatsapp.com/send?phone=${c.telefono}${c.mensaje ? '&text=' + encodeURIComponent(c.mensaje) : ''}` : '';
      const linkWAMovil = c.telefono ? `https://api.whatsapp.com/send?phone=${c.telefono}${c.mensaje ? '&text=' + encodeURIComponent(c.mensaje) : ''}` : '';
      const waSvg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="12" height="12" fill="currentColor"><path d="M16 0C7.163 0 0 7.163 0 16c0 2.822.736 5.472 2.027 7.774L0 32l8.454-2.01A15.938 15.938 0 0016 32c8.837 0 16-7.163 16-16S24.837 0 16 0zm0 29.333a13.27 13.27 0 01-6.748-1.833l-.484-.287-5.02 1.194 1.271-4.874-.317-.502A13.267 13.267 0 012.667 16C2.667 8.636 8.636 2.667 16 2.667S29.333 8.636 29.333 16 23.364 29.333 16 29.333zm7.27-9.862c-.398-.199-2.354-1.162-2.72-1.294-.365-.133-.631-.199-.897.199-.266.398-1.029 1.294-1.262 1.56-.232.266-.465.299-.863.1-.398-.2-1.681-.619-3.203-1.977-1.184-1.057-1.983-2.362-2.215-2.76-.232-.398-.025-.613.174-.811.179-.178.398-.465.598-.698.199-.232.265-.398.398-.664.133-.266.066-.498-.033-.697-.1-.2-.897-2.162-1.229-2.96-.324-.777-.653-.672-.897-.684l-.764-.013c-.266 0-.697.1-1.063.498-.365.398-1.395 1.362-1.395 3.323s1.428 3.854 1.627 4.12c.2.266 2.81 4.287 6.808 6.014.951.41 1.694.656 2.273.839.955.304 1.824.261 2.511.158.766-.114 2.354-.962 2.687-1.891.332-.929.332-1.726.232-1.891-.099-.166-.365-.266-.763-.465z"/></svg>';

      const montoReal = (c.dias <= 0 && c.cuota > 0) ? c.cuota : c.deuda;
      const deudaFmt = 'S/. ' + parseFloat(montoReal || 0).toLocaleString('es-PE',{minimumFractionDigits:2});
      const vencimientoStr = c.vencimiento ? c.vencimiento : '-';

      let avatarBg = '#ffe6e6';
      let avatarColor = 'var(--rojo)';
      if (c.tipo === 'INACTIVO') {
        avatarBg = '#f1f5f9';
        avatarColor = 'var(--texto2)';
      } else if (c.dias < 0 || (c.dias === 0 && !c.vencimiento)) {
        avatarBg = 'rgba(77,159,255,0.12)';
        avatarColor = 'var(--azul)';
      } else if (c.dias === 0) {
        avatarBg = 'rgba(77,159,255,0.12)'; // HOY
        avatarColor = 'var(--azul)';
      }

      return `
      <div class="cliente-card" style="display:flex; justify-content:space-between; align-items:center; padding:10px 16px; cursor:pointer; ${rowStyle}" onclick="abrirClienteDrawer(${idx})">
        
        <div style="display:flex; align-items:center; gap:16px;">
          <div class="avatar" style="background:${avatarBg}; color:${avatarColor}; width:36px; height:36px; display:flex; align-items:center; justify-content:center; flex-shrink:0;"><i data-lucide="user" class="mi"></i></div>
          <div style="display:flex; flex-direction:column;">
            <div class="cliente-nombre" style="font-size:14px; text-transform:uppercase; font-weight:500; color:var(--texto); letter-spacing:-0.2px;">${escapeHtml(c.nombre)}</div>
            <div style="display:flex; align-items:center; gap:12px; margin-top:4px;">
              <span style="color:var(--texto2); font-weight:500; font-size:11px; display:flex; align-items:center;"><i data-lucide="activity" class="mi xs" style="margin-right:4px;"></i> ACTIVO</span>
              ${c.dias === 0 ? 
                `<span style="color:var(--azul); font-weight:500; font-size:11px; display:flex; align-items:center;"><i data-lucide="calendar" class="mi xs" style="margin-right:4px;"></i> HOY</span>` : 
                `<span style="color:var(--rojo); font-weight:500; font-size:11px; display:flex; align-items:center;"><i data-lucide="triangle-alert" class="mi xs" style="margin-right:4px;"></i> ${c.dias} días</span>`
              }
              ${window.getClasificacionRiesgoHTML(c.dias)}
              <span class="cliente-cod" style="margin-top:0; font-size:11px; font-weight:500; color:var(--texto2);">Cód. ${escapeHtml(c.cod)}</span>
            </div>
          </div>
        </div>

        <div style="display:flex; flex-direction:column; align-items:flex-end;">
          <div class="cliente-monto" style="color:var(--texto); font-size:15px; margin-bottom:6px;">${deudaFmt}</div>
          <div style="display:flex; align-items:center; gap:8px;">
            <span style="color:var(--texto2); font-size:10.5px; font-weight:500; margin-right:8px;">${c.tipo === 'INACTIVO' ? 'Cancelado:' : 'Vence:'} ${vencimientoStr}</span>
            ${c.celular ? `<button class="btn-call" style="width:26px; height:26px; border-radius:50%; background:white; color:var(--texto2); border:1px solid var(--gris2); box-shadow:none;" onclick="window.location.href='tel:${c.celular.replace(/\s+/g,'')}'; event.stopPropagation();"><i data-lucide="phone" class="mi xs" style="margin:0;"></i></button>` : ''}
            ${linkWA ? `<button class="btn-wa" style="width:26px; height:26px; border-radius:50%; background:white; color:var(--texto2); border:1px solid var(--gris2); box-shadow:none; animation:none;" onclick="enviarWA('${linkWAMovil}','${linkWA}'); event.stopPropagation();">${waSvg}</button>` : ''}
            <button style="width:26px; height:26px; border-radius:50%; background:white; border:1px solid var(--gris2); color:var(--texto2); display:flex; align-items:center; justify-content:center; cursor:pointer;" onclick="event.stopPropagation(); abrirClienteDrawer(${idx});"><i data-lucide="chevron-right" class="mi xs" style="margin:0;"></i></button>
          </div>
        </div>

      </div>`;
    }).join('');

    document.getElementById('lista-clientes').innerHTML = `
      <div class="movimientos-list" style="padding-bottom:40px;">
        ${cardsHTML}
      </div>
    `;
    
    // Inicializar los iconos de lucide recien inyectados
    if (typeof lucide !== 'undefined') {
      lucide.createIcons();
    }
  }

  function abrirClienteDrawer(idx) {
    const c = clientesFiltrados[idx];
    if (!c) return;

    // Configurar avatar y color
    let avatarBg = '#ffe6e6';
    let avatarColor = 'var(--rojo)';
    if (c.tipo === 'INACTIVO') {
      avatarBg = '#f1f5f9';
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
       riskBadge = `<span style="font-size:10px; font-weight:500; padding:2px 6px; border-radius:4px; background:#f1f5f9; color:#64748b; letter-spacing:0.3px;">SCAL</span>`;
    } else {
       diasTag = c.dias > 90 ? `<span style="color:var(--rojo); font-weight:500; font-size:12px; display:flex; align-items:center;"><i data-lucide="alert-circle" class="mi xs" style="margin-right:4px;"></i> ${c.dias} días</span>` :
                 c.dias > 0  ? `<span style="color:var(--naranja); font-weight:500; font-size:12px; display:flex; align-items:center;"><i data-lucide="alert-triangle" class="mi xs" style="margin-right:4px;"></i> ${c.dias} días</span>` :
                               `<span style="color:var(--verde); font-weight:500; font-size:12px; display:flex; align-items:center;"><i data-lucide="check-circle" class="mi xs" style="margin-right:4px;"></i> Al día</span>`;
       riskBadge = window.getClasificacionRiesgoHTML(c.dias);
    }
    
    document.getElementById('dr-tags').innerHTML = `<div style="display:flex; align-items:center; flex-wrap:wrap; margin-top:4px; gap:10px;">${diasTag} ${riskBadge} ${c.voucher ? `<span style="color:#cc8800; font-weight:500; font-size:12px; border-left:1px solid #e2e8f0; padding-left:10px; display:flex; align-items:center;"><i data-lucide="hourglass" class="mi xs" style="margin-right:4px;"></i> Voucher</span>` : ''}</div>`;

    // Finanzas
    document.getElementById('dr-deuda').textContent = 'S/. ' + parseFloat(c.deuda || 0).toLocaleString('es-PE',{minimumFractionDigits:2});
    document.getElementById('dr-cuota').textContent = c.cuota ? 'S/. ' + parseFloat(c.cuota).toLocaleString('es-PE',{minimumFractionDigits:2}) : '-';
    const numCuotas = c.cuotas > 0 ? `<span style="color:var(--rojo);font-weight:900;background:#fff0f0;padding:2px 8px;border-radius:12px;">${c.cuotas} cuota(s)</span>` : '0 cuotas';
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
    if(c.celular) {
       accionesHTML += `<button style="background:var(--azul);" onclick="window.location.href='tel:${c.celular.replace(/\s+/g,'')}'"><i data-lucide="phone" class="mi"></i> Llamar</button>`;
    }
    const linkWA = c.telefono ? `https://web.whatsapp.com/send?phone=${c.telefono}${c.mensaje ? '&text=' + encodeURIComponent(c.mensaje) : ''}` : '';
    const linkWAMovil = c.telefono ? `https://api.whatsapp.com/send?phone=${c.telefono}${c.mensaje ? '&text=' + encodeURIComponent(c.mensaje) : ''}` : '';
    if(linkWA) {
       accionesHTML += `<button style="background:var(--azul2);" onclick="enviarWA('${linkWAMovil}','${linkWA}')"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="18" height="18" fill="white"><path d="M16 0C7.163 0 0 7.163 0 16c0 2.822.736 5.472 2.027 7.774L0 32l8.454-2.01A15.938 15.938 0 0016 32c8.837 0 16-7.163 16-16S24.837 0 16 0zm0 29.333a13.27 13.27 0 01-6.748-1.833l-.484-.287-5.02 1.194 1.271-4.874-.317-.502A13.267 13.267 0 012.667 16C2.667 8.636 8.636 2.667 16 2.667S29.333 8.636 29.333 16 23.364 29.333 16 29.333zm7.27-9.862c-.398-.199-2.354-1.162-2.72-1.294-.365-.133-.631-.199-.897.199-.266.398-1.029 1.294-1.262 1.56-.232.266-.465.299-.863.1-.398-.2-1.681-.619-3.203-1.977-1.184-1.057-1.983-2.362-2.215-2.76-.232-.398-.025-.613.174-.811.179-.178.398-.465.598-.698.199-.232.265-.398.398-.664.133-.266.066-.498-.033-.697-.1-.2-.897-2.162-1.229-2.96-.324-.777-.653-.672-.897-.684l-.764-.013c-.266 0-.697.1-1.063.498-.365.398-1.395 1.362-1.395 3.323s1.428 3.854 1.627 4.12c.2.266 2.81 4.287 6.808 6.014.951.41 1.694.656 2.273.839.955.304 1.824.261 2.511.158.766-.114 2.354-.962 2.687-1.891.332-.929.332-1.726.232-1.891-.099-.166-.365-.266-.763-.465z"/></svg> WhatsApp</button>`;
    }
    document.getElementById('dr-actions').innerHTML = accionesHTML;

    // Show Drawer
    document.getElementById('drawer-overlay').classList.add('open');
    document.getElementById('drawer-panel').classList.add('open');
    document.body.style.overflow = 'hidden'; // Evitar scroll de fondo
  }

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
    const conWA = clientesFiltrados.filter(c => c.telefono && c.mensaje);
    if (!conWA.length) {
      alert('No hay clientes con teléfono y mensaje configurado en la lista actual.');
      return;
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
    const esMobil = /Android|iPhone|iPad/i.test(navigator.userAgent);
    const linkWA = esMobil
      ? `https://api.whatsapp.com/send?phone=${c.telefono}&text=${encodeURIComponent(c.mensaje)}`
      : `https://web.whatsapp.com/send?phone=${c.telefono}&text=${encodeURIComponent(c.mensaje)}`;

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
      let phone = (c.telefono || c.celular || "").toString().replace(/\D/g, "");
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

    // Damos un mensaje de consola
    console.log("Evento enviado al Robot. Si la extensión no atrapa esto en 1s, el navegador descargará el CSV por seguridad.");
    
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
  });

  // â”€â”€ VOUCHERS â”€â”€