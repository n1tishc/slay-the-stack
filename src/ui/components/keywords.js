// Rules keywords in text become hoverable spans with their glossary definition.
import { KEYWORDS } from '../../game/core/glossary.js';
import { attr } from '../../lib/html.js';

const ALIAS = {
  'Tool Calls': 'Tool Call',
  Hallucinates: 'Hallucinate',
  'PagerDuty Alerts': 'PagerDuty Alert',
  Counters: 'Counter',
  Countered: 'Counter',
  Practices: 'Practice',
  Forks: 'Fork',
  Switches: 'Switch',
};
// Longest first so "Deep Context" wins over "Context".
const words = [...Object.keys(KEYWORDS), ...Object.keys(ALIAS)].sort((a, b) => b.length - a.length);
const KW_RE = new RegExp(`\\b(${words.join('|')})\\b`, 'g');

export function highlight(html) {
  return html.replace(KW_RE, (m) => {
    const key = ALIAS[m] || m;
    return `<span class="kw" data-tip="${attr(`<b>${key}</b><br>${KEYWORDS[key]}`)}">${m}</span>`;
  });
}

export function keywordsIn(text) {
  const found = [];
  for (const m of text.matchAll(KW_RE)) {
    const key = ALIAS[m[0]] || m[0];
    if (!found.includes(key)) found.push(key);
  }
  return found;
}
