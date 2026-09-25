// Character select: a robot per model on platforms; the focused one is lit and the camera pans to it.
import * as THREE from 'three';
import { robot } from '../../art/robots.js';
import { CHARACTERS } from '../../game/data/characters.js';
import { background, baseScene, blinkRacks, lights, motes, platform, rackRow, sprite, stepMotes, tiledFloor } from '../kit.js';
import { camera, tween } from '../stage.js';

export function charSelect(opts) {
  const sc = baseScene();
  background(sc, '#0d1430', '#2b2350');
  sc.scene.fog = new THREE.Fog(0x1e1a3a, 12, 30);
  lights(sc, 0xdde4ff, 0x201830);
  tiledFloor(sc, 60, '#303a5c');
  rackRow(sc, -14, 14, -7);
  const ids = Object.keys(CHARACTERS);
  let focus = opts.focus || ids[0];
  const bots = {};
  ids.forEach((id, i) => {
    const x = (i - (ids.length - 1) / 2) * 2.6;
    const pl = platform(1.05, '#3b4466', CHARACTERS[id].color);
    pl.position.set(x, 0, 0);
    sc.scene.add(pl);
    const sp = sprite(robot(id, 'front'), `rf${id}`, 1.9, sc);
    sp.group.position.set(x, 0.1, 0);
    sp.mesh.userData.pick = { id };
    sc.pickables.push(sp.mesh);
    sc.scene.add(sp.group);
    const spot = new THREE.PointLight(new THREE.Color(CHARACTERS[id].color), 0, 6, 1.5);
    spot.position.set(x, 3, 1.5);
    sc.scene.add(spot);
    bots[id] = { sp, x, spot, pl };
    sc.anchors[`c:${id}`] = { obj: sp.group, y: 2.3 };
  });
  const mo = motes(60, [24, 6, 12, -2], 0xc0c8ff, 1);
  sc.scene.add(mo);
  let camX = bots[focus].x;
  sc.focus = (id) => {
    if (focus === id) return;
    focus = id;
    const b = bots[id];
    tween(
      0.35,
      (k) => {
        b.sp.mesh.position.y = Math.sin(k * Math.PI) * 0.5;
      },
      null,
    );
  };
  sc.click = (h) => {
    if (h.id) opts.onPick?.(h.id);
  };
  sc.hover = () => {};
  sc.update = (dt) => {
    stepMotes(mo, dt, 0.4);
    blinkRacks(dt);
    ids.forEach((id) => {
      const b = bots[id];
      const on = id === focus;
      b.spot.intensity += ((on ? 8 : 0) - b.spot.intensity) * Math.min(1, dt * 6);
      b.sp.mesh.material.color.setScalar(on ? 1 : 0.55);
      b.pl.userData.ring.material.color.set(on ? CHARACTERS[id].color : '#3b4466');
    });
    camX += (bots[focus].x * 0.75 - camX) * Math.min(1, dt * 4);
    camera.position.set(camX, 1.9, 5.6);
    camera.lookAt(camX * 1.1, 1.05, 0);
  };
  return sc;
}
charSelect.sceneName = 'charselect';
