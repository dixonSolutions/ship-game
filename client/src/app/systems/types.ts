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
}

export interface WeatherState {
  id: WeatherId;
  visibility: number;
  precipitation: number;
  lightningChance: number;
}

export interface ShipState {
  position: Vec3;
  heading: number;
  speed: number;
  heel: number;
  pitch: number;
  hullIntegrity: number;
  sailIntegrity: number;
}

export interface CrewMember {
  id: string;
  name: string;
  role: 'captain' | 'helmsman' | 'gunner' | 'lookout' | 'boatswain';
  morale: number;
}

export interface AiShipState {
  id: string;
  faction: 'merchant' | 'navy' | 'pirate';
  ship: ShipState;
  hostile: boolean;
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
  lastError?: string;
}
