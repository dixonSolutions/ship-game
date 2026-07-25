export type WeatherId =
  | 'clear'
  | 'rain'
  | 'storm'
  | 'fog'
  | 'lightning'
  | 'hurricane'
  | 'tsunami';

export type CombatState = 'peaceful' | 'skirmish' | 'battle' | 'sinking';

export type GamePhase =
  | 'loading'
  | 'onboarding'
  | 'playing'
  | 'paused'
  | 'victory'
  | 'defeat'
  | 'error';

export type GraphicsQuality = 'low' | 'medium' | 'high';

export type CrewRole = 'captain' | 'helmsman' | 'gunner' | 'lookout' | 'boatswain';

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface ShipControls {
  sailTrim: number;
  rudder: number;
  throttle: number;
  anchorDeployed: boolean;
  cannonAimYaw: number;
  cannonAimPitch: number;
  fireCannon: boolean;
}

export interface WindState {
  directionRad: number;
  strength: number;
}

export interface OceanState {
  waveHeight: number;
  waveLength: number;
  chop: number;
  time: number;
  /** Extra swell pulse used by tsunami events. */
  tsunamiPulse: number;
  /** Mirrored wind for shader / sampling alignment. */
  windDirectionRad: number;
  windStrength: number;
  /** Long-period swell amount (0–~1.6). */
  swell: number;
}

export interface WeatherState {
  id: WeatherId;
  visibility: number;
  precipitation: number;
  lightningChance: number;
  /** 0–1 flash intensity driven by the weather system. */
  lightningFlash: number;
}

export interface ShipState {
  position: Vec3;
  heading: number;
  speed: number;
  heel: number;
  pitch: number;
  hullIntegrity: number;
  sailIntegrity: number;
  /** 0–1 sink progress after hull reaches zero. */
  sinkProgress: number;
}

export interface CrewMember {
  id: string;
  name: string;
  role: CrewRole;
  morale: number;
  /** Local offset on the player deck for procedural avatar placement. */
  deckOffset: Vec3;
  voiceId: string;
}

export interface AiShipState {
  id: string;
  faction: 'merchant' | 'navy' | 'pirate';
  ship: ShipState;
  hostile: boolean;
  reloadTimer: number;
  broadsideSide: 1 | -1;
}

export interface Projectile {
  id: string;
  originId: string;
  position: Vec3;
  velocity: Vec3;
  age: number;
  alive: boolean;
}

export interface ShotVisual {
  id: string;
  origin: Vec3;
  target: Vec3;
  age: number;
  lifetime: number;
  kind: 'cannon' | 'impact' | 'smoke' | 'ball' | 'splash';
  /** When kind === 'ball', tracks the live projectile id. */
  projectileId?: string;
}

export interface AccessibilitySettings {
  reduceMotion: boolean;
  highContrast: boolean;
}

export interface GameSettings {
  graphicsQuality: GraphicsQuality;
  masterVolume: number;
  waveScale: number;
  accessibility: AccessibilitySettings;
  /** Show collision radii and projectile helpers. */
  debugPhysics: boolean;
}

export interface GameSnapshot {
  phase: GamePhase;
  timeOfDay: number;
  wind: WindState;
  ocean: OceanState;
  weather: WeatherState;
  player: ShipState;
  controls: ShipControls;
  crew: CrewMember[];
  aiShips: AiShipState[];
  combatState: CombatState;
  reloadRemaining: number;
  lastHitMarker?: { targetId: string; damage: number; age: number };
  shotVisuals: ShotVisual[];
  projectiles: Projectile[];
  settings: GameSettings;
  dialogueLine?: string;
  lastError?: string;
}
