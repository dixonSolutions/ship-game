import type { AiShipState, ShipState, ShotVisual, Vec3 } from './types';

const RUPTURE_THRESHOLDS = [0.6, 0.3, 0] as const;

/**
 * Structural damage FX: explosions, wood ruptures, debris, and sink smoke.
 * Tracks hull integrity crossings so threshold bursts fire once per band.
 */
export class DamageFxSystem {
  private fxId = 0;
  private readonly lastHull = new Map<string, number>();
  private readonly sinkBurst = new Set<string>();

  reset(): void {
    this.lastHull.clear();
    this.sinkBurst.clear();
    this.fxId = 0;
  }

  /** Cannonball / collision impact burst at a world point. */
  spawnExplosion(position: Vec3, scale = 1, shipId?: string): ShotVisual[] {
    const id = `fx-${++this.fxId}`;
    const visuals: ShotVisual[] = [
      {
        id: `${id}-flash`,
        origin: { ...position },
        target: { ...position },
        age: 0,
        lifetime: 0.28,
        kind: 'explosion',
        scale: 0.85 * scale,
        shipId,
      },
      {
        id: `${id}-blast`,
        origin: { ...position },
        target: { ...position },
        age: 0,
        lifetime: 0.75,
        kind: 'explosion',
        scale: 1.35 * scale,
        shipId,
      },
      {
        id: `${id}-smoke`,
        origin: { ...position },
        target: { x: position.x, y: position.y + 1.2, z: position.z },
        age: 0,
        lifetime: 1.4,
        kind: 'smoke',
        scale: 1.1 * scale,
        shipId,
      },
    ];

    const shardCount = Math.round(4 + scale * 4);
    for (let i = 0; i < shardCount; i++) {
      const yaw = Math.random() * Math.PI * 2;
      const speed = 2.5 + Math.random() * 5 * scale;
      const up = 2 + Math.random() * 4;
      visuals.push({
        id: `${id}-debris-${i}`,
        origin: { ...position },
        target: { ...position },
        age: 0,
        lifetime: 1.1 + Math.random() * 0.6,
        kind: 'debris',
        shipId,
        scale: 0.35 + Math.random() * 0.45,
        velocity: {
          x: Math.sin(yaw) * speed,
          y: up,
          z: Math.cos(yaw) * speed,
        },
      });
    }

    return visuals;
  }

  /** Check hull threshold crossings and emit rupture / sink bursts. */
  syncShipStructure(
    shipId: string,
    ship: ShipState,
    heavyImpact = false,
  ): ShotVisual[] {
    const prev = this.lastHull.get(shipId) ?? 1;
    const curr = ship.hullIntegrity;
    this.lastHull.set(shipId, curr);
    const out: ShotVisual[] = [];

    for (const band of RUPTURE_THRESHOLDS) {
      if (prev > band && curr <= band) {
        const scale = band === 0 ? 1.6 : band === 0.3 ? 1.15 : 0.85;
        out.push(...this.spawnRupture(ship.position, scale, shipId));
        if (band === 0) {
          out.push(...this.spawnExplosion(ship.position, 1.8, shipId));
        }
      }
    }

    if (heavyImpact && curr > 0) {
      out.push(...this.spawnRupture(ship.position, 0.7, shipId));
    }

    if (curr <= 0 && ship.sinkProgress > 0.05 && !this.sinkBurst.has(shipId)) {
      this.sinkBurst.add(shipId);
      out.push(...this.spawnExplosion(ship.position, 2.1, shipId));
      out.push(...this.spawnRupture(ship.position, 1.8, shipId));
    }

    if (curr <= 0 && ship.sinkProgress > 0.1 && ship.sinkProgress < 0.95) {
      // Continuous light smoke while sinking (throttled by chance).
      if (Math.random() < 0.08) {
        out.push({
          id: `fx-${++this.fxId}-sink`,
          origin: {
            x: ship.position.x + (Math.random() - 0.5),
            y: ship.position.y + 1.5,
            z: ship.position.z + (Math.random() - 0.5),
          },
          target: {
            x: ship.position.x,
            y: ship.position.y + 3.5,
            z: ship.position.z,
          },
          age: 0,
          lifetime: 1.8,
          kind: 'sinkSmoke',
          shipId,
          scale: 1.2,
        });
      }
    }

    return out;
  }

  syncFleet(
    player: ShipState,
    aiShips: AiShipState[],
    collisionEvents: Array<{ aId: string; bId: string; impulse: number }>,
  ): ShotVisual[] {
    const heavy = new Set<string>();
    for (const e of collisionEvents) {
      if (e.impulse > 0.85) {
        heavy.add(e.aId);
        heavy.add(e.bId);
      }
    }

    const out: ShotVisual[] = [];
    out.push(...this.syncShipStructure('player', player, heavy.has('player')));
    for (const ai of aiShips) {
      out.push(...this.syncShipStructure(ai.id, ai.ship, heavy.has(ai.id)));
    }
    return out;
  }

  /** Integrate debris positions; age handled by CombatSystem.ageVisuals. */
  tickDebris(visuals: ShotVisual[], dt: number): ShotVisual[] {
    return visuals.map((v) => {
      if (v.kind !== 'debris' || !v.velocity) return v;
      const vel = {
        x: v.velocity.x * (1 - 0.4 * dt),
        y: v.velocity.y - 9.2 * dt,
        z: v.velocity.z * (1 - 0.4 * dt),
      };
      const target = {
        x: v.target.x + vel.x * dt,
        y: v.target.y + vel.y * dt,
        z: v.target.z + vel.z * dt,
      };
      return { ...v, target, velocity: vel };
    });
  }

  private spawnRupture(position: Vec3, scale: number, shipId: string): ShotVisual[] {
    const id = `fx-${++this.fxId}`;
    const visuals: ShotVisual[] = [
      {
        id: `${id}-rupture`,
        origin: { ...position, y: position.y + 0.8 },
        target: { ...position, y: position.y + 0.8 },
        age: 0,
        lifetime: 0.9,
        kind: 'rupture',
        scale,
        shipId,
      },
    ];

    for (let i = 0; i < Math.round(3 + scale * 3); i++) {
      const yaw = Math.random() * Math.PI * 2;
      const speed = 1.5 + Math.random() * 3.5 * scale;
      visuals.push({
        id: `${id}-plank-${i}`,
        origin: { x: position.x, y: position.y + 1, z: position.z },
        target: { x: position.x, y: position.y + 1, z: position.z },
        age: 0,
        lifetime: 1.2 + Math.random() * 0.5,
        kind: 'debris',
        shipId,
        scale: 0.4 + Math.random() * 0.5,
        velocity: {
          x: Math.sin(yaw) * speed,
          y: 1.5 + Math.random() * 3,
          z: Math.cos(yaw) * speed,
        },
      });
    }

    return visuals;
  }
}
