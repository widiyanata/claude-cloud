import { CAMERA, SHAKES } from './timeline.js';

// Evaluasi kamera sinematik pada waktu t. Murni fungsi waktu (dan posisi unit yang diikuti),
// sehingga pratinjau, seek, dan ekspor selalu menghasilkan gerak kamera yang sama.

const VERTICAL = { yaw: 47, width: 0.6 };
const DEG = Math.PI / 180;

const smooth = (k) => k * k * (3 - 2 * k);

function resolve(key, vertical, focus) {
  const v = vertical ? key.v ?? {} : {};
  let x;
  let z;
  if (v.at) [x, z] = v.at;
  else if (key.follow) ({ x, z } = focus[key.follow]());
  else [x, z] = key.at;
  const yaw = vertical ? v.yaw ?? key.yaw + VERTICAL.yaw : key.yaw;
  const width = vertical ? v.width ?? key.width * VERTICAL.width : key.width;
  return { x, z, yaw, width };
}

function shakeAt(t) {
  let a = 0;
  for (const s of SHAKES) {
    const d = t - s.t;
    if (d >= 0 && d < s.dur) a += s.amp * (1 - d / s.dur) ** 2;
  }
  return a;
}

/**
 * @param {number} t waktu skenario (detik)
 * @param {boolean} vertical format 9:16
 * @param {Record<string, () => {x:number, z:number}>} focus titik fokus yang bisa diikuti
 * @returns {{x:number, z:number, yaw:number, width:number}} titik fokus, yaw (radian), lebar pandang
 */
export function cameraShot(t, vertical, focus) {
  let s;
  if (t <= CAMERA[0].t) s = resolve(CAMERA[0], vertical, focus);
  else if (t >= CAMERA[CAMERA.length - 1].t) s = resolve(CAMERA[CAMERA.length - 1], vertical, focus);
  else {
    let i = 1;
    while (CAMERA[i].t < t) i++;
    const a = resolve(CAMERA[i - 1], vertical, focus);
    const b = resolve(CAMERA[i], vertical, focus);
    const k = smooth((t - CAMERA[i - 1].t) / (CAMERA[i].t - CAMERA[i - 1].t));
    s = {
      x: a.x + (b.x - a.x) * k,
      z: a.z + (b.z - a.z) * k,
      yaw: a.yaw + (b.yaw - a.yaw) * k,
      width: a.width + (b.width - a.width) * k,
    };
  }
  // Guncangan deterministik (jumlah sinus), sebanding dengan lebar pandang.
  const amp = shakeAt(t) * s.width * 0.008;
  return {
    x: s.x + amp * (Math.sin(t * 41.3) + 0.6 * Math.sin(t * 89.7 + 1.1)),
    z: s.z + amp * (Math.sin(t * 37.9 + 2.3) + 0.6 * Math.sin(t * 77.1 + 0.4)),
    yaw: s.yaw * DEG,
    width: s.width,
  };
}
