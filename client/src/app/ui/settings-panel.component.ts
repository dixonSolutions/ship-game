import { Component, inject, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Button } from '@openng/optimus-ui/button';
import { Select } from '@openng/optimus-ui/select';
import { Slider } from '@openng/optimus-ui/slider';
import { ToggleSwitch } from '@openng/optimus-ui/toggleswitch';
import { GameEngineService } from '../game/game-engine.service';
import { AudioService } from '../game/audio.service';
import type { GraphicsQuality, WeatherId } from '../systems/types';

@Component({
  selector: 'app-settings-panel',
  standalone: true,
  imports: [FormsModule, Button, Select, Slider, ToggleSwitch],
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
          Wave scale
          <p-slider [(ngModel)]="waveScale" [min]="0.25" [max]="2" [step]="0.05" (onChange)="onWaves()" />
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

        <label>
          Weather intensity
          <p-slider
            [(ngModel)]="weatherIntensity"
            [min]="0"
            [max]="1"
            [step]="0.05"
            (onChange)="onWeatherIntensity()"
          />
        </label>

        <label>
          Graphics
          <p-select
            [options]="graphicsOptions"
            [(ngModel)]="graphics"
            optionLabel="label"
            optionValue="value"
            (onChange)="onGraphics()"
          />
        </label>

        <label class="toggle-row">
          <span>Reduce motion</span>
          <p-toggleswitch [(ngModel)]="reduceMotion" (onChange)="onAccess()" />
        </label>

        <label class="toggle-row">
          <span>High contrast HUD</span>
          <p-toggleswitch [(ngModel)]="highContrast" (onChange)="onAccess()" />
        </label>

        <label class="toggle-row">
          <span>On-screen controls</span>
          <p-toggleswitch [(ngModel)]="showOnScreenControls" (onChange)="onHudAids()" />
        </label>

        <label class="toggle-row">
          <span>Control legend</span>
          <p-toggleswitch [(ngModel)]="showControlLegend" (onChange)="onHudAids()" />
        </label>

        <label class="toggle-row">
          <span>Debug physics (D)</span>
          <p-toggleswitch [(ngModel)]="debugPhysics" (onChange)="onDebug()" />
        </label>

        <p class="hint">
          Steer Q/E · Trim W/S · Throttle Shift · Fire Space · Anchor A · Aim mouse · D debug · Esc pause
        </p>
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
        max-height: calc(100vh - 6rem);
        overflow: auto;
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
      .toggle-row {
        grid-template-columns: 1fr auto;
        align-items: center;
      }
      .hint {
        margin: 0;
        opacity: 0.7;
        font-size: 0.8rem;
        line-height: 1.4;
      }
    `,
  ],
})
export class SettingsPanelComponent {
  open = input(false);
  closed = output<void>();

  private readonly engine = inject(GameEngineService);
  private readonly audio = inject(AudioService);

  volume = this.engine.snapshot().settings.masterVolume;
  windStrength = this.engine.snapshot().wind.strength;
  waveScale = this.engine.snapshot().settings.waveScale;
  timeOfDay = this.engine.snapshot().timeOfDay;
  weather: WeatherId = this.engine.snapshot().weather.id;
  weatherIntensity = this.engine.snapshot().settings.weatherIntensity;
  graphics: GraphicsQuality = this.engine.snapshot().settings.graphicsQuality;
  reduceMotion = this.engine.snapshot().settings.accessibility.reduceMotion;
  highContrast = this.engine.snapshot().settings.accessibility.highContrast;
  debugPhysics = this.engine.snapshot().settings.debugPhysics;
  showOnScreenControls = this.engine.snapshot().settings.showOnScreenControls;
  showControlLegend = this.engine.snapshot().settings.showControlLegend;

  readonly weatherOptions: { label: string; value: WeatherId }[] = [
    { label: 'Clear', value: 'clear' },
    { label: 'Rain', value: 'rain' },
    { label: 'Storm', value: 'storm' },
    { label: 'Fog', value: 'fog' },
    { label: 'Lightning', value: 'lightning' },
    { label: 'Hurricane', value: 'hurricane' },
    { label: 'Tsunami', value: 'tsunami' },
    { label: 'Tornado', value: 'tornado' },
  ];

  readonly graphicsOptions: { label: string; value: GraphicsQuality }[] = [
    { label: 'Low', value: 'low' },
    { label: 'Medium', value: 'medium' },
    { label: 'High', value: 'high' },
  ];

  onVolume(): void {
    this.engine.patchSettings({ masterVolume: this.volume });
    this.audio.setMasterVolume(this.volume);
  }

  onWind(): void {
    const dir = this.engine.snapshot().wind.directionRad;
    this.engine.setWind(dir, this.windStrength);
  }

  onWaves(): void {
    this.engine.setWaveScale(this.waveScale);
  }

  onTime(): void {
    this.engine.setTimeOfDay(this.timeOfDay);
  }

  onWeather(): void {
    this.engine.setWeather(this.weather);
  }

  onWeatherIntensity(): void {
    this.engine.setWeatherIntensity(this.weatherIntensity);
  }

  onGraphics(): void {
    this.engine.setGraphicsQuality(this.graphics);
  }

  onAccess(): void {
    this.engine.patchSettings({
      accessibility: {
        reduceMotion: this.reduceMotion,
        highContrast: this.highContrast,
      },
    });
  }

  onDebug(): void {
    this.engine.patchSettings({ debugPhysics: this.debugPhysics });
  }

  onHudAids(): void {
    this.engine.patchSettings({
      showOnScreenControls: this.showOnScreenControls,
      showControlLegend: this.showControlLegend,
    });
  }
}
