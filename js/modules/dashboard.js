  function renderDashboard() {
    const container = document.getElementById('dash-content');
    if (!container) return;

    // â”€â”€ Calcular KPIs desde data ya cargada â”€â”€
    const totalClientes = clientes.length;
    const totalDeuda = clientes.reduce(function(s,c) { return s + (parseFloat(c.deuda)||0); }, 0);
    const morosos = clientes.filter(function(c) { return (parseInt(c.dias)||0) > 0; }).length;
    const vouchersPend = vouchers.length;
    const cajaSaldo = cajaDatos ? (cajaDatos.saldo || 0) : 0;
    const cajaIngresos = cajaDatos && cajaDatos.metricas ? (cajaDatos.metricas.totalIngresos || 0) : 0;
    const cajaEgresos = cajaDatos && cajaDatos.metricas ? (cajaDatos.metricas.totalEgresos || 0) : 0;

    // â”€â”€ Distribución de riesgo â”€â”€
    var dist = { normal:0, cpp:0, deficiente:0, dudoso:0, perdida:0 };
    clientes.forEach(function(c) {
      var d = parseInt(c.dias) || 0;
      if (d > 120) dist.perdida++;
      else if (d >= 61) dist.dudoso++;
      else if (d >= 31) dist.deficiente++;
      else if (d >= 9) dist.cpp++;
      else dist.normal++;
    });
    const totalDist = totalClientes || 1;

    // â”€â”€ Resumen por asesor â”€â”€
    var porAsesor = {};
    clientes.forEach(function(c) {
      var a = c.asesor || 'Sin asesor';
      if (!porAsesor[a]) porAsesor[a] = { nombre: a, clientes:0, deuda:0, dias:[], peor:0 };
      porAsesor[a].clientes++;
      porAsesor[a].deuda += (parseFloat(c.deuda)||0);
      var d = parseInt(c.dias)||0;
      porAsesor[a].dias.push(d);
      if (d > porAsesor[a].peor) porAsesor[a].peor = d;
    });
    var asesores = Object.values(porAsesor).sort(function(a,b) { return b.deuda - a.deuda; });
    asesores.forEach(function(a) {
      a.promDias = a.dias.length > 0 ? Math.round(a.dias.reduce(function(s,v){return s+v;},0) / a.dias.length) : 0;
    });

    // â”€â”€ Historial del mes â”€â”€
    var mesStr = new Date().toISOString().substring(0,7);
    var pagosMes = 0, montoMes = 0, pendientesMes = 0;
    historial.forEach(function(h) {
      var fStr = h.fecha || '';
      if (typeof fStr === 'string' && fStr.length >= 7) {
        var fMes = '';
        if (fStr.match(/^\d{4}-\d{2}/)) fMes = fStr.substring(0,7);
        else if (fStr.match(/^\d{2}\/\d{2}\/\d{4}/)) {
          var pts = fStr.split('/');
          fMes = pts[2] + '-' + pts[1];
        }
        if (fMes === mesStr) {
          pagosMes++;
          montoMes += parseFloat(h.monto)||0;
          if (h.estado && h.estado.toString().includes('PENDIENTE')) pendientesMes++;
        }
      }
    });

    // â”€â”€ Top gastos de caja â”€â”€
    var topGastos = cajaDatos && cajaDatos.metricas && cajaDatos.metricas.topGastos ? cajaDatos.metricas.topGastos : [];

    // â• â• â•  RENDER HTML â• â• â• 
    var html = '';

    // â”€â”€ BLOQUE 1: KPI CARDS â”€â”€
    html += '<div class="dash-kpis animate-fade-up" style="--delay: 0s;">';
    html += '<div class="dash-kpi blue">' +
      '<div class="kpi-icon"><i data-lucide="landmark" class="mi"></i></div>' +
      '<div class="kpi-val" data-val="' + totalDeuda + '" data-currency="true">S/. ' + totalDeuda.toLocaleString('es-PE',{minimumFractionDigits:2}) + '</div>' +
      '<div class="kpi-lbl">Cartera Total</div>' +
      '<div class="kpi-sub"><i data-lucide="users" class="mi" style="font-size:14px;"></i> ' + totalClientes + ' clientes activos</div>' +
    '</div>';
    html += '<div class="dash-kpi red">' +
      '<div class="kpi-icon"><i data-lucide="alert-triangle" class="mi"></i></div>' +
      '<div class="kpi-val" data-val="' + morosos + '">' + morosos + '</div>' +
      '<div class="kpi-lbl">Clientes Morosos</div>' +
      '<div class="kpi-sub"><i data-lucide="percent" class="mi" style="font-size:14px;"></i> ' + (totalClientes > 0 ? Math.round(morosos/totalClientes*100) : 0) + '% del portafolio</div>' +
    '</div>';
    html += '<div class="dash-kpi orange">' +
      '<div class="kpi-icon"><i data-lucide="receipt" class="mi"></i></div>' +
      '<div class="kpi-val" data-val="' + vouchersPend + '">' + vouchersPend + '</div>' +
      '<div class="kpi-lbl">Vouchers Pendientes</div>' +
      '<div class="kpi-sub"><i data-lucide="clock" class="mi" style="font-size:14px;"></i> Por verificar</div>' +
    '</div>';
    html += '<div class="dash-kpi green">' +
      '<div class="kpi-icon"><i data-lucide="wallet" class="mi"></i></div>' +
      '<div class="kpi-val" data-val="' + cajaSaldo + '" data-currency="true">S/. ' + cajaSaldo.toLocaleString('es-PE',{minimumFractionDigits:2}) + '</div>' +
      '<div class="kpi-lbl">Saldo Caja Chica</div>' +
      '<div class="kpi-sub"><i data-lucide="trending-up" class="mi" style="font-size:14px;"></i> Ingresos: S/. ' + cajaIngresos.toLocaleString('es-PE',{minimumFractionDigits:0}) + '</div>' +
    '</div>';
    html += '</div>';

    // â”€â”€ BLOQUE 2: Distribución de Riesgo + Resumen Por Asesor â”€â”€
    html += '<div class="dash-row animate-fade-up" style="--delay: 0.15s;">';

    // Panel izquierda: Distribución
    html += '<div class="dash-panel">';
    html += '<div class="dash-panel-title"><i data-lucide="shield" class="mi sm"></i> Distribución de Cartera por Riesgo</div>';
    var riskData = [
      { name:'Normal (0-8d)', count:dist.normal, color:'var(--verde)', pct:Math.round(dist.normal/totalDist*100) },
      { name:'CPP (9-30d)', count:dist.cpp, color:'#cc8800', pct:Math.round(dist.cpp/totalDist*100) },
      { name:'Deficiente (31-60d)', count:dist.deficiente, color:'var(--naranja)', pct:Math.round(dist.deficiente/totalDist*100) },
      { name:'Dudoso (61-120d)', count:dist.dudoso, color:'var(--rojo)', pct:Math.round(dist.dudoso/totalDist*100) },
      { name:'Pérdida (>120d)', count:dist.perdida, color:'#333', pct:Math.round(dist.perdida/totalDist*100) }
    ];
    riskData.forEach(function(r) {
      html += '<div class="risk-bar-wrap">';
      html += '<div class="risk-bar-label"><span>' + r.name + '</span><span style="color:' + r.color + '; font-weight:700;">' + r.count + ' (' + r.pct + '%)</span></div>';
      html += '<div class="risk-bar-container"><div class="risk-bar-fill" data-width="' + Math.max(r.pct, 1) + '" style="background:' + r.color + ';"></div></div>';
      html += '</div>';
    });
    html += '</div>';

    // Panel derecha: Tabla de asesores
    html += '<div class="dash-panel">';
    html += '<div class="dash-panel-title"><i data-lucide="users" class="mi sm"></i> Rendimiento por Asesor</div>';
    if (asesores.length === 0) {
      html += '<div style="text-align:center;color:var(--texto2);padding:20px;">Sin datos</div>';
    } else {
      html += '<div style="overflow-x:auto;"><table class="asesor-table">';
      html += '<thead><tr><th>Asesor</th><th>Clientes</th><th>Deuda Total</th><th>Prom. d&iacute;as</th><th>Peor</th></tr></thead><tbody>';
      asesores.forEach(function(a) {
        var peorColor = a.peor > 60 ? 'var(--rojo)' : a.peor > 30 ? 'var(--naranja)' : 'var(--texto)';
        html += '<tr>';
        html += '<td style="font-weight:700;">' + escapeHtml(a.nombre.split(' ')[0]) + '</td>';
        html += '<td>' + a.clientes + '</td>';
        html += '<td style="font-weight:700;font-family:Montserrat,sans-serif;">S/. ' + a.deuda.toLocaleString('es-PE',{minimumFractionDigits:2}) + '</td>';
        html += '<td>' + a.promDias + 'd</td>';
        html += '<td style="color:' + peorColor + ';font-weight:700;">' + a.peor + 'd</td>';
        html += '</tr>';
      });
      html += '</tbody></table></div>';
    }
    html += '</div>';
    html += '</div>'; // close dash-row

    // â”€â”€ BLOQUE 3: Cobranza del Mes + Resumen Financiero â”€â”€
    html += '<div class="dash-row animate-fade-up" style="--delay: 0.3s;">';

    // Panel izquierda: Cobranza
    html += '<div class="dash-panel">';
    html += '<div class="dash-panel-title"><i data-lucide="banknote" class="mi sm"></i> Cobranza del Mes</div>';
    html += '<div class="dash-mini-stat"><span class="ms-lbl"><i data-lucide="check-circle" class="mi" style="font-size:14px;color:var(--verde);"></i> Pagos registrados</span><span class="ms-val" style="color:var(--verde);">' + pagosMes + '</span></div>';
    html += '<div class="dash-mini-stat"><span class="ms-lbl"><i data-lucide="dollar-sign" class="mi" style="font-size:14px;color:var(--azul);"></i> Monto recaudado</span><span class="ms-val" style="color:var(--azul);">S/. ' + montoMes.toLocaleString('es-PE',{minimumFractionDigits:2}) + '</span></div>';
    html += '<div class="dash-mini-stat"><span class="ms-lbl"><i data-lucide="hourglass" class="mi" style="font-size:14px;color:var(--naranja);"></i> Pendientes verificar</span><span class="ms-val" style="color:var(--naranja);">' + pendientesMes + '</span></div>';
    html += '<div class="dash-mini-stat"><span class="ms-lbl"><i data-lucide="receipt" class="mi" style="font-size:14px;color:var(--rojo);"></i> Vouchers sin procesar</span><span class="ms-val" style="color:var(--rojo);">' + vouchersPend + '</span></div>';
    html += '</div>';

    // Panel derecha: Finanzas
    html += '<div class="dash-panel">';
    html += '<div class="dash-panel-title"><i data-lucide="wallet" class="mi sm"></i> Resumen Financiero</div>';
    html += '<div class="dash-mini-stat"><span class="ms-lbl"><i data-lucide="piggy-bank" class="mi" style="font-size:14px;color:var(--azul);"></i> Saldo Caja Chica</span><span class="ms-val" style="color:var(--azul);">S/. ' + cajaSaldo.toLocaleString('es-PE',{minimumFractionDigits:2}) + '</span></div>';
    html += '<div class="dash-mini-stat"><span class="ms-lbl"><i data-lucide="arrow-down" class="mi" style="font-size:14px;color:var(--verde);"></i> Ingresos del mes</span><span class="ms-val" style="color:var(--verde);">S/. ' + cajaIngresos.toLocaleString('es-PE',{minimumFractionDigits:2}) + '</span></div>';
    html += '<div class="dash-mini-stat"><span class="ms-lbl"><i data-lucide="arrow-up" class="mi" style="font-size:14px;color:var(--rojo);"></i> Egresos del mes</span><span class="ms-val" style="color:var(--rojo);">S/. ' + cajaEgresos.toLocaleString('es-PE',{minimumFractionDigits:2}) + '</span></div>';

    // Top gastos
    if (topGastos.length > 0) {
      html += '<div style="margin-top:10px;padding-top:8px;border-top:2px solid var(--gris2);">';
      html += '<div style="font-size:10px;font-weight:700;color:var(--texto2);text-transform:uppercase;margin-bottom:6px;">Mayores Gastos</div>';
      topGastos.slice(0,3).forEach(function(g, i) {
        html += '<div class="dash-mini-stat"><span class="ms-lbl">' + (i+1) + '. ' + escapeHtml(g.categoria) + '</span><span class="ms-val" style="color:var(--rojo);">S/. ' + g.monto.toLocaleString('es-PE',{minimumFractionDigits:2}) + '</span></div>';
      });
      html += '</div>';
    }
    html += '</div>';
    html += '</div>'; // close dash-row

    // â”€â”€ BLOQUE 4: Resumen KASNET â”€â”€
    html += '<div class="animate-fade-up" style="margin-bottom:18px; --delay: 0.45s;">';
    html += '<h3 style="font-family: Montserrat, sans-serif; font-size:14px; color:var(--azul); margin-bottom:10px; display:flex; align-items:center; gap:6px;"><i data-lucide="store" class="mi sm"></i> Resumen KASNET</h3>';
    html += '<div class="caja-grid">';
    
    let mesActualOps = 0;
    const mesActualStr = new Date().toISOString().substring(0, 7);
    let ultimaDiff = 0;
    let fontColor = 'var(--texto)';
    
    if (typeof kasnetRegistros !== 'undefined' && kasnetRegistros && kasnetRegistros.length > 0) {
      const u = kasnetRegistros[0];
      ultimaDiff = u.diferencia;
      if (ultimaDiff > 0) fontColor = 'var(--verde)';
      else if (ultimaDiff < 0) fontColor = 'var(--rojo)';
      
      kasnetRegistros.forEach(function(r) {
        if (r.fecha && r.fecha.startsWith(mesActualStr)) mesActualOps++;
      });
    }
    
    const diffText = (ultimaDiff > 0 ? '+' : '') + 'S/. ' + ultimaDiff.toLocaleString('es-PE', {minimumFractionDigits:2});

    html += '<div class="caja-card"><div class="caja-card-title">Saldo Asignado (Base)</div><div class="caja-monto azul">S/. 3,000.00</div></div>';
    html += '<div class="caja-card"><div class="caja-card-title">Último Cierre (Diff)</div><div class="caja-monto" style="color:' + fontColor + ';">' + diffText + '</div></div>';
    html += '<div class="caja-card"><div class="caja-card-title">Registros Mes</div><div class="caja-monto verde">' + mesActualOps + '</div></div>';
    html += '</div></div>';

    container.innerHTML = html;
    
    // Iniciar animaciones después de renderizar
    setTimeout(initDashboardAnimations, 50);
  }

  function initDashboardAnimations() {
    // 1. Animar Contadores
    const counters = document.querySelectorAll('#dash-content .kpi-val[data-val]');
    counters.forEach(counter => {
      const target = parseFloat(counter.getAttribute('data-val')) || 0;
      const isCurrency = counter.getAttribute('data-currency') === 'true';
      animateValue(counter, 0, target, 1200, isCurrency);
    });

    // 2. Animar Barras de Progreso
    const bars = document.querySelectorAll('#dash-content .risk-bar-fill');
    bars.forEach(bar => {
      bar.style.width = bar.getAttribute('data-width') + '%';
    });
  }

  function animateValue(obj, start, end, duration, isCurrency) {
    let startTimestamp = null;
    const step = (timestamp) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      // Easing function: easeOutQuart
      const ease = 1 - Math.pow(1 - progress, 4);
      const current = start + (end - start) * ease;
      
      if (isCurrency) {
        obj.innerHTML = 'S/. ' + current.toLocaleString('es-PE', {minimumFractionDigits:2, maximumFractionDigits:2});
      } else {
        obj.innerHTML = Math.round(current);
      }
      
      if (progress < 1) {
        window.requestAnimationFrame(step);
      } else {
        // Asegurar que termine en el valor exacto formateado
        if (isCurrency) {
          obj.innerHTML = 'S/. ' + end.toLocaleString('es-PE', {minimumFractionDigits:2, maximumFractionDigits:2});
        } else {
          obj.innerHTML = Math.round(end);
        }
      }
    };
    window.requestAnimationFrame(step);
  }


  async function cargarAdicionales(sedeParam) {
    try {
      // Lanzar peticiones en paralelo para cargar datos de los módulos adicionales
      const pV = apiFetch({ admin: 'vouchers', sedeContexto: sedeParam });
      const pH = apiFetch({ admin: 'historial', sedeContexto: sedeParam });
      const pK = apiFetch({ admin: 'kasnet_datos', sedeContexto: sedeParam });
      
      // Llamar a cajaCargarDatos() solo si no estamos en la pestaña de caja chica 
      // (si estamos en caja chica, globalOnChangeSede ya lo está llamando)
      let pCaja = Promise.resolve();
      const activeSec = document.querySelector('.content-section.active');
      if (!activeSec || activeSec.id !== 'section-cajachica') {
         if (typeof cajaCargarDatos === 'function') {
           pCaja = cajaCargarDatos();
         }
      }

      const [resV, resH, resK] = await Promise.all([pV, pH, pK, pCaja]);
      
      if (Array.isArray(resV)) {
        vouchers = resV;
        const bv = document.getElementById('badge-vouchers');
        if(bv) { bv.textContent = vouchers.length; bv.style.display = vouchers.length > 0 ? 'inline-block' : 'none'; }
        const bvs = document.getElementById('badge-vouchers-sub');
        if(bvs) { bvs.textContent = vouchers.length; bvs.style.display = vouchers.length > 0 ? 'inline-block' : 'none'; }
        if (typeof renderVouchers === 'function') renderVouchers();
      }
      
      if (Array.isArray(resH)) {
        historial = resH;
        if (typeof poblarFiltrosHistorial === 'function') poblarFiltrosHistorial();
        if (typeof renderHistorial === 'function') renderHistorial();
      }
      
      if (resK && !resK.error) {
        kasnetRegistros = resK.registros || [];
      }
      
      // Re-renderizar dashboard con datos completos (caja + vouchers + historial + kasnet)
      renderDashboard();
    } catch(e) { console.error("Adicionales error: ", e); }
  }


  // â”€â”€ CLIENTES â”€â”€
  function dashCacheKey(sede) { return 'dash_cache_' + (sede || 'todas'); }
  function dashCacheGuardar(sede, data) { try { sessionStorage.setItem(dashCacheKey(sede), JSON.stringify({ ts: Date.now(), data: data })); } catch(e) {} }
  function dashCacheLeer(sede) {
    try {
      const raw = sessionStorage.getItem(dashCacheKey(sede));
      if (!raw) return null;
      const obj = JSON.parse(raw);
      if (Date.now() - obj.ts > CAJA_CACHE_TTL) return null; // Mismo TTL (60s)
      return obj.data;
    } catch(e) { return null; }
  }
