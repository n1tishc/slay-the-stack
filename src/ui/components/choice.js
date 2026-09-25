// A big tappable option row (rewards, rest, shop items, event options).
import { iconImg } from '../../art/icons.js';
import { rich } from '../../lib/html.js';
import { highlight } from './keywords.js';

const EMOJI_RE = /\p{Extended_Pictographic}/u;

export function choice(act, icon, label, detail, taken = false, disabled = false, extra = '') {
  const ico = EMOJI_RE.test(icon) ? iconImg(icon, '', 24) : `<span class="ci-txt">${icon}</span>`;
  return (
    `<button class="choice${taken ? ' taken' : ''}" data-act="${act}"${extra}${disabled ? ' disabled' : ''}>` +
    `<span class="ci">${ico}</span>` +
    `<span><div class="cl">${rich(label)}</div><div class="cd">${highlight(rich(detail))}</div></span></button>`
  );
}
