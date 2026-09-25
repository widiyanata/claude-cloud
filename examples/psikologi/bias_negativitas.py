"""Contoh zero-key: explainer pendek tentang bias negativitas (Piper id_ID + Remotion).

Ini jalur cepat tanpa gerbang pipeline, berguna sebagai template/uji setup.
Produksi sungguhan tetap lewat pipeline `animated-explainer` (lihat CHANNEL.md).

    python examples/psikologi/bias_negativitas.py
    cd remotion-composer && npx remotion render src/index.tsx Explainer \
        ../projects/psikologi-uji-bias-negativitas/final.mp4 \
        --props ../projects/psikologi-uji-bias-negativitas/props.json
"""

import json
import subprocess
import sys
import wave
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))
from tools.tool_registry import registry  # noqa: E402

PROJECT = ROOT / "projects" / "psikologi-uji-bias-negativitas"
AUDIO = PROJECT / "audio"
PUBLIC = ROOT / "remotion-composer" / "public" / "projects" / PROJECT.name
GAP = 0.45  # jeda antar adegan (detik)

SCENES = [
    {
        "cut": {"type": "hero_title", "text": "Satu komentar buruk, seratus pujian",
                "subtitle": "Kenapa yang buruk lebih menempel?"},
        "say": "Kamu dapat seratus komentar baik, lalu satu komentar pedas. "
               "Dan yang terus terpikir sampai malam, justru yang satu itu. Kenapa begitu?",
    },
    {
        "cut": {"type": "text_card", "text": "Bias negativitas"},
        "overlay": {"type": "section_title", "text": "Negativity bias",
                    "subtitle": "Yang buruk diberi bobot lebih besar"},
        "say": "Psikolog menyebutnya bias negativitas, atau negativity bias. "
               "Otak kita memberi bobot lebih besar pada hal buruk, "
               "dibanding hal baik yang sama besarnya.",
    },
    {
        "cut": {"type": "callout", "callout_type": "quote",
                "text": "“Bad is stronger than good.”",
                "title": "Baumeister dkk., 2001"},
        "say": "Tinjauan besar oleh Baumeister dan rekan, pada tahun dua ribu satu, "
               "menemukan pola ini di banyak bidang. Dari hubungan, umpan balik, "
               "sampai kesan pertama terhadap orang lain.",
    },
    {
        "cut": {"type": "comparison", "title": "Bagi nenek moyang kita",
                "leftLabel": "Melewatkan ancaman", "leftValue": "Fatal",
                "rightLabel": "Melewatkan hal baik", "rightValue": "Rugi kecil"},
        "say": "Kenapa bisa begitu? Salah satu penjelasannya datang dari sisi evolusi. "
               "Bagi nenek moyang kita, melewatkan satu ancaman bisa berakibat fatal. "
               "Melewatkan satu hal baik, biasanya hanya rugi kecil.",
    },
    {
        "cut": {"type": "text_card", "text": "Bukan tanda kamu lemah"},
        "say": "Jadi, kalau kritik terasa lebih menempel, itu bukan tanda kamu lemah. "
               "Itu cara kerja otak yang wajar.",
    },
    {
        "cut": {"type": "callout", "callout_type": "tip", "title": "Yang bisa kamu coba",
                "text": "Tulis faktanya utuh: berapa yang positif, berapa yang negatif?"},
        "say": "Yang bisa kamu coba: saat satu kritik terus terngiang, tulis faktanya secara utuh. "
               "Berapa banyak respons positif, berapa yang negatif. Lalu tanyakan, "
               "apakah satu komentar ini benar-benar mewakili semuanya?",
    },
    {
        "cut": {"type": "hero_title", "text": "Kamu yang memilih fokusmu",
                "subtitle": "Sumber: Baumeister dkk. (2001); Rozin & Royzman (2001)"},
        "say": "Otakmu sedang berusaha melindungimu. "
               "Tapi kamu tetap yang memilih, mau menaruh perhatian di mana.",
    },
]


def wav_duration(path: Path) -> float:
    with wave.open(str(path)) as w:
        return w.getnframes() / w.getframerate()


def main() -> None:
    registry.discover()
    tts = registry.get("tts_selector")
    AUDIO.mkdir(parents=True, exist_ok=True)
    PUBLIC.mkdir(parents=True, exist_ok=True)

    cuts, overlays, captions, parts = [], [], [], []
    t = 0.0
    for i, scene in enumerate(SCENES):
        wav = AUDIO / f"scene_{i:02d}.wav"
        res = tts.execute({"text": scene["say"], "preferred_provider": "piper",
                           "length_scale": 1.08, "sentence_silence": 0.4,
                           "output_path": str(wav)})
        if not res.success:
            raise SystemExit(res.error)
        dur = wav_duration(wav)
        start, end = t, t + dur + GAP
        cuts.append({"id": f"s{i}", "source": "", "in_seconds": round(start, 3),
                     "out_seconds": round(end, 3), **scene["cut"]})
        if "overlay" in scene:
            overlays.append({"in_seconds": round(start + 0.3, 3),
                             "out_seconds": round(end - 0.2, 3), **scene["overlay"]})

        # Piper has no word timestamps: spread words proportionally to their length.
        words = scene["say"].split()
        total = sum(len(w) + 1 for w in words)
        cursor = start
        for j, w in enumerate(words):
            span = dur * (len(w) + 1) / total
            captions.append({"word": w, "startMs": int(cursor * 1000),
                             "endMs": int((cursor + span) * 1000),
                             "pageBreakAfter": j == len(words) - 1 or w.endswith((".", "?", ":"))})
            cursor += span
        parts.append((wav, dur))
        t = end

    # Narration track: scenes back to back with GAP silence in between.
    concat = AUDIO / "concat.txt"
    silence = AUDIO / "gap.wav"
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-f", "lavfi", "-i",
                    "anullsrc=r=22050:cl=mono", "-t", str(GAP), silence], check=True)
    concat.write_text("".join(f"file '{p}'\nfile '{silence}'\n" for p, _ in parts))
    narration = PUBLIC / "narration.wav"
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-f", "concat", "-safe", "0",
                    "-i", concat, "-ar", "44100", narration], check=True)

    props = {
        "theme": "psikologi-hangat",
        "cuts": cuts,
        "overlays": overlays,
        "captions": captions,
        "audio": {"narration": {"src": f"projects/{PROJECT.name}/narration.wav", "volume": 1}},
    }
    (PROJECT / "props.json").write_text(json.dumps(props, ensure_ascii=False, indent=2))
    print(f"{len(cuts)} adegan, durasi {t:.1f} dtk -> {PROJECT / 'props.json'}")


if __name__ == "__main__":
    main()
