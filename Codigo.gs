// ============================================================
// Codigo.gs — Código PRINCIPAL del sistema Alo Rico Rico
// Fecha: 24/10/2026
// Este archivo NO contiene claves ni usuarios. Toda la seguridad
// vive en Seguridad.gs (segundo archivo del proyecto).
// Para gestionar usuarios, el ADMIN lo hace desde la página web.
// ============================================================

var HTML_FILE_ID = '1rN8haM8O34Fy2TkO9RUNY0-zs-m0oTNt';
var OVERRIDES_FILE_ID = '1rdo8MpOgBYVYHFx71Tv-ePxZzetVASLc';

function doGet(e) {
  var html = DriveApp.getFileById(HTML_FILE_ID).getBlob().getDataAsString();
  var scriptUrl = ScriptApp.getService().getUrl();
  html = html.replace('__SCRIPT_URL__', scriptUrl);
  return HtmlService.createHtmlOutput(html)
    .setTitle('Alo Rico Rico')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function responder(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

// Validar que precios sea un objeto con costo/precio numéricos válidos
function validarPrecios(precios) {
  if (!precios || typeof precios !== 'object') return 'Datos inválidos';
  var keys = Object.keys(precios);
  if (keys.length === 0 || keys.length > 200) return 'Cantidad de productos inválida';
  for (var i = 0; i < keys.length; i++) {
    var p = precios[keys[i]];
    if (!p || typeof p !== 'object') return 'Formato inválido: ' + keys[i];
    var c = Number(p.costo), v = Number(p.precio);
    if (isNaN(c) || isNaN(v) || c < 0 || v < 0 || c > 1000000 || v > 1000000) {
      return 'Precio inválido: ' + keys[i];
    }
    precios[keys[i]] = { costo: c, precio: v };
  }
  return null;
}

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var action = data.action;

    // ---- Sin autenticación: setup y login ----
    if (action === 'setup_estado') return responder(segSetupEstado());
    if (action === 'setup_admin') return responder(segSetupAdmin(data.usuario, data.password));
    if (action === 'login') return responder(segLogin(data.usuario, data.password));
    if (action === 'logout') { segCerrarSesion(data.token); return responder({ ok: true }); }
    if (action === 'sesion') {
      var s = segVerificarSesion(data.token);
      return s ? responder({ ok: true, usuario: s.usuario, rol: s.rol })
               : responder({ ok: false, error: 'Sesión inválida' });
    }

    // ---- Con sesión: precios ----
    if (action === 'get_precios') {
      var v1 = segExigir(data.token, 'editar_precios');
      if (!v1.ok) return responder(v1);
      var overrides = JSON.parse(DriveApp.getFileById(OVERRIDES_FILE_ID).getBlob().getDataAsString() || '{}');
      return responder({ ok: true, overrides: overrides });
    }
    if (action === 'save_precios') {
      var v2 = segExigir(data.token, 'editar_precios');
      if (!v2.ok) return responder(v2);
      var errPrecios = validarPrecios(data.precios);
      if (errPrecios) return responder({ ok: false, error: errPrecios });
      // Comparar con lo guardado antes para registrar qué cambió
      var anteriores = {}, lecturaOk = true;
      try { anteriores = JSON.parse(DriveApp.getFileById(OVERRIDES_FILE_ID).getBlob().getDataAsString() || '{}'); } catch (eAnt) { anteriores = {}; lecturaOk = false; }
      var cambios = [];
      var keysN = Object.keys(data.precios);
      for (var i = 0; i < keysN.length; i++) {
        var nom = keysN[i];
        var ant = anteriores[nom];
        var nue = data.precios[nom];
        if (!ant) { cambios.push(nom + ' (nuevo)'); continue; }
        var partes = [];
        if (Number(ant.costo) !== nue.costo) partes.push('costo ' + ant.costo + '→' + nue.costo);
        if (Number(ant.precio) !== nue.precio) partes.push('precio ' + ant.precio + '→' + nue.precio);
        if (partes.length) cambios.push(nom + ': ' + partes.join(', '));
      }
      try {
        DriveApp.getFileById(OVERRIDES_FILE_ID).setContent(JSON.stringify(data.precios));
      } catch (errDrive) {
        segRegistrar(false, 'ERROR save_precios escribiendo Drive: ' + (errDrive && errDrive.message ? errDrive.message : errDrive));
        return responder({ ok: false, error: 'No se pudo escribir en Drive. Revisa el registro.' });
      }
      var resumen;
      if (!lecturaOk) resumen = 'guardó precios (' + keysN.length + ' productos)';
      else if (Object.keys(anteriores).length === 0) resumen = 'guardó precios (' + keysN.length + ' productos, primera carga)';
      else if (cambios.length === 0) resumen = 'guardó precios (sin cambios)';
      else {
        var lista = cambios.slice(0, 15).join('; ');
        if (cambios.length > 15) lista += '; y ' + (cambios.length - 15) + ' más';
        resumen = 'actualizó precios: ' + lista;
      }
      segRegistrar(true, 'Admin ' + v2.ses.usuario + ' ' + resumen);
      return responder({ ok: true, mensaje: 'Precios actualizados' });
    }

    // ---- Con sesión: gestión de usuarios (solo admin) ----
    if (action === 'listar_usuarios') {
      var v3 = segExigir(data.token, 'gestionar_usuarios');
      if (!v3.ok) return responder(v3);
      var lista = cargarUsuarios().map(function(u) {
        return { usuario: u.usuario, rol: u.rol, activo: u.activo, creado: u.creado };
      });
      return responder({ ok: true, usuarios: lista });
    }
    if (action === 'ver_log') {
      var vLog = segExigir(data.token, 'gestionar_usuarios');
      if (!vLog.ok) return responder(vLog);
      var log = [];
      try { log = JSON.parse(PropertiesService.getScriptProperties().getProperty('seg_log') || '[]'); } catch (e) { log = []; }
      return responder({ ok: true, log: log.slice(-20) });
    }
    if (action === 'crear_usuario') {
      var v4 = segExigir(data.token, 'gestionar_usuarios');
      if (!v4.ok) return responder(v4);
      var r = segCrearUsuario(data.nuevoUsuario, data.nuevaClave, data.rol);
      if (r.ok) segRegistrar(true, 'Admin ' + v4.ses.usuario + ' creó usuario ' + data.nuevoUsuario + ' (' + data.rol + ')');
      return responder(r);
    }
    if (action === 'cambiar_clave_usuario') {
      var v5 = segExigir(data.token, 'gestionar_usuarios');
      if (!v5.ok) return responder(v5);
      var b = buscarUsuario(String(data.usuarioObjetivo || '').trim());
      if (!b) return responder({ ok: false, error: 'Usuario no encontrado' });
      if (!data.nuevaClave || data.nuevaClave.length < CLAVE_MIN) return responder({ ok: false, error: 'Clave mínima ' + CLAVE_MIN + ' caracteres' });
      b.user.hash = hashClave(data.nuevaClave);
      b.lista[b.idx] = b.user;
      guardarUsuarios(b.lista);
      segRegistrar(true, 'Admin ' + v5.ses.usuario + ' cambió clave de ' + b.user.usuario);
      return responder({ ok: true });
    }
    if (action === 'eliminar_usuario') {
      var v6 = segExigir(data.token, 'gestionar_usuarios');
      if (!v6.ok) return responder(v6);
      var b2 = buscarUsuario(String(data.usuarioObjetivo || '').trim());
      if (!b2) return responder({ ok: false, error: 'Usuario no encontrado' });
      if (b2.user.usuario === v6.ses.usuario) return responder({ ok: false, error: 'No puedes eliminarte a ti mismo' });
      var admins = cargarUsuarios().filter(function(u) { return u.rol === 'admin' && u.activo; });
      if (b2.user.rol === 'admin' && admins.length <= 1) return responder({ ok: false, error: 'No puedes eliminar al único administrador' });
      b2.lista.splice(b2.idx, 1);
      guardarUsuarios(b2.lista);
      segRegistrar(true, 'Admin ' + v6.ses.usuario + ' eliminó usuario ' + b2.user.usuario);
      return responder({ ok: true });
    }
    if (action === 'cambiar_mi_clave') {
      var v7 = segExigir(data.token, null);
      if (!v7.ok) return responder(v7);
      var b3 = buscarUsuario(v7.ses.usuario);
      if (!b3 || !igualesSeguro(hashClave(String(data.claveActual || '')), b3.user.hash)) {
        return responder({ ok: false, error: 'Clave actual incorrecta' });
      }
      if (!data.claveNueva || data.claveNueva.length < CLAVE_MIN) return responder({ ok: false, error: 'Clave nueva mínima ' + CLAVE_MIN + ' caracteres' });
      b3.user.hash = hashClave(data.claveNueva);
      b3.lista[b3.idx] = b3.user;
      guardarUsuarios(b3.lista);
      return responder({ ok: true });
    }

    return responder({ ok: false, error: 'Acción no reconocida' });
  } catch (err) {
    try {
      var acc = 'desconocida';
      try { if (typeof data !== 'undefined' && data && data.action) acc = data.action; } catch (e2) {}
      segRegistrar(false, 'ERROR ' + acc + ': ' + (err && err.message ? err.message : err));
    } catch (e3) {}
    return responder({ ok: false, error: 'Error del servidor (quedó registrado, ver registro)' });
  }
}
