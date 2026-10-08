# Pertempuran Walaja (633 M) · Prototipe Visual

Prototipe visual simulasi taktis berbasis **Three.js** dengan kamera orthographic (nuansa isometrik) dan gaya **low-poly diorama + tilt-shift**. Skenario: *double envelopment* Khalid bin Walid melawan pasukan Sassanid.

Dokumentasi lengkap (keputusan desain, arsitektur, verifikasi, batasan): [DOKUMENTASI.md](./DOKUMENTASI.md).

> Status: **visual saja**. Pratinjau empat fase berjalan sebagai koreografi terskrip; belum ada pertempuran, moral, korban, maupun AI.

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

Kotak centang **Label** dan **Tilt-shift** membantu membandingkan tampilan dengan dan tanpa efek miniatur.

## Isi prototipe

- Medan prosedural berfaset (dataran Mesopotamia), dua punggung bukit tempat kavaleri bersembunyi, batu dan semak, penampang tanah ala diorama.
- ±1.200 prajurit lewat `InstancedMesh` (infanteri Sassanid dan Muslim, kataprak, kavaleri ringan, komandan).
- Panji: Derafsh Kaviani (Sassanid), panji hitam polos (Muslim), panji resimen.
- Debu partikel yang bereaksi pada gerak pasukan, plus jejak kaki dan tapak kuda pada tekstur tanah.
- Naskah empat fase: formasi awal → benturan → umpan termakan (garis Muslim membentuk "U") → penjepit oleh kavaleri.

## Struktur

| Berkas | Fungsi |
|---|---|
| `src/main.js` | Renderer, kamera, loop, HUD, emisi debu |
| `src/terrain.js` | Fungsi tinggi medan, bukit, tekstur tanah dan jejak |
| `src/models.js` | Geometri prajurit dan kuda (prosedural) |
| `src/army.js` | `Regiment`, formasi, jalur gerak, susunan pasukan |
| `src/timeline.js` | Fase dan waktu skenario |
| `src/banners.js` | Panji dan tekstur kanvas |
| `src/dust.js` | Sistem partikel debu |
| `src/post.js` | Tilt-shift, vignette, saturasi |

## Langkah berikutnya

1. Resolusi tempur tingkat resimen (kekuatan, moral, bonus serangan dari sisi/belakang).
2. AI Sassanid (dorong maju, merapat ke tengah) dan komando pemain (bertahan, mundur, sinyal).
3. Fog of war dan minimap.
4. Audio (benturan, genderang, tapak kuda) dan skor.
