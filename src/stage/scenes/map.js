// Map overworld: a circuit board. Copper traces are the routes, pedestals are the nodes,
// and the Legacy Monolith looms at the far end. The camera follows the player's robot.
import * as THREE from 'three';
import { emoji } from '../../art/icons.js';
import { robot } from '../../art/robots.js';
import { RNG } from '../../game/core/rng.js';
import { ENEMIES } from '../../game/data/enemies/index.js';
import { ChapterMap } from '../../game/engine/map.js';
import {
  background,
  baseScene,
  capacitor,
  chip,
  inTexels,
  lights,
  monolith,
  motes,
  pcbGround,
  platform,
  sprite,
  stepMotes,
} from '../kit.js';
import { camera, ease, tween } from '../stage.js';

const NODE_COL = { combat: '#6b7290', elite: '#c0453a', rest: '#3f9e6a', shop: '#d9a23a', event: '#5a7fd6', treasure: '#b86fd6' };
const X_SP = 2.5;
const Z_SP = 2.7;

export function nodePos(map, n) {
  if (n.boss) return new THREE.Vector3(0, 0, -map.rows * Z_SP - 3.2);
  if (n.start) return new THREE.Vector3(0, 0, Z_SP * 1.1);
  return new THREE.Vector3((n.col - 3) * X_SP + n.jx * 0.7, 0, -n.row * Z_SP + n.jy * 0.6);
}

const posKey = (n) => (n.boss ? 'boss' : `${n.row},${n.col}`);

export function mapScene(opts) {
  const sc = baseScene();
  const { run } = opts;
  const { map } = run;
  background(sc, '#0f1f2e', '#1e4a3a');
  sc.scene.fog = new THREE.Fog(0x14302a, 16, 38);
  lights(sc, 0xd8ffe8, 0x1a3020, 0xfff2d8, 1.4);
  const bossZ = nodePos(map, { boss: true }).z;
  pcbGround(sc, 44, -bossZ + 30, bossZ / 2);
  const avail = {};
  (opts.avail || []).forEach((n) => {
    avail[posKey(n)] = true;
  });
  const visited = {};
  (run.path || []).forEach((p) => {
    visited[posKey(p)] = true;
  });
  const curRow = run.pos && !run.pos.boss ? run.pos.row : -1;
  const reach = ChapterMap.reachable(map, run.pos);

  // ───────── traces ─────────
  const segs = [];
  function edge(a, b, state) {
    const d = b.clone().sub(a);
    const col = state === 'taken' ? 0xffd166 : state === 'open' ? 0xe0b25a : state === 'dead' ? 0x2e3a2c : 0x8a6a30;
    const m = new THREE.Mesh(
      new THREE.BoxGeometry(state === 'taken' ? 0.3 : 0.2, 0.05, d.length()),
      new THREE.MeshLambertMaterial({ color: col, emissive: state === 'taken' ? 0x6a4a10 : 0x000000 }),
    );
    m.position.copy(a).add(b).multiplyScalar(0.5);
    m.position.y = 0.03;
    m.rotation.y = Math.atan2(d.x, d.z);
    sc.scene.add(m);
    segs.push([a, b]);
  }
  const start = nodePos(map, { start: true });
  const startPad = platform(0.9, '#3b4466', '#9fb6ff');
  startPad.position.copy(start);
  sc.scene.add(startPad);

  for (let r = 0; r < map.rows; r++) {
    for (let c = 0; c < map.cols; c++) {
      const n = map.nodes[r][c];
      if (!n) continue;
      const p = nodePos(map, n);
      if (r === 0) edge(start, p, visited[posKey(n)] ? 'taken' : avail[posKey(n)] ? 'open' : 'dim');
      const targets = r === map.rows - 1 ? [{ boss: true }] : n.next.map((nc) => map.nodes[r + 1][nc]);
      targets.forEach((t) => {
        const k1 = posKey(n);
        const k2 = posKey(t);
        const here = run.pos && run.pos.row === r && run.pos.col === c;
        const live = (visited[k1] || reach[k1] || !run.pos) && (t.boss || reach[k2] || visited[k2]);
        const st = visited[k1] && visited[k2] ? 'taken' : visited[k1] && avail[k2] && here ? 'open' : live ? 'dim' : 'dead';
        edge(p, nodePos(map, t), st);
      });
    }
  }

  // ───────── nodes ─────────
  const nodeObjs = [];
  function makeNode(n) {
    const key = posKey(n);
    const info = ChapterMap.NODE_INFO[n.type];
    const col = NODE_COL[n.type] || '#888';
    // Nodes you can no longer reach fade into the board, so the live routes stand out.
    const isPast = !visited[key] && (n.row <= curRow || !reach[key]);
    const g = new THREE.Group();
    g.position.copy(nodePos(map, n));
    const ped = new THREE.Mesh(
      new THREE.CylinderGeometry(0.58, 0.68, 0.28, 10),
      new THREE.MeshLambertMaterial({ color: isPast ? '#4a4d58' : col, flatShading: true }),
    );
    ped.position.y = 0.14;
    ped.userData.pick = { row: n.row, col: n.col };
    g.add(ped);
    sc.pickables.push(ped);
    const icon = sprite(emoji(info.icon, 20), `em${info.icon}20`, 0.95, sc);
    icon.group.position.y = 0.3;
    icon.shadow.visible = false;
    if (isPast) {
      icon.mesh.material.color.set(0x6a6a6a);
      icon.group.scale.setScalar(0.7);
    }
    icon.mesh.userData.pick = ped.userData.pick;
    sc.pickables.push(icon.mesh);
    g.add(icon.group);
    let ring = null;
    if (avail[key]) {
      ring = new THREE.Mesh(
        new THREE.RingGeometry(0.75, 0.92, 24),
        new THREE.MeshBasicMaterial({ color: 0xffd166, side: THREE.DoubleSide, transparent: true }),
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.05;
      g.add(ring);
      sc.anchors[`n:${key}`] = { obj: g, y: 1.55 };
    }
    if (visited[key]) {
      const chk = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.06, 4, 20), new THREE.MeshBasicMaterial({ color: 0xffd166 }));
      chk.rotation.x = Math.PI / 2;
      chk.position.y = 0.3;
      g.add(chk);
    }
    sc.scene.add(g);
    nodeObjs.push({ key, g, icon, ring, ped, phase: Math.random() * 6 });
  }
  for (let r = 0; r < map.rows; r++) for (let c = 0; c < map.cols; c++) if (map.nodes[r][c]) makeNode(map.nodes[r][c]);

  // ───────── the boss monolith ─────────
  const boss = monolith(sc, 0, bossZ - 1.5, 1);
  const bossPed = new THREE.Mesh(
    new THREE.CylinderGeometry(1.4, 1.6, 0.3, 12),
    new THREE.MeshLambertMaterial({ color: 0x5a1a22, flatShading: true }),
  );
  bossPed.position.set(0, 0.15, bossZ + 1.2);
  bossPed.userData.pick = { boss: true };
  boss.tower.userData.pick = { boss: true };
  sc.pickables.push(bossPed, boss.tower);
  sc.scene.add(bossPed);
  // The chapter's boss waits in front of the Monolith.
  const bossDef = ENEMIES[run.boss];
  const bossSprite = sprite(emoji(bossDef.icon, 40), `em${bossDef.icon}40`, 2.6, sc);
  bossSprite.group.position.set(0, 0.3, bossZ + 1.2);
  bossSprite.mesh.userData.pick = { boss: true };
  sc.pickables.push(bossSprite.mesh);
  sc.scene.add(bossSprite.group);
  let bossRing = null;
  if (avail.boss) {
    sc.anchors['n:boss'] = { obj: bossPed, y: 2.2 };
    bossRing = new THREE.Mesh(
      new THREE.RingGeometry(1.7, 1.95, 28),
      new THREE.MeshBasicMaterial({ color: 0xff4d5e, side: THREE.DoubleSide }),
    );
    bossRing.rotation.x = -Math.PI / 2;
    bossRing.position.set(0, 0.05, bossZ + 1.2);
    sc.scene.add(bossRing);
  }

  // ───────── decorations (seeded per run, kept clear of nodes and traces) ─────────
  const rnd = new RNG(run.seed ^ 0x5eed);
  const nodePts = nodeObjs.map((o) => o.g.position);
  function clear(x, z) {
    if (nodePts.some((p) => Math.hypot(p.x - x, p.z - z) < 1.4)) return false;
    return segs.every(([a, b]) => {
      const dx = b.x - a.x;
      const dz = b.z - a.z;
      const t = Math.max(0, Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / (dx * dx + dz * dz)));
      return Math.hypot(a.x + dx * t - x, a.z + dz * t - z) >= 0.9;
    });
  }
  const leds = [];
  for (let i = 0; i < 90; i++) {
    const x = (rnd.next() - 0.5) * 36;
    const z = bossZ + 4 + rnd.next() * (-bossZ + 8);
    if (!clear(x, z)) continue;
    const kind = rnd.next();
    if (kind < 0.4) chip(sc, x, z, 0.7 + rnd.next() * 0.9, (Math.random() - 0.5) * 0.3);
    else if (kind < 0.75) capacitor(sc, x, z, rnd.pick([0x2f5fb8, 0x6b3a22, 0x1f7a6a, 0x3b3b52]));
    else {
      const led = new THREE.Mesh(
        new THREE.BoxGeometry(0.16, 0.14, 0.16),
        new THREE.MeshBasicMaterial({ color: rnd.pick([0x59f07d, 0xff4d5e, 0x82aaff, 0xffd166]) }),
      );
      led.position.set(x, 0.07, z);
      sc.scene.add(led);
      leds.push(led);
    }
  }
  const mo = motes(80, [30, 5, -bossZ + 10, bossZ / 2], 0xb8ffd8, 1);
  sc.scene.add(mo);

  // ───────── the player's avatar ─────────
  const avatar = sprite(robot(run.char, 'back'), `rb${run.char}`, 1.3, sc);
  const here = run.pos ? nodePos(map, run.pos.boss ? { boss: true } : map.nodes[run.pos.row][run.pos.col]) : start;
  avatar.group.position.copy(here);
  avatar.group.position.y = run.pos ? 0.28 : 0.1;
  sc.scene.add(avatar.group);

  // ───────── camera & input ─────────
  let scroll = 0;
  const minScroll = bossZ - here.z + 2;
  const camPos = new THREE.Vector3();
  const camLook = new THREE.Vector3();
  let first = true;
  const clampScroll = (v) => Math.max(minScroll, Math.min(3, v));
  sc.wheel = (dy) => {
    scroll = clampScroll(scroll + dy * 0.01);
  };
  sc.drag = (dx, dy) => {
    scroll = clampScroll(scroll + dy * 0.05);
  };
  sc.hover = (h) => {
    nodeObjs.forEach((o) => o.g.scale.setScalar(1));
    if (!h || h.boss) return;
    const o = nodeObjs.find((x) => x.key === `${h.row},${h.col}`);
    if (o) o.g.scale.setScalar(1.15);
  };
  sc.walkTo = (n) => {
    const from = avatar.group.position.clone();
    const to = nodePos(map, n);
    scroll = 0;
    return tween(
      0.85,
      (k) => {
        avatar.group.position.lerpVectors(from, to, k);
        avatar.group.position.y = 0.2 + Math.abs(Math.sin(k * Math.PI * 4)) * 0.22;
      },
      ease.inOut,
    ).then(() => {
      avatar.group.position.y = 0.28;
    });
  };

  sc.update = (dt, t) => {
    stepMotes(mo, dt, 0.25);
    boss.beacon.rotation.y += dt * 2;
    boss.light.intensity = 5 + Math.sin(t * 4) * 2;
    stepMotes(boss.smoke, dt, 0.8);
    leds.forEach((l, i) => {
      l.visible = Math.sin(t * 2 + i * 1.7) > -0.6;
    });
    nodeObjs.forEach((o) => {
      o.icon.group.position.y = 0.3 + inTexels(Math.sin(t * 2 + o.phase) * 0.06, o.icon);
      if (o.ring) o.ring.scale.setScalar(1 + Math.sin(t * 4) * 0.08);
    });
    if (bossRing) bossRing.material.color.setHSL(0.98, 1, 0.5 + Math.sin(t * 5) * 0.12);
    bossSprite.mesh.position.y = 0.15 + inTexels(Math.sin(t * 1.6) * 0.12, bossSprite);
    avatar.mesh.position.y = (Math.floor(t * 2.2) % 2) * avatar.texel; // two-frame idle bob
    const target = avatar.group.position;
    camLook.set(target.x * 0.5, 0.4, target.z - 3.4 + scroll);
    camPos.set(target.x * 0.4, 6.8, target.z + 6.4 + scroll);
    if (first) {
      camera.position.copy(camPos);
      first = false;
    }
    camera.position.lerp(camPos, Math.min(1, dt * 4));
    camera.lookAt(camLook);
  };
  return sc;
}
mapScene.sceneName = 'map';
