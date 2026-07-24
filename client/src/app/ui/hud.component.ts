import { Component, computed, inject } from '@angular/core';
import { Button } from '@openng/optimus-ui/button';
import { ProgressBar } from '@openng/optimus-ui/progressbar';
import { GameEngineService } from '../game/game-engine.service';

/** Edge HUD — keeps the ocean view clear (Law of Prägnanz / white space). */
@Component({
  selector: 'app-hud',
  standalone: true,
  imports: [Button, ProgressBar],
  template: `
    @if (visible()) {
      <div class="hud" role="region" aria-label="Ship status">
        <div class="hud__cluster hud__cluster--left">
          <div class="metric">
            <span>Hull</span>
            <p-progressbar [value]="hullPct()" [showValue]="false" styleClass="hud-bar" />
          </div>
          <div class="metric">
            <span>Sails</span>
            <p-progressbar [value]="sailPct()" [showValue]="false" styleClass="hud-bar" />
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
          <p-button
            label="Pause"
            severity="secondary"
            [outlined]="true"
            size="small"
            (onClick)="pause()"
          />
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
        min-width: 7rem;
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
      :host ::ng-deep .hud-bar {
        height: 0.45rem;
      }
    `,
  ],
})
export class HudComponent {
  private readonly engine = inject(GameEngineService);
  readonly snap = this.engine.snapshot;

  readonly visible = computed(() => this.snap().phase === 'playing');
  readonly hullPct = computed(() => Math.round(this.snap().player.hullIntegrity * 100));
  readonly sailPct = computed(() => Math.round(this.snap().player.sailIntegrity * 100));
  readonly speed = computed(() => this.snap().player.speed.toFixed(1));
  readonly weather = computed(() => this.snap().weather.id);
  readonly windLabel = computed(() => {
    const deg = Math.round((this.snap().wind.directionRad * 180) / Math.PI);
    const str = Math.round(this.snap().wind.strength * 100);
    return `${deg}° / ${str}%`;
  });

  pause(): void {
    this.engine.setPhase('paused');
  }
}
