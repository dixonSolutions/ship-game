import { Injectable } from '@angular/core';

/** Mirrors former API DTOs — content is local only (no runtime server). */
export interface DialogueRequestDto {
  context: {
    crewRole: 'captain' | 'helmsman' | 'gunner' | 'lookout' | 'boatswain';
    crewName: string;
    shipName: string;
    weather: string;
    combatState: string;
    windStrength: number;
    hullIntegrity: number;
    recentEvent?: string;
  };
  playerLine: string;
}

export interface DialogueResponseDto {
  reply: string;
  mood: 'calm' | 'tense' | 'urgent' | 'joyful' | 'grim';
  voiceHint?: string;
  /** Local voice clip id under /assets/voice/{id}.mp3 when present. */
  voiceClipId?: string;
}

interface DialoguePack {
  lines: Array<{ id: string; voice: string; text: string }>;
  byCue: Record<string, string>;
}

/**
 * Offline crew radio + asset loader.
 * Secrets never touch the browser; audio/voice files come from public/assets
 * after `npm run assets:download`.
 */
@Injectable({ providedIn: 'root' })
export class DialogueApiService {
  private pack?: DialoguePack;
  private packPromise?: Promise<DialoguePack>;

  private loadPack(): Promise<DialoguePack> {
    if (this.pack) return Promise.resolve(this.pack);
    if (!this.packPromise) {
      this.packPromise = fetch('/assets/dialogue/pack.json')
        .then((r) => {
          if (!r.ok) throw new Error('dialogue pack missing');
          return r.json() as Promise<DialoguePack>;
        })
        .then((pack) => {
          this.pack = pack;
          return pack;
        })
        .catch(() => {
          const fallback: DialoguePack = {
            lines: [{ id: 'generic_sharp', voice: 'boatswain', text: 'Stay sharp.' }],
            byCue: { default: 'generic_sharp' },
          };
          this.pack = fallback;
          return fallback;
        });
    }
    return this.packPromise;
  }

  async askCrew(request: DialogueRequestDto): Promise<DialogueResponseDto> {
    const pack = await this.loadPack();
    const weather = request.context.weather;
    const combat = request.context.combatState;
    const hull = request.context.hullIntegrity;
    const event = (request.context.recentEvent || '').toLowerCase();

    let cueKey = 'default';
    if (hull < 0.45 || event.includes('damage') || event.includes('hit')) cueKey = 'damage';
    else if (combat === 'battle' || combat === 'skirmish' || event.includes('gun')) cueKey = 'combat';
    else if (event.includes('sail') || event.includes('ship')) cueKey = 'sail';
    else if (event.includes('helm') || event.includes('steer')) cueKey = 'steer';
    else if (weather === 'clear' || weather === 'fog') cueKey = 'clear';
    else if (
      weather === 'storm' ||
      weather === 'hurricane' ||
      weather === 'tornado' ||
      weather === 'tsunami' ||
      weather === 'lightning' ||
      weather === 'rain'
    ) {
      cueKey = 'storm';
    }

    const lineId = pack.byCue[cueKey] ?? pack.byCue['default'] ?? 'generic_sharp';
    const line = pack.lines.find((l) => l.id === lineId) ?? pack.lines[0]!;
    const mood: DialogueResponseDto['mood'] =
      cueKey === 'damage' ? 'grim' : cueKey === 'combat' ? 'urgent' : cueKey === 'storm' ? 'tense' : 'calm';

    return {
      reply: line.text,
      mood,
      voiceHint: line.voice,
      voiceClipId: line.id,
    };
  }

  /** Load a pre-downloaded voice clip; returns empty blob if missing. */
  async speak(_text: string, _voiceId = 'Matthew', voiceClipId?: string): Promise<Blob> {
    if (!voiceClipId) return new Blob();
    const res = await fetch(`/assets/voice/${voiceClipId}.mp3`);
    if (!res.ok) return new Blob();
    return res.blob();
  }

  /** Load a pre-downloaded sound-bank clip from public assets. */
  async fetchSound(soundId: string): Promise<Blob> {
    const res = await fetch(`/assets/audio/${soundId}.mp3`);
    if (!res.ok) {
      throw new Error(`Local sound missing: ${soundId} (run npm run assets:download)`);
    }
    return res.blob();
  }
}
