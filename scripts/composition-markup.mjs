// Editorial composition develops the selected source without changing its copy or media.
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
  const fieldsStart = form.indexOf('<div class="t-container">', header.end);
  if (fieldsStart < 0) throw new Error('The original form container changed.');
  const fields = divAt(form, fieldsStart);
  if (!fields.html.includes('id="form1016216116"')) throw new Error('The invitation must keep the original form.');
  let invitation = header.html.replace(/(<h2\b[^>]*id="dd-heading-form"[^>]*>)[\s\S]*?<\/h2>/, '$1За&shy;явка на кэмп</h2>');
  const preambleStart = /<div\b[^>]*class="[^"]*\bt-section__descr\b[^"]*"[^>]*>/.exec(invitation)?.index;
  if (preambleStart !== undefined) {
    const preamble = divAt(invitation, preambleStart);
    invitation = invitation.slice(0, preamble.start) + invitation.slice(preamble.end);
  }
  invitation=invitation.replace('</h2>','</h2><p class="dd-application-explanation" id="dd-application-explanation">Участие в кэмпе подтверждает организатор после рассмотрения заявки.</p>');
  const application=fields.html.replace('aria-labelledby="dd-heading-form"','aria-labelledby="dd-heading-form" aria-describedby="dd-application-explanation"');
  const scene = `<div class="dd-invitation-scene t-container"><figure class="dd-form-memory">${sunset}</figure>${invitation}<div class="dd-application-body">${application}</div></div>`;
  html = html.slice(0, formStart) + form.slice(0, header.start) + scene
    + form.slice(header.end, fields.start) + form.slice(fields.end);
  return composeRhythm(html);
}

function recordAt(html, id) {
  const start = html.indexOf(`<div id="rec${id}"`);
  if (start < 0) throw new Error(`The composition record ${id} is missing.`);
  return divAt(html, start);
}

function galleryAt(record) {
  const start = record.indexOf('<div class="t1148">');
  if (start < 0) throw new Error('The accepted photographic scene changed.');
  return divAt(record, start);
}

function galleryItems(widget) {
  return [...widget.matchAll(/<div\s+class="t1148__item"/g)].map(match => divAt(widget, match.index));
}

function withGalleryItems(widget, items) {
  const old = galleryItems(widget);
  if (!old.length || !items.length) throw new Error('A photographic scene must keep its sources.');
  const indexed = items.map((item, index) => item
    .replace(/aria-label="\d из \d+"/, `aria-label="${index + 1} из ${items.length}"`)
    .replace(/aria-current="(?:true|false)"/, `aria-current="${index === 0}"`)
    .replace(/data-index="\d+"/, `data-index="${index}"`)
    .replace(/data-zoom-target="\d+"/, `data-zoom-target="${index}"`)
    .replace(/imgfield="gi_img__\d+"/, `imgfield="gi_img__${index}"`));
  return widget.slice(0, old[0].start) + indexed.join('') + widget.slice(old.at(-1).end);
}

/** Three encounters with the same archive, around the unchanged chronological axis. */
function composeRhythm(html) {
  const about = recordAt(html, '1016322141');
  const opening = galleryAt(about.html);
  const people = galleryItems(opening.html);
  if (people.length !== 5 || !people[3].html.includes('IMG_6954') || !people[4].html.includes('IMG_6968')) {
    throw new Error('The selected people archive changed.');
  }
  const weather = recordAt(html, '1017020466');
  const coast = galleryAt(weather.html);
  const shoreline = galleryItems(coast.html);
  const harbour = shoreline.find(item => item.html.includes('edb1b4c73141-IMG_6953.JPG'));
  if (shoreline.length !== 5 || !harbour) throw new Error('The selected coastal archive changed.');

  // Keep the first close encounters large; the same gallery interaction continues in the middle.
  const mountainRoad = people[3].html.replace(/[a-f0-9]{12}-IMG_6954\.JPG/g, '9b0df23f9df7-IMG_6952.JPG')
    .replace(/alt="[^"]*"/, 'alt="Бегуны DD на горной дороге у отбойника. Кэмп в Фетхие, 2025."');
  // Leave the promenade in the opening; the middle pause opens onto the road,
  // then the shared walk, before returning to running by the sea.
  let memory = withGalleryItems(opening.html, [mountainRoad, people[4].html, people[3].html]);
  const header = /<div\b[^>]*class="[^"]*\bt1148__col\b[^\"]*"[^>]*>/.exec(memory);
  const oldHeader = divAt(memory, header.index);
  memory = memory.slice(0, oldHeader.start)
    + '<div class="t-col t-col_10 t1148__col"><p class="dd-archive-caption">Кэмп в Фетхие, 2025</p></div>'
    + memory.slice(oldHeader.end);
  memory = memory.replaceAll('1016322141', '2080000001');
  memory = '<div id="rec2080000001" class="r t-rec dd-programme-memory" data-record-type="1148" data-animationappear="off" data-dd-programme-memory>'
    + memory + "<script>t_onReady(function(){t_onFuncLoad('t_slider__init',function(){t_slider__init('2080000001','t1148');});});</script></div>";

  const changedWeather = weather.html.slice(0, coast.start)
    + withGalleryItems(coast.html, [shoreline[0], harbour, ...shoreline.filter(item => item !== harbour).slice(1)].map(item => item.html))
    + weather.html.slice(coast.end);
  html = html.slice(0, weather.start) + changedWeather + html.slice(weather.end);
  const changedAbout = about.html.slice(0, opening.start)
    + withGalleryItems(opening.html, people.slice(0, 3).map(item => item.html))
    + about.html.slice(opening.end);
  html = html.slice(0, about.start) + changedAbout + html.slice(about.end);

  // Sunday and Monday retain their original dates and relative sides of the axis.
  const programme = recordAt(html, '2078706201');
  const containerStart = programme.html.indexOf('<div class="t-container t547__container">');
  if (containerStart < 0) throw new Error('The chronological axis changed.');
  const container = divAt(programme.html, containerStart);
  const days = [...container.html.matchAll(/<div\s+class="t547__item t-item"/g)];
  if (days.length !== 15 || !divAt(container.html, days[7].index).html.includes('id="dd-day-18"')) {
    throw new Error('The fifteen original days changed.');
  }
  const open = container.html.slice(0, container.html.indexOf('>') + 1);
  const first = container.html.slice(0, days[7].index) + '</div>';
  const second = open.replace('t547__container', 't547__container dd-programme-continuation') + container.html.slice(days[7].index);
  const changedProgramme = programme.html.slice(0, container.start) + first + memory + second + programme.html.slice(container.end);
  html = html.slice(0, programme.start) + changedProgramme + html.slice(programme.end);

  // Preparation keeps one reading flow, with all words and links in source order.
  const travel = recordAt(html, '2078794741');
  const textMatch = /<div\b[^>]*class="t-text t-text_md\s*"[^>]*>/.exec(travel.html);
  if (!textMatch) throw new Error('The original travel copy changed.');
  const text = divAt(travel.html, textMatch.index);
  const paragraphs = [...text.html.matchAll(/<p>/g)];
  if (paragraphs.length !== 5) throw new Error('The five original preparation paragraphs changed.');
  const copy = text.html.replace('class="', 'class="dd-travel-copy ');
  const changedTravel = travel.html.slice(0, text.start) + copy + travel.html.slice(text.end);
  return composeGalleryFooters(html.slice(0, travel.start) + changedTravel + html.slice(travel.end));
}

/** Photo navigation and the archive source stay next to the pictures they describe. */
function composeGalleryFooters(html) {
  for (const id of ['1016322141', '2080000001', '1017020466']) {
    const record = recordAt(html, id);
    const widget = galleryAt(record.html);
    const headerMatch = /<div\b[^>]*class="[^"]*\bt1148__container_flex\b[^\"]*"[^>]*>/.exec(widget.html);
    const header = divAt(widget.html, headerMatch.index);
    const controlMatch = /<div\b[^>]*class="[^"]*\bt1148__controls\b[^\"]*"[^>]*>/.exec(header.html);
    const controls = divAt(header.html, controlMatch.index);
    const existingCaption = header.html.match(/<p class="dd-archive-caption">[\s\S]*?<\/p>/)?.[0];
    const caption = existingCaption || '<p class="dd-archive-caption">Кэмп в Фетхие, 2025</p>';
    let heading = header.html;
    for (const token of ['t-col_2', 't1148__scroll-icon-wrapper']) {
      const match = new RegExp(`<div\\b[^>]*class="[^"]*\\b${token}\\b[^"]*"[^>]*>`).exec(heading);
      if (match) { const part = divAt(heading, match.index); heading = heading.slice(0, part.start) + heading.slice(part.end); }
    }
    if (existingCaption) heading = '';
    let changed = widget.html.slice(0, header.start) + heading + widget.html.slice(header.end);
    const close = changed.lastIndexOf('</div>');
    changed = changed.slice(0, close) + `<div class="dd-gallery-footer t-container">${caption}${controls.html}</div>` + changed.slice(close);
    const contents = record.html.slice(0, widget.start) + changed + record.html.slice(widget.end);
    html = html.slice(0, record.start) + contents + html.slice(record.end);
  }
  return html;
}
