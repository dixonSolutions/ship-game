import type { OceanState, WeatherId } from './types';

export class OceanSystem {
  create(): OceanState {
    return { waveHeight: 0.6, waveLength: 18, chop: 0.25, time: 0 };
  }

  update(ocean: OceanState, dt: number, weather: WeatherId): OceanState {
    const stormBoost =
      weather === 'hurricane' || weather === 'tsunami'
        ? 2.2
        : weather === 'storm'
          ? 1.6
          : 1;
    return {
      ...ocean,
      time: ocean.time + dt,
      waveHeight: 0.5 * stormBoost,
      chop: 0.2 * stormBoost,
    };
  }

  /** Sample a lightweight Gerstner-like height for buoyancy stubs. */
  sampleHeight(ocean: OceanState, x: number, z: number): number {
    const k = (Math.PI * 2) / Math.max(1, ocean.waveLength);
    return (
      Math.sin(x * k + ocean.time * 1.2) * ocean.waveHeight * 0.55 +
      Math.cos(z * k * 0.8 + ocean.time * 0.9) * ocean.waveHeight * 0.35 * ocean.chop
    );
  }
}
