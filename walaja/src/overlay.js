import { OUTRO, PHASES, T_SIGNAL, TITLE } from './timeline.js';

// Teks di dalam bingkai video: kartu judul, narasi per fase, label unit, cue sinyal, kartu penutup.
// Digambar ke canvas 2D yang sama untuk pratinjau dan ekspor, sehingga hasil video = yang terlihat.

const INK = 'rgba(38, 26, 12, 0.84)';
const CREAM = '#f7edd4';
const GOLD = '#e0b54a';
const SIDE = { blue: '#2f6fb5', red: '#b23a34' };
const SERIF = 'Georgia, "Iowan Old Style", serif';
const SANS = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

function fade(t, from, to, f = 0.6) {
  if (t < from || t > to) return 0;
  return Math.min(1, (t - from) / f, (to - t) / f);
}

function wrap(ctx, text, maxW) {
  const lines = [];
  let line = '';
  for (const word of text.split(' ')) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width > maxW && line) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function box(ctx, x, y, w, h, r, fill) {
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fill();
}

function card(ctx, w, s, cy, title, subtitle, alpha) {
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `600 ${64 * s}px ${SERIF}`;
  const tw = ctx.measureText(title).width;
  ctx.font = `${28 * s}px ${SANS}`;
  const sw = ctx.measureText(subtitle).width;
  const bw = Math.min(w * 0.9, Math.max(tw, sw) + 96 * s);
  const bh = 150 * s;
  box(ctx, (w - bw) / 2, cy - bh / 2, bw, bh, 18 * s, INK);
  ctx.fillStyle = GOLD;
  ctx.fillRect(w / 2 - 40 * s, cy + 6 * s, 80 * s, 2 * s);
  ctx.fillStyle = CREAM;
  ctx.font = `600 ${64 * s}px ${SERIF}`;
  ctx.fillText(title, w / 2, cy - 26 * s);
  ctx.font = `${28 * s}px ${SANS}`;
  ctx.globalAlpha = alpha * 0.85;
  ctx.fillText(subtitle, w / 2, cy + 40 * s);
  ctx.restore();
}

function caption(ctx, w, h, s, t, vertical) {
  for (const p of PHASES) {
    const a = fade(t, p.from + 0.2, p.to - 0.1, 0.5);
    if (a <= 0) continue;
    ctx.save();
    ctx.globalAlpha = a;
    const bw = vertical ? w * 0.86 : Math.min(w * 0.62, 1180 * s);
    const pad = 28 * s;
    ctx.font = `${32 * s}px ${SANS}`;
    const lines = wrap(ctx, p.text, bw - pad * 2);
    const lh = 44 * s;
    const bh = pad * 2 + 40 * s + lines.length * lh;
    const bx = (w - bw) / 2;
    const by = h - (vertical ? h * 0.2 : h * 0.07) - bh;
    box(ctx, bx, by, bw, bh, 16 * s, INK);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillStyle = GOLD;
    ctx.font = `600 ${28 * s}px ${SERIF}`;
    ctx.fillText(p.name, bx + pad, by + pad);
    ctx.fillStyle = CREAM;
    ctx.font = `${32 * s}px ${SANS}`;
    lines.forEach((l, i) => ctx.fillText(l, bx + pad, by + pad + 46 * s + i * lh));
    ctx.restore();
  }
}

function pill(ctx, x, y, text, color, s, font = 20) {
  ctx.font = `600 ${font * s}px ${SANS}`;
  const tw = ctx.measureText(text).width;
  const ph = (font + 14) * s;
  const pw = tw + 24 * s;
  box(ctx, x - pw / 2, y - ph, pw, ph, ph / 2, color);
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x, y - ph / 2);
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} w lebar bingkai (px)
 * @param {number} h tinggi bingkai (px)
 * @param {number} t waktu skenario (detik)
 * @param {{labels?: {x:number, y:number, text:string, side:string}[]}} opts koordinat label dalam px bingkai
 */
export function drawOverlay(ctx, w, h, t, { labels = [] } = {}) {
  const s = Math.min(w, h) / 1080;
  const vertical = h > w;

  for (const l of labels) pill(ctx, l.x, l.y, l.text, SIDE[l.side], s);

  const sig = fade(t, T_SIGNAL, T_SIGNAL + 3.2, 0.35);
  if (sig > 0) {
    ctx.save();
    ctx.globalAlpha = sig;
    pill(ctx, w / 2, (vertical ? h * 0.15 : h * 0.12) + 30 * s, 'Sinyal terompet: kavaleri menyerbu', INK, s, 30);
    ctx.restore();
  }

  const top = vertical ? h * 0.16 : h * 0.15;
  card(ctx, w, s, top, TITLE.title, TITLE.subtitle, fade(t, TITLE.from, TITLE.to, 0.7));
  card(ctx, w, s, top, OUTRO.title, OUTRO.subtitle, fade(t, OUTRO.from, OUTRO.to, 0.7));
  caption(ctx, w, h, s, t, vertical);
}
