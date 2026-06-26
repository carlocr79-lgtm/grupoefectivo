  async function cargarVouchers() {
    try {
      const resp = await apiFetch({ admin: 'vouchers' });
      vouchers = Array.isArray(resp) ? resp : [];
      const bv = document.getElementById('badge-vouchers');
      if(bv) { bv.textContent = vouchers.length; bv.style.display = vouchers.length > 0 ? 'inline-block' : 'none'; }
      var subBadge = document.getElementById('badge-vouchers-sub');
      if (subBadge) { subBadge.textContent = vouchers.length; subBadge.style.display = vouchers.length > 0 ? 'inline-block' : 'none'; }
      renderVouchers();
    } catch(e) {
      document.getElementById('lista-vouchers').innerHTML = '<div class="empty"><div class="icon"><i data-lucide="alert-triangle" class="mi" style="font-size:40px;color:var(--naranja);"></i></div>Error al cargar</div>';
    }
  }

  function renderVouchers() {
    const busqueda = (document.getElementById('buscar-cliente')?.value || '').toUpperCase();
    
    let lista = vouchers.filter(v => {
      if (!busqueda) return true;
      const t = [v.nombre, v.asesor, v.cod, v.monto].join(' ').toUpperCase();
      return t.includes(busqueda);
    });

    const contadorEl = document.getElementById('contador-clientes-mora');
    if (contadorEl) {
      if (lista.length > 0) {
        contadorEl.innerHTML = `<span style="color:var(--brand-secondary);">${lista.length}</span>`;
      } else {
        contadorEl.innerHTML = `<i data-lucide="receipt" class="mi sm"></i>`;
      }
      if(window.lucide) window.lucide.createIcons();
    }

    if (lista.length === 0) {
      document.getElementById('lista-vouchers').innerHTML = '<div class="empty"><div class="icon"><i data-lucide="circle-check" class="mi" style="font-size:40px;color:var(--azul);"></i></div><strong>Sin vouchers pendientes</strong><br><small>Todos los pagos están verificados</small></div>';
      return;
    }
    document.getElementById('lista-vouchers').innerHTML = lista.map((v, vi) => {
      const safeNombre = escapeHtml(v.nombre);
      const safeAsesor = escapeHtml(v.asesor);
      const safeCod = escapeHtml(v.cod);
      const safeVoucher = escapeHtml(v.voucher);
      return `
      <div class="fin-card status-pendiente">
        <div class="fin-grid">
          <div class="avatar" style="background:#fff8e6; color:#cc8800;"><i data-lucide="receipt" class="mi"></i></div>
          <div class="fin-info">
            <div class="fin-name" title="${safeNombre}">${safeNombre}</div>
            <div class="fin-sub">
              <span>Cód. ${safeCod}</span>
              <span style="color:var(--gris2)">•</span>
              <span class="font-bold"  style="color:var(--azul2);">${safeAsesor.split(' ')[0]}</span>
            </div>
          </div>
          <div class="fin-monto-box">
            <div class="fin-monto">S/. ${parseFloat(v.monto).toLocaleString('es-PE',{minimumFractionDigits:2})}</div>
            <div class="fin-fecha">${v.fechaPago ? formatFecha(v.fechaPago) : '-'}</div>
          </div>
          <div class="fin-actions">
            <button class="btn-hover-action" data-vi="${vi}" onclick="verVoucherByIndex(this.dataset.vi)">
              <i data-lucide="eye" class="mi"></i> Validar
            </button>
          </div>
        </div>
      </div>`;
    }).join('');
  }

  let modalCodActual = '';

  function verVoucherByIndex(idx) {
    const v = vouchers[parseInt(idx)];
    if (!v) return;
    verVoucher(v.fila, v.nombre, v.monto, v.voucher, v.asesor, v.cod);
  }

  function verVoucher(fila, nombre, monto, link, asesor, cod) {
    modalFilaActual = fila;
    modalNombreActual = nombre;
    modalMontoActual = monto;
    modalCodActual = cod;
    
    // Convertir link de Drive a link directo de imagen
    let imgUrl = link;
    const match = link.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (match) imgUrl = 'https://drive.google.com/thumbnail?id=' + match[1] + '&sz=w800';

    document.getElementById('modal-img').src = imgUrl;
    document.getElementById('modal-info').innerHTML = `
      <div><span class="lbl">Cliente</span><span class="val">${nombre}</span></div>
      <div><span class="lbl">Código</span><span class="val">${cod}</span></div>
      <div><span class="lbl">Asesor</span><span class="val">${asesor}</span></div>
      <div><span class="lbl">Monto</span><span class="val" style="color:var(--verde);font-weight:900;">S/. ${parseFloat(monto).toLocaleString('es-PE',{minimumFractionDigits:2})}</span></div>
      <div><span class="lbl">Ver original</span><span class="val"><a href="${link}" target="_blank" style="color:var(--azul2)">Abrir en Drive â†—</a></span></div>
    `;
    document.getElementById('modal-voucher').classList.add('show');
  }

  function cerrarModal() {
    document.getElementById('modal-voucher').classList.remove('show');
    modalFilaActual = null;
    modalCodActual = '';
  }

  async function verificarDesdeModal() {
    if (!modalFilaActual) return;
    await verificarPago(modalFilaActual, modalNombreActual, modalMontoActual, modalCodActual);
    cerrarModal();
  }

  async function verificarPago(fila, nombre, monto, cod) {
    try {
      const data = await apiPost({ adminAction: 'verificar', fila: fila, nombre: nombre, monto: monto, cod: cod });
      if (data.success) {
        showToast('<i data-lucide="check-circle" class="mi xs" style="vertical-align:text-bottom;margin-right:4px;"></i> Pago verificado — ' + nombre.split(' ')[0]);
        await cargarTodo();
      }
    } catch(e) { showToast('<i data-lucide="x-circle" class="mi xs" style="vertical-align:text-bottom;margin-right:4px;"></i> Error al verificar'); }
  }

  // â”€â”€ HISTORIAL â”€â”€
  async function cargarHistorial() {
    try {
      const resp = await apiFetch({ admin: 'historial' });
      historial = Array.isArray(resp) ? resp : [];
      renderHistorial();
    } catch(e) {
      document.getElementById('lista-historial').innerHTML = '<div class="empty"><div class="icon"><i data-lucide="alert-triangle" class="mi" style="font-size:40px;color:var(--naranja);"></i></div>Error al cargar historial</div>';
    }
  }

  function renderHistorial() {
    const busqueda = (document.getElementById('buscar-cliente')?.value || '').toUpperCase();

    let lista = historial.filter(h => {
      if (!busqueda) return true;
      const t = [h.nombre, h.asesor, h.cod, h.fecha, h.monto].join(' ').toUpperCase();
      return t.includes(busqueda);
    }).reverse();

    const totalMonto = lista.reduce((sum, h) => sum + (parseFloat(h.monto) || 0), 0);
    document.getElementById('res-total').textContent = 'S/. ' + totalMonto.toLocaleString('es-PE',{minimumFractionDigits:2});
    document.getElementById('res-count').textContent = lista.length + ' pago' + (lista.length !== 1 ? 's' : '');

    const contadorEl = document.getElementById('contador-clientes-mora');
    if (contadorEl) {
      if (lista.length > 0) {
        contadorEl.innerHTML = `<span style="color:var(--brand-secondary);">${lista.length}</span>`;
      } else {
        contadorEl.innerHTML = `<i data-lucide="history" class="mi sm"></i>`;
      }
      if(window.lucide) window.lucide.createIcons();
    }

    if (lista.length === 0) {
      document.getElementById('lista-historial').innerHTML = '<div class="empty"><div class="icon"><i class="mi text-secondary" data-lucide="file-text"   style="font-size:40px;"></i></div>Sin registros</div>';
      return;
    }

    document.getElementById('lista-historial').innerHTML = lista.map(h => {
      const estado = (h.estado || 'PENDIENTE').toString().toUpperCase();
      const isVerificado = estado.includes('VERIFICADO');
      const statusClass = isVerificado ? 'status-verificado' : 'status-pendiente';
      const avatarBg    = isVerificado ? 'background:var(--brand-light); color:var(--azul2);' : 'background:#fff8e6; color:#cc8800;';
      const avatarIcon  = isVerificado ? 'check-circle' : 'clock';
      
      return `
      <div class="fin-card ${statusClass}">
        <div class="fin-grid">
          <div class="avatar" style="${avatarBg}"><i data-lucide="${avatarIcon}" class="mi"></i></div>
          <div class="fin-info">
            <div class="fin-name" title="${escapeHtml(h.nombre)}">${escapeHtml(h.nombre) || '-'}</div>
            <div class="fin-sub">
              <span>${h.asesor ? escapeHtml(h.asesor.toString().split(' ')[0]) : '-'}</span>
              <span style="color:var(--gris2)">•</span>
              <span>${escapeHtml(h.tipo) || '-'}</span>
              <span style="color:var(--gris2)">•</span>
              <span>Cód. ${escapeHtml(h.cod) || '-'}</span>
            </div>
          </div>
          <div class="fin-monto-box">
            <div class="fin-monto ${isVerificado ? 'verde' : ''}">S/. ${parseFloat(h.monto||0).toLocaleString('es-PE',{minimumFractionDigits:2})}</div>
            <div class="fin-fecha">${formatFechaSolo(h.fecha)} ${escapeHtml(h.hora) || ''}</div>
          </div>
          ${h.voucher ? `
          <div class="fin-actions">
            <a href="${escapeHtml(h.voucher)}" target="_blank" class="btn-hover-action" style="text-decoration:none;">
              <i data-lucide="external-link" class="mi"></i> Ver
            </a>
          </div>` : ''}
        </div>
      </div>`;
    }).join('');
  }

  // â”€â”€ UTILS â”€â”€
  function formatFecha(str) {
    if (!str) return '-';
    try {
      const d = new Date(str);
      if (isNaN(d.getTime())) return str;
      return d.toLocaleDateString('es-PE',{day:'2-digit',month:'2-digit',year:'numeric'}) + 
             ' ' + d.toLocaleTimeString('es-PE',{hour:'2-digit',minute:'2-digit'});
    } catch(e) { return str; }
  }

  function formatFechaSolo(str) {
    if (!str) return '-';
    try {
      // Si ya viene en formato dd/MM/yyyy, retornarlo directo
      if (typeof str === 'string' && str.match(/^\d{2}\/\d{2}\/\d{4}$/)) return str;
      // Si ya es formato yyyy-mm-dd limpio, convertirlo
      if (typeof str === 'string' && str.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const [y,m,d] = str.split('-');
        return d + '/' + m + '/' + y;
      }
      const d = new Date(str);
      if (isNaN(d.getTime())) return str;
      return String(d.getDate()).padStart(2,'0') + '/' + 
             String(d.getMonth()+1).padStart(2,'0') + '/' + 
             d.getFullYear();
    } catch(e) { return str; }
  }


  function verSustento(url) {
    const cont = document.getElementById('ms-contenido');
    // Detectar tipo de archivo por URL
    const urlLower = url.toLowerCase();
    const esDrive = url.includes('drive.google.com') || url.includes('docs.google.com');
    const esPdf = urlLower.includes('.pdf') || urlLower.includes('pdf');
    const esImg = urlLower.match(/\.(jpg|jpeg|png|gif|webp)/);

    if (esDrive) {
      // Extraer ID de Google Drive y mostrar embed
      const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
      if (match) {
        const fileId = match[1];
        // Intentar como imagen primero, con fallback a iframe
        const imgUrl = 'https://drive.google.com/thumbnail?id=' + fileId + '&sz=w800';
        const embedUrl = 'https://drive.google.com/file/d/' + fileId + '/preview';
        cont.innerHTML =
          '<img class="ms-img" src="' + imgUrl + '" ' +
          'onerror="this.style.display=\'none\';document.getElementById(\'ms-iframe-fb\').style.display=\'block\';" />' +
          '<iframe class="ms-pdf-embed d-none" id="ms-iframe-fb"  src="' + embedUrl + '"  allowfullscreen></iframe>';
      } else {
        cont.innerHTML = '<iframe class="ms-pdf-embed" src="' + url + '" allowfullscreen></iframe>';
      }
    } else if (esImg) {
      cont.innerHTML = '<img class="ms-img" src="' + url + '" />';
    } else if (esPdf) {
      cont.innerHTML = '<iframe class="ms-pdf-embed" src="' + url + '" type="application/pdf"></iframe>';
    } else {
      cont.innerHTML = '<iframe class="ms-iframe" src="' + url + '"></iframe>';
    }
    document.getElementById('modal-sustento').classList.add('show');
  }

  function cerrarSustento() {
    document.getElementById('modal-sustento').classList.remove('show');
    document.getElementById('ms-contenido').innerHTML = '';
    const box = document.querySelector('#modal-sustento .modal-sustento-box');
    if (box) {
      box.style.maxWidth = '';
      box.style.height = '';
      box.style.display = '';
      box.style.flexDirection = '';
    }
  }

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // â”€â”€â”€â”€ MÓDULO CAJA CHICA JS â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

  let cajaMovimientos = [];
  let cajaMovArchivo = [];
  let cajaVistaArchivo = false;
  let _cajaMovRequestId = 0;
  let cajaDatos = null;
  let cajaSedeActual = '';
  let cajaSaldoTeorico = 0;
  const CAJA_CACHE_TTL = 60000; // 60 segundos de cache válido

  // â”€â”€ CACHE HELPERS â”€â”€
  function cajaCacheKey(sede) { return 'caja_cache_' + (sede || 'todas'); }
  function cajaCacheGuardar(sede, data) { try { sessionStorage.setItem(cajaCacheKey(sede), JSON.stringify({ ts: Date.now(), data: data })); } catch(e) {} }
  function cajaCacheLeer(sede) {
    try {
      const raw = sessionStorage.getItem(cajaCacheKey(sede));
      if (!raw) return null;
      const obj = JSON.parse(raw);
      if (Date.now() - obj.ts > CAJA_CACHE_TTL) return null; // expirado
      return obj.data;
    } catch(e) { return null; }
  }
  function cajaCacheInvalidar(sede) { try { sessionStorage.removeItem(cajaCacheKey(sede)); } catch(e) {} }
