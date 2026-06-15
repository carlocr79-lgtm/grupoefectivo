const API_URL = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.protocol === 'file:')
  ? "https://script.google.com/macros/s/AKfycbxARZ0RKzgRWAdLl8SOLN-oeVJWEkdIvcaXE1tmWHRAllIJnYndrRgPHEMZ3_r4BV5wxA/exec"
  : "/api";

let correoActual = '';
let timerInterval = null;

// ─── AUTH: PASO 1 — SOLICITAR CÓDIGO ───
async function solicitarCodigo() {
  const correo = document.getElementById('inp-correo').value.trim();
  if (!correo || !correo.includes('@')) {
    mostrarError('login-error', 'Ingresa un correo válido'); return;
  }
  const btn = document.getElementById('btn-solicitar');
  btn.querySelector('.btn-text').style.display = 'none';
  btn.querySelector('.btn-spinner').style.display = 'inline-block';
  btn.disabled = true;
  ocultarError('login-error'); ocultarError('login-ok');

  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      body: JSON.stringify({ authAction: 'solicitarCodigo', correo: correo })
    });
    const data = await res.json();

    if (data.success) {
      correoActual = correo;
      
      // Smooth Transition to Code Step
      const boxCorreo = document.getElementById('box-correo');
      const boxCodigo = document.getElementById('box-codigo');
      boxCorreo.style.display = 'none'; // Fade out handled by CSS ideally, but switching active class is robust
      boxCodigo.style.display = 'block';
      boxCorreo.classList.remove('active');
      boxCodigo.classList.add('active');

      document.getElementById('correo-display-txt').textContent = correo;
      document.getElementById('c1').focus();
      iniciarTimer(10 * 60);
    } else {
      mostrarError('login-error', data.error || 'Correo no autorizado');
    }
  } catch(e) {
    mostrarError('login-error', 'Error de conexión. Intenta de nuevo.');
  }
  btn.querySelector('.btn-text').style.display = 'inline-block';
  btn.querySelector('.btn-spinner').style.display = 'none';
  btn.disabled = false;
}

// ─── AUTH: PASO 2 — VERIFICAR CÓDIGO ───
async function verificarCodigo() {
  const codigo = ['c1','c2','c3','c4','c5','c6']
    .map(id => document.getElementById(id).value).join('');

  if (codigo.length < 6) {
    mostrarError('codigo-error', 'Ingresa los 6 dígitos'); return;
  }
  const btn = document.getElementById('btn-verificar-cod');
  btn.querySelector('.btn-text').style.display = 'none';
  btn.querySelector('.btn-spinner').style.display = 'inline-block';
  btn.disabled = true;
  ocultarError('codigo-error');

  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      body: JSON.stringify({ authAction: 'verificarCodigo', correo: correoActual, codigo: codigo })
    });
    const data = await res.json();

    if (data.success) {
      clearInterval(timerInterval);
      sessionStorage.setItem('ge_session', data.sessionToken);
      sessionStorage.setItem('ge_nombre', data.nombre);
      sessionStorage.setItem('ge_rol', data.rol);
      sessionStorage.setItem('ge_oficina', data.oficina || 'TODOS');
      document.getElementById('login-screen').style.display = 'none';
      document.getElementById('app').style.display = 'block';
      const rolLabel = data.rol === 'admin' ? 'Admin' : data.rol === 'cajero' ? 'Cajero' : 'Asesor';
      const ofLabel = data.oficina && data.oficina !== 'TODOS' ? data.oficina : 'Acceso General';
      document.getElementById('navbar-rol').textContent = rolLabel;
      document.getElementById('navbar-oficina').textContent = ofLabel;
      document.getElementById('navbar-user').textContent = data.nombre;

      
      if (typeof cargarTodo === 'function') cargarTodo();
    } else {
      mostrarError('codigo-error', data.error || 'Código incorrecto');
    }
  } catch(e) {
    mostrarError('codigo-error', 'Error de conexión.');
  }
  btn.querySelector('.btn-text').style.display = 'inline-block';
  btn.querySelector('.btn-spinner').style.display = 'none';
  btn.disabled = false;
}

function volverCorreo() {
  clearInterval(timerInterval);
  const boxCorreo = document.getElementById('box-correo');
  const boxCodigo = document.getElementById('box-codigo');
  boxCodigo.style.display = 'none';
  boxCorreo.style.display = 'block';
  boxCodigo.classList.remove('active');
  boxCorreo.classList.add('active');
  ['c1','c2','c3','c4','c5','c6'].forEach(id => document.getElementById(id).value = '');
}

function avanzarCodigo(input, siguienteId) {
  input.value = input.value.replace(/[^0-9]/g,'');
  if (input.value) {
    input.classList.remove('pop');
    void input.offsetWidth; // trigger reflow
    input.classList.add('pop');
  }
  if (input.value && siguienteId) document.getElementById(siguienteId).focus();
  if (!siguienteId && input.value) verificarCodigo();
}

// ─── OTP PASTE HANDLER ───
document.addEventListener('paste', (e) => {
  const paste = (e.clipboardData || window.clipboardData).getData('text');
  if (paste.length === 6 && /^\d+$/.test(paste) && document.getElementById('box-codigo').style.display !== 'none') {
    e.preventDefault();
    ['c1','c2','c3','c4','c5','c6'].forEach((id, i) => {
      const input = document.getElementById(id);
      input.value = paste[i];
      input.classList.remove('pop');
      void input.offsetWidth;
      input.classList.add('pop');
    });
    verificarCodigo();
  }
});

function retrocederCodigo(e, anteriorId) {
  if (e.key === 'Backspace' && !e.target.value && anteriorId) {
    document.getElementById(anteriorId).focus();
  }
}

function iniciarTimer(segundos) {
  clearInterval(timerInterval);
  const txt = document.getElementById('timer-txt');
  timerInterval = setInterval(() => {
    const m = Math.floor(segundos / 60);
    const s = segundos % 60;
    txt.textContent = 'Expira en ' + m + ':' + String(s).padStart(2,'0');
    if (--segundos < 0) {
      clearInterval(timerInterval);
      txt.innerHTML = '<i data-lucide="alert-triangle" class="mi xs" style="vertical-align:text-bottom;margin-right:2px;"></i> Código expirado. Solicita uno nuevo.';
    }
  }, 1000);
}

function mostrarError(id, msg) {
  const el = document.getElementById(id);
  if(el) { el.textContent = msg; el.style.display = 'block'; }
}

function ocultarError(id) {
  const el = document.getElementById(id);
  if(el) el.style.display = 'none';
}

function logout() {
  sessionStorage.removeItem('ge_session');
  sessionStorage.removeItem('ge_nombre');
  sessionStorage.removeItem('ge_rol');
  sessionStorage.removeItem('ge_oficina');
  location.reload();
}

// ─── API FETCH ───
function getSession() { return sessionStorage.getItem('ge_session'); }

async function apiFetch(params) {
  const body = {...params, sessionToken: getSession(), _method: 'GET', _t: Date.now()};
  const res = await fetch(API_URL, { method: 'POST', body: JSON.stringify(body) });
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); }
  catch(e) { console.error('No JSON:', text.substring(0,300)); throw new Error('Error del servidor'); }
  if (data && data.error === 'Sesión inválida o expirada') { logout(); return null; }
  return data;
}

async function apiPost(body) {
  const res = await fetch(API_URL, { method: 'POST', body: JSON.stringify({...body, sessionToken: getSession(), _t: Date.now()}) });
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); }
  catch(e) { console.error('No JSON:', text.substring(0,300)); throw new Error('Error del servidor'); }
  if (data && data.error === 'Sesión inválida o expirada') { logout(); return null; }
  return data;
}

// ─── UTILS ───
function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

function showToast(msg) {
  const t = document.getElementById('toast');
  if(!t) return;
  t.innerHTML = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3000);
}

// ─── REFRESH MANUAL ───
async function refrescarDatos() {
  const btn = document.getElementById('btn-refresh');
  const txt = document.getElementById('btn-refresh-text');
  if(btn) btn.classList.add('is-refreshing');
  if(txt) txt.textContent = 'Actualizando...';
  
  if (typeof cargarTodo === 'function') await cargarTodo();
  
  if(btn) btn.classList.remove('is-refreshing');
  const ahora = new Date();
  const h = String(ahora.getHours()).padStart(2,'0');
  const m = String(ahora.getMinutes()).padStart(2,'0');
  if(txt) txt.textContent = 'Actualizado ' + h + ':' + m;
}

// ─── SIDEBAR NAVIGATION ───
const _sectionTitles = {
  'dashboard': 'Dashboard', 'clientes': 'Gestión de Clientes',
  'cartas': 'Cartas de No Adeudo',
  'cajachica': 'Caja Chica', 'kasnet': 'KASNET'
};
const _allSections = ['dashboard','clientes','cartas','cajachica','kasnet'];

function navTo(section, btn) {
  _allSections.forEach(function(s) {
    var el = document.getElementById('section-' + s);
    if (el) el.classList.remove('active');
  });
  var target = document.getElementById('section-' + section);
  if (target) target.classList.add('active');
  
  var topbar = document.getElementById('topbar-title');
  if(topbar) topbar.textContent = _sectionTitles[section] || section;
  
  document.querySelectorAll('.nav-item').forEach(function(n) { n.classList.remove('active'); });
  document.querySelectorAll('.nav-subitem').forEach(function(n) { n.classList.remove('active'); });
  if (btn) {
    btn.classList.add('active');
    if (btn.classList.contains('nav-subitem')) {
      var parent = document.getElementById('nav-cajachica-parent');
      if (parent) parent.classList.add('active');
    }
  }
  if (section === 'cajachica') {
    var parentBtn = document.getElementById('nav-cajachica-parent');
    if (parentBtn) parentBtn.classList.add('active');
  }
  if (window.innerWidth <= 900) toggleSidebar(false);

  // Load data
  if (section === 'dashboard' && typeof renderDashboard === 'function') renderDashboard();
  else if (section === 'cajachica' && typeof cajaCargarDatos === 'function') { cajaCargarDatos(); cajaRenderTabla(cajaMovimientos, false); }
  else if (section === 'kasnet' && typeof kasnetCargarDatos === 'function') kasnetCargarDatos();
  else if (section === 'cartas' && typeof cartasCargarPendientes === 'function') cartasCargarPendientes();
}

function navToMov(vista, btn) {
  navTo('cajachica', btn);
  if(typeof cajaSwitchTab === 'function') cajaSwitchTab(vista === 'archivo' ? 'mesanterior' : 'mesactual');
}

function toggleSidebar(forceState) {
  var sidebar = document.getElementById('sidebar');
  var overlay = document.getElementById('sidebar-overlay');
  if(!sidebar || !overlay) return;
  var isOpen = sidebar.classList.contains('open');
  var shouldOpen = forceState !== undefined ? forceState : !isOpen;
  if (shouldOpen) { sidebar.classList.add('open'); overlay.classList.add('show'); }
  else { sidebar.classList.remove('open'); overlay.classList.remove('show'); }
}

function toggleSidebarCollapse(forceState) {
  var sidebar = document.getElementById('sidebar');
  if(!sidebar) return;
  var isCollapsed = forceState !== undefined ? forceState : !sidebar.classList.contains('collapsed');
  sidebar.classList.toggle('collapsed', isCollapsed);
  try { localStorage.setItem('ge_sidebar_collapsed', isCollapsed ? '1' : '0'); } catch(e) {}
}

(function() {
  try {
    if (window.innerWidth > 900 && localStorage.getItem('ge_sidebar_collapsed') === '0') {
      const sb = document.getElementById('sidebar');
      if(sb) sb.classList.remove('collapsed');
    }
  } catch(e) {}
})();

function toggleSubnav(id, btn) {
  var subnav = document.getElementById(id);
  if (!subnav) return;
  subnav.classList.toggle('open');
  if (btn) btn.classList.toggle('subnav-open');
}
