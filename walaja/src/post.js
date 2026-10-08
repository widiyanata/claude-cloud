import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

// Tilt-shift + vignette + sedikit saturasi dalam satu pass, agar tampilan seperti miniatur.
const TiltShift = {
  uniforms: {
    tDiffuse: { value: null },
    uRes: { value: new THREE.Vector2(1, 1) },
    uBlur: { value: 2.6 },
    uFocus: { value: 0.5 },
    uBand: { value: 0.17 },
    uVig: { value: 0.32 },
    uSat: { value: 1.1 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform vec2 uRes;
    uniform float uBlur, uFocus, uBand, uVig, uSat;
    varying vec2 vUv;
    void main() {
      float d = abs(vUv.y - uFocus);
      float amt = smoothstep(uBand, uBand + 0.38, d) * uBlur;
      vec2 px = amt / uRes;
      vec3 col = texture2D(tDiffuse, vUv).rgb;
      float w = 1.0;
      for (int i = 0; i < 12; i++) {
        float fi = float(i);
        float r = sqrt((fi + 0.5) / 12.0);
        float a = fi * 2.39996;
        col += texture2D(tDiffuse, vUv + vec2(cos(a), sin(a)) * r * px).rgb;
        w += 1.0;
      }
      col /= w;
      float l = dot(col, vec3(0.2126, 0.7152, 0.0722));
      col = mix(vec3(l), col, uSat);
      float v = smoothstep(0.38, 0.98, length((vUv - 0.5) * vec2(1.0, 0.9)));
      col *= 1.0 - uVig * v;
      gl_FragColor = vec4(col, 1.0);
    }
  `,
};

export function createPost(renderer, scene, camera) {
  const size = renderer.getDrawingBufferSize(new THREE.Vector2());
  const target = new THREE.WebGLRenderTarget(size.x, size.y, { type: THREE.HalfFloatType, samples: 4 });
  const composer = new EffectComposer(renderer, target);
  composer.addPass(new RenderPass(scene, camera));
  const tilt = new ShaderPass(TiltShift);
  composer.addPass(tilt);
  composer.addPass(new OutputPass());

  const u = tilt.uniforms;
  const defaults = { blur: u.uBlur.value, vig: u.uVig.value };
  return {
    composer,
    resize(w, h) {
      composer.setPixelRatio(renderer.getPixelRatio());
      composer.setSize(w, h);
      const s = renderer.getDrawingBufferSize(new THREE.Vector2());
      u.uRes.value.set(s.x, s.y);
    },
    setTiltShift(on) {
      u.uBlur.value = on ? defaults.blur : 0;
      u.uVig.value = on ? defaults.vig : 0.1;
    },
  };
}
