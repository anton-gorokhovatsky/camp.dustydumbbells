// Add a compact visual vocabulary to the existing programme, preserving its copy.
const activities=[['легкий бег','run'],['скоростная работа','run'],['DDLong','run'],
  ['райд','bike'],['плавание','swim'],['кросс','mountains']];
const alternatives=/(легкий бег\s*\/\s*райд\s*\/\s*плавание)/;
const symbol=(text,icon)=>`<span class="dd-icon" data-dd-icon="${icon}" aria-hidden="true"></span>${text}`;
function decorateText(text) {
  return text.split(alternatives).map((part,index)=>{
    if(index%2) {
      const choices=part.split(/\s*\/\s*/).map((label,i)=>{
        const icon=activities.find(([text])=>text===label)[1];
        // Icons separate the visible alternatives; the spoken conjunction
        // retains the choice for readers who do not perceive those symbols.
        const conjunction=i?'<span class="dd-visually-hidden"> или </span>':'';
        return `<span class="dd-activity">${conjunction}${symbol(label,icon)}</span>`;
      });
      return `<span class="dd-activity-options">${choices.join(' ')}</span>`;
    }
    for(const [label,icon]of activities){
      const [first,...tail]=label.split(' ');
      part=part.replaceAll(label,`<span class="dd-activity">${symbol(first,icon)}</span>${tail.length?' '+tail.join(' '):''}`);
    }
    return part;
  }).join('');
}
export function composeActivitySymbols(html) {
  return html.replace(/(<div\b[^>]*class="[^"]*\bt547__descr\b[^>]*>)([\s\S]*?)(<\/div>)/g,
    (_,open,copy,close)=>{
      const content=copy.split(/(<[^>]*>)/g).map((part,i)=>{
        if(i%2)return part;
        return decorateText(part);
      }).join('');
      return open+content+close;
    });
}
