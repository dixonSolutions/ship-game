import type { OceanState, WeatherId, WindState } from './types';

/** Lightweight multi-layer ocean: wind swells, chop, and irregular crests. */
export class OceanSystem {
  create(): OceanState {
    return {
      waveHeight: 0.85,
      waveLength: 22,
      chop: 0.42,
      time: 0,
      tsunamiPulse: 0,
      windDirectionRad: Math.PI * 0.25,
      windStrength: 0.55,
      swell: 0.55,
    };
  }

  update(
    ocean: OceanState,
    dt: number,
    weather: WeatherId,
    waveScale = 1,
    wind?: WindState,
    intensity = 0.55,
  ): OceanState {
    const i = clamp(intensity, 0, 1);
    // Keep boosts modest so severe weather stays seagoing, not alpine.
    const stormBoost =
      weather === 'hurricane'
        ? 1.45 + i * 0.35
        : weather === 'tornado'
          ? 1.2 + i * 0.25
          : weather === 'storm' || weather === 'lightning'
            ? 1.28 + i * 0.28
            : weather === 'rain'
              ? 1.1 + i * 0.12
              : weather === 'tsunami'
                ? 1.15 + i * 0.2
                : 1;

    let tsunamiPulse = ocean.tsunamiPulse;
    if (weather === 'tsunami') {
      // Rolling swell pulse; intensity controls fill rate and ceiling.
      const ceiling = 0.28 + i * 0.42;
      tsunamiPulse = Math.min(ceiling, tsunamiPulse + dt * (0.18 + i * 0.28));
    } else {
      tsunamiPulse = Math.max(0, tsunamiPulse - dt * 0.5);
    }

    const windStrength = wind?.strength ?? ocean.windStrength;
    const windDirectionRad = wind?.directionRad ?? ocean.windDirectionRad;
    // Soften user wave scale so max slider stays sail-boat sized, not alpine.
    const scale = 0.65 + clamp(waveScale, 0.25, 2) * 0.45;

    // Slow natural wander so seas never look perfectly periodic.
    const wander = 0.04 * Math.sin(ocean.time * 0.17) + 0.03 * Math.sin(ocean.time * 0.41 + 1.7);
    // Tornado: local vortex does the drama; global chop stays restrained.
    const tornadoChop = weather === 'tornado' ? 0.08 + i * 0.18 : 0;
    const swell = clamp(
      0.4 + windStrength * 0.5 + tsunamiPulse * (0.35 + i * 0.3) + wander,
      0.25,
      1.25,
    );
    const chop = clamp(
      (0.28 + windStrength * 0.45 + wander * 0.4 + tornadoChop) * stormBoost,
      0.2,
      1.15,
    );
    const baseHeight = clamp(
      (0.55 + windStrength * 0.4 + tsunamiPulse * (0.7 + i * 0.45) + swell * 0.12) *
        stormBoost *
        scale,
      0.25,
      1.85,
    );

    let waveLength = 16 + (1 - windStrength) * 10;
    if (weather === 'tsunami') waveLength = 32 + i * 12;
    else if (weather === 'tornado') waveLength = 14 + (1 - i) * 6;

    return {
      ...ocean,
      time: ocean.time + dt,
      waveHeight: baseHeight,
      chop,
      swell,
      tsunamiPulse,
      windDirectionRad,
      windStrength,
      waveLength,
    };
  }

  /**
   * Multi-octave height sample (matches shader layers for buoyancy).
   * Primary swell travels with the wind; chop crosses it for a restless sea.
   * Tornado adds a subtle vortex dip near (vortexX, vortexZ) when provided.
   */
  sampleHeight(
    ocean: OceanState,
    x: number,
    z: number,
    options?: { weather?: WeatherId; vortexX?: number; vortexZ?: number; intensity?: number },
  ): number {
    const t = ocean.time;
    const dirX = Math.sin(ocean.windDirectionRad);
    const dirZ = Math.cos(ocean.windDirectionRad);
    const crossX = -dirZ;
    const crossZ = dirX;
    const w = clamp(ocean.windStrength, 0.05, 1);
    const H = ocean.waveHeight;
    const chop = ocean.chop;
    const swellAmp = ocean.swell;

    const along = x * dirX + z * dirZ;
    const across = x * crossX + z * crossZ;

    // Long wind swell
    const k1 = (Math.PI * 2) / Math.max(8, ocean.waveLength);
    const swell =
      Math.sin(along * k1 + t * (0.55 + w * 0.45)) * H * 0.48 * swellAmp +
      Math.sin(along * k1 * 0.55 + across * k1 * 0.2 + t * 0.38) * H * 0.26 * swellAmp +
      Math.sin(along * k1 * 0.28 + t * 0.22) * H * 0.14 * swellAmp;

    // Mid chop, slightly skewed off the wind
    const k2 = k1 * 2.25;
    const mid =
      Math.sin(along * k2 * 0.9 + across * k2 * 0.38 + t * 1.4) * H * 0.26 * chop +
      Math.cos(across * k2 + along * k2 * 0.22 + t * 1.15) * H * 0.2 * chop +
      Math.sin(along * k2 * 1.35 - across * k2 * 0.65 + t * 1.8) * H * 0.12 * chop;

    // Short, noisy capillary chop — pseudo-random via phase-offset sines
    const k3 = k1 * 4.8;
    const micro =
      Math.sin(along * k3 + across * k3 * 1.35 + t * 2.6 + hashAngle(x, z)) * H * 0.12 * chop * w +
      Math.sin(across * k3 * 1.8 - along * k3 * 0.45 + t * 3.1) * H * 0.09 * chop +
      Math.cos(along * k3 * 0.7 + across * k3 * 2.0 + t * 3.6) * H * 0.06 * chop;

    // Occasional steeper crest (breaking feel) when wind is up
    const crest =
      Math.pow(Math.max(0, Math.sin(along * k1 * 1.15 + t * 0.95)), 2.8) * H * 0.16 * chop * w;

    const tsunami =
      ocean.tsunamiPulse > 0
        ? Math.sin(along * k1 * 0.22 + t * 0.48) * H * 0.32 * ocean.tsunamiPulse
        : 0;

    let vortex = 0;
    if (options?.weather === 'tornado' && options.vortexX !== undefined && options.vortexZ !== undefined) {
      const i = clamp(options.intensity ?? 0.55, 0, 1);
      const dx = x - options.vortexX;
      const dz = z - options.vortexZ;
      const dist = Math.hypot(dx, dz);
      const radius = 8 + i * 10;
      if (dist < radius) {
        const falloff = 1 - dist / radius;
        vortex =
          Math.sin(dist * 0.9 - t * 3.2) * H * 0.22 * falloff * (0.5 + i) +
          Math.sin(Math.atan2(dz, dx) * 3 + t * 4) * H * 0.08 * falloff;
      }
    }

    return swell + mid + micro + crest + tsunami + vortex;
  }

  sampleSlope(
    ocean: OceanState,
    x: number,
    z: number,
    options?: { weather?: WeatherId; vortexX?: number; vortexZ?: number; intensity?: number },
  ): { pitch: number; roll: number } {
    const eps = 0.55;
    const h = this.sampleHeight(ocean, x, z, options);
    const hx = this.sampleHeight(ocean, x + eps, z, options);
    const hz = this.sampleHeight(ocean, x, z + eps, options);
    return {
      pitch: Math.atan2(hz - h, eps) * 0.72,
      roll: Math.atan2(hx - h, eps) * 0.72,
    };
  }

  /** Lateral shove vector from a tsunami face (XZ). */
  tsunamiShove(ocean: OceanState, intensity: number): { x: number; z: number; heel: number } {
    if (ocean.tsunamiPulse <= 0.05) return { x: 0, z: 0, heel: 0 };
    const i = clamp(intensity, 0, 1);
    const dirX = Math.sin(ocean.windDirectionRad);
    const dirZ = Math.cos(ocean.windDirectionRad);
    const force = ocean.tsunamiPulse * (1.2 + i * 2.2);
    return {
      x: dirX * force,
      z: dirZ * force,
      heel: ocean.tsunamiPulse * (0.12 + i * 0.22) * Math.sin(ocean.time * 1.1),
    };
  }
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

/** Stable spatial phase so micro-chop looks irregular but not flickering noise. */
function hashAngle(x: number, z: number): number {
  const s = Math.sin(x * 12.9898 + z * 78.233) * 43758.5453;
  return (s - Math.floor(s)) * Math.PI * 2;
}
