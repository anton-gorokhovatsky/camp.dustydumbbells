export const travelField = 'Летите вы один или с партнёром?';
export const fieldNames = ['Name', 'Date', 'Email', 'Phone', 'telegram', 'Instagram', 'Textarea',
  travelField, 'Name_2', 'Date_2', 'Email_2', 'Phone_2', 'telegram-p', 'Instagram-p'];

export function validBirthday(value, today = new Date()) {
  const match = /^(\d{2})[.\/-](\d{2})[.\/-](\d{4})$/.exec(value);
  if (!match) return false;
  const [, d, m, y] = match.map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return y >= 1900 && date <= today && date.getUTCFullYear() === y &&
    date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

export function validateFields(fields) {
  const errors = {};
  const travel = fields[travelField];
  if (!['Один', 'С партнёром'].includes(travel)) errors[travelField] = 'Выберите один из вариантов.';
  for (const suffix of ['', '_2']) {
    if (suffix && travel !== 'С партнёром') continue;
    const name = (fields[`Name${suffix}`] || '').trim();
    const email = (fields[`Email${suffix}`] || '').trim();
    const phone = (fields[`Phone${suffix}`] || '').trim();
    if (name.length < 2) errors[`Name${suffix}`] = 'Укажите имя и фамилию.';
    else if (name.length > 160) errors[`Name${suffix}`] = 'Сократите имя до 160 знаков.';
    if (!validBirthday((fields[`Date${suffix}`] || '').trim())) errors[`Date${suffix}`] = 'Укажите дату рождения в формате ДД.ММ.ГГГГ.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors[`Email${suffix}`] = 'Проверьте адрес электронной почты.';
    const digits = phone.replace(/\D/g, '');
    if (!/^[+\d\s().-]+$/.test(phone) || digits.length < 7 || digits.length > 15) errors[`Phone${suffix}`] = 'Укажите телефон с кодом страны.';
  }
  for (const name of fieldNames) {
    if (/_2$|-p$/.test(name) && travel !== 'С партнёром') continue;
    if ((fields[name] || '').length > (name === 'Textarea' ? 4000 : 254)) errors[name] = 'Слишком длинное значение.';
  }
  return errors;
}

export function acceptedReply(event, pending, trustedOrigins) {
  if (!pending || !event.data || event.data.type !== 'dd-camp-result') return false;
  const trusted = trustedOrigins ? trustedOrigins.includes(event.origin) :
    /^https:\/\/(?:[a-z0-9-]+-)?script\.googleusercontent\.com$/.test(event.origin) || event.origin === 'https://script.google.com';
  return trusted && event.data.id === pending.id && event.data.nonce === pending.nonce;
}
