import type { OceanState, ShipControls, ShipState, WindState } from './types';
import { WindSystem } from './wind.system';
import { OceanSystem } from './ocean.system';

export class ShipPhysicsSystem {
  private readonly wind = new WindSystem();
  private readonly ocean = new OceanSystem();

  createPlayer(): ShipState {
    return {
      position: { x: 0, y: 0, z: 0 },
      heading: 0,
      speed: 0,
      heel: 0,
      pitch: 0,
      hullIntegrity: 1,
      sailIntegrity: 1,
    };
  }

  update(
    ship: ShipState,
    controls: ShipControls,
    wind: WindState,
    ocean: OceanState,
    dt: number,
  ): ShipState {
    if (controls.anchorDeployed) {
      return {
        ...ship,
        speed: ship.speed * Math.max(0, 1 - dt * 2.5),
        heel: ship.heel * 0.9,
      };
    }

    const thrust = this.wind.update(wind, ship.heading, controls) * ship.sailIntegrity;
    const throttle = Math.max(0, Math.min(1, controls.throttle)) * 0.35;
    const targetSpeed = (thrust + throttle) * 8;
    const speed = ship.speed + (targetSpeed - ship.speed) * Math.min(1, dt * 1.4);
    const heading = ship.heading + controls.rudder * dt * (0.4 + speed * 0.08);
    const waveY = this.ocean.sampleHeight(ocean, ship.position.x, ship.position.z);

    return {
      ...ship,
      heading,
      speed,
      position: {
        x: ship.position.x + Math.sin(heading) * speed * dt,
        y: waveY,
        z: ship.position.z + Math.cos(heading) * speed * dt,
      },
      heel: controls.rudder * 0.25 + wind.strength * 0.1,
      pitch: Math.sin(ocean.time * 1.3) * ocean.waveHeight * 0.05,
    };
  }
}
