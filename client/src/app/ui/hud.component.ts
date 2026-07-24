import { Component, computed, inject } from '@angular/core';
import { Button } from '@openng/optimus-ui/button';
import { ProgressBar } from '@openng/optimus-ui/progressbar';
import { GameEngineService } from '../game/game-engine.service';
import { InputService } from '../game/input.service';

/** Edge HUD — keeps the ocean view clear. */
@Component({
  selector: 'app-hud',
  standalone: true,
  imports: [Button, ProgressBar],
  template: `
    @if (visible()) {
      <div class="hud" [class.hud--contrast]="highContrast()" role="region" aria-label="Ship status">
        <div class="hud__cluster hud__cluster--left">
          <div class="metric">
            <span>Hull</span>
            <p-progressbar [value]="hullPct()" [showValue]="false" styleClass="hud-bar" />
          </div>
          <div class="metric">
            <span>Sails</span>
            <p-progressbar [value]="sailPct()" [showValue]="false" styleClass="hud-bar" />
          </div>
          <div class="metric">
            <span>Reload</span>
            <p-progressbar [value]="reloadPct()" [showValue]="false" styleClass="hud-bar hud-bar--reload" />
          </div>
          <div class="metric text">
            <span>Speed</span>
            <strong>{{ speed() }} kn</strong>
          </div>
        </div>

        <div class="hud__cluster hud__cluster--right">
          <div class="metric text">
            <span>Wind</span>
            <strong>{{ windLabel() }}</strong>
          </div>
          <div class="metric text">
            <span>Weather</span>
            <strong>{{ weather() }}</strong>
          </div>
          @if (hitLabel()) {
            <div class="metric text hit">
              <span>Hit</span>
              <strong>{{ hitLabel() }}</strong>
            </div>
          }
          <p-button
            label="Pause"
            severity="secondary"
            [outlined]="true"
            size="small"
            (onClick)="pause()"
          />
        </div>

        @if (dialogue()) {
          <div class="dialogue" role="status">{{ dialogue() }}</div>
        }

        <div class="touch-pad" aria-label="Touch controls">
          <button type="button" (pointerdown)="steer(-1)">◀</button>
          <button type="button" (pointerdown)="steer(1)">▶</button>
          <button type="button" (pointerdown)="trim(0.08)">Sail+</button>
          <button type="button" (pointerdown)="trim(-0.08)">Sail-</button>
          <button type="button" (click)="input.fire()">Fire</button>
          <button type="button" (click)="input.toggleAnchor()">{{ anchorLabel() }}</button>
        </div>
      </div>
    }
  `,
  styles: [
    `
      .hud {
        pointer-events: none;
        position: absolute;
        inset: 0;
        z-index: 2;
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        padding: 1rem 1.25rem;
        color: #e8f1f5;
        font-family: 'Segoe UI', system-ui, sans-serif;
      }
      .hud--contrast {
        color: #ffffff;
      }
      .hud--contrast .hud__cluster,
      .hud--contrast .dialogue {
        background: #041018;
        border-color: #e8f1f5;
      }
      .hud__cluster {
        pointer-events: auto;
        display: flex;
        gap: 0.85rem;
        align-items: center;
        padding: 0.65rem 0.85rem;
        background: color-mix(in srgb, #06131c 72%, transparent);
        border: 1px solid color-mix(in srgb, #9ec9d8 25%, transparent);
        backdrop-filter: blur(6px);
      }
      .metric {
        min-width: 6.5rem;
        display: grid;
        gap: 0.25rem;
      }
      .metric span {
        font-size: 0.7rem;
        letter-spacing: 0.06em;
        text-transform: uppercase;
        opacity: 0.75;
      }
      .metric strong {
        font-size: 0.95rem;
      }
      .hit strong {
        color: #ffb08a;
      }
      .dialogue {
        pointer-events: none;
        position: absolute;
        left: 50%;
        bottom: 5.5rem;
        transform: translateX(-50%);
        max-width: min(36rem, calc(100vw - 2rem));
        padding: 0.65rem 1rem;
        background: color-mix(in srgb, #06131c 78%, transparent);
        border: 1px solid color-mix(in srgb, #9ec9d8 22%, transparent);
        font-size: 0.92rem;
        line-height: 1.35;
        text-align: center;
      }
      .touch-pad {
        pointer-events: auto;
        position: absolute;
        right: 1rem;
        bottom: 1rem;
        display: none;
        grid-template-columns: repeat(3, minmax(3.4rem, 1fr));
        gap: 0.45rem;
      }
      .touch-pad button {
        min-height: 2.75rem;
        border: 1px solid color-mix(in srgb, #9ec9d8 30%, transparent);
        background: color-mix(in srgb, #06131c 80%, transparent);
        color: inherit;
        border-radius: 0.35rem;
        font-size: 0.8rem;
      }
      @media (pointer: coarse), (max-width: 900px) {
        .touch-pad {
          display: grid;
        }
      }
      :host ::ng-deep .hud-bar {
        height: 0.45rem;
      }
      :host ::ng-deep .hud-bar--reload .p-progressbar-value {
        background: #d4a15a;
      }
    `,
  ],
})
export class HudComponent {
  private readonly engine = inject(GameEngineService);
  readonly input = inject(InputService);
  readonly snap = this.engine.snapshot;

  readonly visible = computed(() => this.snap().phase === 'playing');
  readonly highContrast = computed(() => this.snap().settings.accessibility.highContrast);
  readonly hullPct = computed(() => Math.round(this.snap().player.hullIntegrity * 100));
  readonly sailPct = computed(() => Math.round(this.snap().player.sailIntegrity * 100));
  readonly reloadPct = computed(() => Math.round((1 - this.snap().reloadRemaining / 2.4) * 100));
  readonly speed = computed(() => this.snap().player.speed.toFixed(1));
  readonly weather = computed(() => this.snap().weather.id);
  readonly dialogue = computed(() => this.snap().dialogueLine);
  readonly anchorLabel = computed(() => (this.snap().controls.anchorDeployed ? 'Raise' : 'Anchor'));
  readonly windLabel = computed(() => {
    const deg = Math.round((this.snap().wind.directionRad * 180) / Math.PI);
    const str = Math.round(this.snap().wind.strength * 100);
    return `${deg}° / ${str}%`;
  });
  readonly hitLabel = computed(() => {
    const hit = this.snap().lastHitMarker;
    if (!hit || hit.age > 1.4) return '';
    return `-${Math.round(hit.damage * 100)}%`;
  });

  pause(): void {
    this.engine.setPhase('paused');
  }

  steer(dir: number): void {
    this.input.nudge({ rudder: dir });
  }

  trim(delta: number): void {
    const sailTrim = Math.max(0, Math.min(1, this.snap().controls.sailTrim + delta));
    this.input.nudge({ sailTrim });
  }
}
