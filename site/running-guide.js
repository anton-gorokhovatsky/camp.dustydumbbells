const link = (label, url) => `<a href="${url}" target="_blank" rel="noopener noreferrer">${label}</a>`;
const places = items => `<ul class="guide-places">${items.map(([name, url, note]) => `<li><strong>${url ? link(name, url) : name}</strong>${note ? `<span>${note}</span>` : ''}</li>`).join('')}</ul>`;

const routes = [
  { name: 'Дорожка у моря', distance: '5 км', unit: 'в одну сторону', url: 'https://yandex.com.tr/maps/-/CPFVVNM~', text: 'Мягкое покрытие вдоль набережной. В путеводителе этот участок выбран для быстрых и темповых тренировок.' },
  { name: 'Длинный маршрут', distance: '13,4 км', unit: 'туда и обратно', url: 'https://yandex.com.tr/maps/-/CPFVNA8Z', text: 'Продолжение набережной за пределами мягкой дорожки: около 6,7 км в одну сторону. Вариант для длинного кросса.' },
  { name: 'Интервалы по разметке', distance: '100 м', unit: 'между отметками', url: 'https://yandex.com.tr/maps/-/CPFfeVPa', text: 'На первом километре дорожки есть отметки через каждые сто метров: удобно отмерять короткие отрезки.' },
  { name: 'Горка к старому городу', distance: '500 м', unit: 'набор 27–28 м', url: 'https://yandex.com.tr/maps/-/CPFV5T49', text: 'Подъём от пляжа к Калеичи. Автор стартовал от шлагбаумов внизу и заканчивал там, где каменное покрытие переходит в плитку.' },
  { name: 'Легкоатлетический стадион', distance: 'Трек', unit: 'для работы на дорожке', url: 'https://yandex.com.tr/maps/-/CPFZIUYU', text: 'Место для отрезков и контрольных тренировок. Время посещения и условия входа удобно уточнить у местных бегунов.' },
  { name: 'Выше, в горы', distance: 'Трейл', unit: 'маршрут выбираешь сам', text: 'Для рельефа автор советует смотреть треки в Garmin и Strava, затем загружать выбранный GPX в часы. Выбирай трек под свою дистанцию и набор высоты.' },
];

export function renderRunningGuide(currency, { topics = false } = {}) {
  const number = new Intl.NumberFormat('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const date = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Moscow' });
  const rates = [['TRY', '1 турецкая лира'], ['USD', '1 доллар'], ['EUR', '1 евро']].map(([code, label]) => `<div><dt>${label}</dt><dd data-currency="${code}">${number.format(currency.rates[code].rubPerUnit)} ₽</dd></div>`).join('');
  const chapters = [
    ['run-routes', 'Где бегать', 'Набережная, стадион, горки и горные маршруты.'],
    ['run-districts', 'Районы и транспорт', 'Где поселиться и как передвигаться.'],
    ['run-food', 'Кофе и еда', 'Кофейни, рестораны и доставка.'],
    ['run-essentials', 'Связь и деньги', 'SIM-карта, обменники и курс ЦБ.'],
    ['run-shops', 'Магазины', 'Продукты, подарки и экипировка.'],
    ['run-community', 'Бегуны и сборы', 'Чаты бегунов и что взять с собой.'],
  ];
  const chapterStart = id => {
    const [, label, note] = chapters.find(chapter => chapter[0] === id);
    return `<details id="${id}" class="guide-section" aria-labelledby="${id}-title" open><summary class="guide-summary"><h3 id="${id}-title">${label}</h3><span class="guide-topic-note">${note}</span><span class="guide-toggle" aria-hidden="true"></span></summary><div class="guide-detail-body">`;
  };
  const chapterEnd = '</div></details>';
  return `<section id="running-guide" class="running-guide" data-guide-style="ticket"${topics ? ' data-guide-mode="topics"' : ''} aria-labelledby="running-guide-title">
    <header class="guide-heading"><p class="section-label">На месте · Путеводитель</p><h2 id="running-guide-title">Беговая<br> Анталья.</h2><div><p class="guide-intro">Практические заметки для жизни и бега у моря. Маршруты, адреса и бытовые подробности из поездок в Анталью.</p><p class="guide-byline">По ${link('путеводителю Вячеслава Давыдова', 'https://t.me/Slk425/847')} и ${link('карточкам «Бегом»', 'https://t.me/begmonrun/304')}, <span class="guide-source-period">март–май 2026</span>.</p></div></header>
    <div class="guide-layout"><nav class="guide-contents" aria-label="Содержание путеводителя"><p>На этой странице</p>${chapters.map(([id, label]) => `<a href="#${id}">${label}</a>`).join('')}</nav><div class="guide-body">
      ${chapterStart('run-routes')}<p class="guide-section-lead">Расстояния и маршруты — из опыта автора.</p><div class="running-routes">${routes.map(route => `<article class="running-route"><div class="route-measure"><strong>${route.distance}</strong><span>${route.unit}</span></div><div><h4>${route.url ? link(route.name, route.url) : route.name}</h4><p>${route.text}</p></div></article>`).join('')}</div>${chapterEnd}
      ${chapterStart('run-districts')}<div class="guide-columns"><article><h4>Три разных района</h4><p><strong>Коньяалты</strong> — длинный галечный пляж, набережная и кафе. Его автор выбрал для жизни и бега у моря.</p><p><strong>Калеичи</strong> — исторический центр, узкие улицы, бары и рестораны.</p><p><strong>Лара</strong> — район с большими курортными отелями и песчаными пляжами.</p></article><article id="run-airport" aria-labelledby="run-airport-title"><h4 id="run-airport-title">Из аэропорта</h4><p>Из аэропорта — три варианта: такси, заранее заказанный трансфер и общественный транспорт. Заказать машину через приложение можно, подключившись к Wi-Fi аэропорта; наличные помогали, когда карта не проходила.</p><p>При заказе ${link('трансфера через Booking', 'https://www.booking.com/taxi')} автор заранее указывал пассажиров и багаж, а место встречи согласовывал с водителем.</p><h4>По городу</h4><p>Для автобусов и трамваев используется Antalyakart. Терминалы продажи и пополнения карты встречаются у остановок. С багажом учитывай пересадки; в такси проверь, что включён счётчик.</p></article></div>${chapterEnd}
      ${chapterStart('run-food')}<div class="guide-place-groups"><article><h4>Кофе и сладкое</h4>${places([
        ['Luna Garden', 'https://yandex.com.tr/maps/-/CPFNfR9r', 'Сахарная вата к кофе и официант на роликах.'],
        ['Two Routes Coffee & Shop', 'https://yandex.com.tr/maps/-/CPFNfWMy', 'Турецкий кофе и интерьер с винтовой лестницей.'],
        ['Mackbear Coffee Co.', 'https://yandex.com.tr/maps/-/CPFNn-40', 'Спешелти-кофе и большой выбор десертов.'],
        ['Starbucks', 'https://yandex.com.tr/maps/-/CPFNjC3-', 'Знакомые напитки и Wi-Fi.'],
        ['Kazandeep', 'https://yandex.com.tr/maps/-/CPFNnMjW', 'Казандиби с карамельной корочкой и турецкий кофе.'],
      ])}</article><article><h4>Пообедать</h4>${places([
        ['Golden Wok', 'https://yandex.ru/maps/org/golden_wok/138253068130', 'Большие порции для повседневного обеда.'],
        ['IKEA Antalya Restaurant', 'https://yandex.ru/maps/org/ikea_antalya_restaurant/6435292153', 'Обед во время поездки за покупками.'],
        ['Tavuk Dünyası в Коньяалты', 'https://yandex.ru/maps/-/CPFwQU0R', 'Ресторан сети Tavuk Dünyası — можно поесть на месте.'],
      ])}</article><article><h4>Ужин после прогулки</h4>${places([
        ['The Big Stop', 'https://yandex.ru/maps/org/the_big_stop/150417344499', 'На набережной с видом на море.'],
        ['Veranda Cafe & Bistro', 'https://yandex.ru/maps/org/veranda_cafe_bistro/228763024861', 'Кафе при отеле Golden Orange.'],
      ])}</article></div><article class="guide-inline-note"><h4>Поесть дома</h4><div class="guide-columns"><p>Для доставки в отель — Yemeksepeti. В описанной поездке для регистрации понадобился турецкий номер с SMS. Укажи точный адрес и проверь способы оплаты; меню на турецком удобно читать через переводчик изображений.</p><div>${places([
        ['Tavuk Dünyası в Beach Park', 'https://yandex.ru/maps/org/tavuk_dunyasi/67682928023', 'Можно поесть на месте или заказать домой.'],
        ['Dali Fit Bowl и Green Salads', '', 'Боулы и салаты.'],
      ])}</div></div></article>${chapterEnd}
      ${chapterStart('run-essentials')}<div class="guide-columns"><article><h4>Оставаться на связи</h4><p>Turkcell, Vodafone и Türk Telekom продают SIM-карты в аэропорту и своих салонах. Ещё один вариант — eSIM для совместимого телефона.</p><p>Сам автор обходился Wi-Fi в жилье и кафе. Если сеть требует SMS, а код не приходит, попроси сотрудников помочь с подключением.</p><h4>Обменять наличные</h4><p>После сравнения обменников в центре Калеичи в путеводителе отмечена ${link('эта точка в Коньяалты', 'https://yandex.com.tr/maps/-/CPFNU4~D')}. Перед обменом сравни итоговую сумму, которую получишь на руки.</p></article><aside class="currency-reference" data-currency-reference aria-labelledby="currency-title"><h4 id="currency-title">Курс для ориентира</h4><p class="currency-date">Банк России · <time datetime="${currency.effectiveDate}">${date.format(new Date(`${currency.effectiveDate}T12:00:00+03:00`))}</time></p><dl class="currency-rates">${rates}</dl><p class="currency-note">Справочный курс ЦБ. Курс обменника и комиссия могут отличаться.</p><p class="currency-source">${link('Данные Банка России', currency.source)}</p></aside></div>${chapterEnd}
      ${chapterStart('run-shops')}<div class="guide-place-groups"><article><h4>Продукты рядом</h4>${places([
        ['A101', 'https://yandex.ru/maps/org/a101/18266955589', 'Вода и повседневные продукты.'],
        ['Şok', 'https://yandex.ru/maps/org/sok/1284970284', 'Небольшой магазин у дома.'],
        ['Migros', 'https://yandex.ru/maps/org/migros/17476111982', 'Большой выбор продуктов, фруктов и готовой еды.'],
      ])}</article><article><h4>Сладости и подарки</h4><h5>За рахат-лукумом</h5>${places([
        ['Payamzade', 'https://yandex.ru/maps/org/payamzade/134910204600', ''],
        ['Güllük Kuruyemiş', '', ''],
      ])}<h5>За сувенирами</h5>${places([
        ['TAVUS KUŞU', 'https://yandex.com.tr/maps/-/CPFZVV67', ''],
      ])}</article><article><h4>Одежда и экипировка</h4><p>Автор выделяет Mall of Antalya у аэропорта, TerraCity и MarkAntalya в центре. Для отдельной поездки за покупками — эти точки:</p>${places([
        ['Deepo Outlet Center', 'https://yandex.ru/maps/org/deepo_outlet_center/116224320088', 'Аутлет.'],
        ['Nike Factory Store', 'https://yandex.ru/maps/org/nike_factory_store/50457969707', 'Спортивная одежда и обувь.'],
        ['Decathlon', 'https://yandex.ru/maps/-/CPFs7NKr', 'Экипировка.'],
        ['IKEA', 'https://yandex.ru/maps/org/ikea/11874197094', 'Вещи для быта.'],
        ['5M Migros', 'https://yandex.ru/maps/org/5m_migros/196771525290', 'Торговый центр в Коньяалты.'],
      ])}</article></div>${chapterEnd}
      ${chapterStart('run-community')}<div class="guide-columns"><article><h4>Бежать вместе</h4><p>В ${link('чате бегунов Антальи', 'https://t.me/sportsantaliya')} можно найти компанию, узнать о совместных пробежках и уточнить доступ на стадион. О городском быте — ${link('в чате жителей', 'https://t.me/antalya_chat')}.</p><p>В путеводителе также отмечено местное вино Şirince Zeus, если хочется провести вечер после прогулки за бокалом.</p></article><article><h4>Что положить в рюкзак</h4><p>На сборах в феврале–марте было 15–22° днём и 8–12° ночью. Из опыта поездки: днём хватало лёгкой формы, утром и вечером — дополнительный слой, от ветра и дождя — ветровка.</p><p>Полезная идея для сборов — несколько лёгких слоёв, защита от солнца и погоды. Комплект выбирай по прогнозу перед выездом.</p></article></div>${chapterEnd}
    </div></div>
    <aside class="guide-return" aria-labelledby="guide-return-title"><div><h3 id="guide-return-title">До встречи у моря</h3><p>Анталья, 12–25 октября 2027. Беговое сообщество, море и две недели вместе.</p></div><nav aria-label="Кэмп и сообщество">${link('Познакомиться с Пыльными гантелями', 'https://t.me/dusty_dumbbells')}<a href="#program">Вернуться к программе</a></nav></aside>
  </section>`;
}
