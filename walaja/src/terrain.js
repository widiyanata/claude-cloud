import * as THREE from 'three';
import { fbm, mulberry32 } from './noise.js';

export const WORLD = { w: 340, d: 280 };

// Dua punggung bukit di belakang garis Muslim (z positif), melengkung mengelilingi medan.
export const RIDGES = [
  { x: 84, z: 52, rx: 23, rz: 10, rot: -1.0, h: 12 },
  { x: -84, z: 52, rx: 23, rz: 10, rot: 1.0, h: 12 },
];

const clamp01 = (t) => Math.min(1, Math.max(0, t));
const smooth01 = (t) => {
  t = clamp01(t);
  return t * t * (3 - 2 * t);
};

export function ridgeHeight(x, z) {
  let h = 0;
  for (const r of RIDGES) {
    const dx = x - r.x;
    const dz = z - r.z;
    const c = Math.cos(r.rot);
    const s = Math.sin(r.rot);
    const u = (dx * c + dz * s) / r.rx;
    const v = (-dx * s + dz * c) / r.rz;
    h += r.h * Math.exp(-(u * u + v * v));
  }
  return h;
}

export function heightAt(x, z) {
  const nx = Math.abs(x) / (WORLD.w / 2);
  const nz = Math.abs(z) / (WORLD.d / 2);
  const edge = smooth01((1 - Math.max(nx, nz)) / 0.07);
  // Medan pertempuran dibuat nyaris datar.
  const field = Math.hypot(x / 125, (z + 5) / 85);
  const flat = 0.1 + 0.9 * smooth01((field - 0.6) / 0.8);
  const dunes = fbm(x * 0.016 + 10, z * 0.016, 4) * 10 + fbm(x * 0.07, z * 0.07, 2) * 1.1;
  return (dunes * flat + ridgeHeight(x, z)) * edge;
}

const SAND = {
  flat: new THREE.Color('#e3c78c'),
  mid: new THREE.Color('#d6b274'),
  high: new THREE.Color('#c79b5d'),
  steep: new THREE.Color('#bc9358'),
  crest: new THREE.Color('#ead7a6'),
};

function sandTexture() {
  const size = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, size, size);
  const rnd = mulberry32(11);
  for (let i = 0; i < 70000; i++) {
    const dark = rnd() > 0.45;
    ctx.fillStyle = dark ? `rgba(120,85,40,${0.04 + rnd() * 0.07})` : `rgba(255,250,235,${0.25 + rnd() * 0.3})`;
    ctx.fillRect(rnd() * size, rnd() * size, 1 + rnd() * 1.5, 1);
  }
  // Tanah medan pertempuran sedikit lebih kering dan gelap.
  const g = ctx.createRadialGradient(size / 2, size * 0.5, 20, size / 2, size * 0.5, size * 0.38);
  g.addColorStop(0, 'rgba(130,95,50,0.16)');
  g.addColorStop(1, 'rgba(130,95,50,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return { canvas, ctx, tex, size };
}

// Jejak kaki dan tapak kuda digambar langsung ke tekstur tanah.
export function createTrample(base) {
  let dirty = false;
  const { ctx, tex, size } = base;
  return {
    stamp(x, z, r = 0.7, alpha = 0.1) {
      const px = (x / WORLD.w + 0.5) * size;
      const py = (z / WORLD.d + 0.5) * size;
      if (px < 0 || py < 0 || px > size || py > size) return;
      ctx.fillStyle = `rgba(95,66,34,${alpha})`;
      ctx.beginPath();
      ctx.ellipse(px, py, r * (size / WORLD.w), r * 1.25 * (size / WORLD.d), 0, 0, Math.PI * 2);
      ctx.fill();
      dirty = true;
    },
    flush() {
      if (dirty) {
        tex.needsUpdate = true;
        dirty = false;
      }
    },
  };
}

export function buildTerrain(scene) {
  const SX = 150;
  const SZ = 123;
  const plane = new THREE.PlaneGeometry(WORLD.w, WORLD.d, SX, SZ);
  plane.rotateX(-Math.PI / 2);
  const p = plane.attributes.position;
  for (let i = 0; i < p.count; i++) p.setY(i, heightAt(p.getX(i), p.getZ(i)));
  const geo = plane.toNonIndexed();
  geo.computeVertexNormals();

  const pos = geo.attributes.position;
  const nor = geo.attributes.normal;
  const colors = new Float32Array(pos.count * 3);
  const rnd = mulberry32(5);
  const c = new THREE.Color();
  for (let f = 0; f < pos.count; f += 3) {
    const hy = (pos.getY(f) + pos.getY(f + 1) + pos.getY(f + 2)) / 3;
    const ny = nor.getY(f);
    const t = clamp01(hy / 13);
    c.copy(SAND.flat).lerp(SAND.mid, clamp01(t * 2)).lerp(SAND.high, clamp01(t * 1.4 - 0.2));
    c.lerp(SAND.steep, clamp01((0.9 - ny) * 3.2) * 0.6);
    if (t > 0.78 && ny > 0.9) c.lerp(SAND.crest, 0.5);
    const v = 0.95 + rnd() * 0.1;
    c.multiplyScalar(v);
    for (let k = 0; k < 3; k++) {
      colors[(f + k) * 3] = c.r;
      colors[(f + k) * 3 + 1] = c.g;
      colors[(f + k) * 3 + 2] = c.b;
    }
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const base = sandTexture();
  const mat = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true, map: base.tex });
  const ground = new THREE.Mesh(geo, mat);
  ground.receiveShadow = true;
  scene.add(ground);

  // Penampang tanah di bawah medan, agar terlihat seperti diorama.
  const layers = [
    { h: 3, color: '#b98b54' },
    { h: 5, color: '#9d7342' },
    { h: 8, color: '#7c5a33' },
  ];
  let top = -0.05;
  for (const l of layers) {
    const m = new THREE.Mesh(
      new THREE.BoxGeometry(WORLD.w, l.h, WORLD.d),
      new THREE.MeshLambertMaterial({ color: l.color, flatShading: true }),
    );
    m.position.y = top - l.h / 2;
    top -= l.h;
    scene.add(m);
  }

  addProps(scene);
  return { ground, trample: createTrample(base) };
}

function addProps(scene) {
  const rnd = mulberry32(21);
  const rocks = new THREE.InstancedMesh(
    new THREE.IcosahedronGeometry(1, 0),
    new THREE.MeshLambertMaterial({ flatShading: true }),
    110,
  );
  const scrub = new THREE.InstancedMesh(
    new THREE.ConeGeometry(0.9, 1.5, 5),
    new THREE.MeshLambertMaterial({ flatShading: true }),
    80,
  );
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  const col = new THREE.Color();

  const pick = () => {
    for (let tries = 0; tries < 50; tries++) {
      const x = (rnd() - 0.5) * (WORLD.w - 24);
      const z = (rnd() - 0.5) * (WORLD.d - 24);
      if (Math.hypot(x / 120, (z + 5) / 82) > 1) return [x, z];
    }
    return [150, 120];
  };

  for (let i = 0; i < rocks.count; i++) {
    const [x, z] = pick();
    const s = 0.4 + rnd() * rnd() * 2.2;
    e.set(rnd() * 3, rnd() * 6, rnd() * 3);
    q.setFromEuler(e);
    m.compose(new THREE.Vector3(x, heightAt(x, z) + s * 0.25, z), q, new THREE.Vector3(s * 1.2, s * 0.7, s));
    rocks.setMatrixAt(i, m);
    rocks.setColorAt(i, col.set('#a58a63').offsetHSL(0, 0, (rnd() - 0.5) * 0.12));
  }
  for (let i = 0; i < scrub.count; i++) {
    const [x, z] = pick();
    const s = 0.5 + rnd() * 0.9;
    q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), rnd() * 6);
    m.compose(new THREE.Vector3(x, heightAt(x, z) + s * 0.55, z), q, new THREE.Vector3(s, s * (0.7 + rnd() * 0.5), s));
    scrub.setMatrixAt(i, m);
    scrub.setColorAt(i, col.set('#8b7a42').offsetHSL((rnd() - 0.5) * 0.04, 0, (rnd() - 0.5) * 0.1));
  }
  for (const mesh of [rocks, scrub]) {
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);
  }
}
