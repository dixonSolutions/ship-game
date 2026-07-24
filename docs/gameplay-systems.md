# Gameplay systems

## Wind

Direction + strength drive sail thrust via a simplified polar:

- Best on a beam reach (~90°)
- Softened on a dead run
- Heavy penalty inside a ~35° no-go zone

Wind also contributes lateral heel.

## Ocean

Gerstner-like height samples feed buoyancy, pitch/roll, and the Three.js ocean shader. Wave scale is adjustable in settings. Tsunami weather builds a `tsunamiPulse` swell.

## Weather

Presets: clear, rain, storm, fog, lightning, hurricane, tsunami.

Each sets visibility, precipitation, and lightning chance. The weather tick can emit lightning flashes (visual + thunder SFX) and boosts wind in severe weather.

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
- Shot visuals: cannon trace, muzzle smoke, impact burst
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
