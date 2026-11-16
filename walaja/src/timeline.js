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

export function phaseAt(t) {
  for (let i = PHASES.length - 1; i >= 0; i--) if (t >= PHASES[i].from) return PHASES[i];
  return PHASES[0];
}
