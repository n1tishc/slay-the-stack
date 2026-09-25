// Emoji rendered small and snapped to pixels, shared by 3D sprites and HTML icons.
import { crisp, makeCanvas, memo } from './canvas.js';

const EMOJI_FONT = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji","Twemoji Mozilla",sans-serif';

export function emoji(ch, size = 28) {
  return memo(`e:${ch}:${size}`, () => {
    const c = makeCanvas(size, size);
    const ctx = c.getContext('2d');
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `${Math.round(size * 0.86)}px ${EMOJI_FONT}`;
    ctx.fillText(ch, size / 2, size / 2 + size * 0.06);
    return crisp(c);
  });
}

// Data URL for an icon, so cards and menus share the sprites' look.
export function iconURL(ch, size = 20) {
  return memo(`u:${ch}:${size}`, () => emoji(ch, size).toDataURL());
}

export function iconImg(ch, cls = '', size) {
  return `<img class="px-ico ${cls}" src="${iconURL(ch, size)}" alt="${ch}" draggable="false">`;
}
