// Title: the three models in front of the cracked Legacy Monolith, slow orbiting camera.
import * as THREE from 'three';
import { robot } from '../../art/robots.js';
import { CHARACTERS } from '../../game/data/characters.js';
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
import { camera } from '../stage.js';

export function title() {
  const sc = baseScene();
  background(sc, '#090b18', '#3a1426');
  sc.scene.fog = new THREE.Fog(0x1a0e1e, 12, 34);
  lights(sc, 0xc8c8ff, 0x201020, 0xffe0d0, 1.2);
  pcbGround(sc, 60, 60, -8);
  const mono = monolith(sc, 0, -9, 1.4);
  const bots = Object.keys(CHARACTERS).map((id, i) => {
    const x = (i - 1) * 2.3;
    const pl = platform(0.85, '#3b4466', CHARACTERS[id].color);
    pl.position.set(x, 0, 0.4 + (i === 1 ? -0.5 : 0));
    sc.scene.add(pl);
    const sp = sprite(robot(id, 'front'), `rf${id}`, 1.6, sc);
    sp.group.position.copy(pl.position);
    sp.group.position.y = 0.1;
    sc.scene.add(sp.group);
    return sp;
  });
  for (let i = 0; i < 40; i++) {
    const x = (Math.random() - 0.5) * 40;
    const z = -Math.random() * 26 - 2;
    if (Math.abs(x) < 3.5 && z > -12) continue;
    if (Math.random() < 0.5) chip(sc, x, z, 0.8 + Math.random(), (Math.random() - 0.5) * 0.3);
    else capacitor(sc, x, z, 0x2f5fb8);
  }
  const mo = motes(90, [30, 10, 24, -8], 0xff8090, 1);
  sc.scene.add(mo);
  sc.update = (dt, t) => {
    stepMotes(mo, dt, 0.6);
    stepMotes(mono.smoke, dt, 0.9);
    mono.beacon.rotation.y += dt * 2;
    mono.light.intensity = 6 + Math.sin(t * 3) * 3;
    bots.forEach((b, i) => {
      b.mesh.position.y = inTexels(Math.abs(Math.sin(t * 2.2 + i * 1.3)) * 0.12, b);
    });
    // Locked camera: a slow orbit makes the pixel art and dither crawl.
    camera.position.set(0, 2.1, 8);
    camera.lookAt(0, 2.2, -3);
  };
  return sc;
}
title.sceneName = 'title';
