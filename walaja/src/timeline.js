// Naskah pratinjau: seluruh posisi adalah fungsi waktu t (detik), sehingga bisa di-seek.
export const END = 40;

export const PHASES = [
  {
    from: 0,
    to: 2,
    name: 'Fase 1 · Formasi awal',
    text: 'Garis Sassanid panjang dan tebal. Infanteri Muslim tipis melengkung ke luar; kavaleri bersembunyi di balik bukit.',
  },
  {
    from: 2,
    to: 8,
    name: 'Fase 2 · Benturan pertama',
    text: 'Sassanid maju frontal. Infanteri pusat bertahan, lalu mulai melangkah mundur.',
  },
  {
    from: 8,
    to: 23,
    name: 'Fase 3 · Umpan termakan',
    text: 'Garis Muslim melengkung ke dalam (huruf U). Sayap Sassanid merapat ke tengah dan membuka sisi luarnya.',
  },
  {
    from: 23,
    to: END,
    name: 'Fase 4 · Penjepit',
    text: 'Sinyal diberikan. Kavaleri menyerbu dari kedua bukit dan menjepit Sassanid dari belakang.',
  },
];

export function phaseAt(t) {
  for (let i = PHASES.length - 1; i >= 0; i--) if (t >= PHASES[i].from) return PHASES[i];
  return PHASES[0];
}

export const T_CONTACT = 8;
export const T_SIGNAL = 23;
