import { describe, expect, it } from 'vitest';
import { ShipPhysicsSystem } from './ship-physics.system';
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
    const ocean: OceanState = { waveHeight: 0.5, waveLength: 16, chop: 0.2, time: 0 };

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
    const ocean: OceanState = { waveHeight: 0.4, waveLength: 12, chop: 0.2, time: 0 };

    state = physics.update(state, controls, wind, ocean, 0.5);
    expect(state.speed).toBeLessThan(4);
  });
});
