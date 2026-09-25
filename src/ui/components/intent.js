// Enemy intent badge: what the bug will do on its next turn, with live damage numbers.
import { iconImg } from '../../art/icons.js';
import { attr, esc } from '../../lib/html.js';

const INTENT_ICON = {
  attack: '⚔️',
  defend: '🛡️',
  buff: '⬆️',
  debuff: '🌀',
  context: '📥',
  summon: '➕',
  steal: '💰',
  escape: '💨',
  stun: '💫',
  caught: '✋',
};
const INTENT_TEXT = {
  attack: 'attack',
  defend: 'gain Guard',
  buff: 'power up',
  debuff: 'inflict a debuff',
  context: 'inject tokens into your Context',
  summon: 'call for reinforcements',
  steal: 'steal your API Credits',
  escape: 'escape with everything it stole',
  stun: 'do nothing (it is Hallucinating)',
  caught: 'do nothing (you Countered it)',
};

export function intent(c, e) {
  const info = c.intentInfo(e);
  if (!info) return '';
  if (e.intent === 'split' && info.type !== 'caught') {
    return `<div class="intent" data-tip="${attr('<b>Split</b><br>About to split in two.')}">${iconImg('✂️', 'in-ico', 16)}split</div>`;
  }
  const parts = info.type.split('_');
  const html = [];
  const tips = [];
  parts.forEach((p) => {
    if (p === 'attack') {
      html.push(iconImg('⚔️', 'in-ico', 16) + info.dmg + (info.hits > 1 ? `×${info.hits}` : ''));
      tips.push(`attack for ${info.dmg}${info.hits > 1 ? ` damage ${info.hits} times` : ' damage'}`);
    } else if (p === 'context') {
      html.push(`<span class="ctx">${iconImg('📥', 'in-ico', 16)}+${info.ctx}</span>`);
      tips.push(`inject ${info.ctx} tokens into your Context`);
    } else {
      html.push(iconImg(INTENT_ICON[p], 'in-ico', 16));
      tips.push(INTENT_TEXT[p]);
    }
  });
  const tip = `<b>${esc(info.name)}</b><br>Intends to ${tips.join(', ')}.`;
  return `<div class="intent${parts[0] === 'attack' ? ' attack' : ''}" data-tip="${attr(tip)}">${html.join(' ')}</div>`;
}
