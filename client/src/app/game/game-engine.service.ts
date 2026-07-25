import { Injectable, inject, signal } from '@angular/core';
import { AiSystem } from '../systems/ai.system';
import { CollisionSystem } from '../systems/collision.system';
import { CombatSystem } from '../systems/combat.system';
import { CrewSystem } from '../systems/crew.system';
import { OceanSystem } from '../systems/ocean.system';
import { ShipPhysicsSystem } from '../systems/ship-physics.system';
import { WeatherSystem } from '../systems/weather.system';
import type {
  GamePhase,
  GameSettings,
  GameSnapshot,
  GraphicsQuality,
  Projectile,
  ShipControls,
  WeatherId,
} from '../systems/types';
import { DialogueApiService } from './dialogue-api.service';
import { AudioService } from './audio.service';

const DEFAULT_CONTROLS: ShipControls = {
  sailTrim: 0.7,
  rudder: 0,
  throttle: 0,
  anchorDeployed: false,
  cannonAimYaw: 0,
  cannonAimPitch: 0.15,
  fireCannon: false,
};

const DEFAULT_SETTINGS: GameSettings = {
  graphicsQuality: 'high',
  masterVolume: 0.55,
  waveScale: 1,
  accessibility: {
    reduceMotion: false,
    highContrast: false,
  },
  debugPhysics: false,
};

@Injectable({ providedIn: 'root' })
export class GameEngineService {
  private readonly dialogueApi = inject(DialogueApiService);
  private readonly audio = inject(AudioService);

  private readonly weatherSys = new WeatherSystem();
  private readonly oceanSys = new OceanSystem();
  private readonly physicsSys = new ShipPhysicsSystem();
  private readonly combatSys = new CombatSystem();
  private readonly collisionSys = new CollisionSystem();
  private readonly crewSys = new CrewSystem();
  private readonly aiSys = new AiSystem();

  private raf = 0;
  private lastTs = 0;
  private dialogueInFlight = false;
  /** Seconds of combat grace after casting off / refitting. */
  private voyageGrace = 0;

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
    const settings = this.snapshot().settings;
    const fresh = this.createInitialSnapshot();
    this.voyageGrace = 12;
    this.snapshot.set({
      ...fresh,
      settings,
      phase: 'playing',
      dialogueLine: undefined,
      lastError: undefined,
    });
  }

  restartVoyage(): void {
    const settings = this.snapshot().settings;
    const fresh = this.createInitialSnapshot();
    this.voyageGrace = 12;
    this.snapshot.set({ ...fresh, settings, phase: 'playing' });
  }

  setPhase(phase: GamePhase): void {
    this.snapshot.set({ ...this.snapshot(), phase });
  }

  patchControls(partial: Partial<ShipControls>): void {
    const s = this.snapshot();
    this.snapshot.set({ ...s, controls: { ...s.controls, ...partial } });
  }

  patchSettings(partial: Partial<GameSettings>): void {
    const s = this.snapshot();
    const settings: GameSettings = {
      ...s.settings,
      ...partial,
      accessibility: {
        ...s.settings.accessibility,
        ...(partial.accessibility ?? {}),
      },
    };
    this.snapshot.set({ ...s, settings });
    if (partial.masterVolume !== undefined) {
      this.audio.setMasterVolume(partial.masterVolume);
    }
  }

  setGraphicsQuality(graphicsQuality: GraphicsQuality): void {
    this.patchSettings({ graphicsQuality });
  }

  setWeather(id: WeatherId): void {
    const s = this.snapshot();
    this.snapshot.set({ ...s, weather: this.weatherSys.setWeather(s.weather, id) });
    this.audio.syncFromWeather();
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

  setWaveScale(waveScale: number): void {
    this.patchSettings({ waveScale });
  }

  toggleDebugPhysics(): void {
    const s = this.snapshot();
    this.patchSettings({ debugPhysics: !s.settings.debugPhysics });
  }

  private tick(dt: number): void {
    const s = this.snapshot();

    // Keep seas alive on menus / pause so the water never looks frozen.
    if (s.phase !== 'playing') {
      const weatherTick = this.weatherSys.update(s.weather, s.wind, dt);
      const ocean = this.oceanSys.update(
        s.ocean,
        dt,
        weatherTick.weather.id,
        s.settings.waveScale,
        weatherTick.wind,
      );
      this.snapshot.set({
        ...s,
        ocean,
        wind: weatherTick.wind,
        weather: weatherTick.weather,
      });
      return;
    }

    this.voyageGrace = Math.max(0, this.voyageGrace - dt);
    const inGrace = this.voyageGrace > 0;

    const weatherTick = this.weatherSys.update(s.weather, s.wind, dt);
    const ocean = this.oceanSys.update(
      s.ocean,
      dt,
      weatherTick.weather.id,
      s.settings.waveScale,
      weatherTick.wind,
    );

    let controls = s.controls;
    const combatTick = this.combatSys.update(controls, dt);
    controls = combatTick.controls;

    let player = this.physicsSys.update(s.player, controls, weatherTick.wind, ocean, dt);
    let aiShips = this.aiSys.update(s.aiShips, player, weatherTick.wind, ocean, dt);

    // Hull collisions after movement (no hull damage during voyage grace)
    const collided = this.collisionSys.resolveShips(player, aiShips, {
      damageScale: inGrace ? 0 : 1,
    });
    player = collided.player;
    aiShips = collided.aiShips;
    if (!inGrace && collided.events.some((e) => e.impulse > 0.8)) {
      this.audio.playImpact(0.35);
    }

    let projectiles: Projectile[] = [...s.projectiles];
    let shotVisuals = [...s.shotVisuals];
    let lastHitMarker = s.lastHitMarker
      ? { ...s.lastHitMarker, age: s.lastHitMarker.age + dt }
      : undefined;
    if (lastHitMarker && lastHitMarker.age > 1.6) lastHitMarker = undefined;

    if (combatTick.canFire) {
      const fire = this.combatSys.buildPlayerFire(player, controls);
      const spawned = this.combatSys.spawnProjectile(fire);
      projectiles = [...projectiles, spawned.projectile];
      shotVisuals = [...shotVisuals, ...spawned.visuals];
      player = this.combatSys.applyRecoil(player, fire.yaw, 0.65);
      this.audio.playCannon(0.9);
    }

    // AI return fire (disabled during voyage grace)
    if (!inGrace) {
      for (let i = 0; i < aiShips.length; i++) {
        const ai = aiShips[i]!;
        const fire = this.combatSys.buildAiFire(ai, player);
        if (!fire) continue;
        const marked = this.aiSys.markFired(ai);
        const spawned = this.combatSys.spawnProjectile(fire);
        projectiles = [...projectiles, spawned.projectile];
        shotVisuals = [...shotVisuals, ...spawned.visuals];
        aiShips[i] = {
          ...marked,
          ship: this.combatSys.applyRecoil(marked.ship, fire.yaw, 0.4),
        };
        this.audio.playCannon(0.5);
      }
    }

    const ballTick = this.combatSys.tickProjectiles(
      projectiles,
      player,
      aiShips,
      (x, z) => this.oceanSys.sampleHeight(ocean, x, z),
      dt,
      shotVisuals,
    );
    projectiles = ballTick.projectiles;
    shotVisuals = ballTick.visuals;
    player = ballTick.player;
    aiShips = ballTick.aiShips;

    for (const hit of ballTick.hits) {
      lastHitMarker = { targetId: hit.targetId, damage: hit.damage, age: 0 };
      this.audio.playImpact(0.8);
    }
    if (ballTick.waterSplashes.length) {
      this.audio.playImpact(0.25);
    }

    const crew = this.crewSys.tickMorale(s.crew, player.hullIntegrity, dt);
    this.maybeTriggerDialogue(crew, weatherTick.weather.id, s.combatState, player.hullIntegrity, dt);

    let phase: GamePhase = s.phase;
    let combatState = s.combatState;
    const hostiles = aiShips.filter((a) => a.hostile);
    const hostilesAlive = hostiles.filter((a) => a.ship.hullIntegrity > 0);

    if (!inGrace && player.hullIntegrity <= 0 && player.sinkProgress > 0.85) {
      phase = 'defeat';
      combatState = 'sinking';
    } else if (player.hullIntegrity <= 0) {
      combatState = 'sinking';
    } else if (!inGrace && hostiles.length > 0 && hostilesAlive.length === 0) {
      phase = 'victory';
      combatState = 'peaceful';
    } else if (hostilesAlive.some((a) => {
      const dx = a.ship.position.x - player.position.x;
      const dz = a.ship.position.z - player.position.z;
      return Math.hypot(dx, dz) < 50;
    })) {
      combatState = hostilesAlive.length > 1 ? 'battle' : 'skirmish';
    } else {
      combatState = 'peaceful';
    }

    this.snapshot.set({
      ...s,
      phase,
      ocean,
      wind: weatherTick.wind,
      weather: weatherTick.weather,
      controls,
      player,
      aiShips,
      crew,
      combatState,
      shotVisuals,
      projectiles,
      lastHitMarker,
      reloadRemaining: this.combatSys.getReloadRemaining(),
      timeOfDay: s.settings.accessibility.reduceMotion
        ? s.timeOfDay
        : (s.timeOfDay + dt * 0.004) % 1,
    });

    this.audio.syncFromSnapshot(this.snapshot());
  }

  private maybeTriggerDialogue(
    crew: GameSnapshot['crew'],
    weather: WeatherId,
    combat: GameSnapshot['combatState'],
    hullIntegrity: number,
    dt: number,
  ): void {
    if (this.dialogueInFlight) return;
    const cue = this.crewSys.maybeDialogueCue(crew, weather, combat, hullIntegrity, dt);
    if (!cue) return;

    this.dialogueInFlight = true;
    const snap = this.snapshot();
    void this.dialogueApi
      .askCrew({
        context: {
          crewRole: cue.member.role,
          crewName: cue.member.name,
          shipName: 'Windward',
          weather,
          combatState: combat,
          windStrength: snap.wind.strength,
          hullIntegrity,
          recentEvent: cue.recentEvent,
        },
        playerLine: cue.playerLine,
      })
      .then(async (res) => {
        this.snapshot.set({
          ...this.snapshot(),
          dialogueLine: `${cue.member.name}: ${res.reply}`,
          lastError: undefined,
        });
        try {
          const blob = await this.dialogueApi.speak(res.reply, cue.member.voiceId);
          await this.audio.playVoiceBlob(blob);
        } catch {
          // TTS optional — dialogue text still shows.
        }
      })
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : 'Crew radio offline';
        this.snapshot.set({
          ...this.snapshot(),
          dialogueLine: `${cue.member.name}: (static) Stay sharp.`,
          lastError: message,
        });
      })
      .finally(() => {
        this.dialogueInFlight = false;
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
        this.aiSys.createPatrol('merchant', 55, -36, false),
        this.aiSys.createPatrol('navy', -48, -40, false),
        this.aiSys.createPatrol('pirate', -28, 48, true),
        this.aiSys.createPatrol('pirate', 34, 52, true),
      ],
      combatState: 'peaceful',
      reloadRemaining: 0,
      shotVisuals: [],
      projectiles: [],
      settings: {
        ...DEFAULT_SETTINGS,
        accessibility: { ...DEFAULT_SETTINGS.accessibility },
        debugPhysics: false,
      },
    };
  }
}
