/** DD Camp: write-only receiver. Sheets access uses a dedicated service account. */
var DD_CONFIG = {
  spreadsheetId: '1dirgDNo7GnAIaqcGAL_jJjYBh8UYKTFunTBJsrL3Jf0',
  sheetId: 0,
  sheetName: 'Заявки',
  serviceAccountEmail: 'dd-camp-sheet-writer@dd-camp-applications.iam.gserviceaccount.com',
  origins: [
    'https://camp.dustydumbbells.com',
    'https://anton-gorokhovatsky.github.io',
    'http://127.0.0.1:4187', 'http://localhost:4187',
    'http://127.0.0.1:4173', 'http://localhost:4173'
  ],
  headers: ['ФИО', 'Статус', 'Получена', 'Телефон', 'Telegram', 'Email', 'Едет',
    'Пожелания', 'Дата рождения', 'Instagram', 'ФИО партнёра', 'Телефон партнёра',
    'Telegram партнёра', 'Email партнёра', 'Дата рождения партнёра',
    'Instagram партнёра', 'ID заявки', 'Источник']
};

function ddReadHeaders_() {
  var headers = (ddSheets_('get', ddRange_('A1:R1')).values || [])[0];
  if (JSON.stringify(headers) !== JSON.stringify(DD_CONFIG.headers)) throw new Error('SETUP');
}

/** Safe to run in the editor: checks access and headers, creates no application. */
function checkConnection() {
  ddReadHeaders_();
  return 'DD Camp: доступ к таблице и столбцы проверены. Заявки не создавались.';
}

function doGet() {
  var ok = false;
  try { ddReadHeaders_(); ok = true; } catch (error) { /* Never return private exceptions. */ }
  return ContentService.createTextOutput(JSON.stringify({service: 'dd-camp-applications', version: 2, ok: ok}))
    .setMimeType(ContentService.MimeType.JSON);
}

function ddText_(value, max) {
  if (typeof value !== 'string' || value.length > max) throw new Error('INVALID');
  return value.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '').trim();
}

function ddDate_(value) {
  var match = /^(\d{2})[.\/-](\d{2})[.\/-](\d{4})$/.exec(value);
  if (!match) throw new Error('INVALID');
  var day = Number(match[1]), month = Number(match[2]), year = Number(match[3]);
  var date = new Date(Date.UTC(year, month - 1, day));
  if (year < 1900 || date > new Date() || date.getUTCFullYear() !== year ||
      date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) throw new Error('INVALID');
  return match[1] + '.' + match[2] + '.' + match[3];
}

function ddValidate_(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('INVALID');
  if (!/^[a-f0-9-]{36}$/.test(raw.id || '') || !/^[a-f0-9]{64}$/.test(raw.nonce || '')) throw new Error('INVALID');
  if (DD_CONFIG.origins.indexOf(raw.origin) < 0) throw new Error('ORIGIN');
  if (raw.website || raw.consent !== true) throw new Error('INVALID');
  var data = raw.fields;
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('INVALID');
  var travel = ddText_(data['Летите вы один или с партнёром?'] || '', 30);
  if (travel !== 'Один' && travel !== 'С партнёром') throw new Error('INVALID');
  var values = {}, fields = ['Name', 'Date', 'Email', 'Phone', 'telegram', 'Instagram', 'Textarea',
    'Name_2', 'Date_2', 'Email_2', 'Phone_2', 'telegram-p', 'Instagram-p'];
  fields.forEach(function (name) {
    var partner = /_2$|-p$/.test(name);
    values[name] = partner && travel === 'Один' ? '' : ddText_(data[name] || '', name === 'Textarea' ? 4000 : 254);
  });
  ['', '_2'].forEach(function (suffix) {
    if (suffix && travel === 'Один') return;
    if (values['Name' + suffix].length < 2 || values['Name' + suffix].length > 160) throw new Error('INVALID');
    values['Date' + suffix] = ddDate_(values['Date' + suffix]);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values['Email' + suffix])) throw new Error('INVALID');
    var phone = values['Phone' + suffix], digits = phone.replace(/\D/g, '');
    if (!/^[+\d\s().-]+$/.test(phone) || digits.length < 7 || digits.length > 15) throw new Error('INVALID');
    values['Phone' + suffix] = (phone.charAt(0) === '+' ? '+' : '') + digits;
  });
  var source = ddText_(raw.source || '', 500);
  if (source.indexOf(raw.origin + '/') !== 0 || /[?#]/.test(source)) throw new Error('ORIGIN');
  return {id: raw.id, values: values, travel: travel, source: source};
}

function ddSave_(application) {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(15000)) throw new Error('BUSY');
  try {
    ddReadHeaders_();
    // The technical ID stays in its own column, including after a lost reply.
    var ids = ddSheets_('get', ddRange_('Q2:Q')).values || [];
    if (ids.some(function (row) { return row[0] === application.id; })) return;
    var v = application.values;
    var localTime = Utilities.formatDate(new Date(), 'Europe/Moscow', "yyyy-MM-dd'T'HH:mm:ss");
    var sheetDate = Date.parse(localTime + 'Z') / 86400000 + 25569;
    var row = [v.Name, 'Новая', sheetDate, v.Phone, v.telegram, v.Email,
      application.travel, v.Textarea, v.Date, v.Instagram,
      v.Name_2, v.Phone_2, v['telegram-p'], v.Email_2, v.Date_2, v['Instagram-p'],
      application.id, application.source];
    // RAW preserves all user text literally, including leading =, +, -, and @.
    // Append into the next prepared row, preserving its date format and status validation.
    var response = ddSheets_('post', ddRange_('A:R') + ':append?valueInputOption=RAW&insertDataOption=OVERWRITE',
      {majorDimension: 'ROWS', values: [row]});
    if (!response.updates || response.updates.updatedRows !== 1 || response.updates.updatedCells !== row.length) throw new Error('SAVE');
  } finally {
    lock.releaseLock();
  }
}

function ddReply_(packet, origin) {
  var json = JSON.stringify(packet).replace(/</g, '\\u003c').replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
  var target = JSON.stringify(origin);
  // HtmlService adds its own iframe. Notify ancestors using an exact target origin.
  var html = '<!doctype html><meta charset="utf-8"><title>DD Camp</title><script>' +
    'var reply=' + json + ';var target=' + target + ';var frame=window.parent;' +
    'for(var i=0;i<6;i++){frame.postMessage(reply,target);if(frame===window.top)break;frame=frame.parent;}' +
    '</script>';
  return HtmlService.createHtmlOutput(html).setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function doPost(event) {
  var raw, packet = {type: 'dd-camp-result', ok: false}, origin = '';
  try {
    if (!event || !event.parameter || typeof event.parameter.payload !== 'string' ||
        event.parameter.payload.length > 16000) throw new Error('INVALID');
    raw = JSON.parse(event.parameter.payload);
    if (DD_CONFIG.origins.indexOf(raw.origin) < 0) throw new Error('ORIGIN');
    origin = raw.origin;
    packet.id = raw.id;
    packet.nonce = raw.nonce;
    var application = ddValidate_(raw);
    ddSave_(application);
    packet.ok = true;
  } catch (error) {
    packet.code = ['INVALID', 'BUSY'].indexOf(error.message) >= 0 ? error.message : 'SAVE';
  }
  // No endpoint ever exposes applications, contact details, or spreadsheet data.
  if (!origin) return ContentService.createTextOutput('Invalid request');
  return ddReply_(packet, origin);
}
