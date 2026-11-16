import { Muxer as Mp4Muxer, ArrayBufferTarget as Mp4Target } from 'mp4-muxer';
import { Muxer as WebmMuxer, ArrayBufferTarget as WebmTarget } from 'webm-muxer';

// Render offline frame demi frame lalu encode dengan WebCodecs.
// Hasil tidak bergantung pada kecepatan komputer: setiap frame dirender penuh sebelum diambil.

const CANDIDATES = [
  { container: 'mp4', codec: 'avc1.640034', mux: 'avc' }, // H.264 High 5.2 (sampai 4K60)
  { container: 'mp4', codec: 'avc1.640033', mux: 'avc' }, // H.264 High 5.1
  { container: 'mp4', codec: 'avc1.640028', mux: 'avc' }, // H.264 High 4.0 (1080p)
  { container: 'webm', codec: 'vp09.00.51.08', mux: 'V_VP9' },
  { container: 'webm', codec: 'vp8', mux: 'V_VP8' },
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function pickCodec(width, height, fps, bitrate) {
  for (const c of CANDIDATES) {
    const config = { codec: c.codec, width, height, bitrate, framerate: fps };
    if (c.container === 'mp4') config.avc = { format: 'avc' };
    try {
      const res = await VideoEncoder.isConfigSupported(config);
      if (res.supported) return { ...c, config };
    } catch {
      // codec tidak dikenal di browser ini; coba kandidat berikutnya
    }
  }
  return null;
}

/**
 * @param {object} o
 * @param {number} o.width
 * @param {number} o.height
 * @param {number} o.fps
 * @param {number} o.frames jumlah frame
 * @param {(i:number) => CanvasImageSource} o.renderFrame merender frame ke-i dan mengembalikan canvas-nya
 * @param {(done:number, total:number) => void} [o.onProgress]
 * @param {AbortSignal} [o.signal]
 */
export async function encodeVideo({ width, height, fps, frames, renderFrame, onProgress, signal }) {
  if (!('VideoEncoder' in window)) {
    throw new Error('Browser ini belum mendukung WebCodecs. Gunakan Chrome atau Edge versi terbaru.');
  }
  // Sekitar 15 Mbps untuk 1080p60 dan 60 Mbps untuk 4K60.
  const bitrate = Math.round(width * height * fps * 0.12);
  const pick = await pickCodec(width, height, fps, bitrate);
  if (!pick) throw new Error(`Tidak ada codec video yang mendukung ${width}×${height}.`);

  const muxer =
    pick.container === 'mp4'
      ? new Mp4Muxer({ target: new Mp4Target(), video: { codec: 'avc', width, height, frameRate: fps }, fastStart: 'in-memory' })
      : new WebmMuxer({ target: new WebmTarget(), video: { codec: pick.mux, width, height, frameRate: fps } });

  let failure = null;
  const encoder = new VideoEncoder({
    output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
    error: (e) => {
      failure = e;
    },
  });
  encoder.configure(pick.config);

  const us = 1e6 / fps;
  try {
    for (let i = 0; i < frames; i++) {
      if (signal?.aborted) return null;
      if (failure) throw failure;
      const frame = new VideoFrame(renderFrame(i), { timestamp: Math.round(i * us), duration: Math.round(us) });
      encoder.encode(frame, { keyFrame: i % (fps * 2) === 0 });
      frame.close();
      while (encoder.encodeQueueSize > 4) await sleep(4);
      onProgress?.(i + 1, frames);
      await sleep(0); // beri kesempatan UI memperbarui progres
    }
    await encoder.flush();
    if (failure) throw failure;
  } finally {
    if (encoder.state !== 'closed') encoder.close();
  }
  muxer.finalize();
  const type = pick.container === 'mp4' ? 'video/mp4' : 'video/webm';
  return { blob: new Blob([muxer.target.buffer], { type }), ext: pick.container, codec: pick.codec };
}
