#!/usr/bin/env bash
# Download free LibreQuake id1 data (pak0/pak1) for local DarkPlaces runs.
# Flatpak CI fetches the same archive via the manifest.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DEST="$ROOT/darkplaces/id1"
URL="https://github.com/lavenderdotpet/LibreQuake/releases/download/v0.09-beta/lite.zip"
SHA="428e736b2f01d953e09a08c60bee975bdc4a0ac2219e97fa095c8af41754da83"
TMP="${TMPDIR:-/tmp}/librequake-lite-$$.zip"
WORKDIR="${TMPDIR:-/tmp}/librequake-lite-$$"

if [[ -f "$DEST/pak0.pak" && -f "$DEST/pak1.pak" ]]; then
  echo "[dp-fetch-librequake] already present: $DEST/pak0.pak"
  exit 0
fi

echo "[dp-fetch-librequake] downloading LibreQuake lite…"
curl -fL --retry 3 -o "$TMP" "$URL"
echo "$SHA  $TMP" | sha256sum -c -
rm -rf "$WORKDIR"
mkdir -p "$WORKDIR" "$DEST"
unzip -q "$TMP" -d "$WORKDIR"
cp -a "$WORKDIR"/lite/id1/. "$DEST/"
rm -rf "$TMP" "$WORKDIR"
test -f "$DEST/pak0.pak"
echo "[dp-fetch-librequake] installed free id1 data into $DEST"
echo "[dp-fetch-librequake] Attribution: LibreQuake — https://github.com/lavenderdotpet/LibreQuake"
