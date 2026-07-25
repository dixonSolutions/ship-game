import type { AiShipState, ShipState, Vec3 } from './types';

export const PLAYER_HULL_RADIUS = 2.85;
export const AI_HULL_RADIUS = 2.65;
export const BALL_RADIUS = 0.4;

export interface CollisionResult {
  player: ShipState;
  aiShips: AiShipState[];
  events: Array<{ aId: string; bId: string; impulse: number; damage: number }>;
}

/**
 * Circle-circle hull collisions on the XZ plane.
 * Separates overlapping hulls, bleeds speed, and applies impact damage.
 */
export class CollisionSystem {
  resolveShips(
    player: ShipState,
    aiShips: AiShipState[],
    options: { damageScale?: number } = {},
  ): CollisionResult {
    const damageScale = options.damageScale ?? 1;
    let nextPlayer = { ...player, position: { ...player.position } };
    const nextAi = aiShips.map((ai) => ({
      ...ai,
      ship: { ...ai.ship, position: { ...ai.ship.position } },
    }));
    const events: CollisionResult['events'] = [];

    // Player vs each AI
    for (let i = 0; i < nextAi.length; i++) {
      const ai = nextAi[i]!;
      if (ai.ship.hullIntegrity <= 0 && ai.ship.sinkProgress > 0.5) continue;
      const hit = this.resolvePair(
        nextPlayer,
        PLAYER_HULL_RADIUS,
        'player',
        ai.ship,
        AI_HULL_RADIUS,
        ai.id,
        damageScale,
      );
      nextPlayer = hit.a;
      nextAi[i] = { ...ai, ship: hit.b };
      if (hit.impulse > 0.05) {
        events.push({
          aId: 'player',
          bId: ai.id,
          impulse: hit.impulse,
          damage: hit.damage,
        });
      }
    }

    // AI vs AI
    for (let i = 0; i < nextAi.length; i++) {
      for (let j = i + 1; j < nextAi.length; j++) {
        const a = nextAi[i]!;
        const b = nextAi[j]!;
        if (a.ship.hullIntegrity <= 0 || b.ship.hullIntegrity <= 0) continue;
        const hit = this.resolvePair(
          a.ship,
          AI_HULL_RADIUS,
          a.id,
          b.ship,
          AI_HULL_RADIUS,
          b.id,
          damageScale,
        );
        nextAi[i] = { ...a, ship: hit.a };
        nextAi[j] = { ...b, ship: hit.b };
        if (hit.impulse > 0.05) {
          events.push({
            aId: a.id,
            bId: b.id,
            impulse: hit.impulse,
            damage: hit.damage,
          });
        }
      }
    }

    return { player: nextPlayer, aiShips: nextAi, events };
  }

  /** Point vs ship hull circle on XZ. */
  hitShip(point: Vec3, ship: ShipState, radius: number): boolean {
    if (ship.hullIntegrity <= 0 && ship.sinkProgress > 0.6) return false;
    const dx = point.x - ship.position.x;
    const dz = point.z - ship.position.z;
    return Math.hypot(dx, dz) <= radius + BALL_RADIUS;
  }

  private resolvePair(
    a: ShipState,
    aRadius: number,
    _aId: string,
    b: ShipState,
    bRadius: number,
    _bId: string,
    damageScale = 1,
  ): { a: ShipState; b: ShipState; impulse: number; damage: number } {
    const dx = b.position.x - a.position.x;
    const dz = b.position.z - a.position.z;
    const dist = Math.hypot(dx, dz) || 0.0001;
    const minDist = aRadius + bRadius;
    if (dist >= minDist) {
      return { a, b, impulse: 0, damage: 0 };
    }

    const nx = dx / dist;
    const nz = dz / dist;
    const overlap = minDist - dist;

    // Push each ship halfway apart (heavier / slower ships yield less — equal mass here).
    const push = overlap * 0.52;
    const aPos: Vec3 = {
      x: a.position.x - nx * push,
      y: a.position.y,
      z: a.position.z - nz * push,
    };
    const bPos: Vec3 = {
      x: b.position.x + nx * push,
      y: b.position.y,
      z: b.position.z + nz * push,
    };

    // Relative speed along the collision normal (using heading * speed as velocity proxy).
    const avx = Math.sin(a.heading) * a.speed;
    const avz = Math.cos(a.heading) * a.speed;
    const bvx = Math.sin(b.heading) * b.speed;
    const bvz = Math.cos(b.heading) * b.speed;
    const relN = (avx - bvx) * nx + (avz - bvz) * nz;
    const closing = Math.max(0, -relN);
    const impulse = closing + overlap * 0.8;
    const damage = Math.min(0.22, impulse * 0.035) * Math.max(0, damageScale);

    return {
      a: {
        ...a,
        position: aPos,
        speed: a.speed * Math.max(0.25, 1 - impulse * 0.08),
        hullIntegrity: Math.max(0, a.hullIntegrity - damage),
        sailIntegrity: Math.max(0.15, a.sailIntegrity - damage * 0.2),
      },
      b: {
        ...b,
        position: bPos,
        speed: b.speed * Math.max(0.25, 1 - impulse * 0.08),
        hullIntegrity: Math.max(0, b.hullIntegrity - damage),
        sailIntegrity: Math.max(0.15, b.sailIntegrity - damage * 0.2),
      },
      impulse,
      damage,
    };
  }
}
