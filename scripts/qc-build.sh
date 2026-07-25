#!/usr/bin/env bash
# Compile Ship Game QuakeC → darkplaces/shipgame/progs.dat
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="$ROOT/darkplaces/shipgame/src"
export PATH="${HOME}/.local/bin:/usr/bin:$PATH"

if command -v fteqcc >/dev/null 2>&1; then
  QCC=fteqcc
elif command -v gmqcc >/dev/null 2>&1; then
  QCC=gmqcc
else
  echo "error: fteqcc or gmqcc required (apt install fteqcc)" >&2
  exit 1
fi

echo "[qc-build] using $QCC"
cd "$SRC"
if [[ "$QCC" == "fteqcc" ]]; then
  fteqcc -srcfile progs.src
else
  gmqcc -o ../progs.dat $(grep '\.qc$' progs.src | tr '\n' ' ')
fi

test -f "$ROOT/darkplaces/shipgame/progs.dat"
SIZE=$(wc -c < "$ROOT/darkplaces/shipgame/progs.dat")
echo "[qc-build] wrote darkplaces/shipgame/progs.dat ($SIZE bytes)"
