import type { CrewMember } from './types';

export class CrewSystem {
  createDefaultCrew(): CrewMember[] {
    return [
      { id: 'crew-captain', name: 'Ada Byrne', role: 'captain', morale: 0.9 },
      { id: 'crew-helm', name: 'Pike', role: 'helmsman', morale: 0.85 },
      { id: 'crew-gun', name: 'Maren', role: 'gunner', morale: 0.8 },
      { id: 'crew-look', name: 'Nessa', role: 'lookout', morale: 0.88 },
      { id: 'crew-boat', name: 'Cormac', role: 'boatswain', morale: 0.82 },
    ];
  }

  tickMorale(crew: CrewMember[], hullIntegrity: number, dt: number): CrewMember[] {
    return crew.map((member) => ({
      ...member,
      morale: clamp(member.morale + (hullIntegrity - 0.5) * dt * 0.02, 0, 1),
    }));
  }
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}
