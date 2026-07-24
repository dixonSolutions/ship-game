# Performance budget

Targets for the polished vertical slice on a mid-range laptop.

| Metric | Budget |
| --- | --- |
| Initial JS (compressed) | ≤ 1.5 MB warn / fail soft at 2.5 MB during scaffold |
| Time to interactive (dev) | < 3 s on localhost |
| Frame rate | 60 FPS calm seas; ≥ 30 FPS in storms |
| Draw calls | Keep procedural ships + one ocean mesh; instancing later |
| Particles | Cap spray/wake emitters (future) at ≤ 2k active |
| Audio | ≤ 6 concurrent Howl voices |
| API | Dialogue ≤ 256 tokens; TTS ≤ 500 chars |

## Current scaffold notes

- Pixel ratio capped at 2
- Ocean plane 64×64 segments — raise/lower with graphics setting later
- Angular production budgets in `angular.json` start conservative; raise carefully with Optimus + Three

## Profiling checklist

1. Chrome Performance + Memory while storm + combat
2. `ng build` stats / source-map explorer when bundles grow
3. Server: watch Bedrock latency; keep mocks for CI
