export const channels = hex => hex.slice(1).match(/../g).map(value => parseInt(value, 16));
const hex = values => '#' + values.map(value => Math.round(value).toString(16).padStart(2, '0')).join('');
export const mix = (left, right, amount) => hex(channels(left).map((value, index) =>
  value + (channels(right)[index] - value) * Math.max(0, Math.min(1, amount))));
export const luminance = colour => channels(colour).map(value => value / 255)
  .map(value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4)
  .reduce((sum, value, index) => sum + value * [.2126, .7152, .0722][index], 0);
export const contrast = (left, right) => (Math.max(luminance(left), luminance(right)) + .05)
  / (Math.min(luminance(left), luminance(right)) + .05);
