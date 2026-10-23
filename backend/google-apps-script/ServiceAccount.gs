/** Server-only credentials belong in Script Properties, never in source or HTML. */
function ddBase64_(value) {
  // The charset overload accepts a String; RSA signatures are Byte[].
  var encoded = typeof value === 'string' ?
    Utilities.base64EncodeWebSafe(value, Utilities.Charset.UTF_8) : Utilities.base64EncodeWebSafe(value);
  return encoded.replace(/=+$/, '');
}

function ddToken_() {
  // Static stage names help diagnose setup without exposing a key or Google reply.
  var stage = 'AUTH_CONFIG';
  try {
    var json = PropertiesService.getScriptProperties().getProperty('SERVICE_ACCOUNT_JSON');
    if (!json) throw new Error('AUTH');
    stage = 'AUTH_JSON';
    var key = JSON.parse(json || '{}');
    stage = 'AUTH_ACCOUNT';
    if (!DD_CONFIG.serviceAccountEmail || key.type !== 'service_account' ||
        key.client_email !== DD_CONFIG.serviceAccountEmail) throw new Error('AUTH');
    stage = 'AUTH_KEY';
    if (!key.private_key || !key.private_key_id) throw new Error('AUTH');
    stage = 'AUTH_CACHE';
    var cache = CacheService.getScriptCache(), cacheKey = 'dd-sa-' + key.private_key_id;
    var cached = cache.get(cacheKey);
    if (cached) return cached;
    var now = Math.floor(Date.now() / 1000);
    var header = ddBase64_(JSON.stringify({alg: 'RS256', typ: 'JWT', kid: key.private_key_id}));
    // No subject/delegation: this token represents the service account, never the owner.
    var claims = ddBase64_(JSON.stringify({iss: key.client_email,
      scope: 'https://www.googleapis.com/auth/spreadsheets',
      aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600}));
    var unsigned = header + '.' + claims;
    stage = 'AUTH_SIGNATURE';
    var signature = Utilities.computeRsaSha256Signature(unsigned, key.private_key, Utilities.Charset.UTF_8);
    var assertion = unsigned + '.' + ddBase64_(signature);
    stage = 'AUTH_REQUEST';
    var response = UrlFetchApp.fetch('https://oauth2.googleapis.com/token', {method: 'post',
      payload: {grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: assertion}, muteHttpExceptions: true});
    stage = 'AUTH_HTTP_' + response.getResponseCode();
    if (response.getResponseCode() !== 200) throw new Error('AUTH');
    stage = 'AUTH_RESPONSE';
    var result = JSON.parse(response.getContentText());
    if (!result.access_token || result.expires_in < 300) throw new Error('AUTH');
    cache.put(cacheKey, result.access_token, Math.min(result.expires_in - 120, 3300));
    return result.access_token;
  } catch (error) { throw new Error(stage); }
}

function ddRange_(range) {
  return encodeURIComponent("'" + DD_CONFIG.sheetName.replace(/'/g, "''") + "'!" + range);
}

function ddSheets_(method, range, body) {
  // The request cannot choose another spreadsheet or an arbitrary upstream URL.
  var url = 'https://sheets.googleapis.com/v4/spreadsheets/' + DD_CONFIG.spreadsheetId + '/values/' + range;
  var options = {method: method, headers: {Authorization: 'Bearer ' + ddToken_()}, muteHttpExceptions: true};
  if (body) { options.contentType = 'application/json'; options.payload = JSON.stringify(body); }
  var response = UrlFetchApp.fetch(url, options);
  if (response.getResponseCode() < 200 || response.getResponseCode() >= 300) throw new Error('SAVE');
  try { return JSON.parse(response.getContentText()); } catch (error) { throw new Error('SAVE'); }
}
