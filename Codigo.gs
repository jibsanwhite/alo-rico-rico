// Alo Rico Rico - Sistema de Gestión
// Configuración
var HTML_FILE_ID = 'TU_HTML_FILE_ID';
var OVERRIDES_FILE_ID = 'TU_OVERRIDES_FILE_ID';
var ADMIN_PASSWORD = 'TU_CLAVE_ADMIN'; // <-- CAMBIA ESTA CLAVE ANTES DE USAR

function doGet(e) {
  var html = DriveApp.getFileById(HTML_FILE_ID).getBlob().getDataAsString();
  // Inyectar la URL del script para que el admin pueda guardar
  var scriptUrl = ScriptApp.getService().getUrl();
  html = html.replace('__SCRIPT_URL__', scriptUrl);
  return HtmlService.createHtmlOutput(html)
    .setTitle('Alo Rico Rico')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    
    // Verificar contraseña
    if (data.password !== ADMIN_PASSWORD) {
      return ContentService.createTextOutput(
        JSON.stringify({ok: false, error: 'Clave incorrecta'})
      ).setMimeType(ContentService.MimeType.JSON);
    }
    
    if (data.action === 'get_precios') {
      // Devolver overrides actuales
      var overrides = JSON.parse(
        DriveApp.getFileById(OVERRIDES_FILE_ID).getBlob().getDataAsString() || '{}'
      );
      return ContentService.createTextOutput(
        JSON.stringify({ok: true, overrides: overrides})
      ).setMimeType(ContentService.MimeType.JSON);
    }
    
    if (data.action === 'save_precios') {
      // Guardar nuevos precios
      var file = DriveApp.getFileById(OVERRIDES_FILE_ID);
      file.setContent(JSON.stringify(data.precios));
      return ContentService.createTextOutput(
        JSON.stringify({ok: true, mensaje: 'Precios actualizados'})
      ).setMimeType(ContentService.MimeType.JSON);
    }
    
    return ContentService.createTextOutput(
      JSON.stringify({ok: false, error: 'Acción no reconocida'})
    ).setMimeType(ContentService.MimeType.JSON);
    
  } catch (err) {
    return ContentService.createTextOutput(
      JSON.stringify({ok: false, error: err.toString()})
    ).setMimeType(ContentService.MimeType.JSON);
  }
}
