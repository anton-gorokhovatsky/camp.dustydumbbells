// A typographic split echoes the supplied brand's midline displacement.
// Links keep their own accessible names; the two visual halves are decorative.
export function socialWordmark(word) {
  if(!['WEB','TELEGRAM'].includes(word))throw new Error('An original DD destination is required.');
  return `<span class="dd-social-wordmark" aria-hidden="true"><span>${word}</span><span>${word}</span></span>`;
}
