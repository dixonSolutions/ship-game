import type { CombatState, CrewMember, CrewRole, WeatherId } from './types';

const VOICE_BY_ROLE: Record<CrewRole, string> = {
  captain: 'Matthew',
  helmsman: 'Stephen',
  gunner: 'Ruth',
  lookout: 'Joanna',
  boatswain: 'Brian',
};

export interface CrewDialogueCue {
  member: CrewMember;
  playerLine: string;
  recentEvent: string;
}

export class CrewSystem {
  private dialogueCooldown = 8;

  createDefaultCrew(): CrewMember[] {
    return [
      {
        id: 'crew-captain',
        name: 'Ada Byrne',
        role: 'captain',
        morale: 0.9,
        deckOffset: { x: 0, y: 1.1, z: 0.8 },
        voiceId: VOICE_BY_ROLE.captain,
      },
      {
        id: 'crew-helm',
        name: 'Pike',
        role: 'helmsman',
        morale: 0.85,
        deckOffset: { x: 0.15, y: 1.05, z: -1.6 },
        voiceId: VOICE_BY_ROLE.helmsman,
      },
      {
        id: 'crew-gun',
        name: 'Maren',
        role: 'gunner',
        morale: 0.8,
        deckOffset: { x: -0.9, y: 0.95, z: 0.2 },
        voiceId: VOICE_BY_ROLE.gunner,
      },
      {
        id: 'crew-look',
        name: 'Nessa',
        role: 'lookout',
        morale: 0.88,
        deckOffset: { x: 0.05, y: 3.4, z: 0.1 },
        voiceId: VOICE_BY_ROLE.lookout,
      },
      {
        id: 'crew-boat',
        name: 'Cormac',
        role: 'boatswain',
        morale: 0.82,
        deckOffset: { x: 0.85, y: 0.95, z: -0.4 },
        voiceId: VOICE_BY_ROLE.boatswain,
      },
    ];
  }

  tickMorale(crew: CrewMember[], hullIntegrity: number, dt: number): CrewMember[] {
    return crew.map((member) => ({
      ...member,
      morale: clamp(member.morale + (hullIntegrity - 0.5) * dt * 0.025, 0, 1),
    }));
  }

  /**
   * Occasionally request contextual chatter based on weather / combat.
   * Returns null while cooling down.
   */
  maybeDialogueCue(
    crew: CrewMember[],
    weather: WeatherId,
    combat: CombatState,
    hullIntegrity: number,
    dt: number,
  ): CrewDialogueCue | null {
    this.dialogueCooldown = Math.max(0, this.dialogueCooldown - dt);
    if (this.dialogueCooldown > 0) return null;

    let member: CrewMember | undefined;
    let recentEvent = 'steady sailing';
    let playerLine = 'Status report.';

    if (hullIntegrity < 0.45) {
      member = crew.find((c) => c.role === 'boatswain') ?? crew[0];
      recentEvent = 'hull damage';
      playerLine = 'How bad is the damage?';
    } else if (combat === 'skirmish' || combat === 'battle') {
      member = crew.find((c) => c.role === 'gunner') ?? crew[0];
      recentEvent = 'cannon exchange';
      playerLine = 'Keep those guns ready.';
    } else if (weather === 'storm' || weather === 'hurricane' || weather === 'lightning') {
      member = crew.find((c) => c.role === 'helmsman') ?? crew[0];
      recentEvent = `${weather} weather`;
      playerLine = 'Hold her steady through this.';
    } else if (weather === 'fog' || weather === 'tsunami') {
      member = crew.find((c) => c.role === 'lookout') ?? crew[0];
      recentEvent = weather === 'fog' ? 'low visibility' : 'tsunami swell';
      playerLine = 'What do you see ahead?';
    } else if (Math.random() < 0.15) {
      member = crew.find((c) => c.role === 'captain') ?? crew[0];
      recentEvent = 'calm seas';
      playerLine = 'Any word from the crew?';
    }

    if (!member) return null;
    this.dialogueCooldown = 14 + Math.random() * 10;
    return { member, playerLine, recentEvent };
  }
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}
