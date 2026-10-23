import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';
import { generateKeyPairSync, sign, verify } from 'node:crypto';
import { travelField, validateFields, validBirthday, acceptedReply } from '../site/application-validation.js';

const code = await readFile(new URL('../backend/google-apps-script/Code.gs', import.meta.url), 'utf8');
const serviceCode = await readFile(new URL('../backend/google-apps-script/ServiceAccount.gs', import.meta.url), 'utf8');
const fields = {Name: 'Проверка формы', Date: '29.02.2000', Email: 'form-test@example.invalid',
  Phone: '+7 (999) 000-00-00', telegram: '', Instagram: '', Textarea: '', [travelField]: 'Один'};
const packet = () => ({id: 'a3533d16-5f0a-4219-a9fb-66c629763b66', nonce: 'b'.repeat(64),
  origin: 'http://127.0.0.1:4187', source: 'http://127.0.0.1:4187/camp.dustydumbbells/',
  consent: true, fields: {...fields}});

function receiver({failWrite = false, failReceipt = false, loseReply = false} = {}) {
  const rows = [];
  const requests = [];
  let writes = 0, locks = 0;
  const context = vm.createContext({
    ContentService: {MimeType: {JSON: 'json'}, createTextOutput(text) { return {text, setMimeType() { return this; }}; }},
    HtmlService: {XFrameOptionsMode: {ALLOWALL: 'all'}, createHtmlOutput(html) { return {html, setXFrameOptionsMode() { return this; }}; }},
    LockService: {getScriptLock: () => ({tryLock() { locks++; return true; }, releaseLock() { locks--; }})},
    Utilities: {formatDate: date => date.toISOString().slice(0, 19)},
  });
  vm.runInContext(code, context);
  context.ddRange_ = range => encodeURIComponent("'Заявки'!" + range);
  context.ddSheets_ = (method, range, body) => {
    requests.push({method, range, body});
    if (method === 'get' && decodeURIComponent(range).endsWith('A1:R1')) return {values: [Array.from(context.DD_CONFIG.headers)]};
    if (method === 'get') return {values: rows.map(row => [row[16]])};
    if (failWrite) throw Error('PRIVATE DETAIL');
    rows.push(Array.from(body.values[0])); writes++;
    if (loseReply) throw Error('PRIVATE DETAIL');
    return {updates: {updatedRows: 1, updatedCells: failReceipt ? 0 : 18}};
  };
  return {context, rows, requests, writes: () => writes, locks: () => locks};
}

function reply(output) {
  const json = /var reply=(.*?);var target=/.exec(output.html)?.[1];
  return json ? JSON.parse(json) : null;
}

test('birthdays are actual past calendar dates, including leap years', () => {
  assert(validBirthday('29.02.2000'));
  for (const value of ['31.04.2000', '29.02.2001', '00.01.2000', '01.13.2000', '01.01.2999', 'test']) assert(!validBirthday(value), value);
});

test('partner requirements follow the selected trip type; solo ignores stale partner fields', () => {
  assert.deepEqual(validateFields(fields), {});
  const partner = {...fields, [travelField]: 'С партнёром'};
  assert.deepEqual(Object.keys(validateFields(partner)).sort(), ['Name_2', 'Date_2', 'Email_2', 'Phone_2'].sort());
  assert.deepEqual(validateFields({...partner, Name_2: 'Второй участник', Date_2: '01.01.2000',
    Email_2: 'partner@example.invalid', Phone_2: '+90 555 000 0000'}), {});
});

test('a confirmation requires the pending request ID, nonce and a Google origin', () => {
  const pending = packet();
  const event = {origin: 'https://n-project-0lu-script.googleusercontent.com', data: {type: 'dd-camp-result', id: pending.id, nonce: pending.nonce, ok: true}};
  assert(acceptedReply(event, pending));
  assert(!acceptedReply({...event, origin: 'https://script.googleusercontent.com.evil.test'}, pending));
  assert(!acceptedReply({...event, data: {...event.data, nonce: 'bad'}}, pending));
  assert(!acceptedReply(event, null));
});

test('the receiver rejects invalid dates, missing partner contacts, traps and unapproved origins without writing', () => {
  for (const change of [
    p => { p.fields.Date = '31.02.2000'; },
    p => { p.fields[travelField] = 'С партнёром'; },
    p => { p.origin = 'https://unapproved.example'; },
    p => { p.website = 'spam'; },
    p => { p.consent = false; },
    p => { p.fields.Phone = 'not a phone'; },
  ]) {
    const r = receiver(), p = packet(); change(p);
    const result = r.context.doPost({parameter: {payload: JSON.stringify(p)}});
    assert.notEqual(reply(result)?.ok, true);
    assert.equal(r.writes(), 0);
  }
});

test('saving and retrying one application creates one row; hidden partner data is not saved', () => {
  const r = receiver(), p = packet();
  p.fields.Name_2 = 'Скрытые данные';
  for (let i = 0; i < 2; i++) assert.equal(reply(r.context.doPost({parameter: {payload: JSON.stringify(p)}})).ok, true);
  assert.equal(r.writes(), 1);
  assert.equal(r.rows[0].length, 18);
  assert.equal(r.rows[0][0], fields.Name);
  assert.equal(r.rows[0][3], '+79990000000');
  assert.deepEqual(r.rows[0].slice(10, 16), Array(6).fill(''));
  assert(r.requests.find(request => request.method === 'post').range.includes('insertDataOption=OVERWRITE'));
  assert.equal(r.locks(), 0);
});

test('user text cannot become a spreadsheet formula', () => {
  const r = receiver(), p = packet(); p.fields.Textarea = '=IMPORTXML("https://example.invalid", "//a")';
  r.context.doPost({parameter: {payload: JSON.stringify(p)}});
  assert.equal(r.rows[0][7], p.fields.Textarea);
  assert(r.requests.find(request => request.method === 'post').range.includes('valueInputOption=RAW'));
});

test('a paired application keeps every value under its named header in the working sheet', () => {
  const r = receiver(), p = packet();
  Object.assign(p.fields, {[travelField]: 'С партнёром', telegram: '@test-main', Instagram: 'test-main',
    Textarea: 'Проверка пары', Name_2: 'Второй тестовый участник', Date_2: '02-02-1991',
    Email_2: 'partner@example.invalid', Phone_2: '+90 (555) 000-00-00', 'telegram-p': '@test-partner', 'Instagram-p': 'test-partner'});
  assert.equal(reply(r.context.doPost({parameter: {payload: JSON.stringify(p)}})).ok, true);
  const named = Object.fromEntries(Array.from(r.context.DD_CONFIG.headers).map((header, i) => [header, r.rows[0][i]]));
  assert.equal(typeof named['Получена'], 'number');
  delete named['Получена'];
  assert.deepEqual(named, {'ФИО': fields.Name, 'Статус': 'Новая', 'Телефон': '+79990000000',
    Telegram: '@test-main', Email: fields.Email, 'Едет': 'С партнёром', 'Пожелания': 'Проверка пары',
    'Дата рождения': '29.02.2000', Instagram: 'test-main', 'ФИО партнёра': 'Второй тестовый участник',
    'Телефон партнёра': '+905550000000', 'Telegram партнёра': '@test-partner',
    'Email партнёра': 'partner@example.invalid', 'Дата рождения партнёра': '02.02.1991',
    'Instagram партнёра': 'test-partner', 'ID заявки': p.id, 'Источник': p.source});
});

test('an API failure or an incomplete receipt never returns success or exposes a private exception; locks are released', () => {
  for (const options of [{failWrite: true}, {failReceipt: true}]) {
    const r = receiver(options);
    const result = r.context.doPost({parameter: {payload: JSON.stringify(packet())}});
    assert.equal(reply(result).ok, false);
    assert(!result.html.includes('PRIVATE DETAIL'));
    assert.equal(r.locks(), 0);
  }
});

test('retrying after an accepted append loses its reply finds the row and creates no duplicate', () => {
  const r = receiver({loseReply: true}), p = packet();
  assert.equal(reply(r.context.doPost({parameter: {payload: JSON.stringify(p)}})).ok, false);
  assert.equal(reply(r.context.doPost({parameter: {payload: JSON.stringify(p)}})).ok, true);
  assert.equal(r.writes(), 1);
});

test('the deployed script requests no Google Sheets or Drive permissions for the owner', async () => {
  const manifest = JSON.parse(await readFile(new URL('../backend/google-apps-script/appsscript.json', import.meta.url), 'utf8'));
  assert.deepEqual(manifest.oauthScopes, ['https://www.googleapis.com/auth/script.external_request']);
  assert(!code.includes('SpreadsheetApp') && !serviceCode.includes('ScriptApp.getOAuthToken'));
  assert.equal(manifest.urlFetchWhitelist.length, 2);
  assert(manifest.urlFetchWhitelist[1].endsWith('/1dirgDNo7GnAIaqcGAL_jJjYBh8UYKTFunTBJsrL3Jf0/'));
});

test('the dedicated account signs its own short-lived token without impersonating the owner', () => {
  // Ephemeral test key: no real Google credential is created or saved.
  const {privateKey, publicKey} = generateKeyPairSync('rsa', {modulusLength: 2048});
  const email = 'test-only@example-project.iam.gserviceaccount.com';
  const key = {type: 'service_account', client_email: email, private_key_id: 'test-only', private_key: privateKey.export({type: 'pkcs8', format: 'pem'})};
  const cache = new Map(), calls = [];
  const context = vm.createContext({
    DD_CONFIG: {serviceAccountEmail: email},
    PropertiesService: {getScriptProperties: () => ({getProperty: () => JSON.stringify(key)})},
    CacheService: {getScriptCache: () => ({get: name => cache.get(name), put: (name, value) => cache.set(name, value)})},
    Utilities: {Charset: {UTF_8: 'utf8'},
      base64EncodeWebSafe: (value, charset) => {
        // Match the Apps Script overloads: Byte[] has no charset argument.
        assert(typeof value === 'string' || charset === undefined);
        return Buffer.from(typeof value === 'string' ? value : Uint8Array.from(value)).toString('base64url');
      },
      computeRsaSha256Signature: (text, pem) => [...sign('RSA-SHA256', Buffer.from(text), pem)],
    },
    UrlFetchApp: {fetch(url, options) { calls.push({url, options}); return {getResponseCode: () => 200, getContentText: () => JSON.stringify({access_token: 'test-token', expires_in: 3600})}; }},
  });
  vm.runInContext(serviceCode, context);
  assert.equal(context.ddToken_(), 'test-token');
  assert.equal(context.ddToken_(), 'test-token');
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, 'https://oauth2.googleapis.com/token');
  const [header, claims, signature] = calls[0].options.payload.assertion.split('.');
  const decoded = JSON.parse(Buffer.from(claims, 'base64url'));
  assert.equal(decoded.iss, email);
  assert.equal(decoded.sub, undefined);
  assert.equal(decoded.exp - decoded.iat, 3600);
  assert(verify('RSA-SHA256', Buffer.from(header + '.' + claims), publicKey, Buffer.from(signature, 'base64url')));
  context.DD_CONFIG.serviceAccountEmail = 'different@example.invalid';
  assert.throws(() => context.ddToken_(), /AUTH/);
});
