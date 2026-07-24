import { Injectable, inject } from '@angular/core';
import { Howl, Howler } from 'howler';
import { GameEngineService } from './game-engine.service';

/**
 * Ambient audio layers via Howler.
 * Placeholder oscillators encoded as tiny data-URI tones until real assets arrive.
 */
@Injectable({ providedIn: 'root' })
export class AudioService {
  private readonly engine = inject(GameEngineService);
  private wind?: Howl;
  private waves?: Howl;
  private started = false;

  /** Unlock audio on first user gesture. */
  async unlock(): Promise<void> {
    if (this.started) return;
    this.started = true;
    Howler.volume(0.55);

    // Procedural-ish looping noise stubs using silent/near-silent buffers if decode fails.
    this.wind = new Howl({
      src: [this.toneDataUri(180, 0.03)],
      loop: true,
      volume: 0.15,
    });
    this.waves = new Howl({
      src: [this.toneDataUri(90, 0.04)],
      loop: true,
      volume: 0.2,
    });

    this.wind.play();
    this.waves.play();
    this.syncFromWeather();
  }

  setMasterVolume(volume: number): void {
    Howler.volume(Math.max(0, Math.min(1, volume)));
  }

  syncFromWeather(): void {
    const weather = this.engine.snapshot().weather;
    this.wind?.volume(0.1 + weather.precipitation * 0.25);
    this.waves?.volume(0.15 + (1 - weather.visibility) * 0.2);
  }

  private toneDataUri(freq: number, gain: number): string {
    // Generate a short WAV beep as a stand-in ambient bed.
    const sampleRate = 22050;
    const seconds = 1;
    const samples = sampleRate * seconds;
    const buffer = new ArrayBuffer(44 + samples * 2);
    const view = new DataView(buffer);
    const writeStr = (offset: number, str: string) => {
      for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
    };
    writeStr(0, 'RIFF');
    view.setUint32(4, 36 + samples * 2, true);
    writeStr(8, 'WAVE');
    writeStr(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeStr(36, 'data');
    view.setUint32(40, samples * 2, true);
    for (let i = 0; i < samples; i++) {
      const t = i / sampleRate;
      const sample = Math.sin(2 * Math.PI * freq * t) * gain * 32767;
      view.setInt16(44 + i * 2, sample, true);
    }
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]!);
    return `data:audio/wav;base64,${btoa(binary)}`;
  }
}
