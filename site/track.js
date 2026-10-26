// Equal linear speed, independent of phrase length, photo width and viewport.
for(const track of document.querySelectorAll('.dd-track')){
  const motion=track.querySelector('.dd-track__motion');
  const lap=motion?.firstElementChild;
  if(!lap)continue;
  const measure=()=>{
    const width=lap.getBoundingClientRect().width;
    if(width>0)motion.style.setProperty('--track-duration',`${width/36}s`);
  };
  new ResizeObserver(measure).observe(lap);
  document.fonts.ready.then(measure);
  measure();
}
