import { readFile, writeFile, mkdir, rename } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

export const CBR_SOURCE = 'https://www.cbr.ru/scripts/XML_daily.asp';
export const CURRENCY_CODES = ['TRY', 'USD', 'EUR'];

export function moscowDate(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Moscow', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(now);
  const part = type => parts.find(item => item.type === type).value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}

export function currencyURL(now = new Date()) {
  const [year, month, day] = moscowDate(now).split('-');
  const url = new URL(CBR_SOURCE);
  url.searchParams.set('date_req', `${day}/${month}/${year}`);
  return url.href;
}

export function parseCurrencyXML(xml, now = new Date()) {
  const date = xml.match(/<ValCurs\b[^>]*\bDate="(\d{2})\.(\d{2})\.(\d{4})"/);
  if (!date || !xml.includes('</ValCurs>')) throw new Error('Invalid CBR document');
  const effectiveDate = `${date[3]}-${date[2]}-${date[1]}`;
  const parsedDate = new Date(`${effectiveDate}T00:00:00Z`);
  const requestedDate = moscowDate(now);
  const age = (new Date(`${requestedDate}T00:00:00Z`) - parsedDate) / 86400000;
  // The official effective date may precede the requested date during long holidays.
  if (!Number.isFinite(age) || parsedDate.toISOString().slice(0, 10) !== effectiveDate || age < 0 || age > 31) {
    throw new Error('CBR rate is future-dated or too old');
  }
  const rates = {};
  for (const block of xml.matchAll(/<Valute\b[^>]*>([\s\S]*?)<\/Valute>/g)) {
    const field = name => block[1].match(new RegExp(`<${name}>([^<]+)</${name}>`))?.[1];
    const code = field('CharCode');
    if (!CURRENCY_CODES.includes(code)) continue;
    const number = text => Number(text?.replace(/[\s\u00a0]/g, '').replace(',', '.'));
    const nominal = number(field('Nominal'));
    const value = number(field('Value'));
    if (!Number.isInteger(nominal) || nominal < 1 || !Number.isFinite(value) || value <= 0 || rates[code]) {
      throw new Error(`Invalid CBR quote for ${code}`);
    }
    rates[code] = { nominal, value, rubPerUnit: Number((value / nominal).toFixed(8)) };
  }
  if (CURRENCY_CODES.some(code => !rates[code])) throw new Error('Missing a required CBR currency');
  const source = new URL(CBR_SOURCE);
  source.searchParams.set('date_req', `${date[1]}/${date[2]}/${date[3]}`);
  return { source: source.href, effectiveDate, fetchedAt: now.toISOString(), rates };
}

async function updateCurrency() {
  const now = new Date();
  const input = process.argv.indexOf('--input');
  let bytes;
  if (input !== -1) {
    bytes = await readFile(process.argv[input + 1]);
  } else {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const response = await fetch(currencyURL(now), { signal: AbortSignal.timeout(15000) });
        if (!response.ok) throw new Error(`CBR HTTP ${response.status}`);
        bytes = new Uint8Array(await response.arrayBuffer());
        break;
      } catch (error) {
        if (attempt === 2) throw error;
        await new Promise(resolve => setTimeout(resolve, 1500));
      }
    }
  }
  const payload = parseCurrencyXML(new TextDecoder('windows-1251').decode(bytes), now);
  const directory = fileURLToPath(new URL('../site/data/', import.meta.url));
  const target = path.join(directory, 'currency.json');
  await mkdir(directory, { recursive: true });
  // Validate the complete response before replacing the last valid snapshot.
  await writeFile(`${target}.tmp`, `${JSON.stringify(payload, null, 2)}\n`);
  await rename(`${target}.tmp`, target);
  console.log(`CBR ${payload.effectiveDate}: TRY ${payload.rates.TRY.rubPerUnit}, USD ${payload.rates.USD.rubPerUnit}, EUR ${payload.rates.EUR.rubPerUnit} RUB per unit`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  await updateCurrency();
}
