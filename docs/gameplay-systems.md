# Gameplay systems

## Wind

Direction + strength drive sail thrust via a simplified polar:

- Best on a beam reach (~90°)
- Softened on a dead run
- Heavy penalty inside a ~35° no-go zone

Wind also contributes lateral heel.

## Ocean

Gerstner-like height samples feed buoyancy, pitch/roll, and the Three.js ocean shader. Wave scale is adjustable in settings. Tsunami weather builds a `tsunamiPulse` swell that shoves ships along the wind face. Tornado weather adds vortex chop and a funnel FX near the player.

## Weather

Presets: clear, rain, storm, fog, lightning, hurricane, tsunami, tornado.

Each sets visibility, precipitation, and lightning chance. A **Weather intensity** slider (0–1, default 0.55) scales wind gusts, precipitation, tsunami pulse amplitude, tornado spin rate, lightning chance, and light sail stress. The weather tick can emit lightning flashes (visual + thunder SFX) and boosts wind in severe weather. Voyage grace still blocks lethal weather stress.

## Ship physics

Inputs: sail trim, rudder, throttle, anchor.

Outputs: speed, heading, heel, pitch, position, sink progress.

- Anchor bleeds speed quickly while retaining wave rocking
- Hull zero triggers a sinking animation before defeat
- Sail integrity reduces available thrust after combat damage

## Combat

- Player aim cone from `cannonAimYaw` / pitch (mouse, touch, gamepad)
- Reload gate (~2.4s) with HUD meter
- Hit falloff by distance; miss traces still spawn visuals
- AI hostiles circle for broadsides and return fire
- Shot visuals: cannonballs, muzzle smoke, water splash, impact burst
- Hull hits spawn explosion flash/blast, wood debris shards, and rupture FX
- Hull integrity bands (0.6 / 0.3 / 0) trigger structural ruptures; sink triggers a secondary blast + smoke trail
- Ship meshes scar, crack, and lose sail/mast integrity as damage accumulates
- Victory when all hostiles are destroyed; defeat after the player finishes sinking

## Crew

Roles: captain, helmsman, gunner, lookout, boatswain.

- Procedural deck avatars with role offsets
- Morale ticks with hull integrity
- Contextual dialogue cues call the secured `/api/dialogue` endpoint
- Distinct Polly voice IDs per role via `/api/tts` (mockable)

## AI ships

Factions: merchant, navy, pirate.

- Merchants follow wind corridors
- Hostiles approach, then hold broadside arcs
- Damaged ships slow; destroyed ships sink and vanish from play once submerged
