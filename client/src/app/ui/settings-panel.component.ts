import { Component, inject, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Button } from '@openng/optimus-ui/button';
import { Select } from '@openng/optimus-ui/select';
import { Slider } from '@openng/optimus-ui/slider';
import { GameEngineService } from '../game/game-engine.service';
import { AudioService } from '../game/audio.service';
import type { WeatherId } from '../systems/types';

@Component({
  selector: 'app-settings-panel',
  standalone: true,
  imports: [FormsModule, Button, Select, Slider],
  template: `
    @if (open()) {
      <aside class="panel" role="dialog" aria-label="Settings">
        <header>
          <h2>Settings</h2>
          <p-button icon="pi pi-times" [rounded]="true" [text]="true" (onClick)="closed.emit()" />
        </header>

        <label>
          Master volume
          <p-slider [(ngModel)]="volume" [min]="0" [max]="1" [step]="0.05" (onChange)="onVolume()" />
        </label>

        <label>
          Wind strength
          <p-slider [(ngModel)]="windStrength" [min]="0" [max]="1" [step]="0.05" (onChange)="onWind()" />
        </label>

        <label>
          Time of day
          <p-slider [(ngModel)]="timeOfDay" [min]="0" [max]="1" [step]="0.01" (onChange)="onTime()" />
        </label>

        <label>
          Weather
          <p-select
            [options]="weatherOptions"
            [(ngModel)]="weather"
            optionLabel="label"
            optionValue="value"
            (onChange)="onWeather()"
          />
        </label>

        <p class="hint">Graphics quality and accessibility toggles will expand here.</p>
      </aside>
    }
  `,
  styles: [
    `
      .panel {
        position: absolute;
        top: 4.5rem;
        right: 1rem;
        z-index: 5;
        width: min(22rem, calc(100vw - 2rem));
        display: grid;
        gap: 1rem;
        padding: 1rem;
        background: color-mix(in srgb, #071722 92%, transparent);
        border: 1px solid color-mix(in srgb, #9ec9d8 28%, transparent);
        color: #e8f1f5;
      }
      header {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      h2 {
        margin: 0;
        font-size: 1.1rem;
      }
      label {
        display: grid;
        gap: 0.4rem;
        font-size: 0.85rem;
      }
      .hint {
        margin: 0;
        opacity: 0.7;
        font-size: 0.8rem;
      }
    `,
  ],
})
export class SettingsPanelComponent {
  open = input(false);
  closed = output<void>();

  private readonly engine = inject(GameEngineService);
  private readonly audio = inject(AudioService);

  volume = 0.55;
  windStrength = this.engine.snapshot().wind.strength;
  timeOfDay = this.engine.snapshot().timeOfDay;
  weather: WeatherId = this.engine.snapshot().weather.id;

  readonly weatherOptions: { label: string; value: WeatherId }[] = [
    { label: 'Clear', value: 'clear' },
    { label: 'Rain', value: 'rain' },
    { label: 'Storm', value: 'storm' },
    { label: 'Fog', value: 'fog' },
    { label: 'Lightning', value: 'lightning' },
    { label: 'Hurricane', value: 'hurricane' },
    { label: 'Tsunami', value: 'tsunami' },
  ];

  onVolume(): void {
    this.audio.setMasterVolume(this.volume);
  }

  onWind(): void {
    const dir = this.engine.snapshot().wind.directionRad;
    this.engine.setWind(dir, this.windStrength);
  }

  onTime(): void {
    this.engine.setTimeOfDay(this.timeOfDay);
  }

  onWeather(): void {
    this.engine.setWeather(this.weather);
    this.audio.syncFromWeather();
  }
}
