/** Compact nonmodal DD navigation. The page owns the atmosphere; the menu
 * gives its four destinations, the application and an immediately visible forecast. */
export function composeMenuClarity(html,base,version) {
  if(html.includes('data-dd-menu-clarity'))return html;
  const names=['О кэмпе','Расписание','Погода в Анталье','Дорога и жильё'];
  const labels=['О кэмпе','Распи&shy;сание','Погода в Анталье','Дорога и жильё'];
  let count=0;
  html=html.replace(/(<a class="t-menu__link-item"\s+href="#[^"]+" data-menu-item-number="([1-4])")[^>]*>[\s\S]*?<\/a>/g,(_,start,index)=>{
    count++;return `${start} aria-label="${names[+index-1]}">${labels[+index-1]}</a>`;
  });
  if(count!==4)throw Error('The compact disclosure needs the four original destinations.');
  const weather=`<section class="dd-menu-weather" data-dd-menu-weather data-dd-weather-open aria-label="Погода в Анталье">
      <p class="dd-menu-weather__heading" data-dd-forecast-heading>Сегодня в Анталье</p>
      <div class="dd-menu-weather__forecast"><p class="dd-menu-weather__range" data-dd-forecast-range hidden></p><p data-dd-forecast-conditions>Загружаем прогноз…</p></div>
      <p class="dd-menu-weather__detail" data-dd-forecast-detail hidden></p>
      <p class="dd-menu-weather__now" data-dd-current-weather>Загружаем текущую погоду…</p>
  </section>`;
  if(!/<section class="dd-menu-weather"/.test(html))throw Error('The menu weather reading is required.');
  html=html.replace(/<section class="dd-menu-weather"[\s\S]*?<\/section>/,weather)
    .replace(/<script type="application\/json" id="dd-menu-scenes">[\s\S]*?<\/script>/,'')
    .replace(/<script\b[^>]*src="[^"]*menu-poster\.js[^"]*"[^>]*>[\s\S]*?<\/script>/,'');
  html=html.replace(/(<ul\b[^>]*class="t-sociallinks__wrapper"[^>]*>)([\s\S]*?)(<\/ul>)/,
    (_,start,items,end)=>start+items.replace(/&nbsp;/g,'')+end);
  return html.replace('</head>',`<link rel="stylesheet" href="${base}menu.css?v=${version}" data-dd-menu-clarity></head>`);
}
