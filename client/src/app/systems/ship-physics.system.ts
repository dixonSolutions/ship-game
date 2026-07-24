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
      sinkProgress: 0,
    };
  }

  update(
    ship: ShipState,
    controls: ShipControls,
    wind: WindState,
    ocean: OceanState,
    dt: number,
  ): ShipState {
    if (ship.hullIntegrity <= 0) {
      const sinkProgress = Math.min(1, ship.sinkProgress + dt * 0.22);
      return {
        ...ship,
        speed: ship.speed * Math.max(0, 1 - dt * 1.8),
        sinkProgress,
        position: {
          ...ship.position,
          y: this.ocean.sampleHeight(ocean, ship.position.x, ship.position.z) - sinkProgress * 4.5,
        },
        heel: ship.heel + dt * 0.35,
        pitch: ship.pitch + dt * 0.15,
      };
    }

    if (controls.anchorDeployed) {
      const waveY = this.ocean.sampleHeight(ocean, ship.position.x, ship.position.z);
      const slope = this.ocean.sampleSlope(ocean, ship.position.x, ship.position.z);
      return {
        ...ship,
        speed: ship.speed * Math.max(0, 1 - dt * 2.8),
        heel: ship.heel * 0.88 + slope.roll * 0.2,
        pitch: ship.pitch * 0.88 + slope.pitch * 0.35,
        position: { ...ship.position, y: waveY },
        sinkProgress: 0,
      };
    }

    const thrust = this.wind.update(wind, ship.heading, controls) * ship.sailIntegrity;
    const throttle = clamp(controls.throttle, 0, 1) * 0.4;
    const drag = 0.08 + Math.abs(controls.rudder) * 0.04;
    const targetSpeed = (thrust + throttle) * 9 * (1 - drag * 0.35);
    const speed = ship.speed + (targetSpeed - ship.speed) * Math.min(1, dt * 1.55);

    const turnRate = (0.55 + speed * 0.1) * (0.35 + ship.sailIntegrity * 0.65);
    const heading = ship.heading + controls.rudder * dt * turnRate;

    const waveY = this.ocean.sampleHeight(ocean, ship.position.x, ship.position.z);
    const slope = this.ocean.sampleSlope(ocean, ship.position.x, ship.position.z);
    const windHeel = this.wind.heelForce(wind, heading, controls.sailTrim);
    const heel = lerp(ship.heel, controls.rudder * 0.28 + windHeel + slope.roll * 0.45, dt * 3);
    const pitch = lerp(ship.pitch, slope.pitch + Math.sin(ocean.time * 1.4) * ocean.waveHeight * 0.04, dt * 3);

    return {
      ...ship,
      heading,
      speed,
      position: {
        x: ship.position.x + Math.sin(heading) * speed * dt,
        y: waveY,
        z: ship.position.z + Math.cos(heading) * speed * dt,
      },
      heel,
      pitch,
      sinkProgress: 0,
    };
  }
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * Math.min(1, Math.max(0, t));
}
