# Dokumentasi Pekerjaan · Prototipe Visual Walaja

Ringkasan pekerjaan, keputusan desain, cara kerja, hasil verifikasi, dan batasan prototipe. Untuk cara menjalankan dan kontrol, lihat [README](./README.md).

- **PR:** [widiyanata/claude-cloud#1](https://github.com/widiyanata/claude-cloud/pull/1)
- **Branch:** `claude/pensive-davinci-j6yd8m`
- **Status:** prototipe visual selesai; mekanik pertempuran belum dibuat.

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
| 1 · Formasi awal | 0–2 | Garis Sassanid panjang; garis Muslim tipis melengkung ke luar; kavaleri di balik bukit. |
| 2 · Benturan pertama | 2–8 | Sassanid maju frontal hingga kontak (`T_CONTACT = 8`). |
| 3 · Umpan termakan | 8–23 | Muslim mundur dan melengkung ke dalam (U); sayap Sassanid berputar ke dalam. |
| 4 · Penjepit | 23–40 | Sinyal (`T_SIGNAL = 23`); kavaleri melaju 11 dtk melewati sisi luar lalu menutup di belakang. Muslim menekan maju, Sassanid terdesak. |

Pasukan (±1.230 figur): infanteri Sassanid 3 × (26 × 12) = 936; infanteri Muslim 44 × 3 + Khalid = 133; kavaleri ringan 2 × 40 = 80; kataprak 2 × 36 = 72; Andarzaghar dan pengawal = 9. Jumlah ini untuk keterbacaan visual, **bukan skala historis**.

## 5. Parameter yang sering disetel

| Parameter | Lokasi | Nilai |
|---|---|---|
| Tinggi pandang kamera | `main.js` · `FRUSTUM` | 138 satuan |
| Yaw awal | `main.js` · `START_YAW` | 28° |
| Zoom min / maks | `main.js` · `controls` | 0,7 / 6 |
| Resolusi bayangan | `main.js` · `shadowRes` | 4096 (layar besar), 2048 (kecil) |
| Posisi dan tinggi bukit | `terrain.js` · `RIDGES` | (±84, 52), tinggi 12 |
| Kekuatan tilt-shift / vignette | `post.js` | blur 2,6 · vignette 0,32 · saturasi 1,1 |
| Kolam partikel debu | `dust.js` | 7.000 |
| Durasi serbuan kavaleri | `army.js` · `pathTrack(..., 11)` | 11 dtk |
| Panjang pratinjau | `timeline.js` · `END` | 40 dtk |

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

1. Resolusi tempur tingkat resimen: kekuatan, moral, bonus serangan dari sisi dan belakang.
2. AI Sassanid (dorong maju, merapat ke tengah) dan komando pemain (bertahan, mundur, sinyal).
3. Fog of war dan minimap, sehingga kavaleri benar-benar tersembunyi.
4. Audio: benturan, genderang atau terompet sinyal, tapak kuda.
5. Skor (korban, waktu, jumlah musuh lolos) dan variasi tingkat kesulitan.
6. Ukur performa di perangkat nyata, lalu tambahkan LOD (blok resimen saat zoom-out).
