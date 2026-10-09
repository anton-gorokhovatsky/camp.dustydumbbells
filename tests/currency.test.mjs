import test from 'node:test';
import assert from 'node:assert/strict';
import { parseCurrencyXML, currencyURL } from '../scripts/update-currency.mjs';
import { normalizeCurrency } from '../site/currency.js';

const now = new Date('2026-10-09T08:00:00Z');
const quote = (code, nominal, value) => `<Valute ID="${code}"><CharCode>${code}</CharCode><Nominal>${nominal}</Nominal><Value>${value}</Value></Valute>`;
const document = (date, tryQuote = quote('TRY', 10, '17,3777')) => `<ValCurs Date="${date}">${tryQuote}${quote('USD', 1, '85,4173')}${quote('EUR', 1, '95,4709')}</ValCurs>`;

test('a quote for ten lira is normalized to one lira, without losing its nominal', () => {
  const payload = parseCurrencyXML(document('09.10.2026'), now);
  assert.equal(payload.rates.TRY.nominal, 10);
  assert.equal(payload.rates.TRY.rubPerUnit, 1.73777);
  assert.equal(payload.rates.USD.rubPerUnit, 85.4173);
  assert.equal(payload.effectiveDate, '2026-10-09');
  assert.equal(new URL(payload.source).searchParams.get('date_req'), '09/10/2026');
});

test('the browser reader derives unit rates from the nominal and rejects invalid or future snapshots', () => {
  const payload = parseCurrencyXML(document('09.10.2026'), now);
  assert.equal(normalizeCurrency(payload, now).rates.TRY, 1.73777);
  assert.equal(normalizeCurrency({...payload, effectiveDate:'2026-10-10'}, now), null);
  assert.equal(normalizeCurrency({...payload, rates:{...payload.rates, TRY:{nominal:10,value:null}}}, now), null);
  assert.equal(normalizeCurrency({}, now), null);
});

test('the current effective quote is requested by Moscow date, not tomorrow or UTC yesterday', () => {
  const url = new URL(currencyURL(new Date('2026-10-08T22:30:00Z')));
  assert.equal(url.hostname, 'www.cbr.ru');
  assert.equal(url.searchParams.get('date_req'), '09/10/2026');
  assert.doesNotThrow(() => parseCurrencyXML(document('08.10.2026'), now));
  assert.throws(() => parseCurrencyXML(document('10.10.2026'), now));
  assert.throws(() => parseCurrencyXML(document('01.09.2026'), now));
  assert.doesNotThrow(() => parseCurrencyXML(document('31.12.2026'), new Date('2027-01-09T08:00:00Z')));
});

test('broken and incomplete quotes fail before they can replace the previous feed', () => {
  for (const xml of ['<html>Error</html>', document('09.10.2026', quote('TRY', 0, '17,3777')), document('09.10.2026', quote('TRY', 10, 'NaN')), document('09.10.2026', ''), document('09.10.2026').replace('</ValCurs>', '')]) {
    assert.throws(() => parseCurrencyXML(xml, now));
  }
});
