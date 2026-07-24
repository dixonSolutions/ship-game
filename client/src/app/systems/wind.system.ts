import type { ShipControls, WindState } from './types';

/**
 * Simplified sailing polar:
 * - best thrust on a beam reach (~90°)
 * - reduced on a run
 * - heavy penalty when pointing too close to the wind
 */
export class WindSystem {
  /** Returns normalized thrust contribution in [0, 1]. */
  update(wind: WindState, heading: number, controls: ShipControls): number {
    const sailEfficiency = clamp(controls.sailTrim, 0, 1);
    const relative = wrapAngle(wind.directionRad - heading);
    const absRel = Math.abs(relative);

    // Close-hauled no-go zone (~35°).
    if (absRel < 0.6) {
      return wind.strength * sailEfficiency * 0.12;
    }

    // Beam reach sweet spot, softer on a dead run.
    const reach = Math.sin(absRel);
    const runSoftening = absRel > 2.4 ? 0.55 : 1;
    return wind.strength * sailEfficiency * reach * runSoftening;
  }

  /** Lateral heeling force from wind pressure on sails. */
  heelForce(wind: WindState, heading: number, sailTrim: number): number {
    const relative = wrapAngle(wind.directionRad - heading);
    return Math.sin(relative) * wind.strength * clamp(sailTrim, 0, 1) * 0.35;
  }
}

export function wrapAngle(rad: number): number {
  let a = rad;
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}
