import type { OceanState, WeatherId } from './types';

export class OceanSystem {
  create(): OceanState {
    return {
      waveHeight: 0.65,
      waveLength: 18,
      chop: 0.28,
      time: 0,
      tsunamiPulse: 0,
    };
  }

  update(ocean: OceanState, dt: number, weather: WeatherId, waveScale = 1): OceanState {
    const stormBoost =
      weather === 'hurricane' ? 2.4 : weather === 'storm' || weather === 'lightning' ? 1.7 : 1;

    let tsunamiPulse = ocean.tsunamiPulse;
    if (weather === 'tsunami') {
      tsunamiPulse = Math.min(1, tsunamiPulse + dt * 0.35);
    } else {
      tsunamiPulse = Math.max(0, tsunamiPulse - dt * 0.5);
    }

    const baseHeight = (0.55 + tsunamiPulse * 2.8) * stormBoost * clamp(waveScale, 0.25, 2);
    return {
      ...ocean,
      time: ocean.time + dt,
      waveHeight: baseHeight,
      chop: (0.22 + tsunamiPulse * 0.4) * stormBoost,
      tsunamiPulse,
      waveLength: weather === 'tsunami' ? 28 : 18,
    };
  }

  /** Gerstner-like height sample for buoyancy / rocking. */
  sampleHeight(ocean: OceanState, x: number, z: number): number {
    const k = (Math.PI * 2) / Math.max(1, ocean.waveLength);
    const t = ocean.time;
    const primary = Math.sin(x * k + t * 1.15) * ocean.waveHeight * 0.55;
    const cross = Math.cos(z * k * 0.85 + t * 0.95) * ocean.waveHeight * 0.35 * ocean.chop;
    const swell =
      Math.sin((x + z) * k * 0.35 + t * 0.45) * ocean.waveHeight * 0.25 * (0.4 + ocean.tsunamiPulse);
    return primary + cross + swell;
  }

  sampleSlope(ocean: OceanState, x: number, z: number): { pitch: number; roll: number } {
    const eps = 0.6;
    const h = this.sampleHeight(ocean, x, z);
    const hx = this.sampleHeight(ocean, x + eps, z);
    const hz = this.sampleHeight(ocean, x, z + eps);
    return {
      pitch: Math.atan2(hz - h, eps) * 0.65,
      roll: Math.atan2(hx - h, eps) * 0.65,
    };
  }
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}
