// Only the five selected composition changes are applied to the frozen capture.
function divAt(html, start) {
  const tags = /<\/?div\b[^>]*>/g;
  tags.lastIndex = start;
  let depth = 0;
  for (let tag; (tag = tags.exec(html));) {
    depth += tag[0].startsWith('</') ? -1 : 1;
    if (!depth) return { start, end: tags.lastIndex, html: html.slice(start, tags.lastIndex) };
  }
  throw new Error('The selected composition block is unbalanced.');
}

export function composeCamp(html) {
  const coverStart = html.indexOf('<div id="rec1016226926"');
  const coverEnd = html.indexOf('<div id="rec', coverStart + 10);
  const cover = html.slice(coverStart, coverEnd);
  const introStart = /<div\b[^>]*class="[^"]*\bt997__descr\b[^\"]*"[^>]*>/.exec(cover)?.index;
  if (introStart === undefined) throw new Error('The original cover introduction is missing.');
  const intro = divAt(cover, introStart);
  html = html.slice(0, coverStart) + cover.slice(0, intro.start) + cover.slice(intro.end) + html.slice(coverEnd);
  const slot = '<div class="dd-cover-intro" data-dd-intro></div>';
  if (!html.includes(slot)) throw new Error('The introduction destination is missing.');
  html = html.replace(slot, '');
  const aboutStart = html.indexOf('<div id="rec1016322141"');
  const aboutEnd = html.indexOf('<div id="rec', aboutStart + 10);
  let about = html.slice(aboutStart, aboutEnd);
  const descriptionStart = /<div\b[^>]*class="[^\"]*\bt-section__descr\b[^\"]*"[^>]*>/.exec(about)?.index;
  if (descriptionStart === undefined) throw new Error('The camp description changed.');
  const description = divAt(about, descriptionStart);
  about = about.slice(0, description.start) + `<div class="dd-cover-intro" data-dd-intro>${intro.html}</div>` + about.slice(description.end);
  const aboutClose = about.lastIndexOf('</div>');
  about = about.slice(0, aboutClose) + `<div class="dd-about-details t-container">${description.html}</div>` + about.slice(aboutClose);
  html = html.slice(0, aboutStart) + about + html.slice(aboutEnd);

  const weatherStart = html.indexOf('<div id="rec1017020466"');
  const weatherEnd = html.indexOf('<div id="rec', weatherStart + 10);
  let weather = html.slice(weatherStart, weatherEnd);
  const items = [...weather.matchAll(/<div\s+class="t1148__item"/g)];
  if (items.length !== 6) throw new Error('The accepted coastal gallery changed.');
  const first = divAt(weather, items[0].index);
  const image = first.html.match(/<img\b[^>]*>/)?.[0];
  if (!image?.includes('d152e032841c-IMG_6948.JPG')) throw new Error('The selected sunset photograph changed.');
  const full = image.match(/data-img-zoom-url="([^"]+)"/)?.[1];
  if (!full) throw new Error('The sunset full-size source is missing.');
  const sunset = image.replace(/\bsrc="[^"]+"/, `src="${full}"`)
    .replace(/\s*\/?\>$/, ' width="893" height="1339" loading="lazy" decoding="async" data-dd-memory-photo>');
  weather = weather.slice(0, first.start) + weather.slice(first.end);
  const remaining = [...weather.matchAll(/<div\s+class="t1148__item"/g)];
  for (let index = remaining.length - 1; index >= 0; index--) {
    const item = divAt(weather, remaining[index].index);
    const changed = item.html.replace(/aria-label="\d из 6"/, `aria-label="${index + 1} из 5"`)
      .replace(/aria-current="(?:true|false)"/, `aria-current="${index === 0}"`)
      .replace(/data-index="\d+"/, `data-index="${index}"`)
      .replace(/data-zoom-target="\d+"/, `data-zoom-target="${index}"`)
      .replace(/imgfield="gi_img__\d+"/, `imgfield="gi_img__${index}"`);
    weather = weather.slice(0, item.start) + changed + weather.slice(item.end);
  }
  html = html.slice(0, weatherStart) + weather + html.slice(weatherEnd);

  const formStart = html.indexOf('<div id="rec1016216116"');
  const form = html.slice(formStart);
  const headerStart = /<div\b[^>]*class="[^"]*\bt-section__container\b[^\"]*"[^>]*>/.exec(form)?.index;
  if (headerStart === undefined) throw new Error('The form invitation changed.');
  const header = divAt(form, headerStart);
  const scene = `<div class="dd-invitation-scene t-container"><figure class="dd-form-memory">${sunset}</figure>${header.html}</div>`;
  html = html.slice(0, formStart) + form.slice(0, header.start) + scene + form.slice(header.end);
  return html;
}
