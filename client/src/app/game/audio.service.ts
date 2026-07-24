import { Injectable } from '@angular/core';
import { Howl, Howler } from 'howler';
import type { GameSnapshot } from '../systems/types';

/**
 * Layered ambient + SFX via Howler.
 * Uses procedurally generated short WAV data-URIs (placeholder assets).
 */
@Injectable({ providedIn: 'root' })
export class AudioService {
  private wind?: Howl;
  private waves?: Howl;
  private creak?: Howl;
  private thunder?: Howl;
  private cannon?: Howl;
  private impact?: Howl;
  private voice?: Howl;
  private started = false;
  private lastThunder = 0;

  async unlock(): Promise<void> {
    if (this.started) return;
    this.started = true;
    Howler.volume(0.55);

    this.wind = new Howl({ src: [this.noiseDataUri(0.035, 0.4)], loop: true, volume: 0.12 });
    this.waves = new Howl({ src: [this.noiseDataUri(0.05, 0.15)], loop: true, volume: 0.18 });
    this.creak = new Howl({ src: [this.toneDataUri(110, 0.04, 0.8)], loop: true, volume: 0.05 });
    this.thunder = new Howl({ src: [this.noiseDataUri(0.2, 0.05)], volume: 0.5 });
    this.cannon = new Howl({ src: [this.toneDataUri(70, 0.35, 0.25)], volume: 0.7 });
    this.impact = new Howl({ src: [this.noiseDataUri(0.25, 0.2)], volume: 0.55 });

    this.wind.play();
    this.waves.play();
    this.creak.play();
  }

  setMasterVolume(volume: number): void {
    Howler.volume(Math.max(0, Math.min(1, volume)));
  }

  syncFromWeather(): void {
    // Compatibility with settings panel — full sync uses snapshot.
  }

  syncFromSnapshot(snap: GameSnapshot): void {
    if (!this.started) return;
    const weather = snap.weather;
    this.wind?.volume(0.08 + weather.precipitation * 0.28 + snap.wind.strength * 0.1);
    this.waves?.volume(0.12 + snap.ocean.waveHeight * 0.08 + (1 - weather.visibility) * 0.12);
    this.creak?.volume(0.03 + snap.player.speed * 0.01 + Math.abs(snap.player.heel) * 0.08);

    if (weather.lightningFlash > 0.9 && performance.now() - this.lastThunder > 900) {
      this.lastThunder = performance.now();
      this.thunder?.play();
    }
  }

  playCannon(volume = 0.8): void {
    if (!this.started || !this.cannon) return;
    this.cannon.volume(volume);
    this.cannon.play();
  }

  playImpact(volume = 0.7): void {
    if (!this.started || !this.impact) return;
    this.impact.volume(volume);
    this.impact.play();
  }

  async playVoiceBlob(blob: Blob): Promise<void> {
    if (!this.started) return;
    const url = URL.createObjectURL(blob);
    this.voice?.unload();
    this.voice = new Howl({
      src: [url],
      format: ['mp3', 'ogg', 'wav'],
      volume: 0.9,
      onend: () => URL.revokeObjectURL(url),
    });
    this.voice.play();
  }

  private toneDataUri(freq: number, gain: number, seconds = 1): string {
    const sampleRate = 22050;
    const samples = Math.floor(sampleRate * seconds);
    const buffer = new ArrayBuffer(44 + samples * 2);
    const view = new DataView(buffer);
    this.writeWavHeader(view, samples, sampleRate);
    for (let i = 0; i < samples; i++) {
      const t = i / sampleRate;
      const env = Math.min(1, t * 30) * Math.max(0, 1 - t / seconds);
      const sample = Math.sin(2 * Math.PI * freq * t) * gain * env * 32767;
      view.setInt16(44 + i * 2, sample, true);
    }
    return this.bufferToDataUri(buffer);
  }

  private noiseDataUri(gain: number, seconds: number): string {
    const sampleRate = 22050;
    const samples = Math.floor(sampleRate * seconds);
    const buffer = new ArrayBuffer(44 + samples * 2);
    const view = new DataView(buffer);
    this.writeWavHeader(view, samples, sampleRate);
    let last = 0;
    for (let i = 0; i < samples; i++) {
      // Brown-ish noise for wind/waves
      last = (last + (Math.random() * 2 - 1) * 0.02) * 0.98;
      const sample = last * gain * 32767;
      view.setInt16(44 + i * 2, sample, true);
    }
    return this.bufferToDataUri(buffer);
  }

  private writeWavHeader(view: DataView, samples: number, sampleRate: number): void {
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
  }

  private bufferToDataUri(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]!);
    return `data:audio/wav;base64,${btoa(binary)}`;
  }
}
