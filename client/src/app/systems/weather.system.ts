import type { WeatherId, WeatherState, WindState } from './types';

const PRESETS: Record<WeatherId, Omit<WeatherState, 'id' | 'lightningFlash'>> = {
  clear: { visibility: 1, precipitation: 0, lightningChance: 0 },
  rain: { visibility: 0.75, precipitation: 0.45, lightningChance: 0.05 },
  storm: { visibility: 0.45, precipitation: 0.8, lightningChance: 0.35 },
  fog: { visibility: 0.25, precipitation: 0.05, lightningChance: 0 },
  lightning: { visibility: 0.5, precipitation: 0.6, lightningChance: 0.85 },
  hurricane: { visibility: 0.3, precipitation: 1, lightningChance: 0.7 },
  tsunami: { visibility: 0.55, precipitation: 0.2, lightningChance: 0.1 },
};

export class WeatherSystem {
  create(id: WeatherId = 'clear'): WeatherState {
    return { id, lightningFlash: 0, ...PRESETS[id] };
  }

  setWeather(current: WeatherState, id: WeatherId): WeatherState {
    return { id, lightningFlash: current.lightningFlash * 0.3, ...PRESETS[id] };
  }

  /** Advance lightning flashes and return wind modifiers for severe weather. */
  update(
    weather: WeatherState,
    wind: WindState,
    dt: number,
  ): { weather: WeatherState; wind: WindState } {
    let flash = Math.max(0, weather.lightningFlash - dt * 3.5);
    if (weather.lightningChance > 0 && Math.random() < weather.lightningChance * dt * 0.85) {
      flash = 1;
    }

    let strength = wind.strength;
    if (weather.id === 'hurricane') strength = Math.max(strength, 0.92);
    else if (weather.id === 'storm' || weather.id === 'lightning') strength = Math.max(strength, 0.7);
    else if (weather.id === 'tsunami') strength = Math.max(strength, 0.55);

    return {
      weather: { ...weather, lightningFlash: flash },
      wind: { ...wind, strength: Math.min(1, strength) },
    };
  }
}
