import * as THREE from 'three';
import { heightAt, RIDGES } from './terrain.js';
import { mulberry32 } from './noise.js';
import { infantryGeometry, cavalryGeometry } from './models.js';
import { Banner, derafshTexture, plainTexture } from './banners.js';
import { T_CONTACT, T_SIGNAL } from './timeline.js';

const MAT = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });

const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _p = new THREE.Vector3();
const _s = new THREE.Vector3();
const _m = new THREE.Matrix4();

function lerp(a, b, k) {
  return a + (b - a) * k;
}

// Jalur berbasis keyframe [t, x, z, psi, curve] dengan easing halus antar-key.
function keyTrack(keys) {
  const at = (k) => ({ x: k[1], z: k[2], psi: k[3], curve: k[4] ?? 0 });
  return (t) => {
    if (t <= keys[0][0]) return at(keys[0]);
    for (let i = 1; i < keys.length; i++) {
      if (t <= keys[i][0]) {
        const a = keys[i - 1];
        const b = keys[i];
        let k = (t - a[0]) / (b[0] - a[0]);
        k = k * k * (3 - 2 * k);
        return {
          x: lerp(a[1], b[1], k),
          z: lerp(a[2], b[2], k),
          psi: lerp(a[3], b[3], k),
          curve: lerp(a[4] ?? 0, b[4] ?? 0, k),
        };
      }
    }
    return at(keys[keys.length - 1]);
  };
}

// Jalur kavaleri: spline Catmull-Rom dengan profil kecepatan trapesium (akselerasi, melaju, melambat).
function pathTrack(points, t0, dur, accel = 0.16, decel = 0.22) {
  const curve = new THREE.CatmullRomCurve3(
    points.map(([x, z]) => new THREE.Vector3(x, 0, z)),
    false,
    'centripetal',
  );
  const vmax = 1 / (1 - (accel + decel) / 2);
  const profile = (s) => {
    if (s < accel) return (vmax * s * s) / (2 * accel);
    if (s <= 1 - decel) return vmax * (accel / 2 + (s - accel));
    return 1 - (vmax * (1 - s) * (1 - s)) / (2 * decel);
  };
  return (t) => {
    const s = Math.min(1, Math.max(0, (t - t0) / dur));
    const u = profile(s);
    const p = curve.getPointAt(u);
    const tan = curve.getTangentAt(Math.min(0.999, Math.max(0.001, u)));
    return { x: p.x, z: p.z, psi: Math.atan2(tan.x, tan.z), curve: 0 };
  };
}

export class Regiment {
  constructor({ name, mesh, slots, halfW, track, gait = 'foot', refSpeed = 4, scale = 1, tint }) {
    this.name = name;
    this.mesh = mesh;
    this.slots = slots;
    this.halfW = halfW;
    this.track = track;
    this.gait = gait;
    this.refSpeed = refSpeed;
    this.scale = scale;
    this.start = mesh.userData.used;
    mesh.userData.used += slots.length;
    this.wx = new Float32Array(slots.length);
    this.wz = new Float32Array(slots.length);
    this.state = { ...track(0), speed: 0 };

    const c = new THREE.Color();
    slots.forEach((s, i) => {
      const v = 0.86 + (s.ph / 6.3) * 0.26;
      c.setRGB(v, v, v);
      if (tint) c.multiply(tint);
      mesh.setColorAt(this.start + i, c);
    });
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }

  // Koordinat dunia dari posisi lokal (lx, lz) pada formasi saat ini.
  place(lx, lz) {
    const s = this.state;
    const u = this.halfW ? lx / this.halfW : 0;
    const z2 = lz + s.curve * (1 - u * u);
    const c = Math.cos(s.psi);
    const sn = Math.sin(s.psi);
    return { x: s.x + lx * c + z2 * sn, z: s.z - lx * sn + z2 * c };
  }

  update(t, now, play) {
    const s = this.track(t);
    let speed = 0;
    if (play) {
      const a = this.track(t - 0.1);
      const b = this.track(t + 0.1);
      speed = Math.hypot(b.x - a.x, b.z - a.z) / 0.2;
    }
    this.state = { ...s, speed };
    const c = Math.cos(s.psi);
    const sn = Math.sin(s.psi);
    const sf = Math.min(speed / this.refSpeed, 1.6);
    const foot = this.gait === 'foot';
    for (let i = 0; i < this.slots.length; i++) {
      const sl = this.slots[i];
      const lz = sl.lz0 + s.curve * (1 - sl.u * sl.u);
      const wx = s.x + sl.lx * c + lz * sn;
      const wz = s.z - sl.lx * sn + lz * c;
      let y = heightAt(wx, wz);
      let pitch = 0;
      let yaw = s.psi + sl.yaw + Math.sin(now * 0.9 + sl.ph) * 0.04 * (1 - Math.min(sf, 1));
      if (foot) {
        y += Math.abs(Math.sin(now * 9 + sl.ph)) * 0.16 * sf + Math.sin(now * 1.3 + sl.ph) * 0.012;
      } else {
        const w = Math.sin(now * 13 + sl.ph);
        y += w * 0.24 * sf;
        pitch = w * 0.1 * sf;
      }
      _e.set(pitch, yaw, 0, 'YXZ');
      _q.setFromEuler(_e);
      const k = sl.sc * this.scale;
      _m.compose(_p.set(wx, y, wz), _q, _s.set(k, k, k));
      this.mesh.setMatrixAt(this.start + i, _m);
      this.wx[i] = wx;
      this.wz[i] = wz;
    }
  }

  anchor(lx, lz, h) {
    const o = this.place(lx, lz);
    return new THREE.Vector3(o.x, heightAt(o.x, o.z) + h, o.z);
  }
}

function gridSlots(cols, rows, dx, dz, rnd, jitter = 0.14) {
  const halfW = (cols * dx) / 2;
  const slots = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const lx = (c - (cols - 1) / 2) * dx + (rnd() - 0.5) * 2 * jitter;
      slots.push({
        lx,
        lz0: ((rows - 1) / 2 - r) * dz + (rnd() - 0.5) * 2 * jitter,
        u: lx / halfW,
        sc: 0.95 + rnd() * 0.1,
        yaw: (rnd() - 0.5) * 0.24,
        ph: rnd() * 6.28,
      });
    }
  }
  return { slots, halfW };
}

const PI = Math.PI;

export function buildArmies(scene) {
  const rnd = mulberry32(99);
  const mk = (geo, cap) => {
    const m = new THREE.InstancedMesh(geo, MAT, cap);
    m.castShadow = true;
    m.receiveShadow = true;
    m.frustumCulled = false;
    m.userData.used = 0;
    scene.add(m);
    return m;
  };
  const meshes = {
    muslimInf: mk(infantryGeometry('muslimInf'), 140),
    persianInf: mk(infantryGeometry('persianInf'), 960),
    muslimCav: mk(cavalryGeometry('muslimCav'), 90),
    persianCav: mk(cavalryGeometry('persianCav'), 90),
  };

  const regiments = [];
  const banners = [];
  const labels = [];
  const add = (r) => {
    regiments.push(r);
    return r;
  };

  // ── Infanteri Sassanid: tiga resimen rapat, bergerak maju dan merapat ke tengah.
  const PCOLS = 26;
  const PROWS = 12;
  const persianGrid = () => gridSlots(PCOLS, PROWS, 1.5, 1.8, rnd);
  const pc = persianGrid();
  const persC = add(new Regiment({
    name: 'Infanteri berat Sassanid (tengah)',
    mesh: meshes.persianInf,
    ...pc,
    track: keyTrack([[0, 0, -26, 0], [2, 0, -26, 0], [8, 0, 0, 0], [23, 0, 18, 0], [26, 0, 18, 0], [38, 0, 8, 0]]),
  }));
  const pl = persianGrid();
  const persL = add(new Regiment({
    name: 'Sayap kiri Sassanid',
    mesh: meshes.persianInf,
    ...pl,
    track: keyTrack([[0, -43, -26, 0], [2, -43, -26, 0], [8, -43, 0, 0], [23, -44, 7, 0.3], [26, -44, 7, 0.3], [38, -42, 1, 0.4]]),
  }));
  const pr = persianGrid();
  const persR = add(new Regiment({
    name: 'Sayap kanan Sassanid',
    mesh: meshes.persianInf,
    ...pr,
    track: keyTrack([[0, 43, -26, 0], [2, 43, -26, 0], [8, 43, 0, 0], [23, 44, 7, -0.3], [26, 44, 7, -0.3], [38, 42, 1, -0.4]]),
  }));

  // ── Kataprak (kavaleri berat) mengikuti di belakang.
  const cat = (sign) => {
    const g = gridSlots(12, 3, 2.5, 3.9, rnd);
    return add(new Regiment({
      name: 'Kataprak',
      mesh: meshes.persianCav,
      ...g,
      gait: 'horse',
      refSpeed: 3,
      track: keyTrack([
        [0, sign * 36, -52, 0], [2, sign * 36, -52, 0], [8, sign * 34, -28, 0], [23, sign * 34, -17, 0], [26, sign * 34, -17, 0], [38, sign * 34, -21, 0],
      ]),
    }));
  };
  const catL = cat(-1);
  const catR = cat(1);

  // ── Andarzaghar dan pengawal di barisan belakang.
  const guardSlots = [{ lx: 0, lz0: 0, u: 0, sc: 1.3, yaw: 0, ph: 1 }];
  for (let i = 0; i < 8; i++) {
    const side = i % 2 === 0 ? -1 : 1;
    const row = Math.floor(i / 2);
    guardSlots.push({ lx: side * (4.5 + row * 3.2), lz0: -row * 1.6, u: 0, sc: 1.02, yaw: 0, ph: 2 + i });
  }
  const guard = add(new Regiment({
    name: 'Andarzaghar',
    mesh: meshes.persianCav,
    slots: guardSlots,
    halfW: 0,
    gait: 'horse',
    refSpeed: 3,
    track: keyTrack([[0, 0, -66, 0], [2, 0, -66, 0], [8, 0, -42, 0], [23, 0, -26, 0], [26, 0, -26, 0], [38, 0, -30, 0]]),
  }));
  meshes.persianCav.setColorAt(guard.start, new THREE.Color(1.25, 1.1, 0.7));
  meshes.persianCav.instanceColor.needsUpdate = true;

  // ── Infanteri pusat Muslim: tipis, melengkung ke luar, lalu "bertahan dan mundur".
  const MCOLS = 44;
  const mg = gridSlots(MCOLS, 3, 1.5, 1.8, rnd);
  const frontLz = 1.8;
  mg.slots.push({ lx: 0, lz0: frontLz + 2.6, u: 0, sc: 1.55, yaw: 0, ph: 3 }); // Khalid bin Walid
  const muslimInf = add(new Regiment({
    name: 'Infanteri pusat Muslim',
    mesh: meshes.muslimInf,
    ...mg,
    track: keyTrack([
      [0, 0, 16, PI, 5], [8, 0, 16, PI, 5], [22, 0, 25, PI, -9], [26, 0, 25, PI, -9], [38, 0, 19, PI, -2],
    ]),
  }));

  // ── Kavaleri ringan Muslim, tersembunyi di balik bukit, menyerbu pada sinyal.
  const cavPath = (sign) => {
    const r = RIDGES[sign > 0 ? 0 : 1];
    const out = [r.x * 1.12, r.z * 1.12 + 4];
    return [
      out,
      [sign * 80, 32],
      [sign * 74, 6],
      [sign * 66, -22],
      [sign * 54, -40],
      [sign * 34, -38],
      [sign * 14, -36],
    ];
  };
  const cav = (sign) => {
    const g = gridSlots(20, 2, 2.1, 3.4, rnd);
    return add(new Regiment({
      name: 'Kavaleri ringan Muslim',
      mesh: meshes.muslimCav,
      ...g,
      gait: 'horse',
      refSpeed: 12,
      track: pathTrack(cavPath(sign), T_SIGNAL, 11),
    }));
  };
  const cavL = cav(-1);
  const cavR = cav(1);

  // ── Panji.
  const persTex = plainTexture('#5b2a85', '#d6aa3c');
  const blackTex = plainTexture('#1a1a1a', '#3a3a3a');
  const whiteTex = plainTexture('#f1ede2', '#cfc7b3');
  const rowZ = (rows, dz, k) => ((rows - 1) / 2 - k) * dz;
  for (const [reg, ph] of [[persC, 0], [persL, 1.3], [persR, 2.6]]) {
    banners.push(new Banner({ tex: persTex, width: 3.8, height: 2.6, pole: 9, owner: reg, lx: 0, lz: rowZ(PROWS, 1.8, 3), phase: ph }));
  }
  banners.push(new Banner({ tex: derafshTexture(), width: 5.2, height: 3.9, pole: 10, owner: guard, lx: 0, lz: -1.2, phase: 0.5 }));
  banners.push(new Banner({ tex: blackTex, width: 3.6, height: 2.4, pole: 8, owner: muslimInf, lx: 1.6, lz: frontLz + 1.6, phase: 2 }));
  for (const [reg, ph] of [[cavL, 0.4], [cavR, 1.9]]) {
    banners.push(new Banner({ tex: whiteTex, width: 2.6, height: 1.7, pole: 6.4, owner: reg, lx: 0, lz: 0.6, phase: ph }));
  }
  banners.forEach((b) => scene.add(b.group));

  // ── Label (HTML) untuk unit penting.
  labels.push(
    { text: 'Khalid bin Walid', side: 'blue', get: () => muslimInf.anchor(0, frontLz + 2.6, 5.4) },
    { text: 'Andarzaghar', side: 'red', get: () => guard.anchor(0, 0, 6.2) },
    { text: 'Infanteri pusat (umpan)', side: 'blue', until: T_CONTACT, get: () => muslimInf.anchor(-14, 0, 4.4) },
    { text: 'Infanteri berat Sassanid', side: 'red', until: T_CONTACT, get: () => persC.anchor(-9, 7, 4.2) },
    { text: 'Kataprak', side: 'red', get: () => catR.anchor(0, 0, 5.6) },
    { text: 'Kavaleri ringan · tersembunyi', side: 'blue', phase: 'hidden', get: () => cavR.anchor(0, 0, 6.8) },
    { text: 'Kavaleri ringan · tersembunyi', side: 'blue', phase: 'hidden', get: () => cavL.anchor(0, 0, 6.8) },
  );

  return { regiments, banners, labels, meshes, cavalry: [cavL, cavR], infantry: { muslimInf, persC, persL, persR }, catL, catR };
}
