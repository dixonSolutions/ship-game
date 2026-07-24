import { describe, expect, it } from 'vitest';
import { ShipPhysicsSystem } from './ship-physics.system';
import { WindSystem } from './wind.system';
import { WeatherSystem } from './weather.system';
import { CombatSystem } from './combat.system';
import { OceanSystem } from './ocean.system';
import type { OceanState, ShipControls, WindState } from './types';

describe('ShipPhysicsSystem', () => {
  it('increases speed with sail trim and wind', () => {
    const physics = new ShipPhysicsSystem();
    const ship = physics.createPlayer();
    const controls: ShipControls = {
      sailTrim: 1,
      rudder: 0,
      throttle: 0,
      anchorDeployed: false,
      cannonAimYaw: 0,
      cannonAimPitch: 0,
      fireCannon: false,
    };
    const wind: WindState = { directionRad: Math.PI / 2, strength: 0.9 };
    const ocean: OceanState = {
      waveHeight: 0.5,
      waveLength: 16,
      chop: 0.2,
      time: 0,
      tsunamiPulse: 0,
      windDirectionRad: Math.PI / 2,
      windStrength: 0.9,
      swell: 0.5,
    };

    let state = ship;
    for (let i = 0; i < 30; i++) {
      state = physics.update(state, controls, wind, ocean, 0.1);
    }

    expect(state.speed).toBeGreaterThan(0.5);
  });

  it('stops accelerating when anchor is deployed', () => {
    const physics = new ShipPhysicsSystem();
    let state = { ...physics.createPlayer(), speed: 4 };
    const controls: ShipControls = {
      sailTrim: 1,
      rudder: 0,
      throttle: 1,
      anchorDeployed: true,
      cannonAimYaw: 0,
      cannonAimPitch: 0,
      fireCannon: false,
    };
    const wind: WindState = { directionRad: 0, strength: 1 };
    const ocean: OceanState = {
      waveHeight: 0.4,
      waveLength: 12,
      chop: 0.2,
      time: 0,
      tsunamiPulse: 0,
      windDirectionRad: 0,
      windStrength: 1,
      swell: 0.4,
    };

    state = physics.update(state, controls, wind, ocean, 0.5);
    expect(state.speed).toBeLessThan(4);
  });

  it('sinks after hull is destroyed', () => {
    const physics = new ShipPhysicsSystem();
    let state = { ...physics.createPlayer(), hullIntegrity: 0, sinkProgress: 0 };
    const controls: ShipControls = {
      sailTrim: 1,
      rudder: 0,
      throttle: 0,
      anchorDeployed: false,
      cannonAimYaw: 0,
      cannonAimPitch: 0,
      fireCannon: false,
    };
    const wind: WindState = { directionRad: 0, strength: 0.5 };
    const ocean: OceanState = {
      waveHeight: 0.5,
      waveLength: 16,
      chop: 0.2,
      time: 1,
      tsunamiPulse: 0,
      windDirectionRad: 0,
      windStrength: 0.5,
      swell: 0.5,
    };
    state = physics.update(state, controls, wind, ocean, 0.5);
    expect(state.sinkProgress).toBeGreaterThan(0);
  });
});

describe('WindSystem', () => {
  it('penalizes sailing directly into the wind', () => {
    const windSys = new WindSystem();
    const wind: WindState = { directionRad: 0, strength: 1 };
    const controls: ShipControls = {
      sailTrim: 1,
      rudder: 0,
      throttle: 0,
      anchorDeployed: false,
      cannonAimYaw: 0,
      cannonAimPitch: 0,
      fireCannon: false,
    };
    const intoWind = windSys.update(wind, 0, controls);
    const beamReach = windSys.update(wind, Math.PI / 2, controls);
    expect(beamReach).toBeGreaterThan(intoWind);
  });
});

describe('WeatherSystem', () => {
  it('applies weather presets and can flash lightning', () => {
    const weather = new WeatherSystem();
    let state = weather.create('clear');
    state = weather.setWeather(state, 'lightning');
    expect(state.precipitation).toBeGreaterThan(0.5);
    expect(state.lightningChance).toBeGreaterThan(0.5);

    // Force a flash via many ticks with high chance
    let sawFlash = false;
    for (let i = 0; i < 80; i++) {
      const tick = weather.update(state, { directionRad: 0, strength: 0.4 }, 0.25);
      state = tick.weather;
      if (state.lightningFlash > 0.5) sawFlash = true;
    }
    expect(sawFlash).toBe(true);
  });
});

describe('CombatSystem', () => {
  it('applies hull and sail damage', () => {
    const combat = new CombatSystem();
    const ship = {
      position: { x: 0, y: 0, z: 0 },
      heading: 0,
      speed: 2,
      heel: 0,
      pitch: 0,
      hullIntegrity: 1,
      sailIntegrity: 1,
      sinkProgress: 0,
    };
    const damaged = combat.applyDamage(ship, 0.2);
    expect(damaged.hullIntegrity).toBeCloseTo(0.8);
    expect(damaged.sailIntegrity).toBeLessThan(1);
  });

  it('hits targets inside the aim cone', () => {
    const combat = new CombatSystem();
    const player = {
      position: { x: 0, y: 0, z: 0 },
      heading: 0,
      speed: 2,
      heel: 0,
      pitch: 0,
      hullIntegrity: 1,
      sailIntegrity: 1,
      sinkProgress: 0,
    };
    const controls: ShipControls = {
      sailTrim: 1,
      rudder: 0,
      throttle: 0,
      anchorDeployed: false,
      cannonAimYaw: 0,
      cannonAimPitch: 0.1,
      fireCannon: true,
    };
    const aiShips = [
      {
        id: 'pirate-1',
        faction: 'pirate' as const,
        hostile: true,
        reloadTimer: 0,
        broadsideSide: 1 as const,
        ship: {
          position: { x: 0, y: 0, z: 20 },
          heading: Math.PI,
          speed: 2,
          heel: 0,
          pitch: 0,
          hullIntegrity: 1,
          sailIntegrity: 1,
          sinkProgress: 0,
        },
      },
    ];
    const shot = combat.resolvePlayerShot(player, controls, aiShips);
    expect(shot.hit).toBe(true);
    expect(shot.targetId).toBe('pirate-1');
    expect(shot.damage).toBeGreaterThan(0);
  });
});

describe('OceanSystem', () => {
  it('boosts waves during tsunami', () => {
    const ocean = new OceanSystem();
    let state = ocean.create();
    state = ocean.update(state, 1, 'tsunami', 1);
    expect(state.tsunamiPulse).toBeGreaterThan(0);
    expect(state.waveHeight).toBeGreaterThan(ocean.create().waveHeight);
  });

  it('grows chop and swell with stronger wind', () => {
    const ocean = new OceanSystem();
    const calm = ocean.update(ocean.create(), 0.1, 'clear', 1, {
      directionRad: 0,
      strength: 0.15,
    });
    const gale = ocean.update(ocean.create(), 0.1, 'clear', 1, {
      directionRad: 1.2,
      strength: 0.95,
    });
    expect(gale.chop).toBeGreaterThan(calm.chop);
    expect(gale.swell).toBeGreaterThan(calm.swell);
    expect(gale.waveHeight).toBeGreaterThan(calm.waveHeight);
  });

  it('samples uneven heights along the wind fetch', () => {
    const ocean = new OceanSystem();
    const state = ocean.update(ocean.create(), 0, 'clear', 1, {
      directionRad: 0,
      strength: 0.8,
    });
    const a = ocean.sampleHeight({ ...state, time: 3.2 }, 0, 0);
    const b = ocean.sampleHeight({ ...state, time: 3.2 }, 8, 0);
    const c = ocean.sampleHeight({ ...state, time: 3.2 }, 0, 8);
    expect(Math.abs(a - b) + Math.abs(a - c)).toBeGreaterThan(0.05);
  });
});
