  async function kasnetCargarDatos() {
    // Renderizado instántaneo si ya hay datos precargados
    if (kasnetRegistros && kasnetRegistros.length > 0) {
      kasnetRenderOperaciones(kasnetRegistros);
    } else {
      let skKn = '';
      for(let i=0; i<4; i++) {
        skKn += `<div class="skeleton-box"><div class="skeleton sk-avatar"></div><div style="flex:1;"><div class="skeleton sk-line w-50"></div><div class="skeleton sk-line w-80"></div></div></div>`;
      }
      document.getElementById('kasnet-lista').innerHTML = skKn;
    }

    try {
      const resp = await apiFetch({ admin: 'kasnet_datos', sedeContexto: cajaSedeActual });
      if (!resp || resp.error) {
        if (!kasnetRegistros || kasnetRegistros.length === 0) {
          showToast('Error cargando KASNET: ' + (resp && resp.error ? resp.error : 'Sin respuesta'));
        }
        return;
      }
      kasnetRegistros = resp.registros || [];
      kasnetRenderOperaciones(kasnetRegistros);
    } catch(e) { 
      if (!kasnetRegistros || kasnetRegistros.length === 0) showToast('Error: ' + e.message); 
    }
  }

  function kasnetRenderResumen(regs) {
    // Resumen movido al dashboard principal
  }

  function kasnetRenderOperaciones(regs) {
    _kasnetRegMap = {};
    const contenedor = document.getElementById('kasnet-lista');
    if (!regs || regs.length === 0) {
      contenedor.innerHTML = '<div class="empty"><div class="icon"><i data-lucide="wallet" class="mi" style="font-size:40px;color:var(--texto2);"></i></div>Sin registros de cuadre</div>';
      return;
    }
    regs.forEach(function(m) { _kasnetRegMap['kreg-' + m.id] = m; });
    
    contenedor.innerHTML = regs.map(function(m) {
      const iconBg = m.estado === 'SOBRANTE' ? 'ingreso' : m.estado === 'FALTANTE' ? 'egreso' : 'neutro';
      const mDataId = 'kreg-' + m.id;
      const sign = m.diferencia > 0 ? '+' : '';

      const compUrlSafe = m.comprobante ? m.comprobante.replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/'/g,'&#39;') : '';
      return '<div class="mov-card" onclick="kasnetAbrirDrawer(\'' + mDataId + '\')" style="cursor:pointer; transition:transform 0.2s; box-shadow:0 2px 8px rgba(0,0,0,0.02);" onmouseover="this.style.transform=\'translateY(-2px)\';" onmouseout="this.style.transform=\'translateY(0)\';">' +
        '<div class="mov-left">' +
          '<div class="mov-icon ' + iconBg + '"><i data-lucide="receipt" class="mi sm"></i></div>' +
          '<div class="mov-info">' +
            '<div class="mov-desc" style="font-weight:700;">Registro KASNET</div>' +
            '<div class="mov-cat">' +
              '<span style="background:var(--gris);padding:3px 8px;border-radius:6px;font-size:10px;font-weight:700;">Ops: ' + m.numOps + '</span>' +
              '<span style="background:var(--gris);padding:3px 8px;border-radius:6px;font-size:10px;font-weight:700;">Virt: S/. ' + (m.posVirtual + m.pagayaVirtual).toFixed(2) + '</span>' +
              '<span style="background:var(--gris);padding:3px 8px;border-radius:6px;font-size:10px;font-weight:700;">Fís: S/. ' + m.efectivoFisico.toFixed(2) + '</span>' +
              '<span class="tag ' + (m.estado === 'SOBRANTE' ? 'tag-vencido' : m.estado === 'FALTANTE' ? 'tag-critico' : 'tag-verificado') + '">' + m.estado + ' (' + sign + 'S/. ' + Math.abs(m.diferencia).toFixed(2) + ')</span>' +
              (m.comprobante ? '<span style="color:var(--azul);background:var(--azul-claro);padding:3px 8px;border-radius:6px;font-weight:700;font-size:10px;display:inline-flex;align-items:center;gap:4px;"><i data-lucide="paperclip" class="mi xs" style="margin:0;vertical-align:bottom;"></i> Adjunto</span>' : '') +
            '</div>' +
          '</div>' +
        '</div>' +
        '<div class="mov-right">' +
          '<div class="mov-monto ' + iconBg + '">S/. ' + m.total.toLocaleString('es-PE', {minimumFractionDigits:2}) + '</div>' +
          '<div style="display:flex; justify-content:flex-end; width:100%; align-items:center; gap:10px;">' +
            '<div class="mov-fecha">' + escapeHtml(m.fecha) + '</div>' +
          '</div>' +
        '</div>' +
      '</div>';
    }).join('');
  }

  function kasnetFiltrar() {
    const q = (document.getElementById('kasnet-buscar').value || '').toLowerCase();
    const filtrados = kasnetRegistros.filter(function(m) {
      return m.fecha.includes(q);
    });
    kasnetRenderOperaciones(filtrados);
  }

  function kasnetAbrirDrawer(movId) {
    const m = _kasnetRegMap[movId];
    if (!m) return;
    
    // Header
    const iconBg = m.estado === 'SOBRANTE' ? '#e8f0ff' : m.estado === 'FALTANTE' ? '#ffe6e6' : 'var(--gris)';
    const iconColor = m.estado === 'SOBRANTE' ? 'var(--verde)' : m.estado === 'FALTANTE' ? 'var(--rojo)' : 'var(--texto2)';
    const iconEl = document.getElementById('dr-kasnet-icon');
    iconEl.style.background = iconBg;
    iconEl.style.color = iconColor;
    
    document.getElementById('dr-kasnet-titulo').textContent = 'Registro KASNET';
    document.getElementById('dr-kasnet-sub').textContent = m.fecha;
    
    // Content Resumen
    document.getElementById('dr-kasnet-fis').textContent = 'S/. ' + m.efectivoFisico.toLocaleString('es-PE', {minimumFractionDigits:2});
    document.getElementById('dr-kasnet-virt').textContent = 'S/. ' + (m.posVirtual + m.pagayaVirtual).toLocaleString('es-PE', {minimumFractionDigits:2});
    document.getElementById('dr-kasnet-ops').textContent = m.numOps;
    
    const sign = m.diferencia > 0 ? '+' : '';
    document.getElementById('dr-kasnet-est').innerHTML = '<span class="tag ' + (m.estado === 'SOBRANTE' ? 'tag-vencido' : m.estado === 'FALTANTE' ? 'tag-critico' : 'tag-verificado') + '">' + m.estado + ' (' + sign + 'S/. ' + Math.abs(m.diferencia).toFixed(2) + ')</span>';
    
    // Desglose
    let html = '';
    let total = 0;
    
    if (m.desglose) {
      try {
        const desg = typeof m.desglose === 'string' ? JSON.parse(m.desglose) : m.desglose;
        const labels = {
          'b200': 'Billetes S/ 200', 'b100': 'Billetes S/ 100', 'b50': 'Billetes S/ 50', 'b20': 'Billetes S/ 20', 'b10': 'Billetes S/ 10',
          'm5': 'Monedas S/ 5', 'm2': 'Monedas S/ 2', 'm1': 'Monedas S/ 1', 'm050': 'Monedas S/ 0.50', 'm020': 'Monedas S/ 0.20', 'm010': 'Monedas S/ 0.10'
        };
        const values = {
          'b200': 200, 'b100': 100, 'b50': 50, 'b20': 20, 'b10': 10,
          'm5': 5, 'm2': 2, 'm1': 1, 'm050': 0.5, 'm020': 0.2, 'm010': 0.1
        };
        
        ['b200','b100','b50','b20','b10','m5','m2','m1','m050','m020','m010'].forEach(k => {
          if (desg[k] && parseInt(desg[k]) > 0) {
            const sub = parseInt(desg[k]) * values[k];
            total += sub;
            html += '<div style="display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid var(--gris2); font-size:13px;">' +
                      '<span style="color:var(--texto2);">' + labels[k] + ' <strong style="color:var(--azul);">x' + desg[k] + '</strong></span>' +
                      '<span style="font-weight:700;">S/. ' + sub.toLocaleString('es-PE', {minimumFractionDigits:2}) + '</span>' +
                    '</div>';
          }
        });
      } catch(e) {}
    }
    
    if (!html) {
      html = '<div style="padding:20px; text-align:center; color:var(--texto2); font-size:12px;">No hay detalle de arqueo guardado para este registro.</div>';
    }
    
    html += '<div style="text-align:right; font-family:\'Montserrat\',sans-serif; font-weight:800; font-size:16px; color:var(--verde); margin-top:14px; padding-top:14px; border-top:1.5px dashed var(--gris2);">Total Desglose: S/. ' + (total > 0 ? total : m.efectivoFisico).toLocaleString('es-PE', {minimumFractionDigits:2}) + '</div>';
    
    document.getElementById('dr-kasnet-desglose').innerHTML = html;
    
    // Comprobante
    if (m.comprobante) {
      document.getElementById('dr-kasnet-comp-section').style.display = 'flex';
      const safeUrl = m.comprobante.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
      const previewUrl = safeUrl.includes('/view') ? safeUrl.replace('/view', '/preview') : safeUrl;
      document.getElementById('dr-kasnet-iframe').src = previewUrl;
      document.getElementById('dr-kasnet-link-comp').href = safeUrl;
      
      // Reset visibility
      document.getElementById('dr-kasnet-btn-show-comp').style.display = 'flex';
      document.getElementById('dr-kasnet-iframe').style.display = 'none';
      document.getElementById('dr-kasnet-link-comp').style.display = 'none';
    } else {
      document.getElementById('dr-kasnet-comp-section').style.display = 'none';
      document.getElementById('dr-kasnet-iframe').src = '';
    }
    
    // Actions
    const actionsEl = document.getElementById('dr-kasnet-actions');
    actionsEl.innerHTML = 
      '<button style="background:var(--gris); color:var(--texto);" onclick="kasnetCerrarDrawer(); kasnetShowModalById(\'kreg-' + m.id + '\')"><i data-lucide="pencil" class="mi"></i> Editar</button>' +
      '<button style="background:#ffe6e6; color:var(--rojo);" onclick="kasnetCerrarDrawer(); kasnetEliminar(\'' + m.id + '\')"><i data-lucide="trash-2" class="mi"></i> Eliminar</button>';
    
    document.getElementById('drawer-overlay-kasnet').classList.add('open');
    document.getElementById('drawer-kasnet').classList.add('open');
  }

  function mostrarIframeKasnet() {
    document.getElementById('dr-kasnet-btn-show-comp').style.display = 'none';
    document.getElementById('dr-kasnet-iframe').style.display = 'block';
    document.getElementById('dr-kasnet-link-comp').style.display = 'flex';
  }

  function kasnetCerrarDrawer() {
    document.getElementById('drawer-overlay-kasnet').classList.remove('open');
    document.getElementById('drawer-kasnet').classList.remove('open');
  }

  function kasnetShowModalById(movId) {
    const editData = _kasnetRegMap[movId] || null;
    kasnetShowModal(editData);
  }

  function kasnetShowModal(editData) {
    document.getElementById('kasnet-edit-id').value = editData ? editData.id : '';
    document.getElementById('modal-kasnet-titulo').innerHTML = editData ?
      '<i data-lucide="pencil" class="mi" style="font-size:18px;vertical-align:middle;"></i> Editar Registro' :
      '<i data-lucide="store" class="mi" style="font-size:18px;vertical-align:middle;"></i> Nuevo Registro Diario';
    
    // Limpiar campos
    document.getElementById('kasnet-num-ops').value = '';
    document.getElementById('kasnet-pos-virt').value = '';
    document.getElementById('kasnet-pagaya-virt').value = '';
    ['b200','b100','b50','b20','b10','m5','m2','m1','m050','m020','m010'].forEach(id => {
      document.getElementById('k-' + id).value = '';
    });
    
    document.getElementById('kasnet-file').value = '';
    document.getElementById('kasnet-file-upload-text').innerText = 'Subir comprobante (Opcional)';
    document.getElementById('kasnet-file-upload-icon').innerText = 'cloud_upload';
    document.getElementById('kasnet-file-upload-label').classList.remove('has-file');
    document.getElementById('kasnet-file-upload-label').parentElement.style.borderColor = '';

    const kasnetArchivoActualEl = document.getElementById('kasnet-archivo-actual');
    if (editData && editData.comprobante) {
      kasnetArchivoActualEl.dataset.url = editData.comprobante;
      kasnetArchivoActualEl.style.display = 'block';
    } else {
      kasnetArchivoActualEl.style.display = 'none';
    }
    
    if (editData) {
      document.getElementById('kasnet-fecha').value = editData.fecha;
      document.getElementById('kasnet-num-ops').value = editData.numOps;
      document.getElementById('kasnet-pos-virt').value = editData.posVirtual || '';
      document.getElementById('kasnet-pagaya-virt').value = editData.pagayaVirtual || '';

      if (editData.desglose) {
        try {
          const desg = JSON.parse(editData.desglose);
          Object.keys(desg).forEach(k => {
            if (document.getElementById('k-'+k)) {
              document.getElementById('k-'+k).value = desg[k];
            }
          });
        } catch(e) {}
      }
      kasnetCalcTotal(); 
    } else {
      const hoy = new Date();
      const localYMD = new Date(hoy.getTime() - (hoy.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
      document.getElementById('kasnet-fecha').value = localYMD;
      kasnetCalcTotal();
    }
    
    document.getElementById('modal-kasnet').classList.add('show');
  }

  function kasnetHideModal() { document.getElementById('modal-kasnet').classList.remove('show'); }

  function kasnetCalcTotal() {
    const posVirt = parseFloat(document.getElementById('kasnet-pos-virt').value) || 0;
    const pagayaVirt = parseFloat(document.getElementById('kasnet-pagaya-virt').value) || 0;
    
    const efecFis = 
      (parseInt(document.getElementById('k-b200').value)||0)*200 +
      (parseInt(document.getElementById('k-b100').value)||0)*100 +
      (parseInt(document.getElementById('k-b50').value)||0)*50 +
      (parseInt(document.getElementById('k-b20').value)||0)*20 +
      (parseInt(document.getElementById('k-b10').value)||0)*10 +
      (parseInt(document.getElementById('k-m5').value)||0)*5 +
      (parseInt(document.getElementById('k-m2').value)||0)*2 +
      (parseInt(document.getElementById('k-m1').value)||0)*1 +
      (parseInt(document.getElementById('k-m050').value)||0)*0.5 +
      (parseInt(document.getElementById('k-m020').value)||0)*0.2 +
      (parseInt(document.getElementById('k-m010').value)||0)*0.1;
      
    document.getElementById('kasnet-total-fisico').textContent = 'S/. ' + efecFis.toFixed(2);
    
    const total = posVirt + pagayaVirt + efecFis;
    const diff = total - KASNET_BASE_DEFAULT;
    
    document.getElementById('kasnet-total-declarado').textContent = 'S/. ' + total.toLocaleString('es-PE', {minimumFractionDigits:2});
    
    const diffEl = document.getElementById('kasnet-diferencia-total');
    const msgEl = document.getElementById('kasnet-cuadre-msg');
    const diffCard = document.getElementById('kasnet-cuadre-diff');
    const btnGuardar = document.getElementById('kasnet-btn-guardar');
    
    diffEl.textContent = (diff>0?'+':'') + 'S/. ' + diff.toLocaleString('es-PE', {minimumFractionDigits:2});
    
    const cuadre = Math.abs(diff) < 0.01;
    const btnActivo = total > 0;
    
    diffCard.className = 'diff-card ' + (!btnActivo ? '' : cuadre ? 'cuadre' : diff > 0 ? 'sobrante' : 'faltante');
    
    if (!btnActivo) {
      msgEl.innerHTML = 'Completa saldos y efectivo';
      diffEl.style.color = 'var(--texto)';
    } else if (cuadre) {
      msgEl.innerHTML = '<i data-lucide="check-circle" class="mi" style="vertical-align:text-bottom;margin-right:4px;"></i> \u00a1CUADRE EXACTO!';
      diffEl.style.color = 'var(--verde)';
    } else if (diff > 0) {
      msgEl.innerHTML = '<i data-lucide="alert-triangle" class="mi" style="vertical-align:text-bottom;margin-right:4px;"></i> Sobrante -> Crear\u00E1 un Ingreso en Caja Chica';
      diffEl.style.color = 'var(--verde)';
    } else {
      msgEl.innerHTML = '<i data-lucide="x-circle" class="mi" style="vertical-align:text-bottom;margin-right:4px;"></i> Faltante -> Lo asume el cajero';
      diffEl.style.color = 'var(--rojo)';
    }
    
    btnGuardar.disabled = !btnActivo;
    
    // Almacenar el total fisico calculado para enviarlo
    document.getElementById('kasnet-btn-guardar').dataset.efec = efecFis.toFixed(2);
  }

  async function kasnetGuardar() {
    const btn = document.getElementById('kasnet-btn-guardar');
    const fecha = document.getElementById('kasnet-fecha').value;
    const numOps = document.getElementById('kasnet-num-ops').value;
    const posVirt = document.getElementById('kasnet-pos-virt').value || '0';
    const pagayaVirt = document.getElementById('kasnet-pagaya-virt').value || '0';
    const efecFis = btn.dataset.efec || '0';
    const editId = document.getElementById('kasnet-edit-id').value;

    if (!fecha) {
      showToast('<i data-lucide="alert-triangle" class="mi xs" style="vertical-align:text-bottom;margin-right:4px;"></i> Selecciona una fecha'); return;
    }
    
    const diffPreview = (parseFloat(posVirt) + parseFloat(pagayaVirt) + parseFloat(efecFis)) - KASNET_BASE_DEFAULT;
    
    if (!editId && diffPreview > 0) {
      if (!confirm('Se registrar\u00E1 un SOBRANTE de S/. ' + diffPreview.toFixed(2) + '.\n\nEsto generar\u00E1 autom\u00E1ticamente un movimiento de "Ingreso" en la Caja Chica.\n\n\u00BFDeseas continuar?')) return;
    } else if (!editId && diffPreview < 0) {
      if (!confirm('Se registrar\u00E1 un FALTANTE de S/. ' + Math.abs(diffPreview).toFixed(2) + '.\n\nEste monto ser\u00E1 asumido por el cajero.\n\n\u00BFDeseas continuar?')) return;
    }

    const fileInput = document.getElementById('kasnet-file');
    let base64Data = null;
    
    if (fileInput.files.length > 0) {
      const file = fileInput.files[0];
      if (file.size > 3 * 1024 * 1024) {
        showToast('<i data-lucide="alert-triangle" class="mi xs" style="vertical-align:text-bottom;margin-right:4px;"></i> El archivo no debe superar los 3MB');
        return;
      }
      base64Data = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.readAsDataURL(file);
      });
    }

    btn.disabled = true;
    btn.textContent = (base64Data ? 'Subiendo archivo...' : 'Guardando...');

    const desgloseObj = {
      b200: document.getElementById('k-b200').value,
      b100: document.getElementById('k-b100').value,
      b50: document.getElementById('k-b50').value,
      b20: document.getElementById('k-b20').value,
      b10: document.getElementById('k-b10').value,
      m5: document.getElementById('k-m5').value,
      m2: document.getElementById('k-m2').value,
      m1: document.getElementById('k-m1').value,
      m050: document.getElementById('k-m050').value,
      m020: document.getElementById('k-m020').value,
      m010: document.getElementById('k-m010').value
    };

    try {
      const resp = await apiPost({
        _method: 'POST', kasnetAction: 'guardar',
        fecha: fecha, numOps: numOps,
        posVirtual: posVirt, pagayaVirtual: pagayaVirt,
        efectivoFisico: efecFis,
        desglose: JSON.stringify(desgloseObj),
        comprobante_base64: base64Data,
        edit_id: editId || '',
        sedeContexto: cajaSedeActual
      });
      if (resp && resp.status === 'ok') {
        showToast('<i data-lucide="check-circle" class="mi xs" style="vertical-align:text-bottom;margin-right:4px;"></i> ' + resp.message);
        kasnetHideModal();
        await kasnetCargarDatos();
        // Si hay un sobrante y se creo en caja, vale la pena recargar caja también si estamos viendola
        if (!editId && diffPreview > 0) cajaCargarDatos(); 
      } else {
        showToast('<i data-lucide="x-circle" class="mi xs" style="vertical-align:text-bottom;margin-right:4px;"></i> ' + (resp && resp.message ? resp.message : 'Error'));
      }
    } catch(e) { showToast('Error: ' + e.message); }
    btn.textContent = 'Guardar Registro'; btn.disabled = false;
  }

  async function kasnetEliminar(id) {
    if (!confirm('\u00bfEliminar este registro diario?\n\nSolo un administrador puede hacerlo. Si hubo un sobrante transferido a Caja, tendr\u00E1s que eliminarlo de la Caja manualmente.')) return;
    try {
      const resp = await apiPost({ _method: 'POST', kasnetAction: 'eliminar', id: id });
      if (resp && resp.status === 'ok') {
        showToast('<i data-lucide="check-circle" class="mi xs" style="vertical-align:text-bottom;margin-right:4px;"></i> ' + resp.message);
        await kasnetCargarDatos();
      } else { showToast('<i data-lucide="x-circle" class="mi xs" style="vertical-align:text-bottom;margin-right:4px;"></i> ' + (resp && resp.message ? resp.message : 'Error')); }
    } catch(e) { showToast('Error: ' + e.message); }
  }

  // â”€â”€ INIT â”€â”€