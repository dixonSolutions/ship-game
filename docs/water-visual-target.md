# Water visual target

User feedback: avoid chunky / alpine low-poly peaks. Aim for readable, realistic ocean.

## Reference look (search terms)

- Mid-scale ocean surface: directional swell, surface roughness, whitecap tips only
- Deep blue / ultramarine troughs; pale foam only on steep crests
- Sailing-ship seas: teal-grey storm water OK, but keep troughs dark — not washed white faces
- Specular spray particles at crest breaks, not foam covering whole triangles

## Numeric guidance (game)

| Parameter | Target |
| --- | --- |
| Peak wave height (calm–gale) | ~0.4–1.6 world units (boat-scale) |
| Tsunami / storm boost | Longer wavelength first; height soft-cap ~1.85 |
| Foam | Crest tips only (mask ≤ ~0.4); never full-face white |
| Chop | Wind-aligned micro layers; tornado = local vortex, not global mountains |

## DarkPlaces / QuakeC

Prefer multi-layer sine swells + restrained `r_water*` / DP water; match buoyancy samples to visual amplitude. Do **not** scale height until faces look like snowy hills.
