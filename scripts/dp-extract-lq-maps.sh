#!/usr/bin/env bash
# Extract textured LibreQuake maps from id1/pak0.pak into shipgame/maps for local/GDR playtests.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PAK="$ROOT/darkplaces/id1/pak0.pak"
OUT="$ROOT/darkplaces/shipgame/maps"
if [[ ! -f "$PAK" ]]; then
  echo "missing $PAK — run ./scripts/dp-fetch-librequake.sh first" >&2
  exit 1
fi
python3 - "$PAK" "$OUT" <<'PY'
import struct, pathlib, sys
pak_path, out_dir = pathlib.Path(sys.argv[1]), pathlib.Path(sys.argv[2])
data = pak_path.read_bytes()
ident, dirofs, dirlen = struct.unpack_from('<4sII', data, 0)
assert ident == b'PACK'
n = dirlen // 64
wanted = {
    'maps/start.bsp': 'start.bsp',
    'maps/start.lit': 'start.lit',
    'maps/lq_e0m1.bsp': 'lq_e0m1.bsp',
}
found = {v: False for v in wanted.values()}
for i in range(n):
    off = dirofs + i * 64
    name = data[off:off+56].split(b'\0', 1)[0].decode('latin1')
    if name not in wanted:
        continue
    foff, fsize = struct.unpack_from('<II', data, off+56)
    dest = out_dir / wanted[name]
    dest.write_bytes(data[foff:foff+fsize])
    found[wanted[name]] = True
    print(f'wrote {dest} ({fsize} bytes)')
missing = [k for k, ok in found.items() if not ok]
if missing:
    raise SystemExit(f'missing in pak: {missing}')
PY
echo "[dp-extract-lq-maps] done"
