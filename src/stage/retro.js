// Handheld colour filter for the top screen: the scene is rendered into an offscreen target,
// then drawn to the canvas at 4 bits per channel with a 4×4 ordered dither, so gradients
// break into the crosshatch of old handheld screens instead of smooth bands.
import * as THREE from 'three';

const LEVELS = 15; // 16 steps per channel: coarse enough that the dither reads

let target = null;
let quad = null;
let postScene = null;
const postCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

export function initRetro() {
  // Half-float keeps dark scenes (the boss arena) from banding before we quantise.
  target = new THREE.WebGLRenderTarget(1, 1, {
    type: THREE.HalfFloatType,
    minFilter: THREE.NearestFilter,
    magFilter: THREE.NearestFilter,
  });
  const material = new THREE.ShaderMaterial({
    uniforms: { tScene: { value: target.texture }, uLevels: { value: LEVELS } },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = vec4(position.xy, 0.0, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      uniform sampler2D tScene;
      uniform float uLevels;
      varying vec2 vUv;
      const float BAYER[16] = float[16](0., 8., 2., 10., 12., 4., 14., 6., 3., 11., 1., 9., 15., 7., 13., 5.);
      vec3 toSRGB(vec3 c) {
        return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c));
      }
      void main() {
        // The target holds linear colour; quantise in sRGB, where the steps are perceptually even.
        vec3 c = toSRGB(clamp(texture2D(tScene, vUv).rgb, 0.0, 1.0));
        ivec2 p = ivec2(mod(gl_FragCoord.xy, 4.0));
        float d = BAYER[p.x + p.y * 4] / 16.0 - 0.5 + 1.0 / 32.0;
        gl_FragColor = vec4(clamp(floor(c * uLevels + 0.5 + d) / uLevels, 0.0, 1.0), 1.0);
      }`,
    depthTest: false,
    depthWrite: false,
  });
  quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
  quad.frustumCulled = false;
  postScene = new THREE.Scene();
  postScene.add(quad);
}

export function resizeRetro(w, h) {
  target?.setSize(w, h);
}

export function renderRetro(renderer, scene, camera) {
  renderer.setRenderTarget(target);
  renderer.render(scene, camera);
  renderer.setRenderTarget(null);
  renderer.render(postScene, postCamera);
}
