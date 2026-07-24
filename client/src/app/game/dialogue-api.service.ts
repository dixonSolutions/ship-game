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

@Injectable({ providedIn: 'root' })
export class DialogueApiService {
  private readonly http = inject(HttpClient);
  private readonly apiBase = environment.apiBaseUrl;

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
}
