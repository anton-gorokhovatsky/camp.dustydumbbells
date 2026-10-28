// Add a compact visual vocabulary to the existing programme, preserving its copy.
const activities=[['легкий бег','run'],['скоростная работа','run'],['DDLong','run'],
  ['райд','bike'],['плавание','swim'],['кросс','mountains']];
export function composeActivitySymbols(html) {
  return html.replace(/(<div\b[^>]*class="[^"]*\bt547__descr\b[^>]*>)([\s\S]*?)(<\/div>)/g,
    (_,open,copy,close)=>{
      const content=copy.split(/(<[^>]*>)/g).map((part,i)=>{
        if(i%2)return part;
        for(const [text,icon]of activities){
          const [first,...tail]=text.split(' ');
          part=part.replaceAll(text,
            `<span class="dd-activity"><span class="dd-icon" data-dd-icon="${icon}" aria-hidden="true"></span>${first}</span>${tail.length?' '+tail.join(' '):''}`);
        }
        return part;
      }).join('');
      return open+content+close;
    });
}
