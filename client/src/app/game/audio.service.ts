import { Injectable, inject } from '@angular/core';
import { Howl, Howler } from 'howler';
import type { GameSnapshot } from '../systems/types';
import { DialogueApiService } from './dialogue-api.service';

type BankId =
  | 'ambient_wind'
  | 'ambient_waves'
  | 'ambient_creak'
  | 'ambient_rain'
  | 'sfx_thunder'
  | 'sfx_cannon'
  | 'sfx_impact'
  | 'sfx_splash'
  | 'sfx_sail_flap'
  | 'sfx_anchor'
  | 'music_horizon';

/**
 * Immersive layered audio.
 * Prefers local files under /assets/audio (from `npm run assets:download`);
 * falls back to procedural WAV. Never calls a runtime API server.
 */
@Injectable({ providedIn: 'root' })
export class AudioService {
  private readonly api = inject(DialogueApiService);

  private bank = new Map<BankId, Howl>();
  private objectUrls: string[] = [];
  private voice?: Howl;
  private started = false;
  private usingEleven = false;
  private lastThunder = 0;
  private lastSplash = 0;
  private lastSailFlap = 0;
  private prevSailTrim = 0.7;
  private prevAnchor = false;

  async unlock(): Promise<void> {
    if (this.started) return;
    this.started = true;
    Howler.volume(0.6);

    try {
      await this.loadElevenBank();
      this.usingEleven = true;
    } catch {
      this.usingEleven = false;
      this.installProceduralFallback();
    }

    this.playLoop('ambient_wind', 0.14);
    this.playLoop('ambient_waves', 0.2);
    this.playLoop('ambient_creak', 0.06);
    this.playLoop('music_horizon', 0.12);
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
    const wind = snap.wind.strength;
    const chop = snap.ocean.chop;
    const speed = snap.player.speed;

    this.setVol('ambient_wind', 0.1 + wind * 0.28 + weather.precipitation * 0.1);
    this.setVol('ambient_waves', 0.14 + snap.ocean.waveHeight * 0.06 + chop * 0.12);
    this.setVol('ambient_creak', 0.04 + speed * 0.012 + Math.abs(snap.player.heel) * 0.1);
    this.setVol('music_horizon', weather.id === 'clear' || weather.id === 'fog' ? 0.12 : 0.05);

    const raining = weather.precipitation > 0.2;
    if (raining) {
      this.playLoop('ambient_rain', 0.08 + weather.precipitation * 0.35);
      this.setVol('ambient_rain', 0.08 + weather.precipitation * 0.35);
    } else {
      this.setVol('ambient_rain', 0);
    }

    if (weather.lightningFlash > 0.85 && performance.now() - this.lastThunder > 1200) {
      this.lastThunder = performance.now();
      this.playOneShot('sfx_thunder', 0.45 + weather.precipitation * 0.35);
    }

    // Bow spray when punching into chop
    if (
      speed > 3.2 &&
      chop > 0.45 &&
      performance.now() - this.lastSplash > 1600 + Math.random() * 1200
    ) {
      this.lastSplash = performance.now();
      this.playOneShot('sfx_splash', 0.25 + chop * 0.35);
    }

    // Sail flap on sudden trim changes in wind
    if (
      Math.abs(snap.controls.sailTrim - this.prevSailTrim) > 0.12 &&
      wind > 0.4 &&
      performance.now() - this.lastSailFlap > 900
    ) {
      this.lastSailFlap = performance.now();
      this.playOneShot('sfx_sail_flap', 0.35 + wind * 0.35);
    }
    this.prevSailTrim = snap.controls.sailTrim;

    if (snap.controls.anchorDeployed && !this.prevAnchor) {
      this.playOneShot('sfx_anchor', 0.7);
    }
    this.prevAnchor = snap.controls.anchorDeployed;
  }

  playCannon(volume = 0.8): void {
    this.playOneShot('sfx_cannon', volume);
  }

  playImpact(volume = 0.7): void {
    this.playOneShot('sfx_impact', volume);
  }

  async playVoiceBlob(blob: Blob): Promise<void> {
    if (!this.started) return;
    const url = URL.createObjectURL(blob);
    this.objectUrls.push(url);
    this.voice?.unload();
    this.voice = new Howl({
      src: [url],
      format: ['mp3', 'mpeg', 'wav'],
      volume: 0.95,
      onend: () => URL.revokeObjectURL(url),
    });
    // Duck ambience slightly under dialogue
    this.setVol('music_horizon', 0.04);
    this.voice.play();
  }

  usingElevenLabs(): boolean {
    return this.usingEleven;
  }

  private async loadElevenBank(): Promise<void> {
    // Prefetch loop beds from local public assets; one-shots lazy-load.
    const critical: BankId[] = [
      'ambient_wind',
      'ambient_waves',
      'ambient_creak',
      'music_horizon',
      'sfx_cannon',
    ];
    await Promise.all(critical.map((id) => this.fetchIntoBank(id)));
    void this.fetchIntoBank('ambient_rain');
    void this.fetchIntoBank('sfx_thunder');
    void this.fetchIntoBank('sfx_impact');
    void this.fetchIntoBank('sfx_splash');
    void this.fetchIntoBank('sfx_sail_flap');
    void this.fetchIntoBank('sfx_anchor');
  }

  private async fetchIntoBank(id: BankId): Promise<void> {
    const blob = await this.api.fetchSound(id);
    const url = URL.createObjectURL(blob);
    this.objectUrls.push(url);
    const loop = id.startsWith('ambient_') || id === 'music_horizon';
    this.bank.set(
      id,
      new Howl({
        src: [url],
        format: ['mp3', 'mpeg'],
        loop,
        volume: 0,
        preload: true,
      }),
    );
  }

  private installProceduralFallback(): void {
    this.bank.set('ambient_wind', new Howl({ src: [this.noiseDataUri(0.035, 0.4)], loop: true, volume: 0 }));
    this.bank.set('ambient_waves', new Howl({ src: [this.noiseDataUri(0.05, 0.15)], loop: true, volume: 0 }));
    this.bank.set('ambient_creak', new Howl({ src: [this.toneDataUri(110, 0.04, 0.8)], loop: true, volume: 0 }));
    this.bank.set('ambient_rain', new Howl({ src: [this.noiseDataUri(0.04, 0.3)], loop: true, volume: 0 }));
    this.bank.set('sfx_thunder', new Howl({ src: [this.noiseDataUri(0.2, 0.05)], volume: 0.5 }));
    this.bank.set('sfx_cannon', new Howl({ src: [this.toneDataUri(70, 0.35, 0.25)], volume: 0.7 }));
    this.bank.set('sfx_impact', new Howl({ src: [this.noiseDataUri(0.25, 0.2)], volume: 0.55 }));
    this.bank.set('sfx_splash', new Howl({ src: [this.noiseDataUri(0.08, 0.12)], volume: 0.4 }));
    this.bank.set('sfx_sail_flap', new Howl({ src: [this.noiseDataUri(0.1, 0.1)], volume: 0.4 }));
    this.bank.set('sfx_anchor', new Howl({ src: [this.toneDataUri(55, 0.25, 0.4)], volume: 0.55 }));
    this.bank.set('music_horizon', new Howl({ src: [this.toneDataUri(90, 0.02, 2)], loop: true, volume: 0 }));
  }

  private playLoop(id: BankId, volume: number): void {
    const howl = this.bank.get(id);
    if (!howl) return;
    howl.volume(volume);
    if (!howl.playing()) howl.play();
  }

  private setVol(id: BankId, volume: number): void {
    const howl = this.bank.get(id);
    if (!howl) return;
    howl.volume(Math.max(0, Math.min(1, volume)));
    if (volume > 0.01 && !howl.playing() && howl.loop()) howl.play();
    if (volume <= 0.01 && howl.playing() && id === 'ambient_rain') howl.stop();
  }

  private playOneShot(id: BankId, volume: number): void {
    if (!this.started) return;
    const howl = this.bank.get(id);
    if (!howl) {
      if (this.usingEleven) {
        void this.fetchIntoBank(id).then(() => this.playOneShot(id, volume));
      }
      return;
    }
    howl.volume(Math.max(0, Math.min(1, volume)));
    howl.play();
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
