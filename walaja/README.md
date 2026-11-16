# Pertempuran Walaja (633 M) · Simulasi untuk Video

Aplikasi pembuat video simulasi perang berbasis **Three.js** dengan kamera orthographic (nuansa isometrik) dan gaya **low-poly diorama + tilt-shift**. Skenario: *double envelopment* Khalid bin Walid melawan pasukan Sassanid.

Dokumentasi lengkap (keputusan desain, arsitektur, verifikasi, batasan): [DOKUMENTASI.md](./DOKUMENTASI.md).

> Status: pratinjau empat fase terskrip dan **ekspor video MP4** (16:9 dan 9:16, 1080p/4K) sudah berjalan. Sistem kamera sinematik, panah taktis, dan animasi korban belum ada.

## Menjalankan

```bash
cd walaja
npm install
npm run dev      # pengembangan, http://localhost:5173
npm run build    # hasil build ke dist/
```

## Kontrol

| Aksi | Input |
|---|---|
| Geser | Seret kiri / satu jari |
| Putar | Klik kanan + seret, atau `Q` / `E` |
| Zoom | Roda mouse / cubit |
| Pratinjau | Tombol **Putar pratinjau**; klik bilah waktu untuk lompat |
| Sembunyikan UI | Tombol **Sembunyikan UI** atau `H` |

Kotak centang **Label** dan **Tilt-shift** membantu membandingkan tampilan dengan dan tanpa efek miniatur.

## Membuat video

1. Pilih format: **16:9 · YouTube** atau **9:16 · Shorts/TikTok**. Area di luar bingkai rekaman digelapkan; kamera otomatis menyesuaikan sudut dan zoom (9:16 memutar garis pertempuran menjadi tegak).
2. Atur kamera bila perlu (geser, putar, zoom). Yang terlihat di dalam bingkai adalah yang terekam.
3. Pilih resolusi (1080p/4K), fps (30/60), dan kecepatan (1× ±46 dtk, 0,5× ±90 dtk).
4. Klik **Ekspor video**. Video dirender frame demi frame, lalu otomatis diunduh sebagai MP4 (H.264). Jika browser tidak bisa meng-encode H.264, hasilnya WebM (VP9/VP8).

Teks di dalam video (kartu judul, narasi tiap fase, label unit, cue sinyal, kartu penutup) dibuat oleh aplikasi; centang **Label** menentukan apakah label unit ikut terekam. Audio (narasi, musik, efek) ditambahkan di editor video.

Gunakan **Chrome atau Edge** versi terbaru (memerlukan WebCodecs). Hasil render selalu sama untuk pengaturan yang sama.

## Isi aplikasi

- Medan prosedural berfaset (dataran Mesopotamia), dua punggung bukit tempat kavaleri bersembunyi, batu dan semak, penampang tanah ala diorama.
- ±1.200 prajurit lewat `InstancedMesh` (infanteri Sassanid dan Muslim, kataprak, kavaleri ringan, komandan).
- Panji: Derafsh Kaviani (Sassanid), panji hitam polos (Muslim), panji resimen.
- Debu partikel yang bereaksi pada gerak pasukan, plus jejak kaki dan tapak kuda pada tekstur tanah.
- Naskah empat fase: formasi awal → benturan → umpan termakan (garis Muslim membentuk "U") → penjepit oleh kavaleri.

## Struktur

| Berkas | Fungsi |
|---|---|
| `src/main.js` | Renderer, kamera dan format, loop, HUD, emisi debu, alur ekspor |
| `src/overlay.js` | Teks di dalam video: judul, narasi, label, cue sinyal |
| `src/export.js` | Encode WebCodecs → MP4 (H.264) atau WebM |
| `src/terrain.js` | Fungsi tinggi medan, bukit, tekstur tanah dan jejak |
| `src/models.js` | Geometri prajurit dan kuda (prosedural) |
| `src/army.js` | `Regiment`, formasi, jalur gerak, susunan pasukan |
| `src/timeline.js` | Fase, waktu skenario, teks judul dan penutup |
| `src/banners.js` | Panji dan tekstur kanvas |
| `src/dust.js` | Sistem partikel debu |
| `src/post.js` | Tilt-shift, vignette, saturasi |

## Langkah berikutnya

1. Sistem kamera sinematik: shot per waktu (pembukaan lebar, close-up Khalid, mengikuti serbuan, tampilan peta), transisi halus, guncangan saat benturan.
2. Grafis penjelas: panah pergerakan pasukan, jumlah pasukan, peta taktis.
3. Pertempuran yang terlihat hidup: benturan, prajurit tumbang, formasi pecah, pasukan Sassanid melarikan diri.
4. Skenario sebagai data, agar pertempuran lain bisa dibuat tanpa mengubah kode.
