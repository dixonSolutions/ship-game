import { AI_HULL_RADIUS, CollisionSystem, PLAYER_HULL_RADIUS } from './collision.system';
import type {
  AiShipState,
  Projectile,
  ShipControls,
  ShipState,
  ShotVisual,
  Vec3,
} from './types';
import { wrapAngle } from './wind.system';

export interface FireRequest {
  originId: string;
  origin: Vec3;
  yaw: number;
  pitch: number;
  muzzleSpeed?: number;
}

export interface ProjectileTickResult {
  projectiles: Projectile[];
  visuals: ShotVisual[];
  player: ShipState;
  aiShips: AiShipState[];
  hits: Array<{ targetId: string; damage: number; position: Vec3 }>;
  waterSplashes: Vec3[];
}

const GRAVITY = 9.2;
const MUZZLE = 42;
const MAX_FLIGHT = 3.8;

export class CombatSystem {
  private reloadTimer = 0;
  private shotId = 0;
  private readonly collisions = new CollisionSystem();

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

  /** Spawn a live cannonball with ballistic velocity. */
  spawnProjectile(req: FireRequest): { projectile: Projectile; visuals: ShotVisual[] } {
    const speed = req.muzzleSpeed ?? MUZZLE;
    const pitch = clamp(req.pitch, -0.05, 0.65);
    const vx = Math.sin(req.yaw) * Math.cos(pitch) * speed;
    const vy = Math.sin(pitch) * speed * 0.85 + 2.5;
    const vz = Math.cos(req.yaw) * Math.cos(pitch) * speed;
    const id = `ball-${++this.shotId}`;

    const projectile: Projectile = {
      id,
      originId: req.originId,
      position: { ...req.origin },
      velocity: { x: vx, y: vy, z: vz },
      age: 0,
      alive: true,
    };

    const visuals: ShotVisual[] = [
      {
        id: `${id}-smoke`,
        origin: { ...req.origin },
        target: { ...req.origin },
        age: 0,
        lifetime: 0.85,
        kind: 'smoke',
      },
      {
        id: `${id}-ball`,
        origin: { ...req.origin },
        target: { ...req.origin },
        age: 0,
        lifetime: MAX_FLIGHT,
        kind: 'ball',
        projectileId: id,
      },
    ];

    return { projectile, visuals };
  }

  buildPlayerFire(player: ShipState, controls: ShipControls): FireRequest {
    const yaw = player.heading + controls.cannonAimYaw;
    const pitch = controls.cannonAimPitch;
    return {
      originId: 'player',
      yaw,
      pitch,
      origin: {
        x: player.position.x + Math.sin(yaw) * 2.4,
        y: player.position.y + 1.35,
        z: player.position.z + Math.cos(yaw) * 2.4,
      },
    };
  }

  /** AI broadside fire request, or null if not ready / not aimed. */
  buildAiFire(ai: AiShipState, player: ShipState): FireRequest | null {
    if (!ai.hostile || ai.ship.hullIntegrity <= 0 || ai.reloadTimer > 0) return null;

    const dx = player.position.x - ai.ship.position.x;
    const dz = player.position.z - ai.ship.position.z;
    const dist = Math.hypot(dx, dz);
    if (dist > 40 || dist < 5) return null;

    const bearing = Math.atan2(dx, dz);
    const relative = Math.abs(wrapAngle(bearing - ai.ship.heading));
    const abeam = Math.abs(relative - Math.PI / 2) < 0.6;
    if (!abeam) return null;

    const side = ai.broadsideSide;
    const yaw = ai.ship.heading + (Math.PI / 2) * side;
    const lead = dist / MUZZLE;
    const aimYaw =
      Math.atan2(
        player.position.x + Math.sin(player.heading) * player.speed * lead - ai.ship.position.x,
        player.position.z + Math.cos(player.heading) * player.speed * lead - ai.ship.position.z,
      ) || yaw;

    return {
      originId: ai.id,
      yaw: aimYaw,
      pitch: 0.12 + Math.min(0.25, dist * 0.004),
      muzzleSpeed: MUZZLE * 0.92,
      origin: {
        x: ai.ship.position.x + Math.sin(yaw) * 1.6,
        y: ai.ship.position.y + 1.25,
        z: ai.ship.position.z + Math.cos(yaw) * 1.6,
      },
    };
  }

  tickProjectiles(
    projectiles: Projectile[],
    player: ShipState,
    aiShips: AiShipState[],
    waterHeightAt: (x: number, z: number) => number,
    dt: number,
    existingVisuals: ShotVisual[],
  ): ProjectileTickResult {
    let nextPlayer = player;
    let nextAi = aiShips;
    const hits: ProjectileTickResult['hits'] = [];
    const waterSplashes: Vec3[] = [];
    const nextVisuals = [...existingVisuals];
    const nextBalls: Projectile[] = [];

    for (const ball of projectiles) {
      if (!ball.alive) continue;

      const pos: Vec3 = {
        x: ball.position.x + ball.velocity.x * dt,
        y: ball.position.y + ball.velocity.y * dt,
        z: ball.position.z + ball.velocity.z * dt,
      };
      const vel: Vec3 = {
        x: ball.velocity.x * (1 - 0.015 * dt),
        y: ball.velocity.y - GRAVITY * dt,
        z: ball.velocity.z * (1 - 0.015 * dt),
      };
      const age = ball.age + dt;
      let alive = age < MAX_FLIGHT;

      // Water impact
      const waterY = waterHeightAt(pos.x, pos.z);
      if (pos.y <= waterY + 0.15) {
        alive = false;
        waterSplashes.push({ x: pos.x, y: waterY + 0.4, z: pos.z });
        nextVisuals.push({
          id: `${ball.id}-splash`,
          origin: { x: pos.x, y: waterY + 0.4, z: pos.z },
          target: { x: pos.x, y: waterY + 0.4, z: pos.z },
          age: 0,
          lifetime: 0.7,
          kind: 'splash',
        });
      }

      // Hull hits — player (from AI balls)
      if (alive && ball.originId !== 'player') {
        if (this.collisions.hitShip(pos, nextPlayer, PLAYER_HULL_RADIUS)) {
          const damage = 0.05 + Math.random() * 0.04;
          nextPlayer = this.applyDamage(nextPlayer, damage);
          hits.push({ targetId: 'player', damage, position: pos });
          alive = false;
          nextVisuals.push(this.impactVisual(ball.id, pos));
        }
      }

      // Hull hits — AI ships
      if (alive) {
        for (let i = 0; i < nextAi.length; i++) {
          const ai = nextAi[i]!;
          if (ai.id === ball.originId) continue;
          if (!this.collisions.hitShip(pos, ai.ship, AI_HULL_RADIUS)) continue;
          const damage = 0.12 + Math.random() * 0.08;
          hits.push({ targetId: ai.id, damage, position: pos });
          nextAi[i] = { ...ai, ship: this.applyDamage(ai.ship, damage) };
          alive = false;
          nextVisuals.push(this.impactVisual(ball.id, pos));
          break;
        }
      }

      // Update ball visual position
      const ballVis = nextVisuals.find((v) => v.projectileId === ball.id && v.kind === 'ball');
      if (ballVis) {
        ballVis.target = { ...pos };
        ballVis.origin = { ...pos };
        ballVis.age = age;
      }

      if (alive) {
        nextBalls.push({ ...ball, position: pos, velocity: vel, age, alive: true });
      }
    }

    return {
      projectiles: nextBalls,
      visuals: this.ageVisuals(nextVisuals, dt),
      player: nextPlayer,
      aiShips: nextAi,
      hits,
      waterSplashes,
    };
  }

  applyDamage(ship: ShipState, amount: number): ShipState {
    const hullIntegrity = Math.max(0, ship.hullIntegrity - amount);
    const sailIntegrity = Math.max(0.15, ship.sailIntegrity - amount * 0.35);
    return { ...ship, hullIntegrity, sailIntegrity };
  }

  applyRecoil(ship: ShipState, yaw: number, amount = 0.55): ShipState {
    return {
      ...ship,
      speed: Math.max(0, ship.speed - amount),
      position: {
        x: ship.position.x - Math.sin(yaw) * 0.15,
        y: ship.position.y,
        z: ship.position.z - Math.cos(yaw) * 0.15,
      },
    };
  }

  ageVisuals(visuals: ShotVisual[], dt: number): ShotVisual[] {
    return visuals
      .map((v) => ({ ...v, age: v.age + dt }))
      .filter((v) => v.age < v.lifetime);
  }

  private impactVisual(ballId: string, pos: Vec3): ShotVisual {
    return {
      id: `${ballId}-impact`,
      origin: { ...pos },
      target: { ...pos },
      age: 0,
      lifetime: 0.55,
      kind: 'impact',
    };
  }
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}
