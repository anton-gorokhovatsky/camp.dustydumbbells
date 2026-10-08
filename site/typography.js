// Rendered Russian prose only. Never pass attributes, URLs or machine values.
export function typograph(value) {
  return String(value)
    .replace(/(?<=^|[\s(«])([АаВвИиКкОоСсУуЯя]|[Вв]о|[Кк]о|[Сс]о|[Нн]а|[Пп]о|[Зз]а|[Дд]о|[Ии]з|[Оо]т|[Оо]б|[Нн]е|[Нн]о)[ \t]+(?=\S)/gu, '$1\u00a0')
    .replace(/(\d+(?:[.,]\d+)?(?:–\d+(?:[.,]\d+)?)?)[ \t]+(?=(?:км|м\/с|мм|минут|мин|октября)(?:\s|[.,;:]|$))/gu, '$1\u00a0')
    .replace(/[ \t]+—[ \t]+/g, '\u00a0— ')
    .replace(/\.\.\./g, '…');
}
