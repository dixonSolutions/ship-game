# Gameplay systems

## Wind

Direction + strength drive sail thrust. Relative wind angle favors beam reaches; pointing too high into the wind cuts power.

## Ocean

Procedural height field (Gerstner-like samples) feeds buoyancy/rocking stubs and the Three.js ocean mesh.

## Weather

Presets: clear, rain, storm, fog, lightning, hurricane, tsunami. Each sets visibility, precipitation, and lightning chance. Adjustable from Settings.

## Ship physics

Inputs: sail trim, rudder, throttle, anchor. Outputs: speed, heading, heel, pitch, position. Anchor bleeds speed quickly.

## Combat

Cannon fire with reload gate, nearest-hostile cone hit stub, hull integrity, sinking / victory conditions.

## Crew

Roles (captain, helmsman, gunner, lookout, boatswain), morale tick from hull state. Dialogue goes through the secured API with constrained context.

## AI ships

Faction tags (merchant, navy, pirate), patrol vs chase, damage and sink. Hostile pirates seed the combat vertical slice.
