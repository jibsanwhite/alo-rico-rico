// ============================================================
// Seguridad.gs — Administración de usuarios, claves y roles
// Archivo SEPARADO del código principal. Aquí vive toda la
// seguridad: nadie necesita tocar Codigo.gs para gestionar usuarios.
//
// ROLES PREDEFINIDOS:
//   admin      → todo: precios, usuarios, configuración
//   supervisor → ver panel/catálogo/stock/ventas + editar precios
//   cliente    → ver catálogo solamente
//
// Los usuarios se guardan en las Propiedades del script (solo los
// editores del proyecto pueden verlas) y las claves SOLO como huella
// SHA-256: nadie — ni siquiera el admin — puede ver la clave de otro.
// La primera cuenta de admin se crea DESDE LA PÁGINA WEB, no del código.
// ============================================================

var ROLES = {
  admin:      { nombre: 'Administrador', permisos: ['ver_panel','ver_catalogo','ver_stock','ver_ventas','editar_precios','gestionar_usuarios'] },
  supervisor: { nombre: 'Supervisor',    permisos: ['ver_panel','ver_catalogo','ver_stock','ver_ventas','editar_precios'] },
  cliente:    { nombre: 'Cliente',       permisos: ['ver_catalogo'] }
};

var MAX_INTENTOS = 5;
var BLOQUEO_MINUTOS = 30;
var VENTANA_MINUTOS = 10;
var SESION_HORAS = 12;
var CLAVE_MIN = 8;

// ---------- Utilidades ----------
function segProps() { return PropertiesService.getScriptProperties(); }

function hashClave(clave) {
  var bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, clave);
  var hex = '';
  for (var i = 0; i < bytes.length; i++) {
    var v = bytes[i] < 0 ? bytes[i] + 256 : bytes[i];
    var h = v.toString(16);
    hex += h.length === 1 ? '0' + h : h;
  }
  return hex;
}

function igualesSeguro(a, b) {
  if (!a || !b || a.length !== b.length) return false;
  var diff = 0;
  for (var i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function nuevoToken() {
  return hashClave(Utilities.getUuid() + Date.now() + Math.random());
}

// ---------- Usuarios ----------
function cargarUsuarios() {
  try {
    var raw = segProps().getProperty('usuarios');
    var lista = raw ? JSON.parse(raw) : [];
    return Array.isArray(lista) ? lista : [];
  } catch (e) { return []; }
}

function guardarUsuarios(lista) {
  segProps().setProperty('usuarios', JSON.stringify(lista));
}

function buscarUsuario(nombre) {
  var lista = cargarUsuarios();
  for (var i = 0; i < lista.length; i++) {
    if (lista[i].usuario === nombre) return { idx: i, user: lista[i], lista: lista };
  }
  return null;
}

function hayAlgunUsuario() { return cargarUsuarios().length > 0; }

function rolValido(rol) { return !!ROLES[rol]; }

function tienePermiso(rol, permiso) {
  return ROLES[rol] && ROLES[rol].permisos.indexOf(permiso) >= 0;
}

// Crear usuario (lo usa el setup inicial y el admin desde la web)
function segCrearUsuario(usuario, clave, rol) {
  usuario = String(usuario || '').trim();
  if (!usuario || usuario.length < 3) return { ok: false, error: 'Usuario mínimo 3 caracteres' };
  if (!clave || clave.length < CLAVE_MIN) return { ok: false, error: 'Clave mínima ' + CLAVE_MIN + ' caracteres' };
  if (!rolValido(rol)) return { ok: false, error: 'Rol inválido' };
  if (buscarUsuario(usuario)) return { ok: false, error: 'Ese usuario ya existe' };
  var lista = cargarUsuarios();
  lista.push({ usuario: usuario, hash: hashClave(clave), rol: rol, activo: true, creado: new Date().toISOString() });
  guardarUsuarios(lista);
  return { ok: true };
}

// ---------- Sesiones ----------
function cargarSesiones() {
  try {
    var raw = segProps().getProperty('sesiones');
    var s = raw ? JSON.parse(raw) : {};
    var ahora = Date.now(), limpio = {};
    for (var t in s) { if (s[t].expira > ahora) limpio[t] = s[t]; }
    return limpio;
  } catch (e) { return {}; }
}

function guardarSesiones(s) { segProps().setProperty('sesiones', JSON.stringify(s)); }

function segCrearSesion(usuario, rol) {
  var sesiones = cargarSesiones();
  var token = nuevoToken();
  sesiones[token] = { usuario: usuario, rol: rol, expira: Date.now() + SESION_HORAS * 3600000 };
  guardarSesiones(sesiones);
  return token;
}

function segVerificarSesion(token) {
  if (!token) return null;
  var sesiones = cargarSesiones();
  var s = sesiones[token];
  if (!s) return null;
  if (s.expira <= Date.now()) {
    delete sesiones[token];
    guardarSesiones(sesiones);
    return null;
  }
  // El usuario debe seguir existiendo y activo
  var b = buscarUsuario(s.usuario);
  if (!b || !b.user.activo) return null;
  return { usuario: s.usuario, rol: b.user.rol };
}

function segCerrarSesion(token) {
  var sesiones = cargarSesiones();
  if (sesiones[token]) { delete sesiones[token]; guardarSesiones(sesiones); }
}

// ---------- Intentos fallidos / bloqueo ----------
function segLeerBloqueo() {
  try {
    var raw = segProps().getProperty('seg_admin');
    return raw ? JSON.parse(raw) : { fallos: 0, primerFallo: 0, bloqueadoHasta: 0 };
  } catch (e) { return { fallos: 0, primerFallo: 0, bloqueadoHasta: 0 }; }
}
function segGuardarBloqueo(st) { segProps().setProperty('seg_admin', JSON.stringify(st)); }

function segRegistrar(ok, detalle) {
  try {
    var log = JSON.parse(segProps().getProperty('seg_log') || '[]');
    log.push({ fecha: new Date().toISOString(), ok: ok, detalle: detalle });
    if (log.length > 50) log = log.slice(log.length - 50);
    segProps().setProperty('seg_log', JSON.stringify(log));
  } catch (e) {}
}

// ---------- Acciones de autenticación (las llama Codigo.gs) ----------
function segSetupEstado() {
  return { ok: true, necesitaSetup: !hayAlgunUsuario() };
}

// Solo funciona si TODAVÍA no existe ningún usuario
function segSetupAdmin(usuario, clave) {
  if (hayAlgunUsuario()) return { ok: false, error: 'El sistema ya tiene administrador' };
  var r = segCrearUsuario(usuario, clave, 'admin');
  if (!r.ok) return r;
  var token = segCrearSesion(usuario, 'admin');
  segRegistrar(true, 'Setup inicial: admin creado (' + usuario + ')');
  return { ok: true, token: token, usuario: usuario, rol: 'admin' };
}

function segLogin(usuario, clave) {
  var ahora = Date.now();
  var st = segLeerBloqueo();
  if (st.bloqueadoHasta && ahora < st.bloqueadoHasta) {
    var mins = Math.ceil((st.bloqueadoHasta - ahora) / 60000);
    return { ok: false, error: 'Bloqueado temporalmente. Intenta en ' + mins + ' min.' };
  }
  if (st.primerFallo && ahora - st.primerFallo > VENTANA_MINUTOS * 60000) {
    st = { fallos: 0, primerFallo: 0, bloqueadoHasta: 0 };
  }
  var b = buscarUsuario(String(usuario || '').trim());
  var ok = b && b.user.activo && igualesSeguro(hashClave(String(clave || '')), b.user.hash);
  if (!ok) {
    st.fallos++;
    if (!st.primerFallo) st.primerFallo = ahora;
    if (st.fallos >= MAX_INTENTOS) {
      st.bloqueadoHasta = ahora + BLOQUEO_MINUTOS * 60000;
      st.fallos = 0; st.primerFallo = 0;
      segRegistrar(false, 'BLOQUEO activado tras ' + MAX_INTENTOS + ' fallos');
    } else {
      segRegistrar(false, 'Acceso fallido (' + st.fallos + '/' + MAX_INTENTOS + ')');
    }
    segGuardarBloqueo(st);
    return { ok: false, error: 'Usuario o clave incorrectos' };
  }
  segGuardarBloqueo({ fallos: 0, primerFallo: 0, bloqueadoHasta: 0 });
  var token = segCrearSesion(b.user.usuario, b.user.rol);
  segRegistrar(true, 'Login: ' + b.user.usuario + ' (' + b.user.rol + ')');
  return { ok: true, token: token, usuario: b.user.usuario, rol: b.user.rol };
}

// Exige sesión válida + permiso; devuelve la sesión o un error
function segExigir(token, permiso) {
  var ses = segVerificarSesion(token);
  if (!ses) return { ok: false, error: 'Sesión inválida o vencida. Entra de nuevo.' };
  if (permiso && !tienePermiso(ses.rol, permiso)) return { ok: false, error: 'Tu rol (' + ses.rol + ') no permite esta acción' };
  return { ok: true, ses: ses };
}
