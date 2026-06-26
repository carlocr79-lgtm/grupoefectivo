
  let clientes = [];
  let vouchers = [];
  let historial = [];
  let cajaArqueosData = []; // Store loaded arqueos for details
  let filtroAsesor = '';
  let modalFilaActual = null;
  let modalNombreActual = '';
  let modalMontoActual = 0;




  window.currentMainTab = 'busqueda';
  window.currentMoraSubTab = 'pendientes';

  function switchClientesTab(tab) {
    if (tab === 'mora') {
      tab = 'mora-pendientes';
      window.currentMoraSubTab = 'pendientes';
      // Sincronizar UI de subtabs
      if (typeof window.switchMoraSubTab === 'function') {
        window.switchMoraSubTab('pendientes');
        return; // switchMoraSubTab will call switchClientesTab('mora-pendientes') again
      }
    }
    
    let tabGroup = tab.startsWith('mora') ? 'mora' : tab;
    window.currentMainTab = tabGroup;

    // Actualizar botones tab — usando estilos inline directos (igual que switchMoraSubTab)
    // para evitar recálculo de CSS que causa micro-temblor
    document.querySelectorAll('.btn-main-tab').forEach(b => {
      b.style.background = 'white';
      b.style.color = 'var(--texto2)';
      b.style.borderColor = 'var(--gris2)';
    });
    const btn = document.getElementById('tab-clientes-' + tabGroup);
    if (btn) {
      btn.style.background = 'var(--brand-light)';
      btn.style.color = 'var(--brand-secondary)';
      btn.style.borderColor = 'var(--brand-light-border)';
    }

    // Ocultar todas las vistas y toolbars primero
    document.getElementById('mora-content-busqueda').style.display = 'none';
    document.getElementById('mora-content-clientes').style.display = 'none'; 
    document.getElementById('mora-controls-clientes').style.display = 'none';
    document.getElementById('cartas-controls-pendientes').style.display = 'none';
    document.getElementById('mora-content-vouchers').style.display = 'none';
    document.getElementById('mora-content-historial').style.display = 'none';
    document.getElementById('mora-content-cartas').style.display = 'none';

    // Limpiar buscador si salimos de la pestaña de búsqueda
    const wrapper = document.getElementById('search-wrapper-global');
    if (tab !== 'busqueda') {
      if (wrapper) {
        wrapper.classList.remove('expanded');
        wrapper.classList.add('collapsed');
      }
      const inputGlobal = document.getElementById('input-busqueda-global');
      if (inputGlobal && inputGlobal.value !== '') {
        inputGlobal.value = '';
        if(typeof window.onInputBusquedaGlobal === 'function') {
          window.onInputBusquedaGlobal('');
        }
      }
    } else {
      if (wrapper) {
        wrapper.classList.remove('collapsed');
        wrapper.classList.add('expanded');
      }
    }

    // Mostrar lo correspondiente a la pestaña activa
    if (tab === 'busqueda') {
      document.getElementById('mora-content-busqueda').style.display = 'block';
      setTimeout(() => {
        const inputGlobal = document.getElementById('input-busqueda-global');
        if(inputGlobal) inputGlobal.focus();
      }, 50);
    } else if (tab === 'mora-pendientes') {
      document.getElementById('mora-content-clientes').style.display = 'block';
      document.getElementById('mora-controls-clientes').style.display = 'flex';
      if (typeof renderClientes === 'function') renderClientes();
    } else if (tab === 'mora-vouchers') {
      document.getElementById('mora-content-vouchers').style.display = 'block';
      document.getElementById('mora-controls-clientes').style.display = 'flex';
      if (!window._vouchersLoaded) {
        window._vouchersLoaded = true;
        if (typeof cargarVouchers === 'function') cargarVouchers();
      } else {
        if (typeof renderVouchers === 'function') renderVouchers();
      }
    } else if (tab === 'mora-historial') {
      document.getElementById('mora-content-historial').style.display = 'block';
      document.getElementById('mora-controls-clientes').style.display = 'flex';
      if (!window._historialLoaded) {
        window._historialLoaded = true;
        if (typeof cargarHistorial === 'function') cargarHistorial();
      } else {
        if (typeof renderHistorial === 'function') renderHistorial();
      }
    } else if (tab === 'cartas-pendientes') {
      document.getElementById('mora-content-cartas').style.display = 'block';
      document.getElementById('cartas-controls-pendientes').style.display = 'flex';
      
      if (typeof setFiltroCartas === 'function') {
        setFiltroCartas('SOLICITADA');
      }
      
      if (typeof cartasCargarPendientes === 'function') {
        cartasCargarPendientes();
      }
    }
  }
  window.switchClientesTab = switchClientesTab;

  window.switchMoraSubTab = function(subtab) {
    window.currentMoraSubTab = subtab;
    
    // Update subtab buttons UI
    document.querySelectorAll('.btn-mora-subtab').forEach(b => {
      // Remove inline styles to allow CSS to cascade properly
      b.style.background = '';
      b.style.color = '';
      b.style.borderColor = '';
      b.classList.remove('active-subtab');
    });
    const activeBtn = document.getElementById('subtab-mora-' + (subtab === 'pendientes' ? 'asesores' : subtab));
    if (activeBtn) {
      activeBtn.classList.add('active-subtab');
    }

    // Ocultar select de asesores y mostrar botón falso si no es pendientes
    const selectAsesores = document.getElementById('filtros-asesores');
    const btnAsesoresFalso = document.getElementById('subtab-mora-asesores');
    if (selectAsesores && btnAsesoresFalso) {
      if (subtab === 'pendientes') {
        selectAsesores.style.display = 'inline-block';
        btnAsesoresFalso.style.display = 'none';
      } else {
        selectAsesores.style.display = 'none';
        btnAsesoresFalso.style.display = 'flex';
      }
    }

    // Search Box placeholder
    const searchBox = document.getElementById('buscar-cliente');
    if (searchBox) {
      searchBox.value = '';
      if (subtab === 'vouchers') {
        searchBox.placeholder = 'Buscar en vouchers...';
      } else if (subtab === 'historial') {
        searchBox.placeholder = 'Buscar en historial...';
      } else {
        searchBox.placeholder = 'Buscar cliente...';
      }
    }

    switchClientesTab('mora-' + subtab);
  };


  // â”€â”€ SWITCH TAB DENTRO DE CAJA CHICA â”€â”€
  // Rastrea el último periodo cargado para evitar recargas innecesarias
  let _cajaArchivoUltimoPeriodo = null;

  function cajaSwitchTab(tab) {
    var tabs = ['mesactual','mesanterior','arqueo'];
    tabs.forEach(function(t) {
      var btn = document.getElementById('cc-tab-' + t);
      var panel = document.getElementById('cc-panel-' + t);
      if (btn)   btn.classList.toggle('active', t === tab);
      if (panel) panel.style.display = (t === tab) ? 'block' : 'none';
    });
    // Cargar datos según el tab
    if (tab === 'mesanterior') {
      cajaVistaArchivo = true;
      const d = new Date();
      const anioActual = d.getFullYear().toString();
      const mesActual  = (d.getMonth() + 1).toString();
      document.getElementById('hist-anio').value = anioActual;
      document.getElementById('hist-mes').value  = mesActual;
      // Auto-cargar si el periodo no ha sido cargado aún
      const periodoKey = anioActual + '_' + mesActual + '_MOVIMIENTOS_' + (cajaSedeActual || 'todos');
      if (_cajaArchivoUltimoPeriodo !== periodoKey) {
        _cajaArchivoUltimoPeriodo = periodoKey;
        cajaCargarArchivo();
      }
    }
    else if (tab === 'mesactual') { cajaVistaArchivo = false; cajaRenderTabla(cajaMovimientos, false); }
    else if (tab === 'arqueo') {
      cajaLoadHistorial();
    }
    // Actualizar título topbar
    var titulos = {mesactual:'Caja Chica — Mes Actual', mesanterior:'Caja Chica — Meses Anteriores', arqueo:'Caja Chica — Arqueos'};
    var tt = document.getElementById('topbar-title');
    if (tt) tt.textContent = titulos[tab] || 'Caja Chica';
  }


  // â”€â”€ CONTROL DE RACE CONDITIONS â”€â”€
  let _loadRequestId = 0;        // incrementa con cada cargarTodo()
  let _sedeChangeTimer = null;   // debounce al cambiar sede

  // ── ON CHANGE SEDE GLOBAL ──
  function globalOnChangeSede() {
    clearTimeout(_sedeChangeTimer);
    _sedeChangeTimer = setTimeout(function() {
      cajaSedeActual = document.getElementById('global-sede-select').value;
      cajaCacheInvalidar(cajaSedeActual); _cajaArqueosLoaded = false;
      _cajaArchivoUltimoPeriodo = null;

      // ── EFECTO VISUAL DE CAMBIO DE SEDE ──
      var sel = document.getElementById('global-sede-select');
      var sedeName = sel.options[sel.selectedIndex] ? sel.options[sel.selectedIndex].text : cajaSedeActual;
      var overlay = document.getElementById('sede-transition');
      var nameEl = document.getElementById('sede-transition-name');
      var contentBody = document.querySelector('.content-body');
      if (nameEl) nameEl.textContent = sedeName;
      if (contentBody) contentBody.classList.add('sede-fading');
      if (overlay) overlay.classList.add('active');

      var btn = document.getElementById('btn-refresh');
      var txt = document.getElementById('btn-refresh-text');
      if(btn) btn.classList.add('is-refreshing');
      if(txt) txt.textContent = 'Actualizando...';

      // Mostrar overlay, disparar peticiones inmediatamente y esperar a que ambas terminen
      var activeSec = document.querySelector('.content-section.active');
      var secPromise = Promise.resolve();

      if (activeSec) {
        const secId = activeSec.id.replace('section-', '');
        if (secId === 'cajachica' && typeof cajaCargarDatos === 'function') secPromise = cajaCargarDatos();
        else if (secId === 'kasnet' && typeof kasnetCargarDatos === 'function') secPromise = kasnetCargarDatos();
        else if (secId === 'cartas' && typeof cartasBuscar === 'function') {
           const searchVal = document.getElementById('cartas-buscar').value;
           if (searchVal) secPromise = cartasBuscar(); else if (typeof cartasCargarPendientes === 'function') secPromise = cartasCargarPendientes();
        }
        else if (secId === 'mora') {
           const activeTab = document.querySelector('.btn-mora-tab.active');
           if (activeTab && activeTab.id) {
             const tabName = activeTab.id.replace('tab-mora-', '');
             if (tabName === 'vouchers' && typeof cargarVouchers === 'function') secPromise = cargarVouchers();
             else if (tabName === 'historial' && typeof cargarHistorial === 'function') secPromise = cargarHistorial();
           }
        }
      }

      // El Promise.all esperará a que tanto cargarTodo como secPromise terminen
      // Agregamos un mínimo de 700ms para que la animación de la pantalla azul no se vea cortada si el internet es muy rápido
      Promise.all([
        cargarTodo(),
        secPromise,
        new Promise(resolve => setTimeout(resolve, 700))
      ]).then(function() {
        if(btn) btn.classList.remove('is-refreshing');
        var h = String(new Date().getHours()).padStart(2,'0');
        var m = String(new Date().getMinutes()).padStart(2,'0');
        if(txt) txt.textContent = 'Actualizado ' + h + ':' + m;
        
        // Cerrar overlay
        if (overlay) overlay.classList.remove('active');
        if (contentBody) {
          contentBody.classList.remove('sede-fading');
          contentBody.classList.add('sede-fadein');
          setTimeout(function() { contentBody.classList.remove('sede-fadein'); }, 500);
        }
      });
    }, 300);
  }

  // â”€â”€ NOVEDADES DINÁMICAS â”€â”€
  window._novedadInterval = null;

  window.generarNovedadDelDia = function() {
    const curiosidades = [
      { titulo: "¡Feliz Día del Programador!", texto: "Sabías que el primer programador del mundo fue Ada Lovelace en el siglo XIX. Hoy celebramos el código que mueve el mundo." },
      { titulo: "Dato Senior: Refactoring", texto: "Un buen programador senior sabe que el código no solo debe funcionar, sino que debe ser fácil de leer para el equipo del futuro. ¡Escribe código limpio!" },
      { titulo: "El Mundial del Código", texto: "Como en el mundial, en la programación se necesita trabajo en equipo. Hoy revisa si tienes compañeros bloqueados y dales una mano." },
      { titulo: "Resultados del Mundial Histórico", texto: "El Mundial de Brasil 2014 es recordado por la mayor goleada sufrida por un anfitrión en semifinales: Alemania venció 7-1 a Brasil, cambiando la historia del fútbol." },
      { titulo: "La Regla del Boy Scout", texto: "Siempre deja el código un poco más limpio de lo que lo encontraste. Pequeñas mejoras diarias hacen plataformas invencibles." },
      { titulo: "Fútbol y Tecnología", texto: "Desde el VAR hasta los balones con sensores, la tecnología es fundamental en mundiales recientes, registrando hasta 500 datos de posición por segundo." },
      { titulo: "Mentalidad Ágil", texto: "No busques la perfección en el primer intento. Un código funcional hoy es mejor que un código perfecto que nunca se lanza." },
      { titulo: "Dato Curioso", texto: "Existen más de 700 lenguajes de programación en el mundo, pero solo unos 20 se usan masivamente en la industria moderna." }
    ];

    const actualizacionesReales = [
      { fecha: "2026-06-25", titulo: "Mejoras en WhatsApp", texto: "Hemos implementado un extractor inteligente de números en la sección Cartas para que nunca más falle el botón de WhatsApp." },
      { fecha: "2026-06-25", titulo: "Nueva Interfaz Limpia", texto: "Se rediseñaron los mensajes de 'Sin resultados' por interfaces modernas, claras y personalizadas." },
      { fecha: "2026-06-26", titulo: "Novedades Inteligentes", texto: "Ahora el panel de inicio bloquea el acceso hasta que los datos están listos, y te muestra carruseles de noticias cada día." }
    ];

    // Ajustar la zona horaria a Lima para evitar desfases de día
    const fechaLima = new Date(new Date().toLocaleString("en-US", {timeZone: "America/Lima"}));
    const mes = String(fechaLima.getMonth() + 1).padStart(2, '0');
    const dia = String(fechaLima.getDate()).padStart(2, '0');
    const hoyStr = `${fechaLima.getFullYear()}-${mes}-${dia}`;
    
    // Obtenemos actualizaciones de hoy y mezclamos con curiosidades al azar
    let novedadesDelDia = actualizacionesReales.filter(a => a.fecha === hoyStr);
    
    // Agregamos de 2 a 3 curiosidades al azar para tener un carrusel fluido
    const mezcladas = [...curiosidades].sort(() => 0.5 - Math.random()).slice(0, 3);
    novedadesDelDia = novedadesDelDia.concat(mezcladas);

    const titleEl = document.getElementById('novedad-titulo');
    const textEl = document.getElementById('novedad-texto');
    if (!titleEl || !textEl) return;

    let currentSlide = 0;
    
    function renderSlide() {
      const slide = novedadesDelDia[currentSlide];
      
      // Animación de salida
      titleEl.style.opacity = '0';
      textEl.style.opacity = '0';
      titleEl.style.transform = 'translateY(10px)';
      textEl.style.transform = 'translateY(10px)';
      titleEl.style.transition = 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)';
      textEl.style.transition = 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)';

      setTimeout(() => {
        titleEl.textContent = slide.titulo;
        textEl.innerHTML = slide.texto;
        
        // Animación de entrada
        titleEl.style.opacity = '1';
        textEl.style.opacity = '1';
        titleEl.style.transform = 'translateY(0)';
        textEl.style.transform = 'translateY(0)';
      }, 400);

      currentSlide = (currentSlide + 1) % novedadesDelDia.length;
    }

    // Primera renderización y ciclo
    renderSlide();
    if (window._novedadInterval) clearInterval(window._novedadInterval);
    window._novedadInterval = setInterval(renderSlide, 5000);
  };

  // â”€â”€ CARGA INICIAL (con protección anti race-condition) â”€â”€
  async function cargarTodo() {
    // Capturar el ID de esta petición. Si llega una más nueva, descartamos esta.
    const myReqId = ++_loadRequestId;

    try {
      const globalSel = document.getElementById('global-sede-select');
      // Si el selector está vacío (primer login), usar cajaSedeActual de carga anterior; '' solo si nunca se cargó
      const sedeReq = (globalSel && globalSel.value) ? globalSel.value : (cajaSedeActual || '');

      // â”€â”€ TÉCNICA 1: Mostrar cache inmediatamente (stale-while-revalidate) para Dashboard/Mora â”€â”€
      const dashCached = dashCacheLeer(sedeReq);
      if (dashCached) {
        if (Array.isArray(dashCached.clientes)) {
          // FILTRO DEFENSIVO FRONTEND: Ignorar clientes asignados a "CARTERA"
          clientes = dashCached.clientes.filter(c => {
            if (!c.asesor) return true;
            return c.asesor.toUpperCase().indexOf('CARTERA') < 0;
          });
          renderAsesoresFiltros();
          renderClientes();
        }
        // Poblar sedes precargadas
        if (dashCached.sedes && dashCached.sedes.length > 0 && globalSel.options.length === 0) {
          globalSel.innerHTML = '';
          const rolActual = sessionStorage.getItem('ge_rol') || 'asesor';
          dashCached.sedes.forEach(function(s) { const o = document.createElement('option'); o.value=s; o.textContent=s; globalSel.appendChild(o); });
          if (globalSel.parentElement) {
             globalSel.parentElement.style.display = (rolActual !== 'admin' && dashCached.sedes.length <= 1) ? 'none' : 'block';
          }
          // Admin: seleccionar por defecto la primera sede real (no 'Todas')
          if (dashCached.sedeActiva !== undefined && dashCached.sedeActiva !== null && dashCached.sedeActiva !== '') {
            globalSel.value = dashCached.sedeActiva;
            cajaSedeActual = dashCached.sedeActiva;
          } else if (rolActual === 'admin' && dashCached.sedes.length > 0) {
            globalSel.value = dashCached.sedes[0];
            cajaSedeActual = dashCached.sedes[0];
          }
        }
        renderDashboard();
      }

      // Lanzar solo dashboard primero para conocer la sede real antes de pedir caja/kasnet
      const pDash = apiFetch({ admin: 'dashboard', sedeContexto: sedeReq });

      const resp = await pDash;
      // <i data-lucide="alert-triangle" class="mi xs" style="vertical-align:text-bottom;margin-right:2px;"></i> Guard: si llegó una carga más nueva mientras esperábamos, ignorar esta respuesta
      if (myReqId !== _loadRequestId) { console.log('[cargarTodo] descartando respuesta obsoleta (req ' + myReqId + ')'); return; }

      if (!resp || resp.error) {
        if (!dashCached) {
          console.error('Dashboard error:', resp);
          document.getElementById('lista-clientes').innerHTML = '<div class="empty">Error de conexión con el servidor.</div>';
        }
        return;
      }
      
      dashCacheGuardar(sedeReq, resp);

      // Poblar selector de sedes solo la primera vez (cuando está vacío)
      if (resp.sedes && resp.sedes.length > 0 && globalSel.options.length === 0) {
        globalSel.innerHTML = '';
        const rolActual = sessionStorage.getItem('ge_rol') || 'asesor';
        resp.sedes.forEach(function(s) { const o = document.createElement('option'); o.value=s; o.textContent=s; globalSel.appendChild(o); });
        
        if (globalSel.parentElement) {
           globalSel.parentElement.style.display = (rolActual !== 'admin' && resp.sedes.length <= 1) ? 'none' : 'block';
        }

        // Seleccionar por defecto la primera sede real
        if (resp.sedes.length > 0) {
          if (globalSel) globalSel.value = resp.sedes[0];
          cajaSedeActual = resp.sedes[0];
        }
      }
      // Solo actualizar la sede si coincide con la que pedimos (o si fue la carga inicial donde pedimos '')
      if (resp.sedeActiva !== undefined && resp.sedeActiva !== null && resp.sedeActiva !== '' && (sedeReq === '' || sedeReq === (globalSel ? globalSel.value : sedeReq))) {
        if (globalSel) globalSel.value = resp.sedeActiva;
        cajaSedeActual = resp.sedeActiva;
      }

      // Actualizar clientes solo si la sede sigue siendo la misma
      if (myReqId === _loadRequestId && Array.isArray(resp.clientes)) {
        // FILTRO DEFENSIVO FRONTEND: Ignorar clientes asignados a "CARTERA"
        clientes = resp.clientes.filter(c => {
          if (!c.asesor) return true;
          return c.asesor.toUpperCase().indexOf('CARTERA') < 0;
        });
        renderAsesoresFiltros();
        renderClientes();
      }

      // Sede efectiva ya resuelta: lo que devolvió el dashboard (primera oficina para admin)
      const sedeEfectiva = (cajaSedeActual && cajaSedeActual !== '') ? cajaSedeActual : sedeReq;

      // Cargar dependencias de segundo plano (Caja, Kasnet, Historial, Vouchers)
      // Esto alimenta los KPIs del dashboard que de otra forma saldrían en 0
      if (typeof cargarAdicionales === 'function') {
        await cargarAdicionales(sedeEfectiva);
      }

      // Guard final antes de renderizar dashboard
      if (myReqId === _loadRequestId) {
        renderDashboard();
      }

    } catch(e) {
      if (myReqId !== _loadRequestId) return; // ignorar si ya hay una carga más nueva
      console.error('Error fatal de conexión:', e);
      document.getElementById('lista-clientes').innerHTML = '<div class="empty">Error de conexión.</div>';
      cajaCargarDatos();
    } finally {
      if (myReqId === _loadRequestId) {
        window.datosCargados = true;
        document.dispatchEvent(new Event('datos-cargados'));
      }
    }
  }

  // â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• 
  // â”€â”€â”€â”€ DASHBOARD GENERAL â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• 
  window.addEventListener('load', function() {
    function initReloj() {
      const elFecha = document.getElementById('inicio-fecha');
      const elHora = document.getElementById('inicio-hora');
      if (!elFecha || !elHora) return;

      const actualizar = () => {
        const ahora = new Date();
        const opcionesFecha = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        elFecha.textContent = ahora.toLocaleDateString('es-PE', opcionesFecha);
        elHora.textContent = ahora.toLocaleTimeString('es-PE', { hour12: false });
      };

      actualizar();
      setInterval(actualizar, 1000);
    }
    initReloj();

    const session = sessionStorage.getItem('ge_session');
    const nombre = sessionStorage.getItem('ge_nombre');
    if (session) {
      document.getElementById('login-screen').style.display = 'none';
      document.getElementById('app').style.display = 'block';
      if (nombre) {
        const rol = sessionStorage.getItem('ge_rol') || 'asesor';
        const oficina = sessionStorage.getItem('ge_oficina') || 'TODOS';
        const rolLabel = rol === 'admin' ? 'Admin' : rol === 'cajero' ? 'Cajero' : 'Asesor';
        const ofLabel = oficina !== 'TODOS' ? oficina : 'Todas las oficinas';
        document.getElementById('navbar-rol').textContent = rolLabel;
        document.getElementById('navbar-oficina').textContent = ofLabel;
        document.getElementById('navbar-user').textContent = nombre;

        const saludoEl = document.getElementById('inicio-saludo');
        if (saludoEl) {
          const primerNombre = nombre.split(' ')[0];
          saludoEl.textContent = '¡Hola, ' + primerNombre + '!';
        }

        if (rol !== 'admin') {
          const dashPanelCartas = document.getElementById('dash-panel-cartas');
          if (dashPanelCartas) dashPanelCartas.style.display = 'none';
          const tabCartas = document.getElementById('tab-clientes-cartas-pendientes');
          if (tabCartas) tabCartas.style.display = 'none';
        }
      }
      cargarTodo();
    }

    // Bloqueo zoom
    document.addEventListener('touchstart', e => { if(e.touches.length>1) e.preventDefault(); }, {passive:false});
    document.addEventListener('gesturestart', e => e.preventDefault(), {passive:false});

    // Auto-refresh al volver a la pestaña (cooldown 30s)
    let _lastRefresh = Date.now();
    document.addEventListener('visibilitychange', function() {
      if (document.visibilityState === 'visible' && sessionStorage.getItem('ge_session')) {
        const ahora = Date.now();
        if (ahora - _lastRefresh >= 30000) {
          _lastRefresh = ahora;
          const btnTxt = document.getElementById('btn-refresh-text');
          const btnRefresh = document.getElementById('btn-refresh');
          if (btnRefresh) btnRefresh.classList.add('is-refreshing');
          if (btnTxt) btnTxt.textContent = 'Actualizando...';
          
          cargarTodo().then(function() {
            if (btnRefresh) btnRefresh.classList.remove('is-refreshing');
            const h = String(new Date().getHours()).padStart(2,'0');
            const m = String(new Date().getMinutes()).padStart(2,'0');
            if (btnTxt) btnTxt.textContent = 'Actualizado ' + h + ':' + m;
          });
        }
      }
    });
  }); // ← Cierre del window.addEventListener('load')

  // ═══════════════════════════════════════════
  // ──── CARTAS DE NO ADEUDO ────────────────
  // ═══════════════════════════════════════════
  let _cartasData = [];
  let _cartasTimer = null;
  let _cartasBlobUrl = null;       // FIX: rastrear blob URL para liberar memoria
  let _cartasPendientesTs = 0;     // FIX: timestamp de última carga de pendientes

  // Sanitizar valores del servidor antes de insertar en HTML (previene XSS)
  function escHtml(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function toggleCartasClearBtn() {
    const q = document.getElementById('cartas-buscar').value;
    const btn = document.getElementById('cartas-btn-clear');
    if (btn) btn.style.display = (q.length > 0) ? 'flex' : 'none';
  }

  function limpiarBuscadorCartas() {
    const input = document.getElementById('cartas-buscar');
    input.value = '';
    toggleCartasClearBtn();
    input.focus();
    cartasBuscar();
  }

  function cartasBuscarDebounce() {
    clearTimeout(_cartasTimer);
    _cartasTimer = setTimeout(cartasBuscar, 350);
  }

  let _cartasReqId = 0;

  async function cartasBuscar() {
    const q = document.getElementById('cartas-buscar').value.trim();
    const container = document.getElementById('cartas-resultados');
    const countEl = document.getElementById('cartas-count');

    // Incrementar ID de petición
    const myReqId = ++_cartasReqId;

    // Si el buscador está vacío, mostramos el estado inicial
    if (q === '') {
      container.innerHTML = `
        <div class="empty" style="padding:40px 20px;">
          <div class="icon"><i data-lucide="file-text" class="mi" style="font-size:48px; color:var(--azul2);"></i></div>
          <div class="font-bold text-lg mt-2"  style="color:var(--azul);">Cartas de No Adeudo</div>
          <div class="text-base text-secondary mt-1" >Busca un cliente por nombre, código o celular para consultar su estado</div>
        </div>
      `;
      countEl.textContent = '';
      return;
    }

    // Mostrar loading (Skeleton)
    let skHTML = '';
    for(let i=0; i<3; i++) {
      skHTML += `<div class="skeleton-box"><div class="skeleton sk-avatar"></div><div class="flex-1" ><div class="skeleton sk-line w-50"></div><div class="skeleton sk-line w-80"></div></div></div>`;
    }
    container.innerHTML = skHTML;
    countEl.textContent = '';

    try {
      const resp = await apiFetch({ admin: 'cartas_buscar', q: q, sedeContexto: cajaSedeActual || '' });
      
      // Guard anti-race-condition: si se hizo otra búsqueda mientras esperábamos, ignorar esta respuesta
      if (myReqId !== _cartasReqId) return;

      if (resp && resp.error) {
        container.innerHTML = '<div class="empty"><div class="icon"><i data-lucide="alert-triangle" class="mi" style="font-size:40px;color:var(--naranja);"></i></div>' + resp.error + '</div>';
        return;
      }

      if (!Array.isArray(resp) || resp.length === 0) {
        container.innerHTML = '<div class="empty" style="padding:30px 20px;"><div class="icon"><i class="mi text-secondary" data-lucide="search-x"   style="font-size:40px;"></i></div><div class="font-bold text-primary"  style="margin-top:6px;">Sin resultados</div><div class="text-base text-secondary"  style="margin-top:2px;">No se encontraron clientes con esa búsqueda</div></div>';
        countEl.textContent = '0 resultados';
        return;
      }

      _cartasData = resp;
      countEl.textContent = resp.length + ' resultado' + (resp.length > 1 ? 's' : '');
      cartasRenderResultados(resp);
    } catch(e) {
      console.error('Error buscando cartas:', e);
      container.innerHTML = '<div class="empty"><div class="icon"><i data-lucide="alert-circle" class="mi" style="font-size:40px;color:var(--rojo);"></i></div>Error de conexión</div>';
    }
  }

  function cartasSwitchTab(tab) {
    document.querySelectorAll('#cartas-tabs .gestiones-subtab').forEach(b => b.classList.remove('active'));
    const btn = document.getElementById('tab-cartas-' + tab);
    if (btn) btn.classList.add('active');
    
    document.getElementById('cartas-content-buscador').style.display = (tab === 'buscador') ? 'block' : 'none';
    document.getElementById('cartas-content-pendientes').style.display = (tab === 'pendientes') ? 'block' : 'none';
  }


  // ==========================================
  // UNIFICACION DE CAJA CENTRAL
  // ==========================================

  window.switchCajaTab = function(tab) {
    document.querySelectorAll('#section-caja .btn-main-tab').forEach(b => {
      b.classList.remove('active');
      b.style.background = 'transparent';
      b.style.color = 'var(--texto2)';
      b.style.boxShadow = 'none';
    });
    const btn = document.getElementById('tab-caja-' + tab);
    if (btn) {
      btn.classList.add('active');
      btn.style.background = 'white';
      btn.style.color = 'var(--azul)';
      btn.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
    }

    document.getElementById('caja-sub-cajachica').style.display = (tab === 'cajachica') ? 'flex' : 'none';
    document.getElementById('caja-sub-kasnet').style.display = (tab === 'kasnet') ? 'flex' : 'none';
    document.getElementById('caja-sub-arqueo').style.display = (tab === 'arqueo') ? 'flex' : 'none';

    if (tab === 'arqueo') {
      calcularArqueoGlobal();
    } else if (tab === 'cajachica' && typeof cajaCargarDatos === 'function') {
      if(!window.cajaCargadoPreviamente) { window.cajaCargadoPreviamente=true; cajaCargarDatos(); }
    } else if (tab === 'kasnet' && typeof kasnetCargarDatos === 'function') {
      if(!window.kasnetCargadoPreviamente) { window.kasnetCargadoPreviamente=true; kasnetCargarDatos(); }
    }
  };

  window.cajaUnificadaInit = function() {
    if(typeof cajaCargarDatos === 'function') { window.cajaCargadoPreviamente=true; cajaCargarDatos(); }
    if(typeof kasnetCargarDatos === 'function') { window.kasnetCargadoPreviamente=true; kasnetCargarDatos(); }
    window.switchCajaTab('cajachica');
  };

  function calcularArqueoGlobal() {
    let fisicoCaja = 0;
    let fisicoKasnet = 0;

    // Obtener fisico de caja chica (usamos cajaSaldoTeorico que es el saldo neto exacto esperado)
    if (typeof cajaSaldoTeorico !== 'undefined') {
      fisicoCaja = parseFloat(cajaSaldoTeorico) || 0;
    } else if (typeof cajaMovimientos !== 'undefined' && Array.isArray(cajaMovimientos)) {
      fisicoCaja = cajaMovimientos.reduce((acc, m) => {
        let monto = parseFloat(m.monto) || 0;
        // Dependiendo de si se guarda como 'Ingreso' o 'INGRESO'
        return acc + ((m.tipo || '').toUpperCase() === 'INGRESO' ? monto : -monto);
      }, 0);
    }

    // Obtener fisico de kasnet (usamos el registro más reciente de hoy)
    if (typeof kasnetRegistros !== 'undefined' && Array.isArray(kasnetRegistros) && kasnetRegistros.length > 0) {
      // El registro [0] suele ser el más reciente. Tomamos su efectivo físico declarado.
      fisicoKasnet = parseFloat(kasnetRegistros[0].efectivoFisico) || 0;
    }

    const total = fisicoCaja + fisicoKasnet;

    const elCaja = document.getElementById('arqueo-global-cajachica');
    const elKasnet = document.getElementById('arqueo-global-kasnet');
    const elTotal = document.getElementById('arqueo-global-total');

    if(elCaja) elCaja.textContent = 'S/ ' + fisicoCaja.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
    if(elKasnet) elKasnet.textContent = 'S/ ' + fisicoKasnet.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
    if(elTotal) elTotal.textContent = 'S/ ' + total.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
  }

