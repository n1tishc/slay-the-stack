// Map: 3D overworld on top, a clickable route schematic on the bottom.
import { iconImg, iconURL } from '../../art/icons.js';
import { ENEMIES } from '../../game/data/enemies/index.js';
import { ENCOUNTERS } from '../../game/data/encounters.js';
import { ChapterMap } from '../../game/engine/map.js';
import { attr, esc } from '../../lib/html.js';
import { highlight } from '../components/keywords.js';
import { defineActions } from '../actions.js';
import { goNode } from '../flow.js';
import { ui } from '../state.js';

export const strip = true;

const key = (n) => (n.boss ? 'boss' : `${n.row},${n.col}`);

export function hud() {
  return '<div class="hud-chip">CHAPTER 1 · THE LEGACY MONOLITH</div>';
}

export function world() {
  return ChapterMap.available(ui.run.map, ui.run.pos)
    .map(
      (n) =>
        `<div class="w-label node-label${n.boss ? ' boss' : ''}" data-anchor="n:${key(n)}">${ChapterMap.NODE_INFO[n.type].label}</div>`,
    )
    .join('');
}

export function bottom() {
  const run = ui.run;
  const map = run.map;
  const availKey = {};
  ChapterMap.available(map, run.pos).forEach((n) => {
    availKey[key(n)] = true;
  });
  const visited = {};
  (run.path || []).forEach((p) => {
    visited[key(p)] = true;
  });
  const reach = ChapterMap.reachable(map, run.pos);
  const DX = 66;
  const DY = 30;
  const X0 = 44;
  const Y0 = 20;
  const W = X0 * 2 + map.rows * DX;
  const H = Y0 * 2 + (map.cols - 1) * DY;
  const xy = (n) =>
    n.boss
      ? { x: X0 + map.rows * DX, y: Y0 + ((map.cols - 1) * DY) / 2 }
      : { x: X0 + n.row * DX + n.jy * 10, y: Y0 + n.col * DY + n.jx * 8 };
  let edges = '';
  let nodes = '';
  const curRow = run.pos && !run.pos.boss ? run.pos.row : -1;
  for (let r = 0; r < map.rows; r++) {
    for (let c = 0; c < map.cols; c++) {
      const n = map.nodes[r][c];
      if (!n) continue;
      const a = xy(n);
      const targets = r === map.rows - 1 ? [{ boss: true }] : n.next.map((nc) => map.nodes[r + 1][nc]);
      targets.forEach((t) => {
        const b = xy(t);
        const k1 = key(n);
        const k2 = key(t);
        const here = run.pos && run.pos.row === r && run.pos.col === c;
        const live = (visited[k1] || reach[k1] || !run.pos) && (t.boss || reach[k2] || visited[k2]);
        const cls = visited[k1] && visited[k2] ? 'taken' : visited[k1] && availKey[k2] && here ? 'open' : live ? '' : 'dead';
        edges += `<line class="e ${cls}" x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}"/>`;
      });
      const k = key(n);
      const info = ChapterMap.NODE_INFO[n.type];
      let ncls = `n t-${n.type}`;
      if (availKey[k]) ncls += ' avail';
      if (visited[k]) ncls += ' visited';
      else if (r <= curRow) ncls += ' past';
      else if (!reach[k]) ncls += ' unreach';
      nodes +=
        `<g class="${ncls}"${availKey[k] ? ` data-act="map-node" data-row="${r}" data-col="${c}"` : ''} data-tip="${attr(`<b>${info.label}</b><br>${info.desc}`)}">` +
        `<circle cx="${a.x}" cy="${a.y}" r="12"/><image href="${iconURL(info.icon, 18)}" x="${a.x - 9}" y="${a.y - 9}" width="18" height="18"/></g>`;
    }
  }
  const boss = ENEMIES[run.boss];
  const bx = xy({ boss: true });
  nodes +=
    `<g class="n t-boss${availKey.boss ? ' avail' : ''}"${availKey.boss ? ' data-act="map-node" data-boss="1"' : ''}` +
    ` data-tip="${attr(bossTip(boss))}"><circle cx="${bx.x}" cy="${bx.y}" r="20"/>` +
    `<image href="${iconURL(boss.icon, 24)}" x="${bx.x - 14}" y="${bx.y - 14}" width="28" height="28"/></g>`;
  const legend = ['combat', 'elite', 'event', 'rest', 'shop', 'treasure']
    .map((t) => {
      const i = ChapterMap.NODE_INFO[t];
      return `<span>${iconImg(i.icon, '', 16)}${i.label}</span>`;
    })
    .join('');
  const incidents = ENCOUNTERS.elites[run.boss].map((ids) => ENEMIES[ids[0]]);
  return (
    '<div class="map-bottom">' +
    `<div class="map-legend"><b>ROUTE MAP</b>${legend}<span class="dim">pick a glowing stop · drag the top screen to look ahead</span></div>` +
    '<div class="map-body">' +
    `<div class="map-svg-wrap"><svg class="route" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${edges}${nodes}</svg></div>` +
    `<div class="boss-card" data-tip="${attr(bossTip(boss))}">` +
    `<div class="bc-tag">SEV-0 AHEAD</div>${iconImg(boss.icon, 'bc-ico', 40)}<div class="bc-name">${esc(boss.title)}</div>` +
    `<div class="bc-sub">Incidents on this chapter</div><div class="bc-elites">${incidents.map((e) => `<span data-tip="${attr(`<b>${esc(e.name)}</b><br>${highlight(e.passive || e.flavor)}`)}">${iconImg(e.icon, '', 20)}</span>`).join('')}</div>` +
    '</div></div></div>'
  );
}

function bossTip(boss) {
  return `<b>${esc(boss.name)}</b><br><span class="dim">${esc(boss.flavor)}</span><br>${highlight(boss.passive)}`;
}

defineActions({
  'map-node': (d) => goNode(+d.row, +d.col, !!d.boss),
});
