// Battle arena: a server room. The player's robot (back view) stands on a near platform,
// bugs stand on far platforms, the camera is locked like a handheld battle cam.
import * as THREE from 'three';
import { emoji } from '../../art/icons.js';
import { robot } from '../../art/robots.js';
import { CHARACTERS } from '../../game/data/characters.js';
import { settings } from '../../settings.js';
import {
  background,
  baseScene,
  blinkRacks,
  burst,
  groundRing,
  lights,
  motes,
  platform,
  rackRow,
  sprite,
  stepMotes,
  tiledFloor,
} from '../kit.js';
import { camera, ease, hitStop, resetHover, shake, tween } from '../stage.js';

const THEMES = {
  normal: { bg: ['#141c3a', '#3a2f63'], floor: '#2a3150', fog: 0x2a2850, sky: 0xaab4ff, ground: 0x302040, rim: 0xff6b7d },
  elite: { bg: ['#1c1026', '#6a3326'], floor: '#3b2c3a', fog: 0x4a2a30, sky: 0xffc59a, ground: 0x3a2020, rim: 0xff9e45 },
  boss: { bg: ['#12040a', '#5b0f19'], floor: '#3a1c24', fog: 0x3a0d15, sky: 0xff9aa4, ground: 0x2a0a10, rim: 0xff3348 },
};

const PPOS = new THREE.Vector3(-3.0, 0, 1.7);

function enemyHeight(def) {
  if (def.boss) return 3.5;
  if (def.elite) return 2.7;
  if (def.minion || def.small) return 1.45;
  return 2.05;
}

function slotFor(i, n, def) {
  if (def?.boss) return new THREE.Vector3(2.0, 0, -2.6);
  const spacing = n <= 2 ? 2.9 : n === 3 ? 2.6 : 2.15;
  const x = 1.9 + (i - (n - 1) / 2) * spacing;
  const z = -1.5 + (n > 2 && i % 2 ? -0.8 : 0);
  return new THREE.Vector3(x, 0, z);
}

export function battle(opts) {
  const sc = baseScene();
  const th = opts.arena || THEMES[opts.kind] || THEMES.normal;
  const ch = CHARACTERS[opts.charId];
  background(sc, th.bg[0], th.bg[1]);
  sc.scene.fog = new THREE.Fog(th.fog, 14, 34);
  lights(sc, th.sky, th.ground);
  tiledFloor(sc, 70, th.floor);
  rackRow(sc, -15, 15, -10);
  rackRow(sc, -6, 6, 0, Math.PI / 2).position.x = -12;
  rackRow(sc, -6, 6, 0, -Math.PI / 2).position.x = 13;
  const beacons = [];
  if (opts.kind !== 'normal') {
    for (let b = -2; b <= 2; b++) {
      const bl = new THREE.PointLight(th.rim, 3, 12, 1.5);
      bl.position.set(b * 5, 3.6, -9);
      const bm = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.3, 6), new THREE.MeshBasicMaterial({ color: th.rim }));
      bm.position.set(b * 5, 3.35, -9.3);
      sc.scene.add(bl, bm);
      beacons.push(bl);
    }
  }
  // Unseen: compiles the particle material with the scene so the first hit doesn't hitch.
  const warm = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.01, 0.01), new THREE.MeshBasicMaterial());
  warm.position.y = -50;
  sc.scene.add(warm);
  const mo = motes(70, [26, 6, 16, -3], opts.kind === 'boss' ? 0xff6070 : 0x9fb6ff, 1);
  sc.scene.add(mo);

  // ───────── player ─────────
  const pPlat = platform(1.3, '#3b4466', ch.color);
  pPlat.position.copy(PPOS);
  sc.scene.add(pPlat);
  const player = sprite(robot(opts.charId, 'back'), `rb${opts.charId}`, 1.75, sc);
  player.group.position.copy(PPOS);
  player.group.position.y = 0.1;
  sc.scene.add(player.group);
  sc.anchors.player = { obj: player.group, y: 2.05 };
  const aura = groundRing(0.9, 1.25, 0xff9e64, 0);
  aura.position.set(PPOS.x, 0.14, PPOS.z);
  aura.scale.z = 0.62;
  sc.scene.add(aura);
  const guardRing = new THREE.Mesh(
    new THREE.RingGeometry(0.2, 0.32, 24),
    new THREE.MeshBasicMaterial({ color: 0x7fd4ff, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false }),
  );
  guardRing.position.set(PPOS.x, 1.1, PPOS.z + 0.2);
  sc.scene.add(guardRing);
  const pOff = new THREE.Vector3();
  let deepOn = false;

  // ───────── enemies ─────────
  const ents = {}; // uid → entry
  let order = [];
  let targeting = false;

  const camBase = new THREE.Vector3(-1.1, 2.7, 7.6);
  const lookBase = new THREE.Vector3(0.6, 0.95, -1.4);
  const camFocus = new THREE.Vector3();

  function makeEnemy(e) {
    const h = enemyHeight(e.def);
    const px = e.def.boss ? 44 : e.def.elite ? 34 : h <= 1.5 ? 24 : 30;
    const sp = sprite(emoji(e.def.icon, px), `em${e.def.icon}${px}`, h, sc);
    const plat = platform(e.def.boss ? 2.4 : Math.max(0.9, h * 0.55), th.floor, th.rim);
    const g = new THREE.Group();
    g.add(plat);
    sp.group.position.y = 0.1;
    g.add(sp.group);
    const tRing = groundRing(h * 0.62, h * 0.72, 0xffd166, 0);
    tRing.position.y = 0.15;
    tRing.scale.y = 0.62;
    g.add(tRing);
    sp.mesh.userData.pick = { uid: e.uid };
    sc.pickables.push(sp.mesh);
    // Clips the sprite at the platform top when it faints. Set from the start so the
    // shader variant is compiled with the scene, not mid-fight.
    const clip = new THREE.Plane(new THREE.Vector3(0, 1, 0), 1000);
    sp.mesh.material.clippingPlanes = [clip];
    sc.scene.add(g);
    sc.anchors[`e:${e.uid}`] = { obj: sp.group, y: h + 0.2 };
    return { uid: e.uid, def: e.def, g, sp, h, clip, target: new THREE.Vector3(), off: new THREE.Vector3(), tRing, dying: false };
  }

  function appear(ent) {
    ent.sp.mesh.position.y = -ent.h;
    tween(
      0.45,
      (k) => {
        ent.sp.mesh.position.y = -ent.h * (1 - k);
      },
      ease.outBack,
    );
    burst(sc, ent.g.position.clone().add(new THREE.Vector3(0, ent.h * 0.5, 0)), 0xffffff, 10, true);
  }

  // Match the scene to the combat state: new enemies appear, survivors slide into place.
  // A dying enemy keeps its slot while its sprite is still on stage; once the faint (or
  // escape) has removed it, it must never be rebuilt.
  sc.sync = (c, dying) => {
    const list = c.enemies.filter((e) => e.alive || (dying?.[e.uid] && ents[e.uid]));
    list.forEach((e, i) => {
      let ent = ents[e.uid];
      const slot = slotFor(i, list.length, e.def);
      if (!ent) {
        ent = ents[e.uid] = makeEnemy(e);
        ent.g.position.copy(slot);
        if (c.turn > 1 || e.def.minion || e.def.small) appear(ent);
      }
      ent.target.copy(slot);
    });
    order = list.map((e) => e.uid);
  };

  function who(key) {
    if (key === 'player') return { g: player.group, sp: player, off: pOff, h: 2.05 };
    const e = ents[key];
    return e ? { g: e.g, sp: e.sp, off: e.off, h: e.h, ent: e } : null;
  }

  sc.lunge = (key, towardKey) => {
    const a = who(key);
    if (!a) return Promise.resolve();
    const from = key === 'player' ? PPOS : a.ent.target;
    const tw = towardKey != null ? who(towardKey) : null;
    const to = tw ? (towardKey === 'player' ? PPOS : tw.ent.target) : key === 'player' ? slotFor(0, 1) : PPOS;
    const dir = to
      .clone()
      .sub(from)
      .setY(0)
      .normalize()
      .multiplyScalar(key === 'player' ? 0.9 : 0.7);
    if (key !== 'player') camFocus.set(dir.x * -0.15, 0, dir.z * -0.1);
    return tween(0.14, (k) => a.off.copy(dir).multiplyScalar(k))
      .then(() => tween(0.2, (k) => a.off.copy(dir).multiplyScalar(1 - k)))
      .then(() => camFocus.set(0, 0, 0));
  };

  sc.hit = (key, amount) => {
    const a = who(key);
    if (!a) return;
    const big = amount >= 12;
    if (amount > 0) {
      shake(key === 'player' ? (big ? 0.35 : 0.18) : big ? 0.2 : 0.08);
      if (big) hitStop(70);
    }
    const m = a.sp.mesh;
    const flash = m.material.userData.flash;
    if (settings.reducedMotion || amount <= 0) return;
    // White flash, then a few blinks and a shiver, like a handheld RPG hit.
    tween(
      0.4,
      (k) => {
        flash.value = k < 0.18 ? 1 : 0;
        m.visible = k >= 1 || k < 0.18 || Math.floor(k * 8) % 2 === 0;
        m.position.x = k >= 1 ? 0 : Math.sin(k * 40) * 0.08 * (1 - k);
      },
      null,
    );
  };

  // Leaves the fight: hops, then dashes off-screen to the right.
  sc.escape = (uid) => {
    const e = ents[uid];
    if (!e || e.dying) return;
    e.dying = true;
    const idx = sc.pickables.indexOf(e.sp.mesh);
    if (idx >= 0) sc.pickables.splice(idx, 1);
    tween(
      0.7,
      (k) => {
        e.off.set(k * k * 12, 0, -k * 2);
        e.sp.mesh.position.y = Math.sin(Math.min(1, k * 3) * Math.PI) * 0.6;
      },
      ease.linear,
    ).then(() => removeEnemy(uid));
  };

  function removeEnemy(uid) {
    const e = ents[uid];
    if (!e) return;
    sc.scene.remove(e.g);
    delete ents[uid];
    delete sc.anchors[`e:${uid}`];
  }

  // Handheld-style faint: blink, then sink into the platform a texel at a time
  // (clipped at the platform top), a puff of dust, and the platform folds away.
  sc.faint = (uid) => {
    const e = ents[uid];
    if (!e || e.dying) return;
    e.dying = true;
    const idx = sc.pickables.indexOf(e.sp.mesh);
    if (idx >= 0) sc.pickables.splice(idx, 1);
    const m = e.sp.mesh;
    e.clip.constant = -0.1;
    const plat = e.g.children[0];
    tween(
      0.75,
      (k) => {
        if (k < 0.3) {
          m.visible = settings.reducedMotion || Math.floor(k * 20) % 2 === 0;
          return;
        }
        m.visible = true;
        const s = (k - 0.3) / 0.7;
        m.position.y = -Math.round((e.h * s * s) / e.sp.texel) * e.sp.texel;
        e.sp.shadow.material.opacity = 0.35 * (1 - s);
      },
      ease.linear,
    )
      .then(() => {
        m.visible = false;
        burst(sc, e.g.position.clone().add(new THREE.Vector3(0, 0.25, 0)), 0xb9b3c9, 12, true);
        return tween(0.25, (k) => plat.scale.setScalar(Math.max(0.01, 1 - Math.round(k * 4) / 4)), ease.linear);
      })
      .then(() => removeEnemy(uid));
  };

  sc.guard = (key) => {
    if (key !== 'player') {
      const a = who(key);
      if (a) burst(sc, a.g.position.clone().add(new THREE.Vector3(0, a.h * 0.6, 0)), 0x7fd4ff, 8, true);
      return;
    }
    guardRing.material.opacity = 0.9;
    tween(0.5, (k) => {
      guardRing.scale.setScalar(1 + k * 5);
      guardRing.material.opacity = 0.9 * (1 - k);
    });
  };

  sc.buff = (key, good) => {
    const a = who(key);
    if (!a) return;
    const p = (key === 'player' ? PPOS.clone() : a.g.position.clone()).add(new THREE.Vector3(0, a.h * 0.5, 0));
    burst(sc, p, good ? 0xffd166 : 0xb57bff, 10, true);
  };

  // Tokens stream from an enemy (or off-screen) into the player.
  sc.inject = (fromKey) => {
    const a = fromKey != null ? who(fromKey) : null;
    const from = a ? a.g.position.clone().add(new THREE.Vector3(0, a.h * 0.6, 0)) : new THREE.Vector3(2, 1.5, -2);
    const to = PPOS.clone().add(new THREE.Vector3(0, 1.6, 0));
    const geo = new THREE.BoxGeometry(0.1, 0.1, 0.1);
    const mat = new THREE.MeshBasicMaterial({ color: 0x82aaff });
    const bits = [];
    for (let i = 0; i < 10; i++) {
      const m = new THREE.Mesh(geo, mat);
      sc.scene.add(m);
      bits.push({ m, d: i * 0.05, j: new THREE.Vector3(Math.random() - 0.5, Math.random(), Math.random() - 0.5) });
    }
    tween(
      0.9,
      (k) => {
        bits.forEach((b) => {
          const t = Math.max(0, Math.min(1, (k - b.d) / 0.5));
          b.m.position.lerpVectors(from, to, t).addScaledVector(b.j, Math.sin(t * Math.PI) * 0.8);
          b.m.visible = t > 0 && t < 1;
        });
      },
      null,
    ).then(() => {
      bits.forEach((b) => sc.scene.remove(b.m));
      geo.dispose();
      mat.dispose();
    });
  };

  sc.hover = () => {};
  sc.pointerOk = () => targeting;
  sc.deep = (on) => {
    deepOn = on;
  };
  sc.setTargeting = (on) => {
    targeting = on;
    resetHover();
  };
  sc.enemyKeys = () => order.slice();

  // Intro: the player's side slides in from the left, the bugs from the right.
  const intro = { k: settings.reducedMotion ? 1 : 0 };
  if (!settings.reducedMotion)
    tween(
      0.7,
      (k) => {
        intro.k = k;
      },
      ease.outCubic,
    );

  sc.update = (dt, t) => {
    blinkRacks(dt);
    stepMotes(mo, dt, 0.35);
    beacons.forEach((bl, i) => {
      bl.intensity = 2 + Math.sin(t * 5 + i) * 2;
    });
    const inP = (1 - intro.k) * -9;
    const inE = (1 - intro.k) * 12;
    // Idle: a two-frame bob of one texel on a fixed beat, like handheld battle sprites.
    // Whole-texel steps keep pixel art from shimmering on the low-res screen.
    const still = settings.reducedMotion ? 0 : 1;
    const bob = (sp, phase) => (Math.floor(t * 2.2 + phase) % 2) * sp.texel * still;
    player.group.position.set(PPOS.x + pOff.x + inP, 0.1 + bob(player, 0), PPOS.z + pOff.z);
    pPlat.position.x = PPOS.x + inP;
    for (const e of Object.values(ents)) {
      e.g.position.lerp(e.target, Math.min(1, dt * 6));
      const tx = e.sp.texel;
      const hover = e.def.boss ? Math.round((0.12 + Math.sin(t * 1.6) * 0.1) / tx) * tx * still : 0;
      const idle = e.dying ? 0 : hover + bob(e.sp, 0.5 + e.uid * 0.37);
      e.sp.group.position.set(e.off.x + inE, 0.1 + idle, e.off.z);
      e.tRing.material.opacity = targeting && !e.dying ? 0.55 + Math.sin(t * 8) * 0.35 : 0;
    }
    aura.material.opacity = deepOn ? 0.45 + Math.sin(t * 6) * 0.25 : Math.max(0, aura.material.opacity - dt * 2);
    aura.rotation.z += dt;
    // Camera: locked, cutting briefly toward an attacker. A drifting camera makes every
    // pixel edge crawl on the low-res screen.
    camera.position.set(camBase.x + camFocus.x, camBase.y, camBase.z + camFocus.z);
    camera.lookAt(lookBase);
  };
  return sc;
}
battle.sceneName = 'battle';
