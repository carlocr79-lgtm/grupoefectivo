  async function cajaCargarDatos() {
    const sel = document.getElementById('global-sede-select');
    if(!sel) return;
    const esPrimeraVez = sel.options.length === 0;
    const sedeElegida = sel.value;
    cajaSedeActual = sedeElegida;

    // â”€â”€ TÉCNICA 1: Mostrar cache inmediatamente (stale-while-revalidate) â”€â”€
    const cached = cajaCacheLeer(sedeElegida);
    if (cached) {
      cajaDatos = cached; cajaSaldoTeorico = cached.saldo; cajaMovimientos = cached.movimientos || [];
      cajaRenderResumen(cached); cajaRenderTabla(cajaMovimientos); cajaRenderCategorias(cached.categorias || []);
      cajaSaldoTeorico = cached.saldo;
      document.getElementById('arq-teorico').textContent = 'S/. ' + cached.saldo.toLocaleString('es-PE', {minimumFractionDigits:2});
      return;
    }

    // Sin cache: mostrar skeleton y esperar
    const elSaldo = document.getElementById('caja-saldo');
    const elIng = document.getElementById('caja-ingresos');
    const elEgr = document.getElementById('caja-egresos');
    if (elSaldo) elSaldo.innerHTML = '<div class="skeleton" style="width:80px;height:24px;border-radius:4px;display:inline-block;"></div>';
    if (elIng) elIng.innerHTML = '<div class="skeleton" style="width:70px;height:24px;border-radius:4px;display:inline-block;"></div>';
    if (elEgr) elEgr.innerHTML = '<div class="skeleton" style="width:70px;height:24px;border-radius:4px;display:inline-block;"></div>';
    const tbody = document.getElementById('caja-tabla-body');
    if(tbody) {
      let skHTML = '';
      for(let i=0; i<4; i++) {
        skHTML += `<div class="skeleton-box"><div class="skeleton sk-avatar"></div><div class="flex-1" ><div class="skeleton sk-line w-50"></div><div class="skeleton sk-line w-80"></div></div></div>`;
      }
      tbody.innerHTML = skHTML;
    }

    try {
      const resp = await apiFetch({ admin: 'caja_datos', sede: sedeElegida, sedeContexto: sedeElegida });
      if (!resp || resp.error) { showToast('Error cargando caja: ' + (resp && resp.error ? resp.error : 'Sin respuesta')); return; }

      if (esPrimeraVez && resp.sedes && resp.sedes.length > 0) {
        sel.innerHTML = '';
        resp.sedes.forEach(function(s) { const o = document.createElement('option'); o.value=s; o.textContent=s; sel.appendChild(o); });
        // Seleccionar la sede activa o la primera disponible
        const sedeASeleccionar = (resp.sedeActiva && resp.sedeActiva !== '') ? resp.sedeActiva : (resp.sedes.length > 0 ? resp.sedes[0] : '');
        if (sedeASeleccionar) { sel.value = sedeASeleccionar; cajaSedeActual = sedeASeleccionar; }
      }

      cajaSedeActual = sel.value;
      cajaCacheGuardar(cajaSedeActual, resp);
      cajaDatos = resp; cajaSaldoTeorico = resp.saldo; cajaMovimientos = resp.movimientos || [];
      cajaRenderResumen(resp); cajaRenderTabla(cajaMovimientos); cajaRenderCategorias(resp.categorias || []);
      cajaSaldoTeorico = resp.saldo;
      var elArq = document.getElementById('arq-teorico');
      if (elArq) elArq.textContent = 'S/. ' + resp.saldo.toLocaleString('es-PE', {minimumFractionDigits:2});
      cajaRenderArqueoBanner(resp);
      cajaCalcArqueo();
    } catch(e) { console.error('caja error', e); }
  }

  function cajaRenderArqueoBanner(resp) {
    const bCajera = document.getElementById('badge-arq-cajera');
    const bAdmin = document.getElementById('badge-arq-admin');
    
    if (resp && resp.ultimoArqueo) {
      const txt = (resp.ultimoArqueo.tipo || 'Arqueo') + ' - ' + (resp.ultimoArqueo.fecha || '');
      if (bCajera) {
        bCajera.style.display = 'inline-block';
        const lblCajera = document.getElementById('lbl-arq-cajera');
        if (lblCajera) lblCajera.textContent = txt;
      }
      if (bAdmin) {
        bAdmin.style.display = 'inline-block';
        const lblAdmin = document.getElementById('lbl-arq-admin');
        if (lblAdmin) lblAdmin.textContent = txt;
      }
    } else {
      if (bCajera) bCajera.style.display = 'none';
      if (bAdmin) bAdmin.style.display = 'none';
    }
  }

  // Refresca datos del servidor en segundo plano y actualiza la UI si cambiaron
  async function cajaRefrescarSilencioso(sede) {
    try {
      const resp = await apiFetch({ admin: 'caja_datos', sede: sede, sedeContexto: sede });
      if (!resp || resp.error) return;
      cajaCacheGuardar(sede, resp);
      // Solo re-renderizar si la sede no cambió mientras esperábamos
      if (cajaSedeActual !== sede) return;
      cajaDatos = resp; cajaSaldoTeorico = resp.saldo; cajaMovimientos = resp.movimientos || [];
      cajaRenderResumen(resp); if (!cajaVistaArchivo) cajaRenderTabla(cajaMovimientos); cajaRenderCategorias(resp.categorias || []);
      const arqTeoricoEl = document.getElementById('arq-teorico');
      if (arqTeoricoEl) arqTeoricoEl.textContent = 'S/. ' + resp.saldo.toLocaleString('es-PE', {minimumFractionDigits:2});
      cajaRenderArqueoBanner(resp);
      cajaCalcArqueo();
    } catch(e) { /* silencioso */ }
  }

  function cajaRenderResumen(data) {
    var el1 = document.getElementById('caja-saldo');
    var el2 = document.getElementById('caja-ingresos');
    var el3 = document.getElementById('caja-egresos');
    if (el1) el1.textContent = 'S/. ' + (data.saldo || 0).toLocaleString('es-PE', {minimumFractionDigits:2});
    if (el2) el2.textContent = 'S/. ' + (data.metricas.totalIngresos || 0).toLocaleString('es-PE', {minimumFractionDigits:2});
    if (el3) el3.textContent = 'S/. ' + (data.metricas.totalEgresos || 0).toLocaleString('es-PE', {minimumFractionDigits:2});
    const top = data.metricas.topGastos || [];
    const topEl = document.getElementById('caja-top-gastos');
    if (!topEl) return;
    if (top.length === 0) { topEl.innerHTML = '<div class="text-center"  style="padding:10px;">Sin gastos registrados</div>'; return; }
    topEl.innerHTML = top.map(function(g, i) {
      return '<div class="d-flex justify-between"  style="padding:8px 0; border-bottom:1px solid var(--gris2);">' +
        '<span>' + (i+1) + '. ' + g.categoria + '</span>' +
        '<strong style="color:var(--rojo);">S/. ' + g.monto.toLocaleString('es-PE', {minimumFractionDigits:2}) + '</strong></div>';
    }).join('');
  }

  let _cajaMovMap = {};

  function cajaRenderTabla(movs, readOnly) {
    _cajaMovMap = {};
    const contenedor = document.getElementById(readOnly ? 'caja-tabla-body-archivo' : 'caja-tabla-body');
    if (!contenedor) return;
    if (!movs || movs.length === 0) {
      contenedor.innerHTML = '<div class="empty"><div class="icon"><i class="mi text-secondary" data-lucide="search-x"   style="font-size:40px;"></i></div>' + (readOnly ? 'Sin movimientos archivados' : 'Sin movimientos') + '</div>';
      return;
    }
    
    // Ordenar movimientos: Fecha más reciente primero; y para fechas iguales, el registro más reciente en el tiempo (mayor índice original)
    const sortedMovs = [...movs].map((m, idx) => ({ ...m, originalIndex: idx }));
    sortedMovs.sort((a, b) => {
      const dateA = a.fecha || '';
      const dateB = b.fecha || '';
      const dateCompare = dateB.localeCompare(dateA);
      if (dateCompare !== 0) return dateCompare;
      return b.originalIndex - a.originalIndex;
    });

    sortedMovs.forEach(function(m) { _cajaMovMap['mov-' + m.id] = m; });
    contenedor.innerHTML = sortedMovs.map(function(m) {
      const esIngreso = m.tipo === 'Ingreso';
      const sustentoUrlSafe = m.sustentoUrl ? m.sustentoUrl.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;') : '';
      
      const icon = esIngreso ? '<i class="mi sm m-0" data-lucide="arrow-down"  ></i>' : '<i class="mi sm m-0" data-lucide="arrow-up"  ></i>';
      const sign = esIngreso ? '+' : '-';
      
      const mDataId = 'mov-' + m.id;
      
      // Determine if the movement is from a previous month
      let isPastMonth = false;
      if (typeof m.fecha === 'string') {
        const parts = m.fecha.split('-');
        if (parts.length === 3) {
          const movDate = new Date(parts[0], parts[1] - 1, parts[2]);
          const now = new Date();
          isPastMonth = movDate.getFullYear() < now.getFullYear() || 
                        (movDate.getFullYear() === now.getFullYear() && movDate.getMonth() < now.getMonth());
        }
      }
      const itemReadOnly = readOnly || isPastMonth;

      return `
      <div class="mov-card cursor-pointer"  onclick="cajaAbrirDrawer('${m.id}', ${readOnly})"  style="transition:transform 0.2s; box-shadow:0 2px 8px rgba(0,0,0,0.02);" onmouseover="this.style.transform='translateY(-2px)';" onmouseout="this.style.transform='translateY(0)';">
        <div class="mov-left">
          <div class="mov-icon ${esIngreso ? 'ingreso' : 'egreso'}">${icon}</div>
          <div class="mov-info">
            <div class="mov-desc" title="${m.descripcion.replace(/"/g, '&quot;')}">${m.descripcion}</div>
            <div class="mov-cat">
              <span class="text-xs font-bold"  style="background:var(--gris); padding:3px 8px; border-radius:6px;">${m.categoria}</span>
              ${m.sustentoUrl ? '<span class="font-bold text-xs align-center gap-1"  style="color:var(--azul); background:var(--azul-claro); padding:3px 8px; border-radius:6px; display:inline-flex;"><i class="mi xs m-0" data-lucide="paperclip"   style="vertical-align:bottom;"></i> Adjunto</span>' : ''}
            </div>
          </div>
        </div>
        <div class="mov-right">
          <div class="mov-monto ${esIngreso ? 'ingreso' : 'egreso'}">${sign} S/. ${m.monto.toLocaleString('es-PE', {minimumFractionDigits:2})}</div>
          <div class="d-flex align-center"  style="justify-content:flex-end; width:100%; gap:10px;">
            <div class="mov-fecha">${m.fecha}</div>
          </div>
        </div>
      </div>`;
    }).join('');
  }

  function cajaFiltrar() {
    const qEl = cajaVistaArchivo ? document.getElementById('caja-buscar-archivo') : document.getElementById('caja-buscar');
    const q = (qEl ? qEl.value : '').toLowerCase();
    const source = cajaVistaArchivo ? cajaMovArchivo : cajaMovimientos;
    const filtrados = source.filter(function(m) {
      return m.descripcion.toLowerCase().includes(q) || m.categoria.toLowerCase().includes(q);
    });
    cajaRenderTabla(filtrados, cajaVistaArchivo);
  }

  async function cajaCargarArchivo() {
    const contenedor = document.getElementById('caja-tabla-body-archivo');
    const tipo = document.getElementById('hist-tipo').value;
    const anio = document.getElementById('hist-anio').value;
    const mes = document.getElementById('hist-mes').value;
    
    const myReqId = ++_cajaMovRequestId;
    const cacheKey = 'caja_archivo_v3_' + anio + '_' + mes + '_' + tipo + '_' + (cajaSedeActual || 'todos');
    const CACHE_TTL_ARCHIVO = 1800000; // 30 minutos — datos históricos no cambian

    // Actualizar tracker del periodo cargado
    _cajaArchivoUltimoPeriodo = anio + '_' + mes + '_' + tipo + '_' + (cajaSedeActual || 'todos');

    // 1. Mostrar cache de sessionStorage inmediatamente si existe
    try {
      const raw = sessionStorage.getItem(cacheKey);
      if (raw) {
        const obj = JSON.parse(raw);
        if (Date.now() - obj.ts < CACHE_TTL_ARCHIVO) {
          cajaMovArchivo = obj.data;
          if (cajaMovArchivo.length === 0) {
            contenedor.innerHTML = '<div class="empty"><i class="mi text-secondary" data-lucide="package"   style="font-size:40px;"></i><br>No hay registros archivados en este periodo</div>';
          } else {
            if (tipo === 'MOVIMIENTOS') {
              cajaRenderTabla(cajaMovArchivo, true);
            } else {
              cajaArqueosData = cajaMovArchivo;
              contenedor.innerHTML = renderArqueosHTML(cajaMovArchivo, 0);
            }
          }
          return; // Servido desde cache local
        }
      }
    } catch(e) {}

    let skHTML = '';
    for(let i=0; i<4; i++) {
      skHTML += `<div class="skeleton-box"><div class="skeleton sk-avatar"></div><div class="flex-1" ><div class="skeleton sk-line w-50"></div><div class="skeleton sk-line w-80"></div></div></div>`;
    }
    contenedor.innerHTML = skHTML;

    try {
      const resp = await apiFetch({ admin: 'caja_archivo', sede: cajaSedeActual, sedeContexto: cajaSedeActual, anio: anio, mes: mes, tipo: tipo });
      if (_cajaMovRequestId !== myReqId) return;
      if (!resp || resp.error) {
        contenedor.innerHTML = '<div class="empty"><i class="mi text-secondary" data-lucide="folder-x"   style="font-size:40px;"></i><br>Error al cargar el archivo</div>';
        return;
      }
      cajaMovArchivo = Array.isArray(resp) ? resp : [];

      // Guardar en sessionStorage para siguiente acceso
      try { sessionStorage.setItem(cacheKey, JSON.stringify({ ts: Date.now(), data: cajaMovArchivo })); } catch(e) {}

      if (cajaMovArchivo.length === 0) {
        contenedor.innerHTML = '<div class="empty"><i class="mi text-secondary" data-lucide="package"   style="font-size:40px;"></i><br>No hay registros archivados en este periodo</div>';
        return;
      }
      
      if (tipo === 'MOVIMIENTOS') {
        cajaRenderTabla(cajaMovArchivo, true);
      } else {
        cajaArqueosData = cajaMovArchivo;
        contenedor.innerHTML = renderArqueosHTML(cajaMovArchivo, 0);
      }
    } catch(e) {
      if (_cajaMovRequestId !== myReqId) return;
      contenedor.innerHTML = '<div class="empty"><i data-lucide="alert-triangle" class="mi" style="font-size:40px;color:var(--rojo);"></i><br>Error: ' + e.message + '</div>';
    }
  }

  function cajaRenderCategorias(cats) {
    const sel = document.getElementById('caja-categoria');
    sel.innerHTML = '<option value="">Seleccionar...</option>';
    cats.forEach(function(c) {
      sel.innerHTML += '<option value="' + c + '">' + c + '</option>';
    });
  }

  function cajaAbrirDrawer(movId, readOnly) {
    const m = _cajaMovMap['mov-' + movId];
    if (!m) return;
    
    // Set icon
    const iconEl = document.getElementById('dr-caja-icon');
    iconEl.innerHTML = m.tipo === 'Ingreso' ? '<i data-lucide="arrow-down" class="mi"></i>' : '<i data-lucide="arrow-up" class="mi"></i>';
    iconEl.style.background = m.tipo === 'Ingreso' ? 'var(--brand-light)' : 'var(--alert-danger-light)';
    iconEl.style.color = m.tipo === 'Ingreso' ? 'var(--verde)' : 'var(--rojo)';
    
    // Header
    document.getElementById('dr-caja-titulo').textContent = m.tipo;
    document.getElementById('dr-caja-sub').textContent = m.fecha;
    
    // Content
    const sign = m.tipo === 'Ingreso' ? '+' : '-';
    const montoEl = document.getElementById('dr-caja-monto');
    montoEl.textContent = sign + ' S/. ' + m.monto.toLocaleString('es-PE', {minimumFractionDigits:2});
    montoEl.style.color = m.tipo === 'Ingreso' ? 'var(--verde)' : 'var(--rojo)';
    
    document.getElementById('dr-caja-cat').textContent = m.categoria;
    document.getElementById('dr-caja-fecha').textContent = m.fecha;
    document.getElementById('dr-caja-tipo').textContent = m.tipo;
    
    // Description
    if (m.descripcion) {
      document.getElementById('dr-caja-desc-section').style.display = 'block';
      document.getElementById('dr-caja-desc').textContent = m.descripcion;
    } else {
      document.getElementById('dr-caja-desc-section').style.display = 'none';
    }
    
    // Comprobante
    if (m.sustentoUrl) {
      document.getElementById('dr-caja-comp-section').style.display = 'flex';
      const safeUrl = m.sustentoUrl.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
      const previewUrl = safeUrl.includes('/view') ? safeUrl.replace('/view', '/preview') : safeUrl;
      document.getElementById('dr-caja-iframe').src = previewUrl;
      document.getElementById('dr-caja-link-comp').href = safeUrl;
      
      // Reset visibility
      document.getElementById('dr-caja-btn-show-comp').style.display = 'flex';
      document.getElementById('dr-caja-iframe').style.display = 'none';
      document.getElementById('dr-caja-link-comp').style.display = 'none';
    } else {
      document.getElementById('dr-caja-comp-section').style.display = 'none';
      document.getElementById('dr-caja-iframe').src = '';
    }
    
    // Actions
    const isPastMonth = typeof m.fecha === 'string' && (function(){
      const parts = m.fecha.split('-');
      if (parts.length === 3) {
        const movDate = new Date(parts[0], parts[1] - 1, parts[2]);
        const now = new Date();
        return movDate.getFullYear() < now.getFullYear() || (movDate.getFullYear() === now.getFullYear() && movDate.getMonth() < now.getMonth());
      }
      return false;
    })();
    
    const itemReadOnly = readOnly || isPastMonth;
    const actionsEl = document.getElementById('dr-caja-actions');
    
    if (itemReadOnly) {
      actionsEl.style.display = 'none';
    } else {
      actionsEl.style.display = 'flex';
      actionsEl.innerHTML = 
        '<button class="text-primary"  style="background:var(--gris);" onclick="cajaCerrarDrawer(); cajaShowModalById(\'mov-' + m.id + '\')"><i data-lucide="pencil" class="mi"></i> Editar</button>' +
        '<button style="background:var(--alert-danger-light); color:var(--rojo);" onclick="cajaCerrarDrawer(); cajaEliminar(\'' + m.id + '\')"><i data-lucide="trash-2" class="mi"></i> Eliminar</button>';
    }
    
    document.getElementById('drawer-overlay-caja').classList.add('open');
    document.getElementById('drawer-caja').classList.add('open');
  }

  function mostrarIframeCaja() {
    document.getElementById('dr-caja-btn-show-comp').style.display = 'none';
    document.getElementById('dr-caja-iframe').style.display = 'block';
    document.getElementById('dr-caja-link-comp').style.display = 'flex';
  }

  function cajaCerrarDrawer() {
    document.getElementById('drawer-overlay-caja').classList.remove('open');
    document.getElementById('drawer-caja').classList.remove('open');
  }

  function cajaShowModalById(movId) {
    const editData = _cajaMovMap[movId] || null;
    cajaShowModal(editData);
  }

  function cajaShowModal(editData) {
    document.getElementById('caja-edit-id').value = editData ? editData.id : '';
    document.getElementById('modal-caja-titulo').innerHTML = editData ? '<i data-lucide="pencil" class="mi" style="font-size:18px;vertical-align:middle;"></i> Editar Movimiento' : '<i data-lucide="plus" class="mi" style="font-size:18px;vertical-align:middle;"></i> Nuevo Movimiento';
    const hoy = new Date();
    const localYMD = new Date(hoy.getTime() - (hoy.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
    document.getElementById('caja-fecha').value = localYMD;
    document.getElementById('caja-archivo').value = '';
    document.getElementById('file-upload-text').innerText = 'Subir comprobante (Opcional)';
    document.getElementById('file-upload-icon').innerText = 'cloud_upload';
    document.getElementById('file-upload-label').classList.remove('has-file');
    document.getElementById('file-upload-label').parentElement.style.borderColor = '';
    if (editData) {
      document.getElementById('caja-fecha').value = editData.fecha;
      document.getElementById('caja-tipo').value = editData.tipo;
      document.getElementById('caja-monto').value = editData.monto;
      document.getElementById('caja-categoria').value = editData.categoria;
      document.getElementById('caja-descripcion').value = editData.descripcion;
      // Mostrar botón de archivo existente
      var archivoActualEl = document.getElementById('caja-archivo-actual');
      if (editData.sustentoUrl) {
        archivoActualEl.dataset.url = editData.sustentoUrl;
        archivoActualEl.style.display = 'block';
      } else {
        archivoActualEl.style.display = 'none';
      }
    } else {
      document.getElementById('caja-tipo').value = '';
      document.getElementById('caja-monto').value = '';
      document.getElementById('caja-categoria').value = '';
      document.getElementById('caja-descripcion').value = '';
      document.getElementById('caja-archivo-actual').style.display = 'none';
    }
    document.getElementById('modal-caja').classList.add('show');
  }

  function cajaHideModal() { document.getElementById('modal-caja').classList.remove('show'); }

  function cajaShowSavingOverlay(msg, sub) {
    const ov = document.getElementById('caja-saving-overlay');
    document.getElementById('caja-saving-msg').textContent = msg || 'Guardando...';
    document.getElementById('caja-saving-sub').textContent = sub || 'Esto puede tomar unos segundos';
    ov.style.display = 'flex';
  }
  function cajaHideSavingOverlay() {
    document.getElementById('caja-saving-overlay').style.display = 'none';
  }

  async function cajaGuardar() {
    const btn = document.getElementById('caja-btn-guardar');
    const fecha = document.getElementById('caja-fecha').value;
    const tipo = document.getElementById('caja-tipo').value;
    const monto = document.getElementById('caja-monto').value;
    const categoria = document.getElementById('caja-categoria').value;
    const descripcion = document.getElementById('caja-descripcion').value;
    const editId = document.getElementById('caja-edit-id').value;
    const archivoInput = document.getElementById('caja-archivo');

    if (!fecha || !tipo || !monto || !categoria || !descripcion) {
      showToast('<i data-lucide="alert-triangle" class="mi xs" style="vertical-align:text-bottom;margin-right:4px;"></i> Completa todos los campos'); return;
    }
    if (parseFloat(monto) <= 0) { showToast('<i data-lucide="alert-triangle" class="mi xs" style="vertical-align:text-bottom;margin-right:4px;"></i> El monto debe ser mayor a 0'); return; }

    let archivoBase64 = null;
    let archivoMimeType = null;
    let archivoNombre = null;
    const tieneArchivo = archivoInput.files && archivoInput.files.length > 0;

    if (tieneArchivo) {
      const file = archivoInput.files[0];
      archivoMimeType = file.type;
      archivoNombre = file.name;
      if (file.size > 5 * 1024 * 1024) {
        showToast('<i data-lucide="alert-triangle" class="mi xs" style="vertical-align:text-bottom;margin-right:4px;"></i> El archivo es muy grande (Máx 5MB)'); return;
      }
      const getBase64 = (f) => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(f);
        reader.onload = () => resolve(reader.result.split(',')[1]);
        reader.onerror = error => reject(error);
      });
      try {
        cajaShowSavingOverlay('Leyendo archivo...', archivoNombre);
        btn.disabled = true;
        archivoBase64 = await getBase64(file);
      } catch (e) {
        cajaHideSavingOverlay();
        showToast('<i data-lucide="x-circle" class="mi xs" style="vertical-align:text-bottom;margin-right:4px;"></i> Error al leer el archivo');
        btn.disabled = false;
        return;
      }
    }
    
    btn.disabled = true;
    cajaShowSavingOverlay(
      tieneArchivo ? 'Subiendo archivo y guardando...' : 'Guardando movimiento...',
      tieneArchivo ? 'El archivo se está subiendo a Drive' : 'Registrando en el sistema'
    );

    try {
      const resp = await apiPost({
        _method: 'POST', cajaAction: 'guardar',
        fecha: fecha, tipo: tipo, monto: monto,
        categoria: categoria, descripcion: descripcion,
        edit_id: editId || '',
        sedeContexto: cajaSedeActual,
        archivoBase64: archivoBase64 || '',
        archivoMimeType: archivoMimeType || '',
        archivoNombre: archivoNombre || ''
      });
      
      if (resp && resp.status === 'ok') {
        showToast('<i data-lucide="check-circle" class="mi xs" style="vertical-align:text-bottom;margin-right:4px;"></i> ' + resp.message);
        cajaHideModal();
        cajaCacheInvalidar(cajaSedeActual); _cajaArqueosLoaded = false;
        await cajaCargarDatos(); // Actualizamos la tabla
      } else {
        showToast('<i data-lucide="x-circle" class="mi xs" style="vertical-align:text-bottom;margin-right:4px;"></i> ' + (resp && resp.message ? resp.message : 'Error'));
      }
      cajaHideSavingOverlay(); // Ocultar overlay al final de todo el proceso
    } catch(e) { 
      cajaHideSavingOverlay();
      showToast('<i data-lucide="x-circle" class="mi xs" style="vertical-align:text-bottom;margin-right:4px;"></i> Error: ' + e.message); 
    }
    btn.textContent = 'Guardar'; btn.disabled = false;
  }

  async function cajaEliminar(id) {
    if (!confirm('Â¿Eliminar este movimiento?')) return;
    cajaShowSavingOverlay('Eliminando...', 'Actualizando sistema');
    try {
      const resp = await apiPost({ _method: 'POST', cajaAction: 'eliminar', id: id });
      if (resp && resp.status === 'ok') {
        showToast('<i data-lucide="check-circle" class="mi xs" style="vertical-align:text-bottom;margin-right:4px;"></i> ' + resp.message);
        cajaCacheInvalidar(cajaSedeActual); _cajaArqueosLoaded = false;
        await cajaCargarDatos();
      } else { showToast('<i data-lucide="x-circle" class="mi xs" style="vertical-align:text-bottom;margin-right:4px;"></i> ' + (resp && resp.message ? resp.message : 'Error')); }
    } catch(e) { showToast('<i data-lucide="x-circle" class="mi xs" style="vertical-align:text-bottom;margin-right:4px;"></i> Error: ' + e.message); }
    cajaHideSavingOverlay();
  }

  function cajaCalcArqueo() {
    let total = 0;
    document.querySelectorAll('.arq-modal-input').forEach(function(inp) {
      const cant = parseFloat(inp.value) || 0;
      const val = parseFloat(inp.dataset.val) || 0;
      total += (cant * val);
    });
    total = Math.round(total * 100) / 100;
    
    document.getElementById('arq-fisico').textContent = 'S/. ' + total.toLocaleString('es-PE', {minimumFractionDigits:2});
    
    const rol = sessionStorage.getItem('ge_rol') || 'asesor';
    const esAdmin = rol === 'admin';
    const tieneConteo = total > 0;
    
    const diffCard = document.getElementById('arq-diff-card');
    const diffEl = document.getElementById('arq-diferencia');
    const msgEl = document.getElementById('arq-msg');
    
    let cuadre = false;
    let diff = 0;
    
    if (esAdmin) {
      diff = Math.round((total - cajaSaldoTeorico) * 100) / 100;
      cuadre = Math.abs(diff) < 0.01;
      
      if (diffEl) diffEl.textContent = 'S/. ' + Math.abs(diff).toLocaleString('es-PE', {minimumFractionDigits:2});
      if (diffCard) diffCard.className = 'diff-card ' + (cuadre ? 'cuadre' : diff > 0 ? 'sobrante' : 'faltante');
      
      const quadradText = '<i data-lucide="check-circle" class="mi" style="vertical-align:text-bottom;margin-right:4px;"></i> Â¡CUADRE EXACTO!';
      const sobranteText = '<i data-lucide="alert-triangle" class="mi" style="vertical-align:text-bottom;margin-right:4px;"></i> Sobrante';
      const faltanteText = '<i data-lucide="x-circle" class="mi" style="vertical-align:text-bottom;margin-right:4px;"></i> Faltante';
      
      if (msgEl) msgEl.innerHTML = cuadre ? quadradText : diff > 0 ? sobranteText : faltanteText;
      
      document.getElementById('arq-btn-preventivo').disabled = !cuadre;
      document.getElementById('arq-btn-mes').disabled = !cuadre;
    } else {
      diffEl.textContent = 'S/. ' + total.toLocaleString('es-PE', {minimumFractionDigits:2});
      diffCard.className = 'diff-card ' + (tieneConteo ? 'cuadre' : '');
      const conteoText = '<i data-lucide="check-circle" class="mi" style="vertical-align:text-bottom;margin-right:4px;"></i> Conteo registrado';
      msgEl.innerHTML = tieneConteo ? conteoText : 'Ingresa el conteo físico';
      
      document.getElementById('arq-btn-diario').disabled = !tieneConteo;
    }
    
    return {total: total, diff: diff, cuadre: cuadre};
  }

  function cajaShowArqueoModal() {
    const rol = sessionStorage.getItem('ge_rol') || 'asesor';
    const esAdmin = rol === 'admin';
    
    document.getElementById('arq-bloque-teorico').style.display = esAdmin ? 'block' : 'none';
    document.getElementById('arq-diff-label').textContent = esAdmin ? 'Diferencia VS Base' : 'Total Declarado';
    
    document.getElementById('arq-btns-admin').style.display = esAdmin ? 'flex' : 'none';
    document.getElementById('arq-btns-cajera').style.display = esAdmin ? 'none' : 'flex';
    
    // Limpiar campos y recalcular
    document.querySelectorAll('.arq-modal-input').forEach(function(i) { i.value = ''; });
    cajaCalcArqueo();
    
    // Actualizar Saldo Teórico visual
    if (esAdmin) {
       document.getElementById('arq-teorico').textContent = 'S/. ' + cajaSaldoTeorico.toLocaleString('es-PE', {minimumFractionDigits:2});
       cajaCalcArqueo();
    }
    
    document.getElementById('modal-arqueo').classList.add('show');
  }

  function cajaHideArqueoModal() {
    document.getElementById('modal-arqueo').classList.remove('show');
  }

  async function cajaLoadArqueo() {
    const rol = sessionStorage.getItem('ge_rol') || 'asesor';
    const esAdmin = rol === 'admin';

    // Refrescar saldo del servidor en segundo plano
    try {
      const resp = await apiFetch({ admin: 'caja_datos', sede: cajaSedeActual, sedeContexto: cajaSedeActual });
      if (resp && !resp.error) {
        cajaSaldoTeorico = resp.saldo;
        cajaMovimientos = resp.movimientos || [];
        if (esAdmin && document.getElementById('modal-arqueo').classList.contains('show')) {
          document.getElementById('arq-teorico').textContent = 'S/. ' + resp.saldo.toLocaleString('es-PE', {minimumFractionDigits:2});
          cajaCalcArqueo();
        }
      }
    } catch(e) { /* silencioso */ }
  }

  async function cajaSubmitArqueo(tipoTexto) {
    const calc = cajaCalcArqueo();
    if (tipoTexto === 'Cierre Diario') {
      if (!calc.total || calc.total <= 0) { showToast('<i data-lucide="alert-triangle" class="mi xs" style="vertical-align:text-bottom;margin-right:4px;"></i> Ingresa el conteo primero'); return; }
    } else {
      if (!calc.cuadre) { showToast('<i data-lucide="alert-triangle" class="mi xs" style="vertical-align:text-bottom;margin-right:4px;"></i> Debe cuadrar la caja primero'); return; }
    }

    if (!confirm('Â¿Confirmar ' + tipoTexto + '?')) return;

    showToast('<i data-lucide="hourglass" class="mi xs" style="vertical-align:text-bottom;margin-right:4px;"></i> Procesando ' + tipoTexto + '...');
    const btn = event.target ? event.target.closest('button') : null;
    if (btn) btn.disabled = true;

    const _denomMap = {'200':'b200','100':'b100','50':'b50','20':'b20','10':'b10',
      '5':'m5','2':'m2','1':'m1','0.5':'m050','0.2':'m020','0.1':'m010'};
    const detalle = {};
    const inputs = document.querySelectorAll('.arq-modal-input');
    inputs.forEach(function(inp) {
      const key = _denomMap[inp.dataset.val] || 'val-' + inp.dataset.val;
      detalle[key] = parseFloat(inp.value) || 0;
    });

    try {
      const resp = await apiPost({
        _method: 'POST', cajaAction: 'arqueo',
        tipoTexto: tipoTexto,
        esCierre: tipoTexto === 'Cierre de Mes',
        esPreventivo: tipoTexto === 'Arqueo Preventivo',
        saldoTeorico: cajaSaldoTeorico,
        saldoFisico: calc.total,
        diferencia: tipoTexto === 'Cierre Diario' ? Math.round((calc.total - cajaSaldoTeorico) * 100) / 100 : calc.diff,
        detalle: JSON.stringify(detalle),
        sedeContexto: cajaSedeActual
      });
      if (resp && resp.status === 'ok') {
        showToast('<i data-lucide="check-circle" class="mi xs" style="vertical-align:text-bottom;margin-right:4px;"></i> ' + resp.message);
        cajaHideArqueoModal();
        cajaLoadHistorial(false, true);
        await cajaCargarDatos();
      } else { showToast('<i data-lucide="x-circle" class="mi xs" style="vertical-align:text-bottom;margin-right:4px;"></i> ' + (resp && resp.message ? resp.message : 'Error')); }
    } catch(e) { 
      showToast('<i data-lucide="x-circle" class="mi xs" style="vertical-align:text-bottom;margin-right:4px;"></i> Error: ' + e.message); 
    } finally {
      if (btn) btn.disabled = false;
    }
  }

  let cajaArqueosOffset = 0;
  const CAJA_ARQUEOS_LIMIT = 10;
  let _cajaArqueosLoaded = false; // evita recargar cada vez que se abre el tab

  function renderArqueosHTML(dataArr, offsetIndex) {
    return dataArr.map(function(r, i) {
      const diffColorClass = Math.abs(r.diferencia) < 0.01 ? 'ingreso' : (r.diferencia > 0 ? 'pendiente' : 'egreso');
      const esSobrante = r.diferencia > 0;
      const colorMonto = Math.abs(r.diferencia) < 0.01 ? 'color:var(--verde)' : (esSobrante ? 'color:#cc8800' : 'color:var(--rojo)');
      
      let icono = 'archive'; // default icon (Cierre de mes)
      if (typeof r.tipo === 'string') {
        if (r.tipo.includes('Preventivo')) icono = 'clipboard-check';
        if (r.tipo.includes('Diario')) icono = 'calendar';
      }

      const gIndex = offsetIndex + i;

      return `<div class="mov-card cursor-pointer"   onclick="cajaShowArqueoDetalle(${gIndex})">
        <div class="mov-left">
          <div class="mov-icon text-secondary"   style="background:var(--gris2);"><i data-lucide="${icono}" class="mi"></i></div>
          <div class="mov-info">
            <div class="mov-desc">${r.tipo || 'Arqueo'}</div>
            <div class="mov-cat">
              <span class="text-xs font-bold"  style="background:var(--azul-claro); color:var(--azul); padding:3px 8px; border-radius:6px;">${r.usuario ? String(r.usuario).split('@')[0] : 'S/U'}</span>
            </div>
          </div>
        </div>
        <div class="mov-right">
          <div class="mov-monto" style="${colorMonto}">S/. ${(parseFloat(r.diferencia) || 0).toLocaleString('es-PE', {minimumFractionDigits: 2})}</div>
          <div class="d-flex align-center"  style="justify-content:flex-end; width:100%; gap:10px;">
            <div class="mov-fecha">${r.fecha || ''}</div>
          </div>
        </div>
      </div>`;
    }).join('');
  }

  async function cajaLoadHistorial(append = false, forceRefresh = false) {
    const contenedor = document.getElementById('caja-hist-body');
    const btnMasCont = document.getElementById('caja-hist-mas-container');
    const btnMas = document.getElementById('btn-arqueos-mas');

    // Si ya se cargó y no es append ni force, no recargar
    if (_cajaArqueosLoaded && !append && !forceRefresh && cajaArqueosData.length > 0) {
      contenedor.innerHTML = renderArqueosHTML(cajaArqueosData, 0);
      return;
    }

    if (!append) {
      cajaArqueosOffset = 0;
      let skArq = '';
      for(let i=0; i<4; i++) {
        skArq += `<div class="skeleton-box"><div class="skeleton sk-avatar"></div><div class="flex-1" ><div class="skeleton sk-line w-50"></div><div class="skeleton sk-line w-80"></div></div></div>`;
      }
      contenedor.innerHTML = skArq;
      btnMasCont.style.display = 'none';
    } else {
      btnMas.innerHTML = '<i data-lucide="hourglass" class="mi xs" style="vertical-align:text-bottom;margin-right:4px;"></i> Cargando...';
      btnMas.disabled = true;
    }

    try {
      const resp = await apiFetch({ admin: 'caja_arqueos', sede: cajaSedeActual, sedeContexto: cajaSedeActual, offset: cajaArqueosOffset, limit: CAJA_ARQUEOS_LIMIT });
      
      const dataArr = (resp && resp.data) ? resp.data : (Array.isArray(resp) ? resp : []);
      const total = (resp && resp.total !== undefined) ? resp.total : dataArr.length;

      if (dataArr.length === 0 && !append) {
        contenedor.innerHTML = '<div class="empty"><div class="icon"><i class="mi text-secondary" data-lucide="history"   style="font-size:40px;"></i></div>Sin historial de arqueos</div>';
        btnMasCont.style.display = 'none';
        _cajaArqueosLoaded = true;
        return;
      }

      const html = renderArqueosHTML(dataArr, append ? cajaArqueosData.length : 0);

      if (!append) {
        cajaArqueosData = dataArr;
        contenedor.innerHTML = html;
      } else {
        cajaArqueosData = cajaArqueosData.concat(dataArr);
        contenedor.innerHTML += html;
        btnMas.innerHTML = '<i data-lucide="chevron-down" class="mi xs" style="vertical-align:text-bottom;margin-right:4px;"></i> Ver más arqueos';
        btnMas.disabled = false;
      }

      cajaArqueosOffset += dataArr.length;
      _cajaArqueosLoaded = true;
      
      // Mostrar botón "Ver más" si todavía hay items
      if (cajaArqueosOffset < total) {
        btnMasCont.style.display = 'block';
      } else {
        btnMasCont.style.display = 'none';
      }
      
    } catch(e) {
      if (!append) {
        contenedor.innerHTML = '<div class="empty"><div class="icon"><i data-lucide="alert-triangle" class="mi" style="font-size:40px;color:var(--rojo);"></i></div>Error al cargar historial</div>';
      } else {
        showToast('<i data-lucide="x-circle" class="mi xs" style="vertical-align:text-bottom;margin-right:4px;"></i> Error al cargar más');
        btnMas.innerHTML = '<i data-lucide="chevron-down" class="mi xs" style="vertical-align:text-bottom;margin-right:4px;"></i> Ver más arqueos';
        btnMas.disabled = false;
      }
    }
  }

  function cajaCerrarArqueoDrawer() {
    document.getElementById('drawer-overlay-arqueo').classList.remove('open');
    document.getElementById('drawer-arqueo').classList.remove('open');
  }

  function cajaShowArqueoDetalle(index) {
    const arq = cajaArqueosData[index];
    if (!arq || !arq.detalle) return;
    const d = arq.detalle;
    
    document.getElementById('dr-arq-sub').textContent = arq.fecha || '';
    
    // Generar HTML del detalle
    let html = `
      <div class="dr-section">
        <div class="dr-section-title">Datos del Arqueo</div>
        <div class="dr-item"><span class="lbl">Encargado</span><span class="val font-bold"  >${arq.usuario ? String(arq.usuario).split('@')[0] : 'S/U'}</span></div>
        <div class="dr-item"><span class="lbl">Tipo</span><span class="val">${arq.tipo || 'Arqueo'}</span></div>
        <div class="dr-item"><span class="lbl">Fecha</span><span class="val">${arq.fecha || '-'}</span></div>
      </div>

      <div class="dr-section">
        <div class="dr-section-title">Conteo Físico</div>
        <div class="gap-4"  style="display:grid; grid-template-columns:1fr 1fr;">
          <div>
            <div class="text-sm font-extrabold text-secondary mb-2"  style="border-bottom:1px solid var(--gris2); padding-bottom:4px; letter-spacing:0.5px;">BILLETES</div>
            <table class="text-base"  style="width:100%; border-collapse:collapse;">
              <tr><td class="text-secondary"  style="padding:3px 0;">S/ 200</td><td class="text-right font-bold" >${d.b200||0}</td></tr>
              <tr><td class="text-secondary"  style="padding:3px 0;">S/ 100</td><td class="text-right font-bold" >${d.b100||0}</td></tr>
              <tr><td class="text-secondary"  style="padding:3px 0;">S/ 50</td><td class="text-right font-bold" >${d.b50||0}</td></tr>
              <tr><td class="text-secondary"  style="padding:3px 0;">S/ 20</td><td class="text-right font-bold" >${d.b20||0}</td></tr>
              <tr><td class="text-secondary"  style="padding:3px 0;">S/ 10</td><td class="text-right font-bold" >${d.b10||0}</td></tr>
            </table>
          </div>
          <div>
            <div class="text-sm font-extrabold text-secondary mb-2"  style="border-bottom:1px solid var(--gris2); padding-bottom:4px; letter-spacing:0.5px;">MONEDAS</div>
            <table class="text-base"  style="width:100%; border-collapse:collapse;">
              <tr><td class="text-secondary"  style="padding:3px 0;">S/ 5.00</td><td class="text-right font-bold" >${d.m5||0}</td></tr>
              <tr><td class="text-secondary"  style="padding:3px 0;">S/ 2.00</td><td class="text-right font-bold" >${d.m2||0}</td></tr>
              <tr><td class="text-secondary"  style="padding:3px 0;">S/ 1.00</td><td class="text-right font-bold" >${d.m1||0}</td></tr>
              <tr><td class="text-secondary"  style="padding:3px 0;">S/ 0.50</td><td class="text-right font-bold" >${d.m050||0}</td></tr>
              <tr><td class="text-secondary"  style="padding:3px 0;">S/ 0.20</td><td class="text-right font-bold" >${d.m020||0}</td></tr>
              <tr><td class="text-secondary"  style="padding:3px 0;">S/ 0.10</td><td class="text-right font-bold" >${d.m010||0}</td></tr>
            </table>
          </div>
        </div>
      </div>

      <div style="background:var(--gris2); padding:16px; border-radius:12px; margin-top:24px;">
        <div class="d-flex justify-between align-center mb-2" >
          <span class="font-bold text-base text-secondary" >Total Físico Contado:</span>
          <span style="font-weight:900; font-size:18px; color:var(--verde);">S/. ${(parseFloat(arq.fisico)||0).toLocaleString('es-PE', {minimumFractionDigits: 2})}</span>
        </div>
        <div class="d-flex justify-between align-center" >
          <span class="font-bold text-base text-secondary" >Saldo Teórico Sistema:</span>
          <span style="font-weight:900; font-size:18px; color:var(--azul);">S/. ${(parseFloat(arq.teorico)||0).toLocaleString('es-PE', {minimumFractionDigits: 2})}</span>
        </div>
      </div>
    `;
    
    document.getElementById('dr-arq-content').innerHTML = html;
    
    document.getElementById('drawer-overlay-arqueo').classList.add('open');
    document.getElementById('drawer-arqueo').classList.add('open');
  }

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // â”€â”€â”€â”€ MÓDULO KASNET JS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

  let kasnetRegistros = [];
  let _kasnetRegMap = {};
  const KASNET_BASE_DEFAULT = 3000; // Podría venir de config en el futuro
