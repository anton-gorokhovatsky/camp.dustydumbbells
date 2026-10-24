import { phoneCountries } from './phone-countries.js';

// These national trunk prefixes follow the retained widget, without stripping
// meaningful leading zeroes from countries such as Italy. RU/KZ also accept 8.
const zeroTrunkCodes = new Set(['33','380','373','44','49','31','32','41','43','90','40','48','971']);
function nationalDigits(value, iso) {
  let digits=String(value).replace(/\D/g,'');
  const code=phoneCountries[iso].c.replace(/\D/g,'');
  if(code==='7' && digits.length===11 && /^[78]/.test(digits)) digits=digits.slice(1);
  else if(zeroTrunkCodes.has(code) && digits.startsWith('0')) digits=digits.slice(1);
  return digits;
}

export function phoneParts(value, iso = 'ru') {
  if (!/^[+\d\s().-]*$/.test(value)) return {iso, national: String(value)};
  const digits = String(value).replace(/\D/g, '');
  if (!String(value).trim().startsWith('+')) return {iso, national: nationalDigits(value,iso)};
  const entries = Object.entries(phoneCountries).sort((a,b) => b[1].c.replace(/\D/g,'').length - a[1].c.replace(/\D/g,'').length);
  const current = phoneCountries[iso];
  const same = current && digits.startsWith(current.c.replace(/\D/g,''));
  const found = entries.find(([,country]) => digits.startsWith(country.c.replace(/\D/g,'')));
  const selected = same && (!found || current.c.replace(/\D/g,'').length >= found[1].c.replace(/\D/g,'').length) ? [iso,current] : found;
  return selected ? {iso: selected[0], national: digits.slice(selected[1].c.replace(/\D/g,'').length)} : {iso, national: String(value).trim()};
}
export function internationalPhone(national, iso) {
  if (!/^[+\d\s().-]*$/.test(national)) return String(national);
  if (!String(national).replace(/\D/g,'')) return '';
  if (String(national).trim().startsWith('+')) return '+' + String(national).replace(/\D/g,'');
  return '+' + phoneCountries[iso].c.replace(/\D/g,'') + nationalDigits(national,iso);
}
export function normaliseBirthday(value) {
  const text = String(value).trim();
  if (/^\d{8}$/.test(text)) return `${text.slice(0,2)}.${text.slice(2,4)}.${text.slice(4)}`;
  return text.replace(/[/-]/g,'.');
}
export function calendarMove(date, key, shift = false) {
  const next = new Date(date.getFullYear(),date.getMonth(),date.getDate());
  const step = {ArrowLeft:-1,ArrowRight:1,ArrowUp:-7,ArrowDown:7}[key];
  if (step) next.setDate(next.getDate()+step);
  else if (key === 'Home') next.setDate(next.getDate()-(next.getDay()+6)%7);
  else if (key === 'End') next.setDate(next.getDate()+6-(next.getDay()+6)%7);
  else if (key === 'PageUp' || key === 'PageDown') {
    const day = next.getDate();
    next.setDate(1);
    next.setMonth(next.getMonth()+(key === 'PageUp' ? -1 : 1)*(shift ? 12 : 1));
    next.setDate(Math.min(day,new Date(next.getFullYear(),next.getMonth()+1,0).getDate()));
  }
  return next;
}
