// Rendered Russian prose only. Never pass attributes, URLs or machine values.
export function typograph(value) {
  return String(value)
    .replace(/(?<=^|[\s(«])([АаВвИиКкОоСсУуЯя]|[Вв]о|[Кк]о|[Сс]о|[Нн]а|[Пп]о|[Зз]а|[Дд]о|[Ии]з|[Оо]т|[Оо]б|[Нн]е|[Нн]о)[ \t]+(?=\S)/gu, '$1\u00a0')
    .replace(/(\d+(?:[.,]\d+)?(?:–\d+(?:[.,]\d+)?)?)[ \t]+(?=(?:км|м\/с|мм|минут|мин|октября)(?:\s|[.,;:]|$))/gu, '$1\u00a0')
    .replace(/[ \t]+—[ \t]+/g, '\u00a0— ')
    .replace(/\.\.\./g, '…');
}

// Keep a measured range readable as one value, retaining the author's dash.
// Accept prose (or a single HTML text chunk), never attributes or URLs.
export function bindMeasurements(value) {
  return String(value).replace(
    /(\d+(?:[.,]\d+)?)[ \t]*([-–])[ \t]*(\d+(?:[.,]\d+)?)(?:[ \t\u00a0]|&nbsp;)*((?:°|&deg;)C|км|м\/с|мм)(?=$|[\s.,;:)])/gu,
    (_, from, dash, to, unit) => `${from}\u2060${dash}\u2060${to}\u00a0${unit}`,
  );
}
