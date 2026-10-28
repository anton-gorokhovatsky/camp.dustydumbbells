/** Phosphor Bold, MIT; the local SVGs and pinned source live in icons/. */
export function weatherIcon(weather, night=false) {
  if(!weather)return null;
  const code=weather.code;
  if(code>=95&&code<=99)return 'cloud-lightning';
  if([71,73,75,77,85,86].includes(code))return 'cloud-snow';
  if([51,53,55,56,57,61,63,65,66,67,80,81,82].includes(code))return 'cloud-rain';
  if([45,48].includes(code))return 'cloud-fog';
  if(code===0)return night?'moon-stars':'sun';
  if(code===1||code===2)return night?'cloud-moon':'cloud-sun';
  if(code===3)return 'cloud';
  if(weather.precipitation>0)return 'cloud-rain';
  return null;
}

export function setWeatherText(element,text,weather,night=false) {
  element.textContent=text;
  const name=weatherIcon(weather,night);
  if(!name)return;
  const symbol=element.ownerDocument.createElement('span');
  symbol.className='dd-icon';symbol.dataset.ddIcon=name;
  symbol.setAttribute('aria-hidden','true');
  element.prepend(symbol,element.ownerDocument.createTextNode(' '));
}
