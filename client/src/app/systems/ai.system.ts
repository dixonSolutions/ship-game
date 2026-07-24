import type { AiShipState, ShipState, WindState } from './types';

export class AiSystem {
  createPatrol(faction: AiShipState['faction'], x: number, z: number, hostile = false): AiShipState {
    return {
      id: `ai-${faction}-${Math.floor(x)}-${Math.floor(z)}`,
      faction,
      hostile,
      ship: {
        position: { x, y: 0, z },
        heading: Math.random() * Math.PI * 2,
        speed: 2 + Math.random() * 2,
        heel: 0,
        pitch: 0,
        hullIntegrity: 1,
        sailIntegrity: 1,
      },
    };
  }

  update(ships: AiShipState[], player: ShipState, wind: WindState, dt: number): AiShipState[] {
    return ships.map((ai) => {
      if (ai.ship.hullIntegrity <= 0) {
        return { ...ai, ship: { ...ai.ship, speed: 0, position: { ...ai.ship.position, y: -2 } } };
      }

      let heading = ai.ship.heading;
      if (ai.hostile) {
        const dx = player.position.x - ai.ship.position.x;
        const dz = player.position.z - ai.ship.position.z;
        heading = Math.atan2(dx, dz);
      } else {
        heading += dt * 0.15 * (0.5 - wind.strength);
      }

      const speed = ai.ship.speed * (0.85 + wind.strength * 0.3);
      return {
        ...ai,
        ship: {
          ...ai.ship,
          heading,
          position: {
            x: ai.ship.position.x + Math.sin(heading) * speed * dt,
            y: ai.ship.position.y,
            z: ai.ship.position.z + Math.cos(heading) * speed * dt,
          },
        },
      };
    });
  }
}
