import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { buildTerrain, heightAt, WORLD } from './terrain.js';
import { buildArmies } from './army.js';
import { DustSystem } from './dust.js';
import { createPost } from './post.js';
import { END, PHASES, phaseAt, T_CONTACT, T_SIGNAL } from './timeline.js';

const $ = (id) => document.getElementById(id);

// ── Renderer, scene, kamera isometrik (orthographic) ──────────────────────────
const canvas = $('stage');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.NeutralToneMapping;

const HAZE = new THREE.Color('#f0dfb8');
const scene = new THREE.Scene();
scene.background = HAZE;
scene.fog = new THREE.Fog(HAZE, 430, 900);

const FRUSTUM = 138;
const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 1, 1200);
const POLAR = Math.acos(1 / Math.sqrt(3)); // 54.74° dari vertikal = isometrik sejati
const DIST = 420;
const START_YAW = THREE.MathUtils.degToRad(Number(new URLSearchParams(location.search).get('yaw') ?? 28));
const target0 = new THREE.Vector3(-13, 0, 31);
camera.position.set(
  target0.x + DIST * Math.sin(POLAR) * Math.sin(START_YAW),
  target0.y + DIST * Math.cos(POLAR),
  target0.z + DIST * Math.sin(POLAR) * Math.cos(START_YAW),
);

const controls = new OrbitControls(camera, canvas);
controls.target.copy(target0);
controls.enableDamping = true;
controls.dampingFactor = 0.12;
controls.minPolarAngle = controls.maxPolarAngle = POLAR;
controls.screenSpacePanning = false;
controls.minZoom = 0.7;
controls.maxZoom = 6;
controls.zoomSpeed = 0.9;
controls.rotateSpeed = 0.7;
controls.mouseButtons = { LEFT: THREE.MOUSE.PAN, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.ROTATE };
controls.touches = { ONE: THREE.TOUCH.PAN, TWO: THREE.TOUCH.DOLLY_ROTATE };
controls.update();

// ── Cahaya ────────────────────────────────────────────────────────────────────
scene.add(new THREE.HemisphereLight('#fff1d6', '#b99560', 1.15));
const sun = new THREE.DirectionalLight('#fff0cf', 2.4);
sun.position.set(-120, 170, 90);
sun.castShadow = true;
const shadowRes = Math.min(window.innerWidth, window.innerHeight) > 700 ? 4096 : 2048;
sun.shadow.mapSize.set(shadowRes, shadowRes);
Object.assign(sun.shadow.camera, { left: -185, right: 185, top: 185, bottom: -185, near: 20, far: 520 });
sun.shadow.bias = -0.0004;
sun.shadow.normalBias = 0.35;
scene.add(sun);
scene.add(sun.target);

// ── Dunia ─────────────────────────────────────────────────────────────────────
const { trample } = buildTerrain(scene);
const army = buildArmies(scene);
for (const m of Object.values(army.meshes)) m.count = m.userData.used;
const dust = new DustSystem();
scene.add(dust.points);
const post = createPost(renderer, scene, camera);

function resize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const aspect = w / h;
  const f = Math.max(FRUSTUM, 215 / aspect); // layar potret: perlebar area pandang
  camera.left = (-f * aspect) / 2;
  camera.right = (f * aspect) / 2;
  camera.top = f / 2;
  camera.bottom = -f / 2;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h, false);
  post.resize(w, h);
}
window.addEventListener('resize', resize);
resize();

// ── Label unit ────────────────────────────────────────────────────────────────
const labelRoot = $('labels');
const tags = army.labels.map((l) => {
  const el = document.createElement('div');
  el.className = `tag ${l.side}`;
  el.textContent = l.text;
  labelRoot.appendChild(el);
  return el;
});
let showLabels = true;
const _v = new THREE.Vector3();

function updateLabels(t) {
  army.labels.forEach((l, i) => {
    const el = tags[i];
    const text = l.phase === 'hidden' && t >= T_SIGNAL ? 'Kavaleri ringan · menyerbu' : l.text;
    if (el.textContent !== text) el.textContent = text;
    _v.copy(l.get()).project(camera);
    const visible = showLabels && (l.until === undefined || t <= l.until) && Math.abs(_v.x) < 1.05 && Math.abs(_v.y) < 1.05;
    el.classList.toggle('hide', !visible);
    el.style.left = `${(_v.x * 0.5 + 0.5) * window.innerWidth}px`;
    el.style.top = `${(-_v.y * 0.5 + 0.5) * window.innerHeight}px`;
  });
}

// ── Debu dan jejak ────────────────────────────────────────────────────────────
const rand = (a, b) => a + Math.random() * (b - a);
const WIND = new THREE.Vector2(1.6, 0.5);
const acc = new Map();

function emitFrom(reg, n, kind) {
  for (let k = 0; k < n; k++) {
    const i = (Math.random() * reg.slots.length) | 0;
    const x = reg.wx[i];
    const z = reg.wz[i];
    const y = heightAt(x, z) + 0.3;
    if (kind === 'horse') {
      dust.emit(x, y, z, WIND.x + rand(-1, 1), rand(0.8, 1.8), WIND.y + rand(-1, 1), 3.4, 9.5, 0.38, rand(3, 4.6));
    } else if (kind === 'clash') {
      dust.emit(x, y + 0.8, z, WIND.x + rand(-1.2, 1.2), rand(0.6, 1.4), WIND.y + rand(-1.2, 1.2), 3, 8.5, 0.36, rand(2.6, 4));
    } else {
      dust.emit(x, y, z, WIND.x * 0.6 + rand(-0.5, 0.5), rand(0.4, 0.9), WIND.y * 0.6 + rand(-0.5, 0.5), 1.6, 4.8, 0.34, rand(2.2, 3.4));
    }
  }
}

function emitDust(dt, t, playing) {
  const take = (key, perSec) => {
    const v = (acc.get(key) ?? 0) + perSec * dt;
    const n = Math.floor(v);
    acc.set(key, v - n);
    return n;
  };

  for (const r of army.regiments) {
    const sp = r.state.speed;
    if (sp < 0.3) continue;
    const horse = r.gait === 'horse';
    const rate = sp * Math.sqrt(r.slots.length) * (horse ? 1.05 : 0.35);
    emitFrom(r, take(r.name + r.start, rate), horse ? 'horse' : 'foot');
    // Jejak kaki dan tapak kuda di tanah.
    const stamps = Math.min(14, Math.round(sp * (horse ? 0.6 : 1.1) * dt * 60));
    for (let k = 0; k < stamps; k++) {
      const i = (Math.random() * r.slots.length) | 0;
      trample.stamp(r.wx[i] + rand(-0.6, 0.6), r.wz[i] + rand(-0.6, 0.6), horse ? 0.9 : 0.55, horse ? 0.07 : 0.045);
    }
  }

  // Debu benturan di garis kontak (hanya baris depan).
  if (playing && t > T_CONTACT && t < T_SIGNAL + 9) {
    const { muslimInf, persC, persL, persR } = army.infantry;
    emitFrom({ ...muslimInf, slots: muslimInf.slots.slice(0, 44) }, take('clashM', 20), 'clash');
    for (const [k, p] of [['c', persC], ['l', persL], ['r', persR]]) {
      emitFrom({ ...p, slots: p.slots.slice(0, 26) }, take(`clash${k}`, 8), 'clash');
    }
  }

  // Debu angin yang melintas pelan di seluruh medan.
  for (let n = take('wind', 5); n > 0; n--) {
    const x = rand(-130, 130);
    const z = rand(-90, 90);
    dust.emit(x, heightAt(x, z) + rand(0.5, 3), z, 2.4 + rand(-0.4, 0.4), rand(0.1, 0.4), 0.7 + rand(-0.4, 0.4), 6, 14, 0.14, rand(8, 12));
  }
}

// ── Kendali waktu dan UI ──────────────────────────────────────────────────────
let t = 0;
let playing = false;

const btnPlay = $('btn-play');
const phaseName = $('phase-name');
const phaseText = $('phase-text');
const playhead = $('playhead');
const signalCue = $('signal');
const timeline = $('timeline');
const segs = [...timeline.querySelectorAll('.seg')];
segs.forEach((s, i) => (s.style.flex = String(PHASES[i].to - PHASES[i].from)));

function syncButton() {
  btnPlay.textContent = playing ? 'Jeda' : t >= END ? 'Putar ulang' : t > 0 ? 'Lanjutkan' : 'Putar pratinjau';
}

function syncHud() {
  const ph = phaseAt(t);
  phaseName.textContent = t >= END ? 'Pengepungan ganda selesai' : ph.name;
  phaseText.textContent =
    t >= END
      ? 'Pratinjau visual berakhir. Simulasi pertempuran (korban, moral, AI) belum diimplementasikan.'
      : ph.text;
  segs.forEach((s, i) => {
    const p = PHASES[i];
    s.style.setProperty('--fill', `${Math.min(1, Math.max(0, (t - p.from) / (p.to - p.from))) * 100}%`);
  });
  playhead.style.left = `${(t / END) * 100}%`;
  signalCue.classList.toggle('on', t >= T_SIGNAL && t < T_SIGNAL + 3);
}

function seek(time) {
  t = Math.min(END, Math.max(0, time));
  syncHud();
  syncButton();
}

btnPlay.addEventListener('click', () => {
  if (t >= END) seek(0);
  playing = !playing;
  syncButton();
});
$('btn-reset').addEventListener('click', () => {
  playing = false;
  seek(0);
});
$('chk-labels').addEventListener('change', (e) => (showLabels = e.target.checked));
$('chk-tilt').addEventListener('change', (e) => post.setTiltShift(e.target.checked));
timeline.addEventListener('click', (e) => {
  const r = timeline.getBoundingClientRect();
  seek(((e.clientX - r.left) / r.width) * END);
});

// Putar kamera dengan Q / E.
const keys = new Set();
window.addEventListener('keydown', (e) => keys.add(e.key.toLowerCase()));
window.addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()));
const UP = new THREE.Vector3(0, 1, 0);
const _off = new THREE.Vector3();
function rotateCamera(a) {
  _off.copy(camera.position).sub(controls.target).applyAxisAngle(UP, a);
  camera.position.copy(controls.target).add(_off);
}
const LIMIT = { x: WORLD.w / 2 - 30, z: WORLD.d / 2 - 30 };
function clampTarget() {
  const tg = controls.target;
  const cx = Math.min(LIMIT.x, Math.max(-LIMIT.x, tg.x)) - tg.x;
  const cz = Math.min(LIMIT.z, Math.max(-LIMIT.z, tg.z)) - tg.z;
  if (cx || cz) {
    tg.x += cx;
    tg.z += cz;
    camera.position.x += cx;
    camera.position.z += cz;
  }
}

// ── Loop ──────────────────────────────────────────────────────────────────────
let last = performance.now();
let frameNo = 0;

function frame(ms) {
  const dt = Math.min(0.05, (ms - last) / 1000);
  last = ms;
  const now = ms / 1000;

  if (playing) {
    t += dt;
    if (t >= END) {
      t = END;
      playing = false;
      syncButton();
    }
    syncHud();
  }

  if (keys.has('q')) rotateCamera(1.3 * dt);
  if (keys.has('e')) rotateCamera(-1.3 * dt);

  for (const r of army.regiments) r.update(t, now, playing);
  for (const m of Object.values(army.meshes)) m.instanceMatrix.needsUpdate = true;
  for (const b of army.banners) b.update(now);

  emitDust(dt, t, playing);
  const px = renderer.domElement.height / ((camera.top - camera.bottom) / camera.zoom);
  dust.update(dt, px);
  if (frameNo++ % 6 === 0) trample.flush();

  controls.update();
  clampTarget();
  updateLabels(t);
  post.composer.render();
  requestAnimationFrame(frame);
}

syncHud();
syncButton();
requestAnimationFrame(frame);

// Hook sederhana untuk pengujian/screenshot.
window.walaja = {
  seek,
  play: () => {
    playing = true;
    syncButton();
  },
  pause: () => {
    playing = false;
    syncButton();
  },
  yaw: (deg) => {
    const cur = Math.atan2(camera.position.x - controls.target.x, camera.position.z - controls.target.z);
    rotateCamera(THREE.MathUtils.degToRad(deg) - cur);
  },
  target: (x, z) => {
    camera.position.x += x - controls.target.x;
    camera.position.z += z - controls.target.z;
    controls.target.set(x, 0, z);
  },
  zoom: (z) => {
    camera.zoom = z;
    camera.updateProjectionMatrix();
  },
  get t() {
    return t;
  },
};
