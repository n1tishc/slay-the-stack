// Scene building blocks: textures, billboard sprites, platforms, particles and props.
import * as THREE from 'three';
import { shade } from '../art/canvas.js';
import { crackTexture, drawRack, floorTiles, gradient, pcb, platformTop, rackCanvas } from '../art/textures.js';
import { tween } from './stage.js';

const texCache = new Map();

// Nearest-filtered texture for a pixel canvas, cached by key.
export function tex(canvasEl, key, repeat) {
  const k = key + (repeat ? `:${repeat[0]}x${repeat[1]}` : '');
  if (texCache.has(k)) return texCache.get(k);
  const t = new THREE.CanvasTexture(canvasEl);
  t.magFilter = THREE.NearestFilter;
  t.minFilter = THREE.NearestFilter;
  t.generateMipmaps = false;
  t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(repeat[0], repeat[1]);
  }
  texCache.set(k, t);
  return t;
}

export function baseScene() {
  return { scene: new THREE.Scene(), billboards: [], pickables: [], anchors: {}, update() {} };
}

// A 2D pixel sprite standing on the ground (feet at y=0), with a blob shadow.
export function sprite(canvasEl, key, height, sc) {
  const w = height * (canvasEl.width / canvasEl.height);
  const geo = new THREE.PlaneGeometry(w, height);
  geo.translate(0, height / 2, 0);
  const mat = flashable(new THREE.MeshBasicMaterial({ map: tex(canvasEl, key), alphaTest: 0.5, side: THREE.DoubleSide }));
  const mesh = new THREE.Mesh(geo, mat);
  const group = new THREE.Group();
  group.add(mesh);
  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(w * 0.42, 16),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.35, depthWrite: false }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.scale.y = 0.45;
  shadow.position.y = 0.02;
  group.add(shadow);
  sc.billboards.push(mesh);
  // texel: world size of one sprite pixel, for moving sprites in whole-pixel steps.
  return { group, mesh, shadow, h: height, w, texel: height / canvasEl.height };
}

// Rounds an offset to whole sprite pixels, so idle motion steps instead of shimmering
// across the low-res screen (and its dither pattern).
export function inTexels(v, sp) {
  return Math.round(v / sp.texel) * sp.texel;
}

// Adds a uFlash uniform (0..1) that blends the sprite toward white: the classic hit flash.
function flashable(mat) {
  const flash = { value: 0 };
  mat.userData.flash = flash;
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uFlash = flash;
    shader.fragmentShader = `uniform float uFlash;\n${shader.fragmentShader}`.replace(
      '#include <dithering_fragment>',
      '#include <dithering_fragment>\n  gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(1.0), uFlash);',
    );
  };
  mat.customProgramCacheKey = () => 'flashable';
  return mat;
}

export function setSpriteTexture(sp, canvasEl, key) {
  sp.mesh.material.map = tex(canvasEl, key);
  sp.mesh.material.needsUpdate = true;
}

// Round battle base with a coloured rim, squashed into an ellipse.
export function platform(radius, col, rim) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius * 1.08, 0.22, 20),
    new THREE.MeshLambertMaterial({ color: shade(col, -0.55), flatShading: true }),
  );
  body.position.y = -0.02;
  g.add(body);
  const top = new THREE.Mesh(
    new THREE.CircleGeometry(radius * 0.98, 20),
    new THREE.MeshLambertMaterial({ map: tex(platformTop(col), `pt${col}`) }),
  );
  top.rotation.x = -Math.PI / 2;
  top.position.y = 0.095;
  g.add(top);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(radius * 1.02, 0.045, 4, 28), new THREE.MeshBasicMaterial({ color: rim || col }));
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.09;
  g.add(ring);
  g.scale.z = 0.62;
  g.userData.ring = ring;
  return g;
}

// Drifting pixel particles. area = [width, height, depth, zOffset].
export function motes(count, area, color, size = 1) {
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    pos[i * 3] = (Math.random() - 0.5) * area[0];
    pos[i * 3 + 1] = Math.random() * area[1];
    pos[i * 3 + 2] = (Math.random() - 0.5) * area[2] + (area[3] || 0);
  }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const pts = new THREE.Points(geo, new THREE.PointsMaterial({ color, size, sizeAttenuation: false }));
  pts.userData.area = area;
  return pts;
}

export function stepMotes(pts, dt, speed) {
  const a = pts.geometry.attributes.position;
  const h = pts.userData.area[1];
  for (let i = 0; i < a.count; i++) {
    let y = a.getY(i) + dt * speed * (0.5 + (i % 5) * 0.2);
    if (y > h) y = 0;
    a.setY(i, y);
  }
  a.needsUpdate = true;
}

// Burst of little squares (buffs, debuffs, loot).
export function burst(sc, pos, color, n = 14, up = false) {
  const group = new THREE.Group();
  const geo = new THREE.BoxGeometry(0.08, 0.08, 0.08);
  const mat = new THREE.MeshBasicMaterial({ color });
  const parts = [];
  for (let i = 0; i < n; i++) {
    const m = new THREE.Mesh(geo, mat);
    m.position.copy(pos);
    const v = new THREE.Vector3(
      (Math.random() - 0.5) * 2,
      up ? 1 + Math.random() * 2 : (Math.random() - 0.2) * 2.5,
      (Math.random() - 0.5) * 2,
    );
    parts.push({ m, v });
    group.add(m);
  }
  sc.scene.add(group);
  // Integrate per second of animation, not per frame, so 120 Hz screens match 60 Hz ones.
  const dur = 0.8;
  let prev = 0;
  tween(
    dur,
    (k) => {
      const dt = (k - prev) * dur;
      prev = k;
      parts.forEach((p) => {
        p.m.position.addScaledVector(p.v, 1.8 * dt);
        p.v.y -= up ? 0 : 3.6 * dt;
        p.m.scale.setScalar(1 - k);
      });
    },
    null,
  ).then(() => {
    sc.scene.remove(group);
    geo.dispose();
    mat.dispose();
  });
}

export function background(sc, top, bottom) {
  sc.scene.background = tex(gradient(top, bottom, 96), `bg${top}${bottom}`);
}

export function lights(sc, sky, ground, dirCol = 0xffffff, dirInt = 1.6) {
  sc.scene.add(new THREE.HemisphereLight(sky, ground, 2.2));
  const d = new THREE.DirectionalLight(dirCol, dirInt);
  d.position.set(-3, 6, 4);
  sc.scene.add(d);
}

export function tiledFloor(sc, size, tint) {
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(size, size),
    new THREE.MeshLambertMaterial({ map: tex(floorTiles(tint), `fl${tint}`, [size / 2, size / 2]) }),
  );
  floor.rotation.x = -Math.PI / 2;
  sc.scene.add(floor);
  return floor;
}

export function pcbGround(sc, w, d, cz = 0) {
  const g = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshLambertMaterial({ map: tex(pcb(), 'pcb', [w / 4, d / 4]) }));
  g.rotation.x = -Math.PI / 2;
  g.position.z = cz;
  sc.scene.add(g);
  return g;
}

// ───────── server racks (shared canvases whose LEDs blink) ─────────
const rackCanvases = [];
const rackTextures = [];
function rackMaterials(i) {
  if (!rackCanvases.length) {
    for (let k = 0; k < 3; k++) {
      rackCanvases.push(rackCanvas(k + 1));
      rackTextures.push(tex(rackCanvases[k], `rack${k}`));
    }
  }
  const side = new THREE.MeshLambertMaterial({ color: 0x1c1e2a });
  const front = new THREE.MeshLambertMaterial({ map: rackTextures[i % 3] });
  return [side, side, side, side, front, side];
}

let rackTick = 0;
export function blinkRacks(dt) {
  rackTick += dt;
  if (rackTick < 0.35) return;
  rackTick = 0;
  const k = (Math.random() * rackCanvases.length) | 0;
  if (!rackCanvases[k]) return;
  drawRack(rackCanvases[k], k + 1, Date.now() / 350);
  rackTextures[k].needsUpdate = true;
}

export function rackRow(sc, x0, x1, z, rotY = 0, h = 3.2) {
  const g = new THREE.Group();
  for (let x = x0, i = 0; x <= x1; x += 1.25, i++) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(1.15, h, 1), rackMaterials(i));
    m.position.set(x, h / 2, 0);
    g.add(m);
  }
  g.position.z = z;
  g.rotation.y = rotY;
  sc.scene.add(g);
  return g;
}

// ───────── props ─────────
// The Legacy Monolith: a cracked tower with a red beacon and smoke.
export function monolith(sc, x, z, scale = 1) {
  const g = new THREE.Group();
  const ct = tex(crackTexture(), 'crack');
  const tower = new THREE.Mesh(
    new THREE.BoxGeometry(2.4, 7.5, 2.4),
    new THREE.MeshLambertMaterial({ map: ct, emissive: 0xff2a3a, emissiveMap: ct, emissiveIntensity: 0.9 }),
  );
  tower.position.y = 3.75;
  g.add(tower);
  const cap = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.4, 2.8), new THREE.MeshLambertMaterial({ color: 0x241c2c }));
  cap.position.y = 7.6;
  g.add(cap);
  const beacon = new THREE.Mesh(new THREE.OctahedronGeometry(0.45, 0), new THREE.MeshBasicMaterial({ color: 0xff3348 }));
  beacon.position.y = 8.5;
  g.add(beacon);
  const light = new THREE.PointLight(0xff3348, 6, 18, 1.4);
  light.position.y = 8.2;
  g.add(light);
  g.position.set(x, 0, z);
  g.scale.setScalar(scale);
  sc.scene.add(g);
  const smoke = motes(40, [3, 9, 3, z], 0x7a2230, 2);
  smoke.position.x = x;
  sc.scene.add(smoke);
  return { group: g, tower, beacon, light, smoke };
}

export function chip(sc, x, z, s, rot = 0) {
  const g = new THREE.Group();
  const legs = new THREE.Mesh(new THREE.BoxGeometry(1.0 * s, 0.06, 0.8 * s), new THREE.MeshLambertMaterial({ color: 0xb9bfcc }));
  legs.position.y = 0.05;
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.8 * s, 0.24 * s, 0.8 * s), new THREE.MeshLambertMaterial({ color: 0x1b1d26 }));
  body.position.y = 0.12 * s + 0.05;
  const dot = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.02, 0.1), new THREE.MeshBasicMaterial({ color: 0xd8dde8 }));
  dot.position.set(-0.25 * s, 0.24 * s + 0.07, -0.25 * s);
  g.add(legs, body, dot);
  g.position.set(x, 0, z);
  g.rotation.y = rot;
  sc.scene.add(g);
  return g;
}

export function capacitor(sc, x, z, col) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(0.2, 0.2, 0.6, 8),
    new THREE.MeshLambertMaterial({ color: col, flatShading: true }),
  );
  body.position.y = 0.3;
  const top = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.05, 8), new THREE.MeshLambertMaterial({ color: 0xc8ccd6 }));
  top.position.y = 0.62;
  g.add(body, top);
  g.position.set(x, 0, z);
  sc.scene.add(g);
  return g;
}

// Flat ring on the ground (targets, selection, auras).
export function groundRing(inner, outer, color, opacity = 1) {
  const m = new THREE.Mesh(
    new THREE.RingGeometry(inner, outer, 24),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity, side: THREE.DoubleSide, depthWrite: false }),
  );
  m.rotation.x = -Math.PI / 2;
  return m;
}
