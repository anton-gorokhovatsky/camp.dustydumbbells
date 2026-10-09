// All marks belong to the landscape behind the content. The same painter is
// used for live conditions and fixed local visual-review states.
const wrap = (value, limit) => ((value % limit) + limit) % limit;
export function paintAtmosphere(context, model, width, height, elapsed) {
  if (!context || !model || width <= 0 || height <= 0) return;
  context.clearRect(0, 0, width, height);
  const { rain, snow, wind, gust, drift } = model.effects;
  const gusting = wind + (gust - wind) * (.5 + .5 * Math.sin(elapsed * .6));
  const night = model.phase === 'night';
  const start = model.phase === 'morning' ? .64 : model.phase === 'evening' ? .71 : .61;
  const end = model.phase === 'evening' ? .82 : 1;
  // The night photograph shows the city, so water marks do not cross its roofs.
  const count = night ? 0 : width < 700 ? 32 : 64;
  const speed = (2 + gusting * 1.7) * drift;
  context.lineWidth = .65;
  for (let i = 0; i < count; i++) {
    const depth = (i + .5) / count;
    const y = height * (start + depth * (end - start));
    const x = wrap(i * 139.17 + elapsed * speed * (.3 + depth), width + 160) - 80;
    if (model.phase === 'morning' && x < width * (.22 + depth * .3)) continue;
    const size = (12 + (i % 7) * 8) * (.3 + depth);
    const amplitude = (.3 + gusting * .18) * depth;
    const shimmer = .04 + (i % 5) * .015 + Math.sin(elapsed * .8 + i) * .015;
    context.strokeStyle = `rgba(237,244,237,${shimmer})`;
    context.beginPath();
    context.moveTo(x, y);
    context.quadraticCurveTo(x + size / 2, y + Math.sin(elapsed * .65 + i * 2.7) * amplitude, x + size, y);
    context.stroke();
  }
  if (rain > 0) {
    const drops = Math.round((width < 700 ? 65 : 160) * (.25 + rain * .75));
    const fall = 260 + rain * 220;
    const slope = drift * Math.min(28, gusting * 1.7);
    context.strokeStyle = `rgba(224,237,244,${.09 + rain * .3})`;
    context.lineWidth = .7;
    for (let i = 0; i < drops; i++) {
      const x = wrap(i * 97.31 + elapsed * slope * 8, width + 120) - 60;
      const y = wrap(i * 83.93 + elapsed * fall * (.7 + (i % 5) * .08), height + 100) - 50;
      const length = 10 + (i % 4) * 3 + rain * 10;
      context.beginPath(); context.moveTo(x, y); context.lineTo(x + slope, y + length); context.stroke();
    }
  }
  if (snow > 0) {
    const flakes = Math.round((width < 700 ? 22 : 55) * (.4 + snow * .6));
    context.fillStyle = `rgba(237,244,247,${.2 + snow * .3})`;
    for (let i = 0; i < flakes; i++) {
      const x = wrap(i * 137.31 + elapsed * drift * (7 + wind * 2) + Math.sin(elapsed + i) * 8, width + 80) - 40;
      const y = wrap(i * 91.93 + elapsed * (25 + (i % 7) * 7), height + 40) - 20;
      context.beginPath(); context.arc(x, y, .7 + (i % 3) * .4, 0, Math.PI * 2); context.fill();
    }
  }
}
