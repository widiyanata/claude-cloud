# Channel Psikologi — overlay di atas OpenMontage

Repo ini adalah fork dari [calesthio/OpenMontage](https://github.com/calesthio/OpenMontage)
(AGPL-3.0) yang disetel untuk channel psikologi berbahasa Indonesia.

## Default channel

| Hal | Default |
|---|---|
| Bahasa | Bahasa Indonesia |
| Narasi | Piper TTS, suara `id_ID-news_tts-medium` (gratis, offline) |
| Style | `styles/psikologi-hangat.yaml` |
| Skill channel | `skills/creative/psikologi-channel.md` — **wajib dibaca** untuk setiap video |
| Pipeline utama | `animated-explainer` (video panjang per bab, Shorts) |
| Visual tanpa API key | Remotion (teks, stat, chart), diagram, stok Pexels/Pixabay bila key diisi |

## Setup

```bash
make setup                      # dependensi + Piper + suara Indonesia (scripts/setup_piper_id.sh)
cp .env.example .env            # PIPER_MODEL=id_ID-news_tts-medium sudah terisi
```

Kredit Gemini/Google nanti tinggal diisi `GEMINI_API_KEY` di `.env`. Setelah itu
`google_imagen` (gambar) dan `google_tts` (narasi `id-ID` Chirp 3 HD) otomatis ikut dipilih
oleh selector.

## Uji cepat

```bash
python examples/psikologi/bias_negativitas.py        # narasi Piper + props Remotion
cd remotion-composer && npx remotion render src/index.tsx Explainer \
  ../projects/psikologi-uji-bias-negativitas/final.mp4 \
  --props ../projects/psikologi-uji-bias-negativitas/props.json
```

Di lingkungan yang memblokir unduhan Chrome milik Remotion (misalnya container cloud),
tambahkan `--browser-executable <path chromium/headless_shell lokal>`.

## Update dari upstream

```bash
git remote add upstream https://github.com/calesthio/OpenMontage.git   # sekali saja
git fetch upstream && git merge upstream/main
```

Perubahan fork ini sengaja kecil agar merge mudah: `tools/audio/piper_tts.py`
(`PIPER_MODEL` + pencarian model lokal), `scripts/setup_piper_id.sh`, `Makefile`,
`.env.example`, `CLAUDE.md`, `skills/INDEX.md`, serta file baru untuk channel.
