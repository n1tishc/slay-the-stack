// HTML string helpers. Screens build markup as strings, so everything interpolated is escaped.
export function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Escaped value for use inside a double-quoted attribute.
export const attr = esc;

// Escaped text with `backtick` spans set as <code> (scenario and lesson text).
export function rich(s) {
  return esc(s).replace(/`([^`]+)`/g, '<code>$1</code>');
}

// The first sentence of a text: the headline of a lesson (the Field Guide has the rest).
export function firstSentence(text) {
  const i = text.indexOf('. ');
  return i < 0 ? text : text.slice(0, i + 1);
}

// ["A","A","B"] → "2× A and B"
export function groupNames(names) {
  const counts = new Map();
  names.forEach((n) => counts.set(n, (counts.get(n) || 0) + 1));
  return [...counts].map(([n, k]) => (k > 1 ? `${k}× ` : '') + n).join(' and ');
}
