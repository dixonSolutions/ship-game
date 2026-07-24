import { Injectable, signal } from '@angular/core';
import { AiSystem } from '../systems/ai.system';
import { CombatSystem } from '../systems/combat.system';
import { CrewSystem } from '../systems/crew.system';
import { OceanSystem } from '../systems/ocean.system';
import { ShipPhysicsSystem } from '../systems/ship-physics.system';
import { WeatherSystem } from '../systems/weather.system';
import type { GamePhase, GameSnapshot, ShipControls, WeatherId } from '../systems/types';

const DEFAULT_CONTROLS: ShipControls = {
  sailTrim: 0.7,
  rudder: 0,
  throttle: 0,
  anchorDeployed: false,
  cannonAimYaw: 0,
  cannonAimPitch: 0.15,
  fireCannon: false,
};

@Injectable({ providedIn: 'root' })
export class GameEngineService {
  private readonly weatherSys = new WeatherSystem();
  private readonly oceanSys = new OceanSystem();
  private readonly physicsSys = new ShipPhysicsSystem();
  private readonly combatSys = new CombatSystem();
  private readonly crewSys = new CrewSystem();
  private readonly aiSys = new AiSystem();

  private raf = 0;
  private lastTs = 0;

  readonly snapshot = signal<GameSnapshot>(this.createInitialSnapshot());

  start(): void {
    if (this.raf) return;
    const boot = this.snapshot();
    this.snapshot.set({ ...boot, phase: 'onboarding' });
    this.lastTs = performance.now();
    const loop = (ts: number) => {
      const dt = Math.min(0.05, (ts - this.lastTs) / 1000);
      this.lastTs = ts;
      this.tick(dt);
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  stop(): void {
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
  }

  beginVoyage(): void {
    const s = this.snapshot();
    this.snapshot.set({ ...s, phase: 'playing' });
  }

  setPhase(phase: GamePhase): void {
    this.snapshot.set({ ...this.snapshot(), phase });
  }

  patchControls(partial: Partial<ShipControls>): void {
    const s = this.snapshot();
    this.snapshot.set({ ...s, controls: { ...s.controls, ...partial } });
  }

  setWeather(id: WeatherId): void {
    const s = this.snapshot();
    this.snapshot.set({ ...s, weather: this.weatherSys.setWeather(s.weather, id) });
  }

  setWind(directionRad: number, strength: number): void {
    const s = this.snapshot();
    this.snapshot.set({
      ...s,
      wind: {
        directionRad,
        strength: Math.max(0, Math.min(1, strength)),
      },
    });
  }

  setTimeOfDay(value: number): void {
    const s = this.snapshot();
    this.snapshot.set({ ...s, timeOfDay: Math.max(0, Math.min(1, value)) });
  }

  private tick(dt: number): void {
    const s = this.snapshot();
    if (s.phase !== 'playing') return;

    const ocean = this.oceanSys.update(s.ocean, dt, s.weather.id);
    let controls = s.controls;
    const combatTick = this.combatSys.update(controls, dt);
    controls = combatTick.controls;

    let player = this.physicsSys.update(s.player, controls, s.wind, ocean, dt);
    let aiShips = this.aiSys.update(s.aiShips, player, s.wind, dt);

    if (combatTick.canFire) {
      const shot = this.combatSys.resolvePlayerShot(player, aiShips);
      if (shot?.targetId && shot.damage > 0) {
        aiShips = aiShips.map((ai) =>
          ai.id === shot.targetId
            ? { ...ai, ship: this.combatSys.applyDamage(ai.ship, shot.damage) }
            : ai,
        );
      }
    }

    const crew = this.crewSys.tickMorale(s.crew, player.hullIntegrity, dt);
    let phase: GamePhase = s.phase;
    let combatState = s.combatState;

    if (player.hullIntegrity <= 0) {
      phase = 'defeat';
      combatState = 'sinking';
    } else if (aiShips.filter((a) => a.hostile).every((a) => a.ship.hullIntegrity <= 0)) {
      phase = 'victory';
    } else if (aiShips.some((a) => a.hostile && a.ship.hullIntegrity > 0)) {
      combatState = 'skirmish';
    }

    this.snapshot.set({
      ...s,
      phase,
      ocean,
      controls,
      player,
      aiShips,
      crew,
      combatState,
      timeOfDay: (s.timeOfDay + dt * 0.005) % 1,
    });
  }

  private createInitialSnapshot(): GameSnapshot {
    return {
      phase: 'loading',
      timeOfDay: 0.35,
      wind: { directionRad: Math.PI * 0.25, strength: 0.55 },
      ocean: this.oceanSys.create(),
      weather: this.weatherSys.create('clear'),
      player: this.physicsSys.createPlayer(),
      controls: { ...DEFAULT_CONTROLS },
      crew: this.crewSys.createDefaultCrew(),
      aiShips: [
        this.aiSys.createPatrol('merchant', 40, -20, false),
        this.aiSys.createPatrol('pirate', -35, 45, true),
      ],
      combatState: 'peaceful',
    };
  }
}
