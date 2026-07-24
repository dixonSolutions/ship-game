import type { ShipControls, WindState } from './types';

/** Wind influence on sail thrust (stub-ready for full aero model). */
export class WindSystem {
  update(wind: WindState, heading: number, controls: ShipControls): number {
    const sailEfficiency = Math.max(0, Math.min(1, controls.sailTrim));
    const relative = wrapAngle(wind.directionRad - heading);
    // Simplified polar: best on a beam reach (~90°), poor dead into wind.
    const angleFactor = Math.max(0, Math.sin(Math.abs(relative)));
    const intoWindPenalty = Math.abs(relative) < 0.6 ? 0.15 : 1;
    return wind.strength * sailEfficiency * angleFactor * intoWindPenalty;
  }
}

function wrapAngle(rad: number): number {
  let a = rad;
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}
