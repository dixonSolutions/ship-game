import type { AiShipState, ShipControls, ShipState, ShotVisual, Vec3 } from './types';
import { wrapAngle } from './wind.system';

export interface ShotEvent {
  originId: string;
  targetId?: string;
  damage: number;
  origin: Vec3;
  target: Vec3;
  hit: boolean;
}

export class CombatSystem {
  private reloadTimer = 0;
  private shotId = 0;

  getReloadRemaining(): number {
    return this.reloadTimer;
  }

  update(controls: ShipControls, dt: number): { controls: ShipControls; canFire: boolean } {
    this.reloadTimer = Math.max(0, this.reloadTimer - dt);
    const canFire = controls.fireCannon && this.reloadTimer <= 0;
    if (canFire) {
      this.reloadTimer = 2.4;
    }
    return {
      controls: { ...controls, fireCannon: false },
      canFire,
    };
  }

  resolvePlayerShot(player: ShipState, controls: ShipControls, aiShips: AiShipState[]): ShotEvent {
    const aimYaw = player.heading + controls.cannonAimYaw;
    const range = 48;
    const origin: Vec3 = {
      x: player.position.x + Math.sin(aimYaw) * 2.2,
      y: player.position.y + 1.4,
      z: player.position.z + Math.cos(aimYaw) * 2.2,
    };

    let best: AiShipState | undefined;
    let bestScore = Number.POSITIVE_INFINITY;

    for (const ai of aiShips) {
      if (ai.ship.hullIntegrity <= 0) continue;
      const dx = ai.ship.position.x - player.position.x;
      const dz = ai.ship.position.z - player.position.z;
      const dist = Math.hypot(dx, dz);
      if (dist > range || dist < 2) continue;

      const bearing = Math.atan2(dx, dz);
      const angleError = Math.abs(wrapAngle(bearing - aimYaw));
      const score = dist + angleError * 18;
      // Prefer targets roughly in the aim cone (~55°).
      if (angleError < 0.95 && score < bestScore) {
        best = ai;
        bestScore = score;
      }
    }

    if (!best) {
      const miss: Vec3 = {
        x: origin.x + Math.sin(aimYaw) * range * 0.7,
        y: 0.5,
        z: origin.z + Math.cos(aimYaw) * range * 0.7,
      };
      return { originId: 'player', damage: 0, origin, target: miss, hit: false };
    }

    const dist = Math.hypot(
      best.ship.position.x - player.position.x,
      best.ship.position.z - player.position.z,
    );
    const falloff = clamp(1 - dist / range, 0.25, 1);
    const damage = 0.14 * falloff * (0.85 + Math.random() * 0.3);

    return {
      originId: 'player',
      targetId: best.id,
      damage,
      origin,
      target: {
        x: best.ship.position.x,
        y: best.ship.position.y + 1,
        z: best.ship.position.z,
      },
      hit: true,
    };
  }

  resolveAiShot(ai: AiShipState, player: ShipState): ShotEvent | null {
    if (!ai.hostile || ai.ship.hullIntegrity <= 0 || ai.reloadTimer > 0) return null;

    const dx = player.position.x - ai.ship.position.x;
    const dz = player.position.z - ai.ship.position.z;
    const dist = Math.hypot(dx, dz);
    if (dist > 36 || dist < 4) return null;

    // Broadside: fire when roughly abeam of the player.
    const bearing = Math.atan2(dx, dz);
    const relative = Math.abs(wrapAngle(bearing - ai.ship.heading));
    const abeam = Math.abs(relative - Math.PI / 2) < 0.55;
    if (!abeam) return null;

    const origin: Vec3 = {
      x: ai.ship.position.x,
      y: ai.ship.position.y + 1.2,
      z: ai.ship.position.z,
    };
    const damage = 0.08 * (0.8 + Math.random() * 0.4);
    return {
      originId: ai.id,
      targetId: 'player',
      damage,
      origin,
      target: { ...player.position, y: player.position.y + 1 },
      hit: Math.random() > 0.25,
    };
  }

  applyDamage(ship: ShipState, amount: number): ShipState {
    const hullIntegrity = Math.max(0, ship.hullIntegrity - amount);
    const sailIntegrity = Math.max(0.15, ship.sailIntegrity - amount * 0.35);
    return { ...ship, hullIntegrity, sailIntegrity };
  }

  createShotVisuals(shot: ShotEvent): ShotVisual[] {
    const id = `shot-${++this.shotId}`;
    const visuals: ShotVisual[] = [
      {
        id: `${id}-trace`,
        origin: shot.origin,
        target: shot.target,
        age: 0,
        lifetime: 0.45,
        kind: 'cannon',
      },
      {
        id: `${id}-smoke`,
        origin: shot.origin,
        target: shot.origin,
        age: 0,
        lifetime: 0.9,
        kind: 'smoke',
      },
    ];
    if (shot.hit) {
      visuals.push({
        id: `${id}-impact`,
        origin: shot.target,
        target: shot.target,
        age: 0,
        lifetime: 0.55,
        kind: 'impact',
      });
    }
    return visuals;
  }

  ageVisuals(visuals: ShotVisual[], dt: number): ShotVisual[] {
    return visuals
      .map((v) => ({ ...v, age: v.age + dt }))
      .filter((v) => v.age < v.lifetime);
  }
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}
