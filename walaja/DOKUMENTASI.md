# Dokumentasi Pekerjaan · Simulasi Video Walaja

Ringkasan pekerjaan, keputusan desain, cara kerja, hasil verifikasi, dan batasan prototipe. Untuk cara menjalankan dan kontrol, lihat [README](./README.md).

- **PR:** [#1](https://github.com/widiyanata/claude-cloud/pull/1) prototipe visual, [#2](https://github.com/widiyanata/claude-cloud/pull/2) dokumentasi
- **Branch:** `claude/pensive-davinci-j6yd8m`
- **Status:** prototipe visual, ekspor video (bagian 9), dan kamera sinematik (bagian 10) selesai. Arah proyek: alat pembuat video simulasi perang, bukan game.

## 1. Tujuan

Menguji apakah skenario Walaja (double envelopment Khalid bin Walid) layak dijadikan simulasi taktis, dan memilih gaya visual serta teknologinya sebelum membangun mekanik.

## 2. Keputusan desain

| Keputusan | Pilihan | Alasan |
|---|---|---|
| Teknologi | Three.js + Vite | Ribuan unit, debu partikel, dan bukit nyata tidak realistis dengan HTML/CSS isometrik (DOM berat di atas ±300 elemen). |
| Kamera | Orthographic, polar 54,74° (sudut isometrik sejati) | Tampilan isometrik tetap, tetapi dengan kamera 3D yang bisa digeser, diputar, dan di-zoom. |
| Yaw bawaan | 28° (dimetrik) | Pada 45° kedua bukit jatuh keluar layar dan pasukan tampak kecil. Dapat diubah dengan `Q`/`E` atau `?yaw=45`. |
| Gaya | Low-poly flat-shaded + tilt-shift ringan | Murah dirender, unit terbaca dari jauh, kesan miniatur diorama. |
| Aset | Semua prosedural, tanpa berkas eksternal | Tanpa dependensi aset; mudah disetel lewat kode. |
| Pemodelan unit | Resimen (satu "otak") + prajurit sebagai slot formasi | Ringan dan mudah diskrip; siap dipakai untuk mekanik moral dan kekuatan per resimen. |
| Posisi pemain | Sisi Muslim di dekat kamera (+z), Sassanid di sisi jauh (−z) | Massa pasukan Sassanid dan jebakan "U" terlihat dari depan. |

## 3. Arsitektur

Seluruh pratinjau adalah **fungsi dari waktu `t`**, bukan simulasi bertahap. Karena itu bilah waktu bisa di-seek ke titik mana pun dan hasilnya selalu konsisten.

```
timeline.js ──► army.js (Regiment.track(t) → x, z, psi, curve)
                  │
                  ├─► InstancedMesh (matriks tiap prajurit, dihitung tiap frame)
                  ├─► banners.js (panji mengikuti resimen)
                  └─► main.js ──► dust.js (emisi dari posisi prajurit)
                              ├─► terrain.js (jejak kaki pada tekstur tanah)
                              └─► post.js (tilt-shift → output)
```

| Berkas | Tanggung jawab |
|---|---|
| `src/main.js` | Renderer, cahaya, kamera dan kontrol, loop, HUD, label, emisi debu dan jejak |
| `src/terrain.js` | `heightAt(x, z)`, bukit, warna per-faset, tekstur pasir, jejak, batu dan semak |
| `src/models.js` | Geometri prajurit dan kuda (digabung per jenis, warna lewat atribut vertex) |
| `src/army.js` | `Regiment`, susunan formasi, jalur keyframe dan spline kavaleri, panji, label |
| `src/timeline.js` | Daftar fase, durasi, `T_CONTACT`, `T_SIGNAL` |
| `src/banners.js` | Panji (tekstur kanvas, animasi kibar) termasuk Derafsh Kaviani |
| `src/dust.js` | Kolam 7.000 partikel dengan shader titik lembut |
| `src/post.js` | Satu pass: tilt-shift, vignette, saturasi (MSAA 4×) |

Mekanisme penting:

- **Formasi:** tiap resimen punya slot lokal `(lx, lz)`. Parameter `curve` menggeser `lz` dengan bentuk parabola `curve·(1−u²)`. Garis Muslim melengkung ke luar (`curve = +5`) lalu ke dalam membentuk "U" (`curve = −9`) hanya dengan menganimasikan satu angka.
- **Jalur:** infanteri memakai keyframe `[t, x, z, psi, curve]` dengan easing halus. Kavaleri memakai spline Catmull-Rom dengan profil kecepatan trapesium (akselerasi, melaju, melambat) dan arah hadap mengikuti garis singgung.
- **Kecepatan** (untuk debu, jejak, dan hentakan langkah) dihitung dari selisih posisi `t ± 0,1 s`, sehingga tetap benar setelah seek. Saat jeda, kecepatan dianggap nol.
- **Jejak kaki:** kanvas 1024² yang menjadi `map` material tanah; cap digambar sebagian kecil per frame dan diunggah ke GPU tiap 6 frame.

## 4. Skenario dan susunan pasukan

| Fase | Waktu (dtk) | Peristiwa |
|---|---|---|
| 1 · Formasi awal | 0–6 | Garis Sassanid panjang; garis Muslim tipis melengkung ke luar; kavaleri di balik bukit. |
| 2 · Benturan pertama | 6–12 | Sassanid maju frontal hingga kontak (`T_CONTACT = 12`). |
| 3 · Umpan termakan | 12–27 | Muslim mundur dan melengkung ke dalam (U); sayap Sassanid berputar ke dalam. |
| 4 · Penjepit | 27–44 | Sinyal (`T_SIGNAL = 27`); kavaleri melaju 11 dtk melewati sisi luar lalu menutup di belakang. Muslim menekan maju, Sassanid terdesak. |

Pasukan (±1.230 figur): infanteri Sassanid 3 × (26 × 12) = 936; infanteri Muslim 44 × 3 + Khalid = 133; kavaleri ringan 2 × 40 = 80; kataprak 2 × 36 = 72; Andarzaghar dan pengawal = 9. Jumlah ini untuk keterbacaan visual, **bukan skala historis**.

## 5. Parameter yang sering disetel

| Parameter | Lokasi | Nilai |
|---|---|---|
| Tinggi pandang kamera | `main.js` · `FRUSTUM` | 138 satuan |
| Yaw awal | `main.js` · `START_YAW` | 28° |
| Zoom min / maks | `main.js` · `controls` | 0,35 / 6 |
| Resolusi bayangan | `main.js` · `sun.shadow.mapSize` | 4096 |
| Posisi dan tinggi bukit | `terrain.js` · `RIDGES` | (±84, 52), tinggi 12 |
| Kekuatan tilt-shift / vignette | `post.js` | blur 2,6 · vignette 0,32 · saturasi 1,1 |
| Kolam partikel debu | `dust.js` | 7.000 |
| Durasi serbuan kavaleri | `army.js` · `pathTrack(..., 11)` | 11 dtk |
| Panjang pratinjau | `timeline.js` · `END` | 44 dtk |

## 6. Verifikasi

Diuji dengan Chromium headless (SwiftShader, 1280×760): screenshot pada beberapa titik waktu dan sudut kamera, serta pemeriksaan konsol. `vite build` sukses. Tidak ada error atau peringatan konsol.

Masalah yang ditemukan lewat screenshot dan sudah diperbaiki:

| Masalah | Perbaikan |
|---|---|
| Kedua bukit di luar layar pada yaw 45° | Bukit didekatkan; yaw bawaan 28°; area pandang melebar pada layar potret. |
| Sassanid tampak keabu-abuan | Perisai diganti merah tua berbingkai emas; kabut dikurangi. |
| Debu hampir tak terlihat (warna mirip pasir) | Warna debu dibuat lebih terang, alfa dan ukuran dinaikkan. |
| Jejak kaki berupa bintik gelap berderet | Cap diperkecil, dipudarkan, dan diberi jitter. |
| Garis Muslim menembus blok Sassanid di akhir pratinjau | Blok Sassanid ikut terdesak mundur saat Muslim menekan. |
| Kataprak menimpa sayap kiri Sassanid | Posisi kataprak digeser ke belakang. |
| Label infanteri bertumpuk saat benturan | Label infanteri disembunyikan setelah `T_CONTACT`. |
| Panel HUD menutupi bukit dan kavaleri | Panel dipindah ke kiri bawah dan diringkas; target kamera digeser. |

## 7. Batasan yang diketahui

- **Belum ada mekanik pertempuran:** tanpa tabrakan, korban, moral, atau AI. Pasukan hanya mengikuti naskah.
- **Kavaleri "tersembunyi" hanya label.** Tidak ada fog of war; kavaleri tetap terlihat oleh pemain.
- **Performa belum diukur di GPU nyata.** Pengujian memakai renderer perangkat lunak, jadi frame rate tidak bisa dijadikan acuan. Delta waktu dibatasi 0,05 dtk, sehingga perangkat lambat akan menjalankan pratinjau lebih pelan dari waktu nyata.
- **Sentuhan (touch) belum diuji,** begitu pula resolusi layar selain 1280×760.
- **Bundel JS ±540 kB** (141 kB gzip), terutama Three.js.
- **Akurasi sejarah:** skenario terinspirasi dari Walaja; sumber berbeda dalam detail (misalnya cara mundurnya pusat Muslim). Susunan dan jumlah pasukan di sini bersifat ilustratif.

## 8. Langkah berikutnya

Diperbarui setelah arah proyek menjadi alat pembuat video (lihat bagian 9):

1. Grafis penjelas: panah pergerakan, jumlah pasukan, peta taktis.
2. Pertempuran yang terlihat hidup: benturan, prajurit tumbang, formasi pecah, pasukan melarikan diri.
3. Skenario sebagai data untuk pertempuran lain.
4. Ukur waktu render di perangkat nyata.

## 9. Tahap 2 · Ekspor video

Arah proyek ditetapkan sebagai **alat pembuat video**, dengan format 16:9 dan 9:16, gaya miniatur tetap, dan teks dibuat di aplikasi. Mekanik game (AI, komando pemain, skor) tidak lagi direncanakan. Naskah terskrip dipertahankan karena hasilnya bisa diatur dan diulang persis.

### Keputusan

| Keputusan | Pilihan | Alasan |
|---|---|---|
| Cara merekam | Render offline frame demi frame + WebCodecs | Mulus pada fps berapa pun, tidak bergantung kecepatan komputer. Rekam layar biasa akan patah-patah. |
| Wadah dan codec | MP4 H.264 (`mp4-muxer`), cadangan WebM VP9/VP8 (`webm-muxer`) | H.264 diterima semua editor dan platform; cadangan untuk browser tanpa encoder H.264. |
| Bitrate | ±0,12 bit/piksel/frame (±15 Mbps 1080p60, ±60 Mbps 4K60) | Cukup tinggi agar debu dan pasir tidak pecah setelah dikompres ulang oleh platform. |
| Determinisme | Angka acak ber-seed, langkah waktu tetap, debu dan jejak di-reset sebelum render | Pengaturan yang sama selalu menghasilkan video yang sama. |
| Teks | Digambar ke canvas 2D yang sama untuk pratinjau dan ekspor | Yang terlihat di pratinjau = yang terekam (WYSIWYG). |
| Bingkai format | Area di luar rasio format digelapkan; kamera ekspor = potongan bingkai itu | Pengguna menyusun shot langsung di layar. |
| Komposisi 9:16 | Kamera diputar +47° (75°), titik tengah dan zoom tersendiri; matahari ikut diputar | Garis pertempuran tegak; kedua bukit masuk bingkai sempit; pencahayaan relatif kamera tetap. |
| Pacing | Jeda pembuka 4 dtk (naskah 44 dtk) + 2 dtk ekor; opsi kecepatan 0,5× | Kartu judul dan narasi Fase 1 sempat terbaca. |

### Perubahan kode

| Berkas | Perubahan |
|---|---|
| `src/export.js` (baru) | Memilih codec yang didukung, encode frame dengan backpressure, membatalkan via `AbortSignal`, mengembalikan Blob. |
| `src/overlay.js` (baru) | Kartu judul dan penutup, narasi per fase (lower third), label unit, cue sinyal. Ukuran diskalakan dengan sisi terpendek bingkai; area aman 9:16 di bawah ±20%. |
| `src/main.js` | `stepWorld()` dipakai bersama oleh loop interaktif dan ekspor; RNG ber-seed; format dan bingkai pratinjau; mode sembunyikan UI (`H`); alur ekspor dan modal progres. Label HTML diganti label di canvas. |
| `src/timeline.js` | Waktu digeser 4 dtk (`END` 44, `T_CONTACT` 12, `T_SIGNAL` 27); teks judul dan penutup. |
| `src/army.js` | Keyframe digeser 4 dtk; `Regiment` menyimpan `vx`/`vz` untuk menyebar debu dan jejak di sepanjang lintasan. |
| `src/dust.js`, `src/terrain.js` | `clear()` dan `reset()` untuk render deterministik. |
| `src/post.js` | Blur tilt-shift diskalakan dengan resolusi, agar 4K terlihat sama dengan pratinjau. |

### Verifikasi

Diuji di Chromium headless (SwiftShader). Codec yang tersedia: H.264, VP9, VP8.

| Uji | Hasil |
|---|---|
| Ekspor penuh 16:9 dan 9:16 (480×270 / 270×480, 8 fps, 4×) | MP4 H.264 valid, 104 frame, 13 dtk; didekode ulang dengan PyAV |
| Resolusi sebenarnya | 1920×1080, 1080×1920, dan 3840×2160 ter-encode dan terdekode benar |
| Determinisme | Dua ekspor terpisah: 40 frame identik per piksel (selisih maksimum 0) |
| Konsol | Tanpa error atau peringatan |

Bug yang ditemukan dan diperbaiki selama pengujian:

| Bug | Perbaikan |
|---|---|
| Partikel debu tampil sebagai bulatan hitam: umur melewati batas dalam satu langkah, `pow(1−k, 1,5)` menjadi NaN. Juga bisa muncul sesekali di pratinjau biasa. | `k` dibatasi maksimum 1. |
| Debu dan jejak bergaris-garis pada langkah waktu besar | Disebar di sepanjang lintasan gerak selama satu langkah. |
| Pada 9:16 pasukan tergeser ke kanan dan satu bukit terpotong | Sudut, titik tengah, dan zoom tersendiri untuk 9:16. |
| Ekspor tepat setelah ganti format menghadap ke arah salah | Orientasi kamera diperbarui saat ganti format dan di awal ekspor. |

### Batasan tambahan

- **Browser:** memerlukan WebCodecs; diuji di Chromium, disarankan Chrome/Edge terbaru.
- **Memori:** seluruh video ditampung di RAM sebelum diunduh. 4K60 pada 0,5× (±90 dtk) bisa mencapai ±700 MB.
- **Waktu render** bergantung pada GPU dan belum diukur di perangkat nyata.
- **Ukuran partikel debu** di 4K bisa melampaui batas `gl_PointSize` pada sebagian GPU, sehingga debu tampak lebih kecil.

## 10. Tahap 3 · Kamera sinematik

Kamera kini bergerak menurut **daftar shot** (`CAMERA` di `src/timeline.js`), aktif secara bawaan lewat centang **Kamera sinematik**. Jika dimatikan, kamera kembali manual seperti tahap 2.

### Cara kerja

- Tiap key berisi waktu `t`, titik fokus (`at: [x, z]` tetap, atau `follow: 'khalid' | 'cavL' | 'cavR' | 'persC'` yang mengikuti unit), `yaw` dalam derajat, dan `width`, yaitu lebar pandang dalam satuan dunia. Di antara dua key ada transisi halus (smoothstep).
- Lebar pandang dipetakan ke lebar bingkai video, sehingga framing sama di pratinjau dan ekspor pada resolusi berapa pun.
- Untuk 9:16, yaw otomatis +47° dan lebar ×0,6, kecuali diganti lewat `v: { at, yaw, width }`.
- **Guncangan** (`SHAKES`): saat kontak infanteri (`t = 12`) dan saat kavaleri menghantam (`t = 35`). Dibuat dari jumlah sinus, sehingga tetap deterministik.
- Kamera adalah fungsi waktu dan posisi unit, sehingga seek, pratinjau, dan ekspor selalu sama.

### Urutan shot Walaja

| Waktu | Shot |
|---|---|
| 0–5 | Pembukaan lebar, perlahan mendekat (kartu judul) |
| 5–8,5 | Menyorot massa infanteri Sassanid |
| 8,5–11,5 | Garis benturan; guncangan saat kontak |
| 11,5–19,5 | Close-up Khalid memimpin mundur perlahan, kamera berputar pelan |
| 19,5–23,5 | Menjauh untuk memperlihatkan garis "U" |
| 23,5–27,6 | Kavaleri kanan menunggu di balik bukit; sinyal |
| 27,6–34 | Mengikuti serbuan kavaleri; guncangan saat menghantam |
| 34–44 | Kantong tertutup, lalu kamera menjauh (kartu penutup) |

### Verifikasi

Ekspor 640×360 dan 360×640 (4 fps, 2×, 96 frame) berupa MP4 H.264 valid. Frame pada sembilan momen kunci diperiksa secara visual di kedua format: subjek tiap shot berada dalam bingkai. Tidak ada error konsol.
