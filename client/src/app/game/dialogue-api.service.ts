import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';

/** Mirrors @ship-game/shared DialogueRequest — browser never talks to AWS. */
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
}

function resolveApiBase(): string {
  if (typeof window !== 'undefined') {
    const fromQuery = new URLSearchParams(window.location.search).get('api');
    if (fromQuery) return fromQuery.replace(/\/$/, '');
    const fromWindow = (window as Window & { __SHIP_GAME_API__?: string }).__SHIP_GAME_API__;
    if (fromWindow) return fromWindow.replace(/\/$/, '');
  }
  return environment.apiBaseUrl.replace(/\/$/, '');
}

@Injectable({ providedIn: 'root' })
export class DialogueApiService {
  private readonly http = inject(HttpClient);
  private readonly apiBase = resolveApiBase();

  async askCrew(request: DialogueRequestDto): Promise<DialogueResponseDto> {
    return firstValueFrom(
      this.http.post<DialogueResponseDto>(`${this.apiBase}/api/dialogue`, request),
    );
  }

  async speak(text: string, voiceId = 'Matthew'): Promise<Blob> {
    return firstValueFrom(
      this.http.post(`${this.apiBase}/api/tts`, { text, voiceId }, { responseType: 'blob' }),
    );
  }

  /** Fetch a constrained sound-bank clip (ElevenLabs via server). */
  async fetchSound(soundId: string): Promise<Blob> {
    return firstValueFrom(
      this.http.post(`${this.apiBase}/api/sfx`, { soundId }, { responseType: 'blob' }),
    );
  }
}
