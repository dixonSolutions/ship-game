import type { AiShipState, ShipControls, ShipState } from './types';

export interface ShotEvent {
  originId: string;
  targetId?: string;
  damage: number;
}

export class CombatSystem {
  private reloadTimer = 0;

  update(controls: ShipControls, dt: number): { controls: ShipControls; canFire: boolean } {
    this.reloadTimer = Math.max(0, this.reloadTimer - dt);
    const canFire = controls.fireCannon && this.reloadTimer <= 0;
    if (canFire) {
      this.reloadTimer = 2.5;
    }
    return {
      controls: { ...controls, fireCannon: false },
      canFire,
    };
  }

  resolvePlayerShot(player: ShipState, aiShips: AiShipState[]): ShotEvent | null {
    // Stub: hit nearest hostile within a short forward cone.
    let best: AiShipState | undefined;
    let bestDist = Number.POSITIVE_INFINITY;
    for (const ai of aiShips) {
      if (!ai.hostile) continue;
      const dx = ai.ship.position.x - player.position.x;
      const dz = ai.ship.position.z - player.position.z;
      const dist = Math.hypot(dx, dz);
      if (dist < bestDist && dist < 40) {
        best = ai;
        bestDist = dist;
      }
    }
    if (!best) {
      return { originId: 'player', damage: 0 };
    }
    return { originId: 'player', targetId: best.id, damage: 0.12 };
  }

  applyDamage(ship: ShipState, amount: number): ShipState {
    return {
      ...ship,
      hullIntegrity: Math.max(0, ship.hullIntegrity - amount),
    };
  }
}
