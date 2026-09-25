#!/usr/bin/env bash
# Download the Indonesian Piper voice (id_ID-news_tts-medium, MIT) into models/piper/.
# Primary source is the official rhasspy/piper-voices repo on HuggingFace; if that host
# is unreachable, fall back to the sherpa-onnx GitHub release mirror of the same model.
set -euo pipefail

VOICE="id_ID-news_tts-medium"
DEST="$(cd "$(dirname "$0")/.." && pwd)/models/piper"
HF="https://huggingface.co/rhasspy/piper-voices/resolve/main/id/id_ID/news_tts/medium"
MIRROR="https://github.com/k2-fsa/sherpa-onnx/releases/download/tts-models/vits-piper-${VOICE}.tar.bz2"

mkdir -p "$DEST"
if [ -f "$DEST/$VOICE.onnx" ] && [ -f "$DEST/$VOICE.onnx.json" ]; then
  echo "==> $VOICE already present in $DEST"
  exit 0
fi

echo "==> Downloading $VOICE from HuggingFace..."
if curl -fsSL -o "$DEST/$VOICE.onnx" "$HF/$VOICE.onnx" \
   && curl -fsSL -o "$DEST/$VOICE.onnx.json" "$HF/$VOICE.onnx.json"; then
  echo "    done"
else
  echo "    HuggingFace unavailable, using sherpa-onnx GitHub mirror..."
  rm -f "$DEST/$VOICE.onnx" "$DEST/$VOICE.onnx.json"
  tmp="$(mktemp -d)"
  trap 'rm -rf "$tmp"' EXIT
  curl -fsSL -o "$tmp/voice.tar.bz2" "$MIRROR"
  tar xjf "$tmp/voice.tar.bz2" -C "$tmp"
  cp "$tmp/vits-piper-$VOICE/$VOICE.onnx" "$tmp/vits-piper-$VOICE/$VOICE.onnx.json" "$DEST/"
  echo "    done"
fi

echo "==> Voice ready: $DEST/$VOICE.onnx"
echo "    Set PIPER_MODEL=$VOICE in .env to make it the default narration voice."
