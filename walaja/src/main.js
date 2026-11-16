import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { buildTerrain, heightAt, WORLD } from './terrain.js';
import { buildArmies } from './army.js';
import { DustSystem } from './dust.js';
import { createPost } from './post.js';
import { drawOverlay } from './overlay.js';
import { encodeVideo } from './export.js';
import { cameraShot } from './camera.js';
import { mulberry32 } from './noise.js';
import { END, PHASES, phaseAt, T_CONTACT, T_SIGNAL } from './timeline.js';

const $ = (id) => document.getElementById(id);

// ── Renderer, scene, kamera isometrik (orthographic) ──────────────────────────
const canvas = $('stage');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
const DPR = Math.min(window.devicePixelRatio, 2);
renderer.setPixelRatio(DPR);
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
controls.minZoom = 0.35;
controls.maxZoom = 6;
controls.zoomSpeed = 0.9;
controls.rotateSpeed = 0.7;
controls.mouseButtons = { LEFT: THREE.MOUSE.PAN, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.ROTATE };
controls.touches = { ONE: THREE.TOUCH.PAN, TWO: THREE.TOUCH.DOLLY_ROTATE };
controls.update();

// ── Cahaya ────────────────────────────────────────────────────────────────────
scene.add(new THREE.HemisphereLight('#fff1d6', '#b99560', 1.15));
const sun = new THREE.DirectionalLight('#fff0cf', 2.4);
const SUN_BASE = new THREE.Vector3(-120, 170, 90);
sun.position.copy(SUN_BASE);
sun.castShadow = true;
sun.shadow.mapSize.set(4096, 4096);
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

// ── Format video dan bingkai pratinjau ────────────────────────────────────────
const FORMATS = { '16:9': 16 / 9, '9:16': 9 / 16 };
let format = '16:9';
const overlay = $('overlay');
const octx = overlay.getContext('2d');

function videoSize(fmt, quality) {
  const short = Number(quality);
  return fmt === '16:9' ? [Math.round((short * 16) / 9), short] : [short, Math.round((short * 16) / 9)];
}

// Persegi terbesar dengan rasio format, di tengah layar: area yang akan terekam.
function frameRect(vw, vh) {
  const aspect = FORMATS[format];
  let w = vw;
  let h = vw / aspect;
  if (h > vh) {
    h = vh;
    w = vh * aspect;
  }
  return { x: (vw - w) / 2, y: (vh - h) / 2, w, h };
}

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
  overlay.width = Math.round(w * DPR);
  overlay.height = Math.round(h * DPR);
}
window.addEventListener('resize', resize);
resize();

// Sudut dan titik tengah kamera per format. Pada 9:16 kamera diputar ±75° sehingga garis
// pertempuran tegak: Muslim di kiri, Sassanid di kanan, kedua bukit di atas dan bawah.
// Matahari ikut diputar agar pencahayaan relatif terhadap kamera tetap sama.
const VIEWS = {
  '16:9': { target: new THREE.Vector3(-13, 0, 31), yaw: START_YAW, width: 0 },
  '9:16': { target: new THREE.Vector3(0, 0, -2), yaw: START_YAW + THREE.MathUtils.degToRad(47), width: 138 },
};

function applyFormatView() {
  const v = VIEWS[format];
  camera.position.add(_shift.copy(v.target).sub(controls.target));
  controls.target.copy(v.target);
  const cur = Math.atan2(camera.position.x - controls.target.x, camera.position.z - controls.target.z);
  rotateCamera(v.yaw - cur);
  sun.position.copy(SUN_BASE).applyAxisAngle(UP, v.yaw - START_YAW);
  fitZoom();
  controls.update();
}
const _shift = new THREE.Vector3();

function fitZoom() {
  const r = frameRect(window.innerWidth, window.innerHeight);
  const worldW = ((camera.right - camera.left) * r.w) / window.innerWidth;
  const want = VIEWS[format].width;
  camera.zoom = want ? THREE.MathUtils.clamp(worldW / want, controls.minZoom, 1) : 1;
  camera.updateProjectionMatrix();
}

// ── Kamera sinematik ──────────────────────────────────────────────────────────
let cinematic = true;

// Menempatkan kamera menurut daftar shot. rect adalah bingkai video di dalam area render
// (vw × vh); lebar pandang shot dipetakan ke lebar bingkai itu.
function placeCinematic(time, vw, vh, rect) {
  const s = cameraShot(time, format === '9:16', army.focus);
  camera.position.set(
    s.x + DIST * Math.sin(POLAR) * Math.sin(s.yaw),
    DIST * Math.cos(POLAR),
    s.z + DIST * Math.sin(POLAR) * Math.cos(s.yaw),
  );
  camera.lookAt(s.x, 0, s.z);
  controls.target.set(s.x, 0, s.z);
  const fullW = s.width * (vw / rect.w);
  const fullH = fullW * (vh / vw);
  camera.left = -fullW / 2;
  camera.right = fullW / 2;
  camera.top = fullH / 2;
  camera.bottom = -fullH / 2;
  camera.zoom = 1;
  camera.updateProjectionMatrix();
}

function setCinematic(on) {
  cinematic = on;
  controls.enabled = !on;
  if (!on) {
    resize();
    applyFormatView();
  }
}

// ── Label unit (digambar di overlay, ikut terekam) ────────────────────────────
let showLabels = true;
const _v = new THREE.Vector3();

function collectLabels(t, viewW, viewH, rect) {
  if (!showLabels) return [];
  const out = [];
  for (const l of army.labels) {
    if (l.until !== undefined && t > l.until) continue;
    _v.copy(l.get()).project(camera);
    const x = (_v.x * 0.5 + 0.5) * viewW - rect.x;
    const y = (-_v.y * 0.5 + 0.5) * viewH - rect.y;
    if (x < 0 || y < 0 || x > rect.w || y > rect.h) continue;
    const text = l.phase === 'hidden' && t >= T_SIGNAL ? 'Kavaleri ringan · menyerbu' : l.text;
    out.push({ x, y, text, side: l.side });
  }
  return out;
}

// ── Debu dan jejak (deterministik: angka acak ber-seed) ───────────────────────
let rng = mulberry32(7);
const rand = (a, b) => a + rng() * (b - a);
const WIND = new THREE.Vector2(1.6, 0.5);
const acc = new Map();

// Titik acak di lintasan prajurit selama langkah terakhir, agar debu dan jejak tidak
// menumpuk di posisi per frame (penting saat merender dengan langkah waktu besar).
let stepDt = 0;
function along(reg, i) {
  const u = rng() * stepDt;
  return [reg.wx[i] - reg.state.vx * u, reg.wz[i] - reg.state.vz * u];
}

function emitFrom(reg, n, kind) {
  for (let k = 0; k < n; k++) {
    const i = (rng() * reg.slots.length) | 0;
    const [x, z] = along(reg, i);
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
    for (let k = take(`step${r.start}${r.name}`, sp * (horse ? 36 : 66)); k > 0; k--) {
      const [x, z] = along(r, (rng() * r.slots.length) | 0);
      trample.stamp(x + rand(-0.6, 0.6), z + rand(-0.6, 0.6), horse ? 0.9 : 0.55, horse ? 0.06 : 0.035);
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

// ── Satu langkah dunia ────────────────────────────────────────────────────────
let t = 0;
let playing = false;
let clock = 0; // waktu animasi (langkah kaki, kibar panji)

function pxPerUnit() {
  return renderer.domElement.height / ((camera.top - camera.bottom) / camera.zoom);
}

function stepWorld(dt, moving) {
  clock += dt;
  stepDt = dt;
  for (const r of army.regiments) r.update(t, clock, moving);
  for (const m of Object.values(army.meshes)) m.instanceMatrix.needsUpdate = true;
  for (const b of army.banners) b.update(clock);
  emitDust(dt, t, moving);
  dust.update(dt, pxPerUnit());
}

function resetWorld() {
  rng = mulberry32(7);
  acc.clear();
  dust.clear();
  trample.reset();
  clock = 0;
  t = 0;
}

// ── Kendali waktu dan UI ──────────────────────────────────────────────────────
const btnPlay = $('btn-play');
const phaseName = $('phase-name');
const playhead = $('playhead');
const timeline = $('timeline');
const segs = [...timeline.querySelectorAll('.seg')];
segs.forEach((s, i) => (s.style.flex = String(PHASES[i].to - PHASES[i].from)));

function syncButton() {
  btnPlay.textContent = playing ? 'Jeda' : t >= END ? 'Putar ulang' : t > 0 ? 'Lanjutkan' : 'Putar pratinjau';
}

function syncHud() {
  phaseName.textContent = t >= END ? 'Pengepungan ganda selesai' : phaseAt(t).name;
  segs.forEach((s, i) => {
    const p = PHASES[i];
    s.style.setProperty('--fill', `${Math.min(1, Math.max(0, (t - p.from) / (p.to - p.from))) * 100}%`);
  });
  playhead.style.left = `${(t / END) * 100}%`;
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
$('chk-cine').addEventListener('change', (e) => setCinematic(e.target.checked));
timeline.addEventListener('click', (e) => {
  const r = timeline.getBoundingClientRect();
  seek(((e.clientX - r.left) / r.width) * END);
});
$('sel-format').addEventListener('change', (e) => {
  format = e.target.value;
  applyFormatView();
});

function toggleClean() {
  document.body.classList.toggle('clean');
}
$('btn-clean').addEventListener('click', toggleClean);

// Putar kamera dengan Q / E; H menyembunyikan UI.
const keys = new Set();
window.addEventListener('keydown', (e) => {
  if (e.target instanceof HTMLSelectElement) return;
  const k = e.key.toLowerCase();
  if (k === 'h') toggleClean();
  keys.add(k);
});
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

// ── Overlay pratinjau ─────────────────────────────────────────────────────────
function drawPreviewOverlay() {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const r = frameRect(vw, vh);
  octx.setTransform(DPR, 0, 0, DPR, 0, 0);
  octx.clearRect(0, 0, vw, vh);
  if (r.w < vw - 2 || r.h < vh - 2) {
    // Gelapkan area di luar bingkai video.
    octx.fillStyle = 'rgba(30, 20, 10, 0.5)';
    octx.beginPath();
    octx.rect(0, 0, vw, vh);
    octx.rect(r.x, r.y, r.w, r.h);
    octx.fill('evenodd');
    octx.strokeStyle = 'rgba(247, 237, 212, 0.7)';
    octx.lineWidth = 1;
    octx.strokeRect(r.x + 0.5, r.y + 0.5, r.w - 1, r.h - 1);
  }
  octx.save();
  octx.beginPath();
  octx.rect(r.x, r.y, r.w, r.h);
  octx.clip();
  octx.translate(r.x, r.y);
  drawOverlay(octx, r.w, r.h, t, { labels: collectLabels(t, vw, vh, r) });
  octx.restore();
}

// ── Loop interaktif ───────────────────────────────────────────────────────────
let last = performance.now();
let frameNo = 0;
let exporting = false;

function frame(ms) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (ms - last) / 1000);
  last = ms;
  if (exporting) return;

  if (playing) {
    t += dt;
    if (t >= END) {
      t = END;
      playing = false;
      syncButton();
    }
    syncHud();
  }

  stepWorld(dt, playing);
  if (frameNo++ % 6 === 0) trample.flush();

  if (cinematic) {
    placeCinematic(t, window.innerWidth, window.innerHeight, frameRect(window.innerWidth, window.innerHeight));
  } else {
    if (keys.has('q')) rotateCamera(1.3 * dt);
    if (keys.has('e')) rotateCamera(-1.3 * dt);
    controls.update();
    clampTarget();
  }
  post.composer.render();
  drawPreviewOverlay();
}

// ── Ekspor video ──────────────────────────────────────────────────────────────
const TAIL = 2; // detik tambahan di akhir agar kartu penutup sempat terbaca
const modal = $('export-modal');
const bar = $('export-bar');
const status = $('export-status');
let abort = null;

$('btn-cancel').addEventListener('click', () => abort?.abort());

async function exportVideo(opts = {}) {
  if (exporting) return null;
  const fps = Number(opts.fps ?? $('sel-fps').value);
  const speed = Number(opts.speed ?? $('sel-speed').value);
  const [W, H] = opts.width ? [opts.width, opts.height] : videoSize(format, $('sel-quality').value);
  const frames = Math.min(opts.maxFrames ?? Infinity, Math.ceil((END / speed + TAIL) * fps));
  const simDt = speed / fps;

  exporting = true;
  playing = false;
  controls.enabled = false;
  // Pastikan orientasi kamera sesuai posisinya; loop interaktif mungkin belum sempat memperbaruinya.
  controls.update();
  camera.lookAt(controls.target);
  modal.hidden = false;
  bar.style.width = '0%';
  status.textContent = 'Menyiapkan…';
  abort = new AbortController();

  // Kamera manual: kamera ekspor = bagian bingkai pratinjau, dengan skala dunia yang sama.
  // Kamera sinematik: ditempatkan ulang tiap frame menurut daftar shot.
  if (!cinematic) {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const r = frameRect(vw, vh);
    const fw = camera.right - camera.left;
    const fh = camera.top - camera.bottom;
    const l0 = camera.left;
    const t0 = camera.top;
    camera.left = l0 + (r.x / vw) * fw;
    camera.right = l0 + ((r.x + r.w) / vw) * fw;
    camera.top = t0 - (r.y / vh) * fh;
    camera.bottom = t0 - ((r.y + r.h) / vh) * fh;
    camera.updateProjectionMatrix();
  }
  renderer.setPixelRatio(1);
  renderer.setSize(W, H, false);
  post.resize(W, H);

  const comp = document.createElement('canvas');
  comp.width = W;
  comp.height = H;
  const cctx = comp.getContext('2d');
  const full = { x: 0, y: 0, w: W, h: H };

  // Mulai dari kondisi yang sama setiap kali; isi debu angin dulu agar frame pertama tidak kosong.
  resetWorld();
  for (let i = 0; i < 60; i++) stepWorld(0.1, false);
  clock = 0;

  const started = performance.now();
  let result = null;
  let error = null;
  try {
    result = await encodeVideo({
      width: W,
      height: H,
      fps,
      frames,
      signal: abort.signal,
      renderFrame: (i) => {
        t = Math.min(END, i * simDt);
        stepWorld(simDt, t < END);
        if (cinematic) placeCinematic(t, W, H, full);
        trample.flush();
        post.composer.render();
        cctx.drawImage(renderer.domElement, 0, 0, W, H);
        drawOverlay(cctx, W, H, t, { labels: collectLabels(t, W, H, full) });
        return comp;
      },
      onProgress: (done, total) => {
        bar.style.width = `${(done / total) * 100}%`;
        const el = (performance.now() - started) / 1000;
        const eta = (el / done) * (total - done);
        status.textContent = `Frame ${done} / ${total} · sisa ±${Math.ceil(eta)} dtk`;
      },
    });
  } catch (e) {
    error = e;
  }

  // Kembalikan tampilan interaktif (resize() memulihkan frustum kamera manual).
  renderer.setPixelRatio(DPR);
  resize();
  controls.enabled = !cinematic;
  exporting = false;
  seek(0);

  if (error) {
    status.textContent = `Gagal: ${error.message}`;
    console.error(error);
    setTimeout(() => (modal.hidden = true), 6000);
    return null;
  }
  modal.hidden = true;
  if (!result) return null;

  const name = `walaja-${format.replace(':', 'x')}-${H > W ? W : H}p-${fps}fps.${result.ext}`;
  const url = URL.createObjectURL(result.blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
  return { name, size: result.blob.size, codec: result.codec, frames };
}

$('btn-export').addEventListener('click', () => exportVideo());

setCinematic(true);
syncHud();
syncButton();
requestAnimationFrame(frame);

// Hook sederhana untuk pengujian/screenshot.
window.walaja = {
  seek,
  exportVideo,
  setCinematic: (on) => {
    $('chk-cine').checked = on;
    setCinematic(on);
  },
  setFormat: (f) => {
    format = f;
    $('sel-format').value = f;
    applyFormatView();
  },
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
