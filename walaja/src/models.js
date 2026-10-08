import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// Semua model dibuat prosedural (low-poly, flat-shaded) tanpa aset eksternal.
// Arah hadap lokal: +Z. Titik asal: tengah alas di tanah.

const S = 1.2; // skala global prajurit, sedikit dilebihkan agar terbaca dari jauh.

const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _p = new THREE.Vector3();
const _s = new THREE.Vector3();

function T(x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) {
  _e.set(rx, ry, rz);
  _q.setFromEuler(_e);
  return new THREE.Matrix4().compose(_p.set(x, y, z), _q, _s.set(sx, sy, sz));
}

function paint(geometry, hex, matrix) {
  const g = geometry.index ? geometry.toNonIndexed() : geometry.clone();
  g.deleteAttribute('uv');
  if (matrix) g.applyMatrix4(matrix);
  const c = new THREE.Color(hex);
  const n = g.attributes.position.count;
  const arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    arr[i * 3] = c.r;
    arr[i * 3 + 1] = c.g;
    arr[i * 3 + 2] = c.b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  return g;
}

function finish(parts) {
  const g = mergeGeometries(parts, false);
  g.scale(S, S, S);
  g.computeBoundingSphere();
  return g;
}

const HALF_PI = Math.PI / 2;

export const PALETTES = {
  muslimInf: {
    base: '#2f6fb5',
    legs: '#6b5a45',
    tunic: '#e8dfc8',
    vest: '#7a5233',
    skin: '#b98962',
    hat: '#f1ece0',
    shield: '#a8743f',
    boss: '#a3a9b0',
    shaft: '#8a6a3f',
    tip: '#d4d8dd',
  },
  persianInf: {
    base: '#b23a34',
    legs: '#4a3a52',
    tunic: '#8f2a30',
    vest: '#8d97a6',
    skin: '#c79a73',
    hat: '#aeb6c2',
    plume: '#5b2a85',
    shield: '#a02f3a',
    rim: '#d6aa3c',
    shaft: '#6f5230',
    tip: '#c3c8cf',
  },
  muslimCav: {
    base: '#2f6fb5',
    horse: '#8b5a33',
    legs: '#6e4526',
    mane: '#2a1d14',
    robe: '#e8dfc8',
    skin: '#b98962',
    hat: '#f1ece0',
    shield: '#a8743f',
    shaft: '#8a6a3f',
    tip: '#d4d8dd',
  },
  persianCav: {
    base: '#b23a34',
    horse: '#6f7782',
    legs: '#59606a',
    mane: '#2a2530',
    barding: '#8a929e',
    cloth: '#8f2a30',
    robe: '#9aa3b0',
    skin: '#c79a73',
    hat: '#b7bfca',
    plume: '#5b2a85',
    shaft: '#6a4a2a',
    tip: '#c3c8cf',
  },
};

export function infantryGeometry(kind) {
  const p = PALETTES[kind];
  const persian = kind === 'persianInf';
  const parts = [];

  parts.push(paint(new THREE.CylinderGeometry(0.55, 0.58, 0.12, 10), p.base, T(0, 0.06, 0)));
  parts.push(paint(new THREE.CylinderGeometry(0.22, 0.26, 0.5, 6), p.legs, T(0, 0.37, 0)));
  parts.push(paint(new THREE.CylinderGeometry(0.3, 0.4, 1.0, 7), p.tunic, T(0, 1.0, 0)));
  parts.push(paint(new THREE.CylinderGeometry(0.36, 0.36, 0.55, 7), p.vest, T(0, 1.2, 0)));
  parts.push(paint(new THREE.IcosahedronGeometry(0.26, 0), p.skin, T(0, 1.78, 0)));

  if (persian) {
    parts.push(paint(new THREE.ConeGeometry(0.3, 0.5, 7), p.hat, T(0, 2.07, 0)));
    parts.push(paint(new THREE.BoxGeometry(0.08, 0.3, 0.2), p.plume, T(0, 2.25, -0.12, -0.5)));
    // Perisai besar persegi panjang.
    parts.push(paint(new THREE.BoxGeometry(0.85, 1.25, 0.1), p.shield, T(-0.46, 1.15, 0.3, 0, 0.25)));
    parts.push(paint(new THREE.BoxGeometry(0.89, 0.1, 0.13), p.rim, T(-0.46, 1.74, 0.3, 0, 0.25)));
  } else {
    parts.push(paint(new THREE.CylinderGeometry(0.29, 0.32, 0.2, 8), p.hat, T(0, 1.95, 0)));
    // Perisai kayu bundar.
    parts.push(paint(new THREE.CylinderGeometry(0.46, 0.46, 0.09, 12), p.shield, T(-0.44, 1.2, 0.3, HALF_PI, 0.3, 0)));
    parts.push(paint(new THREE.IcosahedronGeometry(0.12, 0), p.boss, T(-0.4, 1.2, 0.37)));
  }

  parts.push(paint(new THREE.CylinderGeometry(0.035, 0.035, 3.0, 4), p.shaft, T(0.46, 1.65, 0.3, 0.22)));
  parts.push(paint(new THREE.ConeGeometry(0.07, 0.3, 4), p.tip, T(0.46, 3.15, 0.69, 0.22)));
  return finish(parts);
}

export function cavalryGeometry(kind) {
  const p = PALETTES[kind];
  const armored = kind === 'persianCav';
  const parts = [];

  parts.push(paint(new THREE.CylinderGeometry(0.9, 0.9, 0.12, 12), p.base, T(0, 0.06, 0, 0, 0, 0, 1, 1, 2.2)));
  for (const [lx, lz] of [[-0.3, 0.75], [0.3, 0.75], [-0.3, -0.8], [0.3, -0.8]]) {
    parts.push(paint(new THREE.BoxGeometry(0.2, 1.0, 0.2), p.legs, T(lx, 0.62, lz)));
  }
  parts.push(paint(new THREE.BoxGeometry(0.95, 0.9, 2.2), p.horse, T(0, 1.55, 0)));
  parts.push(paint(new THREE.BoxGeometry(0.4, 1.0, 0.55), p.horse, T(0, 2.05, 1.1, 0.55)));
  parts.push(paint(new THREE.BoxGeometry(0.32, 0.34, 0.8), p.horse, T(0, 2.4, 1.72, 0.7)));
  parts.push(paint(new THREE.BoxGeometry(0.1, 0.9, 0.2), p.mane, T(0, 2.1, 0.95, 0.55)));
  parts.push(paint(new THREE.BoxGeometry(0.14, 0.8, 0.14), p.mane, T(0, 1.6, -1.2, -0.4)));

  if (armored) {
    parts.push(paint(new THREE.BoxGeometry(1.05, 0.85, 1.7), p.barding, T(0, 1.55, -0.05)));
    parts.push(paint(new THREE.BoxGeometry(1.1, 0.14, 1.75), p.cloth, T(0, 1.2, -0.05)));
    parts.push(paint(new THREE.BoxGeometry(0.38, 0.4, 0.5), p.barding, T(0, 2.47, 1.9, 0.7)));
  }

  // Penunggang.
  parts.push(paint(new THREE.CylinderGeometry(0.26, 0.34, 0.95, 7), p.robe, T(0, 2.5, -0.1)));
  parts.push(paint(new THREE.IcosahedronGeometry(0.26, 0), p.skin, T(0, 3.18, -0.1)));
  if (armored) {
    parts.push(paint(new THREE.ConeGeometry(0.3, 0.5, 7), p.hat, T(0, 3.47, -0.1)));
    parts.push(paint(new THREE.BoxGeometry(0.08, 0.34, 0.22), p.plume, T(0, 3.62, -0.26, -0.5)));
  } else {
    parts.push(paint(new THREE.CylinderGeometry(0.29, 0.32, 0.2, 8), p.hat, T(0, 3.35, -0.1)));
    parts.push(paint(new THREE.CylinderGeometry(0.38, 0.38, 0.07, 10), p.shield, T(-0.46, 2.55, 0.0, 0, 0, HALF_PI)));
  }
  const ang = 1.68;
  const dir = new THREE.Vector3(0, Math.cos(ang), Math.sin(ang));
  const len = armored ? 4.4 : 3.8;
  const mid = new THREE.Vector3(0.52, 2.55, 0.9);
  parts.push(paint(new THREE.CylinderGeometry(0.04, 0.04, len, 4), p.shaft, T(mid.x, mid.y, mid.z, ang)));
  const tip = mid.clone().addScaledVector(dir, len / 2 + 0.12);
  parts.push(paint(new THREE.ConeGeometry(0.07, 0.3, 4), p.tip, T(tip.x, tip.y, tip.z, ang)));
  return finish(parts);
}

export const MODEL_SCALE = S;
