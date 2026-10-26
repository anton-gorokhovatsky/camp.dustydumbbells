const video = document.querySelector('#dd-cover-video');
const tools = document.querySelector('.dd-cover-tools');
if (video && tools) {
  const pause = tools.querySelector('.dd-cover-pause');
  const sound = tools.querySelector('.dd-cover-sound');
  const icon = pause.querySelector('path');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  let visible = false, userPaused = false, explicitlyPlayed = false, manualMotion=false;
  function sync() {
    pause.setAttribute('aria-label', video.paused ? 'Воспроизвести видео' : 'Пауза');
    icon.setAttribute('d', video.paused ? 'M7 4 20 12 7 20Z' : 'M7 5H10V19H7ZM14 5H17V19H14Z');
    sound.setAttribute('aria-pressed', String(!video.muted));
    sound.setAttribute('aria-label', video.muted ? 'Включить звук' : 'Выключить звук');
  }
  async function play() { try { await video.play(); } catch { sync(); } }
  function reconcile() {
    if (visible && !document.hidden && !userPaused && (document.documentElement.dataset.ddMarquees!=='paused'||manualMotion) && (!reduce.matches || explicitlyPlayed)) play();
    else video.pause();
  }
  pause.addEventListener('click', () => {
    if (video.paused) { userPaused = false; explicitlyPlayed = true; manualMotion=true; play(); }
    else { userPaused = true; video.pause(); }
  });
  // Sound can be enabled only by this explicit control.
  sound.addEventListener('click', () => { video.muted = !video.muted; sync(); });
  for (const event of ['play', 'pause', 'volumechange']) video.addEventListener(event, sync);
  video.addEventListener('error', () => { video.controls = true; sync(); });
  new IntersectionObserver(entries => { visible = entries[0].isIntersecting && entries[0].intersectionRatio >= .15; reconcile(); }, {threshold:[0,.15,.5]}).observe(video);
  document.addEventListener('visibilitychange', reconcile);
  new MutationObserver(()=>{if(document.documentElement.dataset.ddMarquees==='paused')manualMotion=false;reconcile();}).observe(document.documentElement,{attributes:true,attributeFilter:['data-dd-marquees']});
  reduce.addEventListener('change', reconcile);
  video.muted = true;
  video.loop = true;
  video.controls = false;
  tools.hidden = false;
  sync();
}
