// Naskah pratinjau: seluruh posisi adalah fungsi waktu t (detik), sehingga bisa di-seek.
// Fase 1 diberi jeda pembuka agar kartu judul dan narasi pertama sempat terbaca di video.
export const END = 44;
export const T_CONTACT = 12;
export const T_SIGNAL = 27;

export const TITLE = {
  title: 'Pertempuran Walaja',
  subtitle: 'Mei 633 M · Mesopotamia',
  from: 0.4,
  to: 5,
};

export const OUTRO = {
  title: 'Pengepungan Ganda',
  subtitle: 'Pasukan Sassanid terkunci dari segala sisi',
  from: END - 5,
  to: Infinity,
};

export const PHASES = [
  {
    from: 0,
    to: 6,
    name: 'Fase 1 · Formasi awal',
    text: 'Garis Sassanid panjang dan tebal. Infanteri Muslim tipis melengkung ke luar; kavaleri bersembunyi di balik bukit.',
  },
  {
    from: 6,
    to: 12,
    name: 'Fase 2 · Benturan pertama',
    text: 'Sassanid maju frontal. Infanteri pusat bertahan, lalu mulai melangkah mundur.',
  },
  {
    from: 12,
    to: 27,
    name: 'Fase 3 · Umpan termakan',
    text: 'Garis Muslim melengkung ke dalam (huruf U). Sayap Sassanid merapat ke tengah dan membuka sisi luarnya.',
  },
  {
    from: 27,
    to: END,
    name: 'Fase 4 · Penjepit',
    text: 'Sinyal diberikan. Kavaleri menyerbu dari kedua bukit dan menjepit Sassanid dari belakang.',
  },
];

// Kamera sinematik. Tiap key: kamera tiba di keadaan ini pada waktu t; di antara key ada transisi halus.
// at: titik fokus [x, z] atau follow: nama titik fokus yang bergerak (army.focus).
// yaw: sudut kamera (derajat). width: lebar pandang dalam satuan dunia untuk 16:9.
// Untuk 9:16 otomatis yaw +47° (garis pertempuran tegak) dan width ×0,6, kecuali diganti lewat v.
export const CAMERA = [
  { t: 0, at: [-13, 31], yaw: 24, width: 270, v: { at: [0, -2], width: 165 } }, // pembukaan lebar
  { t: 5, at: [-10, 24], yaw: 30, width: 220, v: { at: [0, -2], width: 140 } },
  { t: 8.5, at: [0, -18], yaw: 36, width: 120 }, // massa Sassanid
  { t: 11.5, at: [0, 8], yaw: 30, width: 92 }, // benturan
  { t: 14.5, follow: 'khalid', yaw: 22, width: 52 }, // Khalid memimpin mundur perlahan
  { t: 19.5, follow: 'khalid', yaw: 16, width: 60 },
  { t: 23.5, at: [0, 6], yaw: 28, width: 150, v: { width: 100 } }, // garis membentuk U
  { t: 26.2, at: [88, 58], yaw: 32, width: 68 }, // kavaleri di balik bukit
  { t: 27.6, at: [88, 58], yaw: 32, width: 74 },
  { t: 31, follow: 'cavR', yaw: 40, width: 95 }, // mengikuti serbuan
  { t: 34, follow: 'cavR', yaw: 44, width: 115 },
  { t: 37.5, at: [0, -8], yaw: 32, width: 175, v: { width: 125 } }, // kantong tertutup
  { t: 44, at: [4, -12], yaw: 26, width: 210, v: { width: 145 } },
];

// Guncangan kamera saat benturan: amplitudo relatif terhadap lebar pandang.
export const SHAKES = [
  { t: T_CONTACT, amp: 0.5, dur: 1.2 },
  { t: 35, amp: 0.9, dur: 1.6 },
];

export function phaseAt(t) {
  for (let i = PHASES.length - 1; i >= 0; i--) if (t >= PHASES[i].from) return PHASES[i];
  return PHASES[0];
}
