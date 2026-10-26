import { socialWordmark } from './brand-markup.mjs';

function division(html,start) {
  if(start<0)throw new Error('The expected footer division is missing.');
  const tags=/<\/?div\b[^>]*>/g; tags.lastIndex=start;
  let depth=0;
  for(let match;(match=tags.exec(html));) {
    depth+=match[0].startsWith('</')?-1:1;
    if(!depth)return {start,end:tags.lastIndex,html:html.slice(start,tags.lastIndex)};
  }
  throw new Error('The footer division is not closed.');
}

export function composeFooter(html,base,{plainLinks=false}={}) {
  const social=division(html,html.indexOf('<div id="rec1053527756"'));
  const linksStart=social.html.indexOf('<div class="t-sociallinks">');
  if(social.start<0||linksStart<0)throw new Error('The original footer links changed.');
  const links=[...division(social.html,linksStart).html.matchAll(/(<a\b[^>]*aria-label="(website|telegram)"[^>]*>)[\s\S]*?<\/a>/g)]
    .map(([,opening,name])=>{
      const label=name==='website'?'Сайт DD':'Telegram';
      const word=name==='website'?'WEB':'TELEGRAM';
      const accessible=plainLinks?label:name==='website'?'WEB — сайт Пыльных Гантелей':'TELEGRAM — Пыльные Гантели';
      return opening.replace(`aria-label="${name}"`,`aria-label="${accessible}"`).replace('<a ',`<a class="${plainLinks?'dd-footer-plain':'dd-footer-brand'}" `)+(plainLinks?label:socialWordmark(word))+'</a>';
    }).join('');
  if(!links.includes('dustydumbbells.com')||!links.includes('t.me/dusty_dumbbells'))throw new Error('Both original DD destinations are required.');
  html=html.slice(0,social.start)+html.slice(social.end);
  const credits=division(html,html.indexOf('<div id="rec1018079361"'));
  if(credits.start<0)throw new Error('The footer credits changed.');
  const opening=credits.html.slice(0,credits.html.indexOf('>')+1);
  const content=`${opening}<div class="dd-footer-meta">
    <div class="dd-footer-details">
      <div class="dd-footer-mainline"><span class="dd-footer-copy">© DUSTY DUMBBELLS, 2026</span><nav class="dd-footer-socials" aria-label="Ссылки DD">${links}</nav></div>
      <div class="dd-footer-legal"><a href="${base}privacy/">Политика конфи&shy;денци&shy;альности</a><button class="dd-motion-preference" type="button" data-dd-marquee-toggle hidden><svg viewBox="0 0 12 16" aria-hidden="true"><path d="M0 0H4V16H0ZM8 0H12V16H8Z"></path></svg><span>Отключить движение</span></button><a class="dd-footer-weather" href="https://open-meteo.com/" target="_blank" rel="noopener noreferrer">Данные погоды: Open-Meteo</a></div>
    </div>
    <ag-signature class="dd-footer-signature" theme="dark" role-label="Дизайн и разработка" controls="external"><a href="https://gorokhovatsky.tech/" rel="author">Антон Гороховатский — Дизайн и разработка</a></ag-signature>
  </div></div>`;
  html=html.slice(0,credits.start)+content+html.slice(credits.end);
  return html.replace('</body>','<script type="module" src="https://gorokhovatsky.tech/signature/v1/signature.js" data-dd-signature></script></body>');
}
