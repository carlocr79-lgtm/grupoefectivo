function doGet(e) {
  if (e.parameter.token) {
    return buscarPorToken(e.parameter.token);
  }

  // Bloquear GET sin parámetro válido
  var busqueda = e.parameter.q ? 
    e.parameter.q.toString().replace(/\s/g,'').toUpperCase() : "";
  
  if (!busqueda || busqueda.length < 3) {
    return ContentService
      .createTextOutput(JSON.stringify([]))
      .setMimeType(ContentService.MimeType.JSON);
  }

  var sheet = SpreadsheetApp.getActiveSpreadsheet()
    .getSheetByName("BASE DE DATOS");
  var data = sheet.getDataRange().getValues();
  var resultado = [];

  for (var i = 1; i < data.length; i++) {
    var nombre = data[i][4] ? data[i][4].toString().toUpperCase() : "";
    var celu = data[i][5] ? data[i][5].toString().replace(/\s/g,'') : "";
    if (nombre.includes(busqueda) || celu.includes(busqueda)) {
      resultado.push({
        fila: i + 1,
        nombres: data[i][4],
        celular: data[i][5],
        cod: data[i][6],
        tipo: data[i][7],
        asesor: data[i][3],
        vencimiento: data[i][14],
        cuota: data[i][16],
        deuda: data[i][18],
        cuotasVencidas: data[i][19],
        diasAtraso: data[i][20],
        direccion: data[i][22]
      });
    }
  }

  return ContentService
    .createTextOutput(JSON.stringify(resultado))
    .setMimeType(ContentService.MimeType.JSON);
}

function buscarPorToken(token) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet()
    .getSheetByName("BASE DE DATOS");
  var data = sheet.getDataRange().getValues();

  for (var i = 1; i < data.length; i++) {
    var tokenFila = data[i][30] ? data[i][30].toString().trim() : "";
    
    if (tokenFila === token.trim()) {

      // Verificar expiración
      var expiraFila = data[i][31] ? new Date(data[i][31]) : null;
      if (expiraFila && new Date() > expiraFila) {
        return ContentService
          .createTextOutput(JSON.stringify({expirado: true}))
          .setMimeType(ContentService.MimeType.JSON);
      }

      // Saltar filas REVISAR o vacías
      var nombreFila = data[i][4] ? data[i][4].toString().trim() : "";
      if (!nombreFila || nombreFila === "REVISAR") {
        return ContentService
          .createTextOutput(JSON.stringify({alDia: true}))
          .setMimeType(ContentService.MimeType.JSON);
      }

      return ContentService
        .createTextOutput(JSON.stringify({
          encontrado: true,
          // ya no devolvemos fila — el doPost busca por token
          nombres: data[i][4],
          celular: data[i][5],
          cod: data[i][6],
          tipo: data[i][7],
          asesor: data[i][3],
          vencimiento: data[i][14],
          cuota: data[i][16],
          deuda: data[i][18],
          cuotasVencidas: data[i][19],
          diasAtraso: data[i][20],
          direccion: data[i][22]
        }))
        .setMimeType(ContentService.MimeType.JSON);
    }
  }

  return ContentService
    .createTextOutput(JSON.stringify({alDia: true}))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    var params = JSON.parse(e.postData.contents);
    var token = params.token;       // ← ahora usa token en vez de fila
    var base64Data = params.voucher;
    var nombre = params.nombre || "cliente";
    var monto = params.monto || 0;

    // Buscar la fila correcta por token en tiempo real
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("BASE DE DATOS");
    var data = sheet.getDataRange().getValues();
    var filaReal = -1;

    for (var i = 1; i < data.length; i++) {
      var tokenFila = data[i][30] ? data[i][30].toString().trim() : "";
      if (tokenFila === token.trim()) {
        filaReal = i + 1;
        break;
      }
    }

    if (filaReal === -1) {
      return ContentService
        .createTextOutput(JSON.stringify({success: false, error: "Token no encontrado"}))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // Guardar voucher en Drive
    var folderName = "Vouchers Grupo Efectivo";
    var folders = DriveApp.getFoldersByName(folderName);
    var folder = folders.hasNext() ? folders.next() : DriveApp.createFolder(folderName);

    var base64Clean = base64Data.indexOf(',') > -1 ? base64Data.split(',')[1] : base64Data;
    var bytes = Utilities.base64Decode(base64Clean);
    var blob = Utilities.newBlob(bytes, "image/jpeg", nombre.split(" ")[0] + "_" + new Date().getTime() + ".jpg");
    
    var file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    var link = file.getUrl();

    // Escribir en la fila correcta (encontrada por token)
    sheet.getRange(filaReal, 28).setValue(link);
    sheet.getRange(filaReal, 29).setValue(new Date());
    sheet.getRange(filaReal, 30).setValue("PENDIENTE VERIFICAR");

    MailApp.sendEmail({
      to: "cajalm001@gmail.com",
      subject: "🔔 Nuevo pago - " + nombre,
      body: "Cliente: " + nombre + "\nMonto: S/. " + monto + "\nVoucher: " + link
    });

    return ContentService
      .createTextOutput(JSON.stringify({success: true, link: link}))
      .setMimeType(ContentService.MimeType.JSON);

  } catch(err) {
    return ContentService
      .createTextOutput(JSON.stringify({success: false, error: err.toString()}))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function generarTokens() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet()
    .getSheetByName("BASE DE DATOS");
  var data = sheet.getDataRange().getValues();
  var ahora = new Date();
  var expira = new Date(ahora.getTime() + 48*60*60*1000);
  var count = 0;

  for (var i = 1; i < data.length; i++) {
    var nombreFila = data[i][4] ? data[i][4].toString().trim() : "";

    // Saltar filas vacías y REVISAR
    if (!nombreFila || nombreFila === "REVISAR") continue;

    // Saltar clientes que ya subieron voucher
    var voucherExistente = data[i][27] ? data[i][27].toString().trim() : "";
    if (voucherExistente) continue;

    // No sobreescribir tokens vigentes
    var tokenExistente = data[i][30] ? data[i][30].toString().trim() : "";
    var expiraExistente = data[i][31] ? new Date(data[i][31]) : null;
    if (tokenExistente && expiraExistente && new Date() < expiraExistente) continue;

    var token = Utilities.getUuid().replace(/-/g,'').substring(0, 16);
    sheet.getRange(i+1, 31).setValue(token);
    sheet.getRange(i+1, 32).setValue(expira);
    count++;
  }
  Logger.log("Tokens generados: " + count);
}

function activarTriggerTokens() {
  var triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(function(t) {
    if (t.getHandlerFunction() === 'generarTokens') {
      ScriptApp.deleteTrigger(t);
    }
  });
  ScriptApp.newTrigger('generarTokens')
    .timeBased()
    .everyHours(48)
    .create();
  Logger.log("Trigger activado correctamente");
}

function autorizarDrive() {
  DriveApp.getFoldersByName("test");
  MailApp.sendEmail(Session.getActiveUser().getEmail(), "Test autorización", "OK");
}

function diagnosticarToken() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet()
    .getSheetByName("BASE DE DATOS");
  var data = sheet.getDataRange().getValues();
  var fila2 = data[1];
  for (var j = 27; j < 35; j++) {
    Logger.log("Col " + (j+1) + ": [" + fila2[j] + "]");
  }
  Logger.log("Total columnas: " + fila2.length);
}
