import {season} from '../site/content.js';

const escape = value => String(value).replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;');

// Metadata describes the current publication host. Keep the immutable Tilda
// capture intact, and make previews independent of its external CDN assets.
export function composeMetadata(html, site, options={}) {
  const canonical = new URL(options.path || '', site).href;
  const url = path => new URL(path, site).href;
  const title = options.title || `DD Camp — Анталья, 12–25 октября ${season.year}`;
  const description = options.description || `«Пыльные гантели» на каникулах в Анталье. Тренировки, море и две недели вместе: 12–25 октября ${season.year}. Программа и заявка на участие.`;
  const image = url('media/dd-camp-social-2027.png');
  const metadata = `<title>${escape(title)}</title>
<meta name="description" content="${escape(description)}">
<link rel="canonical" href="${escape(canonical)}">
<meta property="og:type" content="website">
<meta property="og:locale" content="ru_RU">
<meta property="og:site_name" content="DD Camp">
<meta property="og:url" content="${escape(canonical)}">
<meta property="og:title" content="${escape(title)}">
<meta property="og:description" content="${escape(description)}">
<meta property="og:image" content="${escape(image)}">
<meta property="og:image:secure_url" content="${escape(image)}">
<meta property="og:image:type" content="image/png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="DD Camp. На каникулах в Анталье, 12–25 октября ${season.year}. Море на пляже Коньяалты.">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${escape(title)}">
<meta name="twitter:description" content="${escape(description)}">
<meta name="twitter:image" content="${escape(image)}">
<meta name="twitter:image:alt" content="DD Camp в Анталье, 12–25 октября ${season.year}">
<link rel="icon" href="${escape(url('branding/favicon.svg'))}" type="image/svg+xml">
<link rel="icon" href="${escape(url('branding/favicon-32.png'))}" type="image/png" sizes="32x32">
<link rel="alternate icon" href="${escape(url('branding/favicon.ico'))}" sizes="16x16 32x32">
<link rel="apple-touch-icon" href="${escape(url('branding/apple-touch-icon.png'))}" sizes="180x180">
<meta name="theme-color" content="#f2f0e8">`;
  return html.replace(/<title\b[^>]*>[\s\S]*?<\/title>/gi,'')
    .replace(/<meta\b[^>]*(?:name=["'](?:description|twitter:[^"']+|theme-color)["']|property=["']og:[^"']+["'])[^>]*>/gi,'')
    .replace(/<link\b[^>]*rel=["'](?:canonical|(?:alternate )?icon|apple-touch-icon)["'][^>]*>/gi,'')
    .replace('</head>',`${metadata}\n</head>`);
}
