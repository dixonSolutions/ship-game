import type { WeatherId, WeatherState } from './types';

const PRESETS: Record<WeatherId, Omit<WeatherState, 'id'>> = {
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
    return { id, ...PRESETS[id] };
  }

  setWeather(current: WeatherState, id: WeatherId): WeatherState {
    return { id, ...PRESETS[id] };
  }
}
