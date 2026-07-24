import { Injectable, inject, signal } from '@angular/core';
import { AiSystem } from '../systems/ai.system';
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
};

@Injectable({ providedIn: 'root' })
export class GameEngineService {
  private readonly dialogueApi = inject(DialogueApiService);
  private readonly audio = inject(AudioService);

  private readonly weatherSys = new WeatherSystem();
  private readonly oceanSys = new OceanSystem();
  private readonly physicsSys = new ShipPhysicsSystem();
  private readonly combatSys = new CombatSystem();
  private readonly crewSys = new CrewSystem();
  private readonly aiSys = new AiSystem();

  private raf = 0;
  private lastTs = 0;
  private dialogueInFlight = false;

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
    this.snapshot.set({ ...s, phase: 'playing', dialogueLine: undefined, lastError: undefined });
  }

  restartVoyage(): void {
    const settings = this.snapshot().settings;
    const fresh = this.createInitialSnapshot();
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

  private tick(dt: number): void {
    const s = this.snapshot();
    if (s.phase !== 'playing') return;

    const weatherTick = this.weatherSys.update(s.weather, s.wind, dt);
    const ocean = this.oceanSys.update(
      s.ocean,
      dt,
      weatherTick.weather.id,
      s.settings.waveScale,
    );

    let controls = s.controls;
    const combatTick = this.combatSys.update(controls, dt);
    controls = combatTick.controls;

    let player = this.physicsSys.update(s.player, controls, weatherTick.wind, ocean, dt);
    let aiShips = this.aiSys.update(s.aiShips, player, weatherTick.wind, ocean, dt);
    let shotVisuals = this.combatSys.ageVisuals(s.shotVisuals, dt);
    let lastHitMarker = s.lastHitMarker
      ? { ...s.lastHitMarker, age: s.lastHitMarker.age + dt }
      : undefined;
    if (lastHitMarker && lastHitMarker.age > 1.6) lastHitMarker = undefined;

    if (combatTick.canFire) {
      const shot = this.combatSys.resolvePlayerShot(player, controls, aiShips);
      shotVisuals = [...shotVisuals, ...this.combatSys.createShotVisuals(shot)];
      this.audio.playCannon(0.9);
      if (shot.hit && shot.targetId) {
        aiShips = aiShips.map((ai) =>
          ai.id === shot.targetId
            ? { ...ai, ship: this.combatSys.applyDamage(ai.ship, shot.damage) }
            : ai,
        );
        lastHitMarker = { targetId: shot.targetId, damage: shot.damage, age: 0 };
        this.audio.playImpact(0.7);
      }
    }

    // AI return fire
    for (let i = 0; i < aiShips.length; i++) {
      const ai = aiShips[i]!;
      const shot = this.combatSys.resolveAiShot(ai, player);
      if (!shot) continue;
      aiShips[i] = this.aiSys.markFired(ai);
      shotVisuals = [...shotVisuals, ...this.combatSys.createShotVisuals(shot)];
      this.audio.playCannon(0.55);
      if (shot.hit) {
        player = this.combatSys.applyDamage(player, shot.damage);
        this.audio.playImpact(0.85);
      }
    }

    const crew = this.crewSys.tickMorale(s.crew, player.hullIntegrity, dt);
    this.maybeTriggerDialogue(crew, weatherTick.weather.id, s.combatState, player.hullIntegrity, dt);

    let phase: GamePhase = s.phase;
    let combatState = s.combatState;
    const hostiles = aiShips.filter((a) => a.hostile);
    const hostilesAlive = hostiles.filter((a) => a.ship.hullIntegrity > 0);

    if (player.hullIntegrity <= 0 && player.sinkProgress > 0.85) {
      phase = 'defeat';
      combatState = 'sinking';
    } else if (player.hullIntegrity <= 0) {
      combatState = 'sinking';
    } else if (hostiles.length > 0 && hostilesAlive.length === 0) {
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
        this.aiSys.createPatrol('merchant', 48, -28, false),
        this.aiSys.createPatrol('navy', -55, -40, false),
        this.aiSys.createPatrol('pirate', -38, 52, true),
        this.aiSys.createPatrol('pirate', 30, 60, true),
      ],
      combatState: 'peaceful',
      reloadRemaining: 0,
      shotVisuals: [],
      settings: { ...DEFAULT_SETTINGS, accessibility: { ...DEFAULT_SETTINGS.accessibility } },
    };
  }
}
