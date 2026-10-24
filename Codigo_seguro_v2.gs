// Alo Rico Rico - Sistema de Gestión (VERSIÓN SEGURA v2)
// Fecha: 24/10/2026
// MEJORA CLAVE: la clave NO está en el código. Se guarda cifrada (SHA-256)
// en las Propiedades del script de Google, visibles solo para los editores
// del proyecto. El código solo compara huellas, nunca ve la clave real.
//
// ============================================================
// CONFIGURACIÓN INICIAL - HACER UNA SOLA VEZ:
// 1. Escribe tu usuario y clave en las 2 líneas de configurarAdmin()
// 2. En el editor, selecciona "configurarAdmin" y pulsa Ejecutar ▶
// 3. Cuando veas "Credenciales guardadas", BORRA tu clave de abajo
//    (deja las comillas vacías) y guarda. Así la clave NO queda en el código.
// 4. Si olvidas la clave, repite estos pasos con una nueva.
// ============================================================
function configurarAdmin() {
  var MI_USUARIO = '';  // <-- ESCRIBE TU USUARIO AQUÍ
  var MI_CLAVE = '';    // <-- ESCRIBE TU CLAVE AQUÍ (mín. 12 caracteres)

  if (!MI_USUARIO || !MI_CLAVE || MI_CLAVE.length < 12) {
    throw new Error('Escribe un usuario y una clave de al menos 12 caracteres.');
  }
  var props = PropertiesService.getScriptProperties();
  props.setProperty('admin_user', MI_USUARIO);
  props.setProperty('admin_pass_hash', hashClave(MI_CLAVE));
  props.setProperty('seg_admin', JSON.stringify({ fallos: 0, primerFallo: 0, bloqueadoHasta: 0 }));
  Logger.log('✅ Credenciales guardadas. Ahora BORRA tu clave del código y guarda.');
}

// IDs de Drive (no son secretos, solo ubican tus archivos)
var HTML_FILE_ID = '1rN8haM8O34Fy2TkO9RUNY0-zs-m0oTNt';
var OVERRIDES_FILE_ID = '1rdo8MpOgBYVYHFx71Tv-ePxZzetVASLc';

// LÍMITES DE SEGURIDAD
var MAX_INTENTOS = 5;            // Intentos fallidos antes de bloquear
var BLOQUEO_MINUTOS = 30;        // Minutos de bloqueo tras agotar intentos
var VENTANA_MINUTOS = 10;        // Ventana en que se cuentan los intentos

function doGet(e) {
  var html = DriveApp.getFileById(HTML_FILE_ID).getBlob().getDataAsString();
  var scriptUrl = ScriptApp.getService().getUrl();
  html = html.replace('__SCRIPT_URL__', scriptUrl);
  return HtmlService.createHtmlOutput(html)
    .setTitle('Alo Rico Rico')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// Huella SHA-256 de un texto (una sola vía: no se puede revertir a la clave)
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

// Comparación sin atajo (evita ataques de tiempo)
function igualesSeguro(a, b) {
  if (!a || !b || a.length !== b.length) return false;
  var diff = 0;
  for (var i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

function leerEstado() {
  try {
    var raw = PropertiesService.getScriptProperties().getProperty('seg_admin');
    return raw ? JSON.parse(raw) : { fallos: 0, primerFallo: 0, bloqueadoHasta: 0 };
  } catch (e) { return { fallos: 0, primerFallo: 0, bloqueadoHasta: 0 }; }
}
function guardarEstado(st) {
  PropertiesService.getScriptProperties().setProperty('seg_admin', JSON.stringify(st));
}

function registrarIntento(ok, detalle) {
  try {
    var props = PropertiesService.getScriptProperties();
    var log = JSON.parse(props.getProperty('seg_log') || '[]');
    log.push({ fecha: new Date().toISOString(), ok: ok, detalle: detalle });
    if (log.length > 50) log = log.slice(log.length - 50);
    props.setProperty('seg_log', JSON.stringify(log));
  } catch (e) { /* el log nunca debe romper la respuesta */ }
}

function responder(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var props = PropertiesService.getScriptProperties();
    var ahora = Date.now();
    var st = leerEstado();

    // 0. ¿ADMIN CONFIGURADO? Si no, nadie entra (fallo seguro por defecto)
    var userGuardado = props.getProperty('admin_user');
    var hashGuardado = props.getProperty('admin_pass_hash');
    if (!userGuardado || !hashGuardado) {
      return responder({ ok: false, error: 'Admin no configurado. Ejecuta configurarAdmin en el editor.' });
    }

    // 1. BLOQUEO POR INTENTOS FALLIDOS
    if (st.bloqueadoHasta && ahora < st.bloqueadoHasta) {
      var mins = Math.ceil((st.bloqueadoHasta - ahora) / 60000);
      return responder({ ok: false, error: 'Bloqueado temporalmente. Intenta en ' + mins + ' min.' });
    }
    if (st.primerFallo && ahora - st.primerFallo > VENTANA_MINUTOS * 60000) {
      st = { fallos: 0, primerFallo: 0, bloqueadoHasta: 0 };
    }

    // 2. VERIFICAR USUARIO + CLAVE (comparando huellas, nunca la clave real)
    var usuarioOk = igualesSeguro(String(data.usuario || ''), userGuardado);
    var claveOk = igualesSeguro(hashClave(String(data.password || '')), hashGuardado);
    if (!usuarioOk || !claveOk) {
      st.fallos++;
      if (!st.primerFallo) st.primerFallo = ahora;
      if (st.fallos >= MAX_INTENTOS) {
        st.bloqueadoHasta = ahora + BLOQUEO_MINUTOS * 60000;
        st.fallos = 0; st.primerFallo = 0;
        registrarIntento(false, 'BLOQUEO activado tras ' + MAX_INTENTOS + ' fallos');
      } else {
        registrarIntento(false, 'Acceso fallido (' + st.fallos + '/' + MAX_INTENTOS + ')');
      }
      guardarEstado(st);
      return responder({ ok: false, error: 'Usuario o clave incorrectos' });
    }

    // Acceso correcto: reiniciar contador
    guardarEstado({ fallos: 0, primerFallo: 0, bloqueadoHasta: 0 });
    registrarIntento(true, 'Acceso admin: ' + data.action);

    // 3. ACCIONES
    if (data.action === 'get_precios') {
      var overrides = JSON.parse(DriveApp.getFileById(OVERRIDES_FILE_ID).getBlob().getDataAsString() || '{}');
      return responder({ ok: true, overrides: overrides });
    }

    if (data.action === 'save_precios') {
      // 4. VALIDAR DATOS: solo costo/precio numéricos >= 0
      var precios = data.precios;
      if (!precios || typeof precios !== 'object') {
        return responder({ ok: false, error: 'Datos inválidos' });
      }
      var keys = Object.keys(precios);
      if (keys.length === 0 || keys.length > 200) {
        return responder({ ok: false, error: 'Cantidad de productos inválida' });
      }
      for (var i = 0; i < keys.length; i++) {
        var p = precios[keys[i]];
        if (!p || typeof p !== 'object') return responder({ ok: false, error: 'Formato inválido: ' + keys[i] });
        var c = Number(p.costo), v = Number(p.precio);
        if (isNaN(c) || isNaN(v) || c < 0 || v < 0 || c > 1000000 || v > 1000000) {
          return responder({ ok: false, error: 'Precio inválido: ' + keys[i] });
        }
        precios[keys[i]] = { costo: c, precio: v }; // normalizar: solo estos 2 campos
      }
      DriveApp.getFileById(OVERRIDES_FILE_ID).setContent(JSON.stringify(precios));
      return responder({ ok: true, mensaje: 'Precios actualizados' });
    }

    return responder({ ok: false, error: 'Acción no reconocida' });
  } catch (err) {
    return responder({ ok: false, error: 'Error del servidor' }); // no exponer detalles internos
  }
}
