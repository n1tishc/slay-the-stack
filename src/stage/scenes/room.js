// Non-combat rooms (rest, shop, event, treasure, reward, win, lose): the player's robot
// facing an NPC or object on a lit platform.
import * as THREE from 'three';
import { emoji } from '../../art/icons.js';
import { robot } from '../../art/robots.js';
import { CHARACTERS } from '../../game/data/characters.js';
import {
  background,
  baseScene,
  blinkRacks,
  burst,
  lights,
  motes,
  platform,
  rackRow,
  inTexels,
  setSpriteTexture,
  sprite,
  stepMotes,
  tiledFloor,
} from '../kit.js';
import { camera, flash } from '../stage.js';

const ROOM = {
  rest: { bg: ['#171027', '#4a2f3d'], floor: '#3d3040', light: 0xffa860 },
  shop: { bg: ['#0c1d24', '#1f4a4a'], floor: '#27403f', light: 0x7fe0ff },
  event: { bg: ['#10152e', '#303366'], floor: '#2d3358', light: 0xa8b8ff },
  treasure: { bg: ['#170f27', '#4a3066'], floor: '#3a2f55', light: 0xe0a8ff },
  reward: { bg: ['#0e2018', '#2d5a3d'], floor: '#2a4a3a', light: 0xa8ffc8 },
  win: { bg: ['#10230f', '#4d6a24'], floor: '#355a2a', light: 0xfff0a0 },
  lose: { bg: ['#12040a', '#3a0f14'], floor: '#301820', light: 0xff5060 },
};

export function room(opts) {
  const sc = baseScene();
  const th = ROOM[opts.theme] || ROOM.event;
  background(sc, th.bg[0], th.bg[1]);
  sc.scene.fog = new THREE.Fog(new THREE.Color(th.bg[0]).getHex(), 10, 26);
  lights(sc, th.light, 0x201828, 0xffffff, 1.2);
  tiledFloor(sc, 50, th.floor);
  rackRow(sc, -12, 12, -7, 0, 2.6);
  const glow = new THREE.PointLight(th.light, 5, 10, 1.3);
  glow.position.set(1.4, 2.4, 1.2);
  sc.scene.add(glow);

  const pl = platform(1.0, '#3b4466', CHARACTERS[opts.charId].color);
  pl.position.set(-1.9, 0, 0.8);
  sc.scene.add(pl);
  const bot = sprite(robot(opts.charId, 'front'), `rf${opts.charId}`, 1.75, sc);
  bot.group.position.set(-1.9, 0.1, 0.8);
  sc.scene.add(bot.group);
  const lying = opts.theme === 'lose';
  if (lying) {
    bot.mesh.rotation.z = Math.PI / 2;
    bot.mesh.position.set(0.6, 0.35, 0);
  }

  const np = platform(1.15, th.floor, `#${new THREE.Color(th.light).getHexString()}`);
  np.position.set(1.5, 0, -0.3);
  sc.scene.add(np);
  const onTable = opts.theme === 'shop' || opts.theme === 'rest';
  if (onTable) {
    const table = new THREE.Mesh(
      new THREE.BoxGeometry(1.5, 0.7, 0.9),
      new THREE.MeshLambertMaterial({ color: opts.theme === 'shop' ? 0x5a4636 : 0x4a3a44, flatShading: true }),
    );
    table.position.set(1.5, 0.45, -0.1);
    sc.scene.add(table);
  }
  const npcY = onTable ? 0.8 : 0.1;
  const icon = opts.icon || '💬';
  const npc = sprite(emoji(icon, 32), `em${icon}32`, lying ? 1.3 : 1.7, sc);
  npc.group.position.set(1.5, npcY, -0.3);
  sc.scene.add(npc.group);
  const extras = (opts.extras || []).map((ic, i) => {
    const s = sprite(emoji(ic, 20), `em${ic}20`, 0.7, sc);
    s.group.position.set(0.2 + i * 1.3, 1.9 + (i % 2) * 0.4, -1.2);
    s.shadow.visible = false;
    sc.scene.add(s.group);
    return s;
  });

  let fx;
  if (opts.theme === 'rest') {
    fx = motes(20, [0.5, 1.6, 0.4, -0.3], 0xe8e8f0, 2);
    fx.position.set(1.5, 1.8, 0);
  } else if (opts.theme === 'win' || opts.theme === 'reward') fx = motes(80, [10, 6, 6, 0], 0xffd166, 2);
  else if (lying) fx = motes(50, [8, 6, 6, 0], 0x6a2030, 2);
  else fx = motes(40, [14, 6, 8, -1], 0xc0c8ff, 1);
  sc.scene.add(fx);

  sc.setIcon = (ic) => {
    setSpriteTexture(npc, emoji(ic, 32), `em${ic}32`);
    burst(sc, new THREE.Vector3(1.5, npcY + 0.9, -0.3), 0xffd166, 24, false);
    flash('rgba(255,255,255,.5)');
  };
  sc.celebrate = () => burst(sc, new THREE.Vector3(-1.9, 1.2, 0.8), 0x8bd49c, 16, true);
  sc.update = (dt, t) => {
    blinkRacks(dt);
    stepMotes(fx, dt, opts.theme === 'rest' ? 0.7 : 0.5);
    npc.mesh.position.y = inTexels(Math.sin(t * 2) * 0.08, npc);
    if (!lying) bot.mesh.position.y = inTexels(Math.abs(Math.sin(t * 2.4)) * 0.05, bot);
    extras.forEach((e, i) => {
      e.mesh.position.y = inTexels(Math.sin(t * 2 + i) * 0.1, e);
    });
    // Locked camera: a sway makes the pixel art and dither crawl.
    camera.position.set(0, 1.9, 5.8);
    camera.lookAt(0, 1.05, 0);
  };
  return sc;
}
room.sceneName = 'room';
