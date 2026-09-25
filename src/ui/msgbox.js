// Typewriter message box at the bottom of the top screen. Click to reveal the whole line.
import { settings } from '../settings.js';
import { dom } from './dom.js';

let timer = null;
let full = '';
const body = () => dom.msg.querySelector('.msg-text');

export function say(text) {
  full = text;
  clearInterval(timer);
  dom.msg.classList.remove('done');
  dom.msg.hidden = !text;
  if (settings.reducedMotion) {
    finish();
    return;
  }
  let i = 0;
  body().textContent = '';
  timer = setInterval(() => {
    i += 2;
    body().textContent = text.slice(0, i);
    if (i >= text.length) finish();
  }, 18 / settings.speed);
}

function finish() {
  clearInterval(timer);
  body().textContent = full;
  dom.msg.classList.add('done');
}

export function hideMessage() {
  clearInterval(timer);
  dom.msg.hidden = true;
}

export function initMessageBox() {
  dom.msg.addEventListener('click', finish);
}
