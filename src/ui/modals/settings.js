// Settings: text size, game speed, screen shake, reduced motion, top-screen pixel size and colour filter.
import { saveSettings, settings } from '../../settings.js';
import { isReady, resize } from '../../stage/index.js';
import { defineActions } from '../actions.js';
import { openModal, renderModal } from '../modal.js';

export function applySettings() {
  saveSettings();
  document.body.classList.toggle('reduced-motion', !!settings.reducedMotion);
  document.body.classList.toggle('text-large', settings.textSize === 'large');
  if (isReady()) resize();
}

function opt(key, val, label) {
  const on = settings[key] === val ? ' on' : '';
  return `<button class="seg-btn${on}" data-act="set" data-key="${key}" data-val="${JSON.stringify(val).replace(/"/g, '&quot;')}">${label}</button>`;
}

function row(label, options) {
  return `<div class="set-row"><span>${label}</span><div>${options.join('')}</div></div>`;
}

function body() {
  return (
    '<button class="pill close-x" data-act="close-modal">✕</button><h2>Settings</h2>' +
    '<div class="settings">' +
    row('Text size<br><small class="dim">Messages, scenarios, lessons and tooltips</small>', [
      opt('textSize', 'normal', 'Normal'),
      opt('textSize', 'large', 'Large'),
    ]) +
    row('Game speed', [opt('speed', 1, '1×'), opt('speed', 1.6, '1.6×'), opt('speed', 2.5, '2.5×')]) +
    row('Screen shake', [opt('shake', true, 'On'), opt('shake', false, 'Off')]) +
    row('Reduced motion<br><small class="dim">No shake, flashes, glitch or camera sway</small>', [
      opt('reducedMotion', false, 'Off'),
      opt('reducedMotion', true, 'On'),
    ]) +
    row('Top-screen pixels', [opt('pixel', 'chunky', 'Chunky'), opt('pixel', 'crisp', 'Crisp')]) +
    row('Handheld colour<br><small class="dim">Low colour depth with dithering on the top screen</small>', [
      opt('retro', true, 'On'),
      opt('retro', false, 'Off'),
    ]) +
    '</div><div class="modal-actions"><button class="ds-btn red" data-act="close-modal">DONE</button></div>'
  );
}

defineActions({
  settings: () => openModal(body),
  set: (d) => {
    settings[d.key] = JSON.parse(d.val);
    applySettings();
    renderModal();
  },
});
