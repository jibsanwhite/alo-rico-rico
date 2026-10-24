// Alo Rico Rico - Sistema de Gestión (VERSIÓN SEGURA)
// Fecha: 24/10/2026 - Incluye protección anti fuerza bruta, registro de intentos y validación de datos
//
// CONFIGURACIÓN - CAMBIA ESTOS VALORES ANTES DE DESPLEGAR:
var HTML_FILE_ID = '1rN8haM8O34Fy2TkO9RUNY0-zs-m0oTNt';
var OVERRIDES_FILE_ID = '1rdo8MpOgBYVYHFx71Tv-ePxZzetVASLc';
var ADMIN_PASSWORD = 'alicorico2026'; // <-- CAMBIA ESTA CLAVE por una fuerte (mín. 12 caracteres, letras+números)

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

// Comparación de claves sin atajo (evita ataques de tiempo)
function clavesIguales(a, b) {
  if (!a || !b || a.length !== b.length) return false;
  var diff = 0;
  for (var i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

// Estado de bloqueo guardado en propiedades del script
function leerEstado() {
  try {
    var raw = PropertiesService.getScriptProperties().getProperty('seg_admin');
    return raw ? JSON.parse(raw) : { fallos: 0, primerFallo: 0, bloqueadoHasta: 0 };
  } catch (e) { return { fallos: 0, primerFallo: 0, bloqueadoHasta: 0 }; }
}
function guardarEstado(st) {
  PropertiesService.getScriptProperties().setProperty('seg_admin', JSON.stringify(st));
}

// Registro de intentos (últimos 50, con fecha)
function registrarIntento(ok, detalle) {
  try {
    var props = PropertiesService.getScriptProperties();
    var raw = props.getProperty('seg_log') || '[]';
    var log = JSON.parse(raw);
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
    var ahora = Date.now();
    var st = leerEstado();

    // 1. BLOQUEO POR INTENTOS FALLIDOS
    if (st.bloqueadoHasta && ahora < st.bloqueadoHasta) {
      var mins = Math.ceil((st.bloqueadoHasta - ahora) / 60000);
      return responder({ ok: false, error: 'Bloqueado temporalmente. Intenta en ' + mins + ' min.' });
    }
    // Reiniciar ventana si pasó el tiempo
    if (st.primerFallo && ahora - st.primerFallo > VENTANA_MINUTOS * 60000) {
      st = { fallos: 0, primerFallo: 0, bloqueadoHasta: 0 };
    }

    // 2. VERIFICAR CLAVE
    if (!clavesIguales(String(data.password || ''), ADMIN_PASSWORD)) {
      st.fallos++;
      if (!st.primerFallo) st.primerFallo = ahora;
      if (st.fallos >= MAX_INTENTOS) {
        st.bloqueadoHasta = ahora + BLOQUEO_MINUTOS * 60000;
        st.fallos = 0; st.primerFallo = 0;
        registrarIntento(false, 'BLOQUEO activado tras ' + MAX_INTENTOS + ' fallos');
      } else {
        registrarIntento(false, 'Clave incorrecta (' + st.fallos + '/' + MAX_INTENTOS + ')');
      }
      guardarEstado(st);
      return responder({ ok: false, error: 'Clave incorrecta' });
    }

    // Clave correcta: reiniciar contador
    guardarEstado({ fallos: 0, primerFallo: 0, bloqueadoHasta: 0 });
    registrarIntento(true, 'Acceso admin: ' + data.action);

    // 3. ACCIONES
    if (data.action === 'get_precios') {
      var overrides = JSON.parse(DriveApp.getFileById(OVERRIDES_FILE_ID).getBlob().getDataAsString() || '{}');
      return responder({ ok: true, overrides: overrides });
    }

    if (data.action === 'save_precios') {
      // 4. VALIDAR DATOS: solo objetos con costo/precio numéricos >= 0
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
