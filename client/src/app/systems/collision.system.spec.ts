import { describe, expect, it } from 'vitest';
import {
  AI_HULL_RADIUS,
  CollisionSystem,
  PLAYER_HULL_RADIUS,
} from './collision.system';
import type { AiShipState, ShipState } from './types';

function makeShip(partial: Partial<ShipState> & { x: number; z: number; speed?: number }): ShipState {
  return {
    position: { x: partial.x, y: 0, z: partial.z },
    heading: partial.heading ?? 0,
    speed: partial.speed ?? 4,
    heel: 0,
    pitch: 0,
    hullIntegrity: partial.hullIntegrity ?? 1,
    sailIntegrity: 1,
    sinkProgress: 0,
  };
}

function makeAi(id: string, ship: ShipState): AiShipState {
  return {
    id,
    faction: 'pirate',
    hostile: true,
    reloadTimer: 0,
    broadsideSide: 1,
    ship,
  };
}

describe('CollisionSystem', () => {
  it('separates overlapping player and AI hulls', () => {
    const sys = new CollisionSystem();
    const player = makeShip({ x: 0, z: 0, speed: 5 });
    const ai = makeAi('pirate-1', makeShip({ x: 1, z: 0, speed: 3 }));
    const result = sys.resolveShips(player, [ai]);

    const dist = Math.hypot(
      result.aiShips[0]!.ship.position.x - result.player.position.x,
      result.aiShips[0]!.ship.position.z - result.player.position.z,
    );
    expect(dist).toBeGreaterThanOrEqual(PLAYER_HULL_RADIUS + AI_HULL_RADIUS - 0.05);
    expect(result.player.speed).toBeLessThan(player.speed);
    expect(result.events.length).toBeGreaterThan(0);
  });

  it('applies damage proportional to closing speed', () => {
    const sys = new CollisionSystem();
    const slow = sys.resolveShips(
      makeShip({ x: 0, z: 0, speed: 0.5, heading: 0 }),
      [makeAi('a', makeShip({ x: 1, z: 0, speed: 0.5, heading: Math.PI }))],
    );
    const fast = sys.resolveShips(
      makeShip({ x: 0, z: 0, speed: 9, heading: 0 }),
      [makeAi('a', makeShip({ x: 1, z: 0, speed: 9, heading: Math.PI }))],
    );
    expect(fast.events[0]!.damage).toBeGreaterThan(slow.events[0]!.damage);
    expect(fast.player.hullIntegrity).toBeLessThan(slow.player.hullIntegrity);
  });

  it('prevents AI ships from stacking', () => {
    const sys = new CollisionSystem();
    const result = sys.resolveShips(makeShip({ x: 50, z: 50, speed: 0 }), [
      makeAi('a', makeShip({ x: 0, z: 0, speed: 2 })),
      makeAi('b', makeShip({ x: 0.5, z: 0, speed: 2 })),
    ]);
    const dist = Math.hypot(
      result.aiShips[1]!.ship.position.x - result.aiShips[0]!.ship.position.x,
      result.aiShips[1]!.ship.position.z - result.aiShips[0]!.ship.position.z,
    );
    expect(dist).toBeGreaterThanOrEqual(AI_HULL_RADIUS * 2 - 0.05);
  });

  it('detects projectile hits against hull circles', () => {
    const sys = new CollisionSystem();
    const ship = makeShip({ x: 0, z: 0 });
    expect(sys.hitShip({ x: 0.5, y: 1, z: 0.5 }, ship, PLAYER_HULL_RADIUS)).toBe(true);
    expect(sys.hitShip({ x: 20, y: 1, z: 20 }, ship, PLAYER_HULL_RADIUS)).toBe(false);
  });
});
