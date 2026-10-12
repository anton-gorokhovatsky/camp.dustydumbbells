// Frame the actual page for this comparison, after fonts and forecast settle.
// The complete page keeps its normal anchor behaviour outside the preview.
if (new URLSearchParams(location.search).get('view') === 'transition') {
  const place = () => {
    const about = document.getElementById('about');
    if (!about) return;
    const seam = about.getBoundingClientRect().top + scrollY;
    window.scrollTo({top:Math.max(0,seam-innerHeight*.49),behavior:'instant'});
  };
  window.addEventListener('load',place,{once:true});
  document.fonts.ready.then(place);
  new ResizeObserver(place).observe(document.getElementById('weather'));
}
