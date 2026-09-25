# Channel Psikologi (Bahasa Indonesia)

> Channel-level conventions for this fork. Read this together with the pipeline
> director skills whenever a request is about the psychology channel. It sits on top
> of `creative/long-form.md`, `creative/short-form.md` and `creative/storytelling.md`;
> where they disagree on language, sourcing or safety, this file wins.

## Quick Reference Card

```
LANGUAGE:      Bahasa Indonesia, sapaan "kamu", formal tapi hangat (bukan bahasa baku kaku)
STYLE:         styles/psikologi-hangat.yaml (default render_runtime: Remotion)
NARRATION:     tts_selector -> piper_tts, model id_ID-news_tts-medium (PIPER_MODEL in .env)
LONG FORM:     8-12 menit, 16:9, dipecah per bab 60-120 dtk (lihat "Video panjang")
SHORTS:        30-60 dtk, 9:16, satu insight + satu ajakan
SOURCES:       minimal 2 sumber primer/ulasan (jurnal, buku teks, APA/WHO) per video
```

## Content rules

1. **Evidence first.** Every factual claim in the script maps to a source in the
   research brief. Prefer meta-analyses, review articles, textbooks, APA/WHO pages.
   Popular articles are allowed only for framing, never as the evidence for a claim.
2. **Label the strength of evidence** in narration when it matters:
   "penelitian konsisten menunjukkan…" vs "beberapa studi awal menduga…".
3. **Myth guard.** Do not present these as established science: learning styles,
   left/right-brain personalities, MBTI as a validated diagnostic, "10% otak",
   the original marshmallow-test conclusions without the replication caveat, the
   Stanford Prison Experiment without its methodological critique, ego depletion as
   settled. If the topic is one of these, the video is about the myth.
4. **No diagnosis, no treatment advice.** Describe patterns and research; never tell
   viewers they "have" a disorder. Use "jika ini terasa mengganggu keseharianmu,
   pertimbangkan bicara dengan psikolog atau psikiater".
5. **Sensitive topics** (depresi, bunuh diri, self-harm, trauma, gangguan makan):
   - no method details, no graphic imagery, no romanticizing;
   - close with a help line card: *Layanan kesehatan jiwa Kemenkes 119 ext 8* and
     "hubungi layanan darurat atau orang terdekat";
   - flag the topic at the proposal gate so the user confirms before scripting.
6. **Original angle.** Each video needs a clear thesis the user approved at the
   proposal gate. Mass-produced, templated scripts put monetization at risk
   (YouTube "inauthentic content" policy) — vary hooks, structure and examples.

## Script voice

- Hook in the first 5 seconds: a relatable situation or a surprising finding,
  never "Halo semuanya, di video kali ini…".
- Everyday Indonesian examples (kantor, kuliah, keluarga, media sosial) over US-centric ones.
- Technical terms: Indonesian first, English in parentheses once
  ("bias konfirmasi (confirmation bias)").
- Write for TTS: short sentences, numbers spelled the way they should be read,
  no abbreviations Piper would mispronounce (tulis "misalnya", bukan "mis.";
  "persen", bukan "%"). Read the scene plan's narration aloud once via piper before
  locking timing.

## Piper narration notes

- `id_ID-news_tts-medium` is a single male newsreader voice. Pass `length_scale`
  1.05-1.12 for a calmer pace and `sentence_silence` 0.35-0.5 between sentences.
- Piper has no SSML and no word timestamps — generate narration per scene, then
  derive caption timing from the audio (existing subtitle tooling).
- When the user adds Gemini/Google credits later, `google_tts` with an `id-ID`
  Chirp 3 HD voice is the upgrade path; keep the script unchanged.

## Visual rules (zero-key default)

- Without image API keys, build visuals from Remotion text/stat/chart scenes,
  diagrams (`diagram_gen`) and free stock (Pexels/Pixabay if keys are set).
- Metaphor over literal: a knotted rope for anxiety, a fogged window for
  depressive thinking — never stock photos of crying people.
- On-screen citation tag `(Penulis, Tahun)` whenever a study is mentioned.

## Video panjang (long form)

Render each chapter as its own run of the `animated-explainer` pipeline with the same
style playbook and voice settings, then concatenate with FFmpeg and add a single
music bed across the whole video. Structure:

1. Hook + janji isi (0:00-0:30)
2. 3-5 bab, masing-masing satu ide + satu contoh sehari-hari + satu temuan riset
3. Rangkuman praktis ("yang bisa kamu coba minggu ini")
4. Penutup + ajakan diskusi di komentar

Plan 3-6 Shorts from each long video (`clip-factory` or dedicated 9:16 renders).
