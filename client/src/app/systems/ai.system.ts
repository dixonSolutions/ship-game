import type { AiShipState, OceanState, ShipState, WindState } from './types';
import { OceanSystem } from './ocean.system';
import { wrapAngle } from './wind.system';

export class AiSystem {
  private readonly ocean = new OceanSystem();

  createPatrol(
    faction: AiShipState['faction'],
    x: number,
    z: number,
    hostile = false,
  ): AiShipState {
    return {
      id: `ai-${faction}-${Math.floor(x)}-${Math.floor(z)}`,
      faction,
      hostile,
      reloadTimer: 1 + Math.random() * 2,
      broadsideSide: Math.random() > 0.5 ? 1 : -1,
      ship: {
        position: { x, y: 0, z },
        heading: Math.random() * Math.PI * 2,
        speed: 2.2 + Math.random() * 1.8,
        heel: 0,
        pitch: 0,
        hullIntegrity: 1,
        sailIntegrity: 1,
        sinkProgress: 0,
      },
    };
  }

  update(
    ships: AiShipState[],
    player: ShipState,
    wind: WindState,
    ocean: OceanState,
    dt: number,
  ): AiShipState[] {
    return ships.map((ai) => {
      if (ai.ship.hullIntegrity <= 0) {
        const sinkProgress = Math.min(1, ai.ship.sinkProgress + dt * 0.2);
        const waveY = this.ocean.sampleHeight(ocean, ai.ship.position.x, ai.ship.position.z);
        return {
          ...ai,
          ship: {
            ...ai.ship,
            speed: 0,
            sinkProgress,
            position: {
              ...ai.ship.position,
              y: waveY - sinkProgress * 5,
            },
            heel: ai.ship.heel + dt * 0.4,
          },
        };
      }

      const dx = player.position.x - ai.ship.position.x;
      const dz = player.position.z - ai.ship.position.z;
      const dist = Math.hypot(dx, dz);
      const toPlayer = Math.atan2(dx, dz);

      let desiredHeading = ai.ship.heading;
      if (ai.hostile) {
        // Circle for a broadside rather than ramming bow-on.
        if (dist < 18) {
          desiredHeading = toPlayer + (Math.PI / 2) * ai.broadsideSide;
        } else if (dist > 42) {
          desiredHeading = toPlayer;
        } else {
          desiredHeading = toPlayer + 0.7 * ai.broadsideSide;
        }
      } else {
        // Merchants gently follow wind corridor.
        desiredHeading = wind.directionRad + Math.sin(ocean.time * 0.2 + dist * 0.01) * 0.4;
      }

      const headingError = wrapAngle(desiredHeading - ai.ship.heading);
      const heading = ai.ship.heading + clamp(headingError, -1, 1) * dt * 0.85;
      const speed =
        (ai.hostile ? 3.2 : 2.4) *
        (0.75 + wind.strength * 0.45) *
        ai.ship.sailIntegrity *
        (ai.ship.hullIntegrity < 0.4 ? 0.65 : 1);

      const waveY = this.ocean.sampleHeight(ocean, ai.ship.position.x, ai.ship.position.z);
      const slope = this.ocean.sampleSlope(ocean, ai.ship.position.x, ai.ship.position.z);

      return {
        ...ai,
        reloadTimer: Math.max(0, ai.reloadTimer - dt),
        ship: {
          ...ai.ship,
          heading,
          speed,
          heel: headingError * 0.2 + slope.roll * 0.4,
          pitch: slope.pitch,
          position: {
            x: ai.ship.position.x + Math.sin(heading) * speed * dt,
            y: waveY,
            z: ai.ship.position.z + Math.cos(heading) * speed * dt,
          },
        },
      };
    });
  }

  markFired(ai: AiShipState): AiShipState {
    return { ...ai, reloadTimer: 3.2 + Math.random() * 1.2 };
  }
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}
