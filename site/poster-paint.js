// Only the paint moves. Layout, text speed and real photographs are unchanged.
const root=document.documentElement;
const reduced=matchMedia('(prefers-reduced-motion:reduce)');
const fields=new Map([...document.querySelectorAll('[data-dd-aura]')].map(element=>[element,false]));
function sync(){
  const allowed=!document.hidden&&root.dataset.ddMarquees!=='paused'
    &&(!reduced.matches||root.dataset.ddMarquees==='running');
  for(const [element,visible]of fields)element.toggleAttribute('data-dd-aura-playing',allowed&&visible);
}
const observer=new IntersectionObserver(entries=>{
  for(const entry of entries)fields.set(entry.target,entry.isIntersecting);
  sync();
});
for(const element of fields.keys())observer.observe(element);
new MutationObserver(sync).observe(root,{attributes:true,attributeFilter:['data-dd-marquees']});
document.addEventListener('visibilitychange',sync);
reduced.addEventListener('change',sync);
sync();
