/** Narrow, reviewable adapter: the captured original stays untouched. */
export function adaptApplication(html, base, version) {
  if (!html.includes('id="form1016216116"')) throw new Error('Application form is missing');
  html = html.replace('t-form js-form-proccess t-form_inputs-total_14', 't-form dd-application-form t-form_inputs-total_14')
    .replace(' data-formactiontype="2"', '')
    .replace(' data-success-callback="t678_onSuccess"', '')
    .replace(/ <input type="hidden" name="formservices\[\]"[^>]+>/, '')
    .replace(/ <input type="hidden" name="tildaspec-formname"[^>]+>/, '')
    .replace('class="t-submit t-btnflex t-btnflex_type_submit t-btnflex_md"',
      'disabled class="t-submit t-btnflex t-btnflex_type_submit t-btnflex_md"');
  return html.replace('</head>', `<link rel="stylesheet" href="${base}application.css?v=${version}" data-dd-application></head>`)
    .replace('</body>', `<script type="module" src="${base}application.js?v=${version}" data-dd-application></script></body>`);
}
