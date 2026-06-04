  async function cargarClientes() {
    try {
      const resp = await apiFetch({ admin: 'clientes' });
      if (!Array.isArray(resp)) {
        console.error('Respuesta inesperada:', resp);
        document.getElementById('lista-clientes').innerHTML = '<div class="empty"><div class="icon"><i data-lucide="alert-triangle" class="mi" style="font-size:40px;color:var(--naranja);"></i></div>Error: ' + (resp && resp.error ? resp.error : 'Respuesta inválida') + '</div>';
        return;
      }
      clientes = resp;
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

  function filtrarClientes() { renderClientes(); }

  let clientesFiltrados = [];

  function renderClientes() {
    const busqueda = document.getElementById('buscar-cliente').value.toUpperCase();
    let lista = clientes.filter(c => {
      const matchAsesor = !filtroAsesor || c.asesor.includes(filtroAsesor);
      const matchBusqueda = !busqueda || c.nombre.toUpperCase().includes(busqueda) || c.celular.includes(busqueda);
      return matchAsesor && matchBusqueda;
    });

    if (lista.length === 0) {
      document.getElementById('lista-clientes').innerHTML = '<div class="empty"><div class="icon"><i data-lucide="search-x" class="mi" style="font-size:40px;"></i></div>Sin resultados</div>';
      return;
    }

    // Ordenar por dias de atraso desc
    lista.sort((a, b) => b.dias - a.dias);
    clientesFiltrados = lista;

    document.getElementById('lista-clientes').innerHTML = clientesFiltrados.map((c, idx) => {
      const diasTag = c.dias > 90 ? `<span class="tag tag-critico"><i data-lucide="alert-circle" class="mi xs"></i> ${c.dias} d&iacute;as</span>` :
                      c.dias > 0  ? `<span class="tag tag-vencido"><i data-lucide="alert-triangle" class="mi xs"></i> ${c.dias} d&iacute;as</span>` :
                                    `<span class="tag tag-pendiente"><i data-lucide="clock" class="mi xs"></i> Vence hoy</span>`;
      const tieneVoucher = c.voucher ? `<span class="tag tag-pendiente"><i data-lucide="hourglass" class="mi xs"></i> Voucher enviado</span>` : '';
      const isNotificado = esNotificado(c.telefono || c.celular);
      const notificadoTag = isNotificado ? `<span class="tag" style="background:#e8f8f5; color:var(--verde);"><i data-lucide="check-circle" class="mi xs"></i> Notificado hoy</span>` : '';
      const cardStyle = isNotificado ? 'cursor:pointer; background-color:var(--azul-claro); border-color:#cce0ff; box-shadow:0 0 5px rgba(0,82,204,0.1);' : 'cursor:pointer;';
      const linkWA = c.telefono ? 
        `https://web.whatsapp.com/send?phone=${c.telefono}${c.mensaje ? '&text=' + encodeURIComponent(c.mensaje) : ''}` : '';
      const linkWAMovil = c.telefono ?
        `https://api.whatsapp.com/send?phone=${c.telefono}${c.mensaje ? '&text=' + encodeURIComponent(c.mensaje) : ''}` : '';

      const cuotaFmt = c.cuota ? 'S/. ' + parseFloat(c.cuota).toLocaleString('es-PE',{minimumFractionDigits:2}) : '-';
      const deudaFmt = 'S/. ' + parseFloat(c.deuda).toLocaleString('es-PE',{minimumFractionDigits:2});
      const detId = 'det-' + idx;
      
      const waSvg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="16" height="16" fill="currentColor" style="vertical-align:middle;"><path d="M16 0C7.163 0 0 7.163 0 16c0 2.822.736 5.472 2.027 7.774L0 32l8.454-2.01A15.938 15.938 0 0016 32c8.837 0 16-7.163 16-16S24.837 0 16 0zm0 29.333a13.27 13.27 0 01-6.748-1.833l-.484-.287-5.02 1.194 1.271-4.874-.317-.502A13.267 13.267 0 012.667 16C2.667 8.636 8.636 2.667 16 2.667S29.333 8.636 29.333 16 23.364 29.333 16 29.333zm7.27-9.862c-.398-.199-2.354-1.162-2.72-1.294-.365-.133-.631-.199-.897.199-.266.398-1.029 1.294-1.262 1.56-.232.266-.465.299-.863.1-.398-.2-1.681-.619-3.203-1.977-1.184-1.057-1.983-2.362-2.215-2.76-.232-.398-.025-.613.174-.811.179-.178.398-.465.598-.698.199-.232.265-.398.398-.664.133-.266.066-.498-.033-.697-.1-.2-.897-2.162-1.229-2.96-.324-.777-.653-.672-.897-.684l-.764-.013c-.266 0-.697.1-1.063.498-.365.398-1.395 1.362-1.395 3.323s1.428 3.854 1.627 4.12c.2.266 2.81 4.287 6.808 6.014.951.41 1.694.656 2.273.839.955.304 1.824.261 2.511.158.766-.114 2.354-.962 2.687-1.891.332-.929.332-1.726.232-1.891-.099-.166-.365-.266-.763-.465z"/></svg>';

      return `
      <div class="mov-card" id="card-${detId}" style="${cardStyle}" onclick="abrirClienteDrawer(${idx})">
        <div class="mov-left">
          <div class="mov-icon egreso"><i data-lucide="user" class="mi sm" style="margin:0;"></i></div>
          <div class="mov-info">
            <div class="mov-desc" title="${escapeHtml(c.nombre)}">${escapeHtml(c.nombre)}</div>
            <div class="mov-cat">
              ${diasTag}
              ${tieneVoucher}
              ${notificadoTag}
              <span style="background:var(--gris);padding:3px 8px;border-radius:6px;font-size:10px;font-weight:700;">C&oacute;d. ${escapeHtml(c.cod)}</span>
            </div>
          </div>
        </div>
        <div class="mov-right">
          <div class="mov-monto egreso">${deudaFmt}</div>
          <div style="display:flex; justify-content:flex-end; width:100%; align-items:center; gap:10px;" onclick="event.stopPropagation()">
            <div class="mov-fecha">Vence: ${c.vencimiento ? formatFechaSolo(c.vencimiento) : '-'}</div>
            <div class="mov-acciones">
              ${c.celular ? `<button class="mov-btn" onclick="window.location.href='tel:${c.celular.replace(/\s+/g,'')}'" title="Llamar al cliente"><i data-lucide="phone" class="mi sm"></i></button>` : ''}
              ${linkWA ? `<button class="mov-btn" onclick="enviarWA('${linkWAMovil}','${linkWA}')" title="Enviar WhatsApp">${waSvg}</button>` : ''}
              <button class="mov-btn" onclick="abrirClienteDrawer(${idx})" title="Ver detalles"><i data-lucide="chevron-right" class="mi sm"></i></button>
            </div>
          </div>
        </div>
      </div>`;
    }).join('');
  }

  function abrirClienteDrawer(idx) {
    const c = clientesFiltrados[idx];
    if (!c) return;

    document.getElementById('dr-avatar').textContent = getInitials(c.nombre);
    document.getElementById('dr-nombre').textContent = escapeHtml(c.nombre);
    
    // Configurar tags rápidos de cabecera
    const diasTag = c.dias > 90 ? `<span style="color:var(--rojo);"><i data-lucide="alert-circle" class="mi xs"></i> ${c.dias} d atraso</span>` :
                    c.dias > 0  ? `<span style="color:var(--naranja);"><i data-lucide="alert-triangle" class="mi xs"></i> ${c.dias} d atraso</span>` :
                                  `<span style="color:var(--verde);"><i data-lucide="check-circle" class="mi xs"></i> Al día</span>`;
    document.getElementById('dr-tags').innerHTML = diasTag + (c.voucher ? ` | <span style="color:#cc8800"><i data-lucide="hourglass" class="mi xs"></i> Voucher</span>` : '');

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