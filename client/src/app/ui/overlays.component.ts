import { Component, computed, inject, signal } from '@angular/core';
import { Button } from '@openng/optimus-ui/button';
import { GameEngineService } from '../game/game-engine.service';
import { AudioService } from '../game/audio.service';
import { SettingsPanelComponent } from './settings-panel.component';

@Component({
  selector: 'app-overlays',
  standalone: true,
  imports: [Button, SettingsPanelComponent],
  template: `
    @if (phase() === 'loading') {
      <div class="overlay">
        <h1>Ship Game</h1>
        <p>Charting waters…</p>
      </div>
    }

    @if (phase() === 'onboarding') {
      <div class="overlay">
        <h1>Ship Game</h1>
        <p>Trim sails, mind the wind, and keep the hull afloat against hostile sails.</p>
        <p class="controls">
          Q/E steer · W/S sail trim · Shift throttle · Space fire · A anchor · Mouse aim · Esc pause
        </p>
        <p-button label="Cast off" (onClick)="start()" />
      </div>
    }

    @if (phase() === 'paused') {
      <div class="overlay dim">
        <h2>Paused</h2>
        <div class="row">
          <p-button label="Resume" (onClick)="resume()" />
          <p-button label="Settings" severity="secondary" (onClick)="settingsOpen.set(true)" />
        </div>
      </div>
    }

    @if (phase() === 'victory') {
      <div class="overlay">
        <h2>Victory</h2>
        <p>Hostile sails broken. The horizon is yours.</p>
        <div class="row">
          <p-button label="Sail on" (onClick)="engine.restartVoyage()" />
          <p-button label="Settings" severity="secondary" (onClick)="settingsOpen.set(true)" />
        </div>
      </div>
    }

    @if (phase() === 'defeat') {
      <div class="overlay">
        <h2>Defeat</h2>
        <p>The sea claims the hull. Refit and try again.</p>
        <div class="row">
          <p-button label="Refit" (onClick)="engine.restartVoyage()" />
          <p-button label="Menu" severity="secondary" (onClick)="engine.setPhase('onboarding')" />
        </div>
      </div>
    }

    @if (phase() === 'error') {
      <div class="overlay">
        <h2>Something went wrong</h2>
        <p>{{ snap().lastError || 'Unknown error' }}</p>
        <p-button label="Return" (onClick)="engine.setPhase('onboarding')" />
      </div>
    }

    @if (apiError()) {
      <div class="toast" role="status">Crew link degraded — {{ apiError() }}</div>
    }

    <app-settings-panel [open]="settingsOpen()" (closed)="settingsOpen.set(false)" />
  `,
  styles: [
    `
      .overlay {
        position: absolute;
        inset: 0;
        z-index: 4;
        display: grid;
        place-content: center;
        gap: 0.75rem;
        text-align: center;
        color: #f2f7fa;
        background: radial-gradient(circle at 50% 30%, rgba(12, 40, 58, 0.55), rgba(4, 10, 16, 0.82));
        padding: 1.5rem;
      }
      .overlay.dim {
        background: rgba(4, 10, 16, 0.62);
      }
      h1,
      h2 {
        margin: 0;
        font-weight: 600;
        letter-spacing: 0.02em;
      }
      h1 {
        font-size: clamp(2rem, 6vw, 3.5rem);
      }
      p {
        margin: 0;
        max-width: 28rem;
        opacity: 0.9;
      }
      .controls {
        font-size: 0.85rem;
        opacity: 0.75;
      }
      .row {
        display: flex;
        gap: 0.75rem;
        justify-content: center;
        flex-wrap: wrap;
      }
      .toast {
        position: absolute;
        left: 50%;
        top: 1rem;
        transform: translateX(-50%);
        z-index: 6;
        padding: 0.5rem 0.85rem;
        background: color-mix(in srgb, #3a1510 88%, transparent);
        border: 1px solid #e0a090;
        color: #ffe8e0;
        font-size: 0.85rem;
        max-width: min(28rem, calc(100vw - 2rem));
      }
    `,
  ],
})
export class OverlaysComponent {
  readonly engine = inject(GameEngineService);
  private readonly audio = inject(AudioService);

  readonly snap = this.engine.snapshot;
  readonly phase = computed(() => this.snap().phase);
  readonly apiError = computed(() =>
    this.snap().phase === 'playing' ? this.snap().lastError : undefined,
  );
  readonly settingsOpen = signal(false);

  async start(): Promise<void> {
    await this.audio.unlock();
    this.engine.beginVoyage();
  }

  resume(): void {
    this.engine.setPhase('playing');
  }
}
