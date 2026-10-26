import { ddBrandMark } from './brand-markup.mjs';

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

export function composeFooter(html,base) {
  const social=division(html,html.indexOf('<div id="rec1053527756"'));
  const linksStart=social.html.indexOf('<div class="t-sociallinks">');
  if(social.start<0||linksStart<0)throw new Error('The original footer links changed.');
  const links=[...division(social.html,linksStart).html.matchAll(/(<a\b[^>]*aria-label="(website|telegram)"[^>]*>)[\s\S]*?<\/a>/g)]
    .map(([,opening,name])=>{
      const label=name==='website'?'Сайт DD':'Telegram';
      return opening.replace(`aria-label="${name}"`,`aria-label="${label}"`).replace('<a ','<a class="dd-footer-brand" ')+ddBrandMark+`<span>${label}</span></a>`;
    }).join('');
  if(!links.includes('>Сайт DD<')||!links.includes('>Telegram<'))throw new Error('Both original DD destinations are required.');
  html=html.slice(0,social.start)+html.slice(social.end);
  const credits=division(html,html.indexOf('<div id="rec1018079361"'));
  if(credits.start<0)throw new Error('The footer credits changed.');
  const opening=credits.html.slice(0,credits.html.indexOf('>')+1);
  const content=`${opening}<div class="dd-footer-meta">
    <div class="dd-footer-details">
      <div class="dd-footer-mainline"><span class="dd-footer-copy">© DUSTY DUMBBELLS, 2026</span><span class="dd-footer-motto">It costs 0.00 to be a nice camp (21+)</span></div>
      <div class="dd-footer-legal">${links}<a href="${base}privacy/">Политика конфи&shy;денци&shy;альности</a><label class="dd-motion-preference" hidden><input type="checkbox" data-dd-marquee-toggle aria-label="Анимация строк и подписи" checked>Анимация</label></div>
    </div>
    <ag-signature class="dd-footer-signature" theme="dark" layout="compact" role-label="Дизайн и разработка" controls="external"><a href="https://gorokhovatsky.tech/" rel="author">Антон Гороховатский — Дизайн и разработка</a></ag-signature>
  </div></div>`;
  html=html.slice(0,credits.start)+content+html.slice(credits.end);
  return html.replace('</body>','<script type="module" src="https://gorokhovatsky.tech/signature/v1/signature.js" data-dd-signature></script></body>');
}
