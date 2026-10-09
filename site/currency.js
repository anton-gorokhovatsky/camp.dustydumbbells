// A dated, same-origin CBR snapshot; never turn missing values into zeroes.
export function normalizeCurrency(payload, now = new Date()) {
  if (!payload || !/^\d{4}-\d{2}-\d{2}$/.test(payload.effectiveDate || '')) return null;
  const effective = new Date(`${payload.effectiveDate}T00:00:00Z`);
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Moscow', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(now);
  const part = type => parts.find(item => item.type === type).value;
  const today = new Date(`${part('year')}-${part('month')}-${part('day')}T00:00:00Z`);
  const age = (today - effective) / 86400000;
  if (!Number.isFinite(age) || age < 0 || age > 31 || effective.toISOString().slice(0, 10) !== payload.effectiveDate) return null;
  const rates = {};
  for (const code of ['TRY', 'USD', 'EUR']) {
    const quote = payload.rates?.[code];
    if (!quote || !Number.isInteger(quote.nominal) || quote.nominal <= 0 || !Number.isFinite(quote.value) || quote.value <= 0) return null;
    rates[code] = quote.value / quote.nominal;
  }
  const [year, month, day] = payload.effectiveDate.split('-');
  const source = new URL('https://www.cbr.ru/scripts/XML_daily.asp');
  source.searchParams.set('date_req', `${day}/${month}/${year}`);
  return { effectiveDate: payload.effectiveDate, source: source.href, rates };
}
