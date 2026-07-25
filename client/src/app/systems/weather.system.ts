import type { WeatherId, WeatherState, WindState } from './types';

const PRESETS: Record<WeatherId, Omit<WeatherState, 'id' | 'lightningFlash'>> = {
  clear: { visibility: 1, precipitation: 0, lightningChance: 0 },
  rain: { visibility: 0.75, precipitation: 0.45, lightningChance: 0.05 },
  storm: { visibility: 0.45, precipitation: 0.8, lightningChance: 0.35 },
  fog: { visibility: 0.25, precipitation: 0.05, lightningChance: 0 },
  lightning: { visibility: 0.5, precipitation: 0.6, lightningChance: 0.85 },
  hurricane: { visibility: 0.3, precipitation: 1, lightningChance: 0.7 },
  tsunami: { visibility: 0.55, precipitation: 0.2, lightningChance: 0.1 },
  tornado: { visibility: 0.35, precipitation: 0.55, lightningChance: 0.4 },
};

export class WeatherSystem {
  create(id: WeatherId = 'clear'): WeatherState {
    return { id, lightningFlash: 0, ...PRESETS[id] };
  }

  setWeather(current: WeatherState, id: WeatherId): WeatherState {
    return { id, lightningFlash: current.lightningFlash * 0.3, ...PRESETS[id] };
  }

  /**
   * Advance lightning flashes and return wind modifiers for severe weather.
   * `intensity` (0–1) scales gusts, spin, precipitation, and flash chance.
   */
  update(
    weather: WeatherState,
    wind: WindState,
    dt: number,
    intensity = 0.55,
  ): { weather: WeatherState; wind: WindState } {
    const i = clamp(intensity, 0, 1);
    const preset = PRESETS[weather.id];

    // Blend visibility / precip toward intensity-scaled preset values.
    const visibility = lerp(1, preset.visibility, 0.35 + i * 0.65);
    const precipitation = preset.precipitation * (0.35 + i * 0.65);
    const lightningChance = preset.lightningChance * (0.25 + i * 0.75);

    let flash = Math.max(0, weather.lightningFlash - dt * 3.5);
    if (lightningChance > 0 && Math.random() < lightningChance * dt * 0.85) {
      flash = 1;
    }

    let directionRad = wind.directionRad;
    let strength = wind.strength;

    if (weather.id === 'hurricane') {
      strength = Math.max(strength, 0.75 + i * 0.24);
    } else if (weather.id === 'storm' || weather.id === 'lightning') {
      strength = Math.max(strength, 0.55 + i * 0.25);
    } else if (weather.id === 'tsunami') {
      strength = Math.max(strength, 0.4 + i * 0.35);
    } else if (weather.id === 'tornado') {
      // Vortex: wind spins and gusts hard.
      const spin = (0.55 + i * 1.8) * dt;
      directionRad = wrapAngle(directionRad + spin);
      const gust = 0.08 * Math.sin(performanceNowSafe() * 0.004 + directionRad * 3);
      strength = Math.max(strength, 0.7 + i * 0.28 + gust);
    }

    return {
      weather: {
        ...weather,
        visibility,
        precipitation,
        lightningChance,
        lightningFlash: flash,
      },
      wind: {
        directionRad,
        strength: Math.min(1, strength),
      },
    };
  }
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * clamp(t, 0, 1);
}

function wrapAngle(a: number): number {
  const tau = Math.PI * 2;
  return ((a % tau) + tau) % tau;
}

function performanceNowSafe(): number {
  return typeof performance !== 'undefined' ? performance.now() : Date.now();
}
