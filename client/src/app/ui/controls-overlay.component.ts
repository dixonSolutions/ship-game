import { Component, computed, inject } from '@angular/core';
import { GameEngineService } from '../game/game-engine.service';
import { InputService } from '../game/input.service';

/**
 * Optional on-screen control pad + always-readable control legend.
 * Uses plain semantic buttons (no extra npm dep) styled to match Optimus HUD.
 */
@Component({
  selector: 'app-controls-overlay',
  standalone: true,
  template: `
    @if (playing()) {
      @if (showLegend()) {
        <aside class="legend" aria-label="Control breakdown">
          <h3>Controls</h3>
          <ul>
            <li><kbd>Q</kbd>/<kbd>E</kbd> or ◀ ▶ — Steer</li>
            <li><kbd>W</kbd>/<kbd>S</kbd> — Sail trim</li>
            <li><kbd>Shift</kbd> — Throttle</li>
            <li><kbd>Space</kbd> — Fire cannons</li>
            <li><kbd>A</kbd> — Anchor</li>
            <li>Mouse — Aim</li>
            <li><kbd>D</kbd> — Debug physics</li>
            <li><kbd>Esc</kbd> — Pause / settings</li>
          </ul>
        </aside>
      }

      @if (showPad()) {
        <div class="pad" aria-label="On-screen controls">
          <button type="button" (pointerdown)="steer(-1)" title="Steer port">◀</button>
          <button type="button" (pointerdown)="steer(1)" title="Steer starboard">▶</button>
          <button type="button" (pointerdown)="trim(0.08)" title="More sail">Sail+</button>
          <button type="button" (pointerdown)="trim(-0.08)" title="Less sail">Sail−</button>
          <button type="button" class="pad__fire" (click)="input.fire()" title="Fire">Fire</button>
          <button type="button" (click)="input.toggleAnchor()" title="Anchor">
            {{ anchorLabel() }}
          </button>
        </div>
      }
    }
  `,
  styles: [
    `
      .legend {
        pointer-events: none;
        position: absolute;
        left: 1rem;
        bottom: 1rem;
        z-index: 3;
        max-width: min(18rem, 42vw);
        padding: 0.75rem 0.9rem;
        border-radius: 0.5rem;
        background: rgba(6, 16, 24, 0.72);
        border: 1px solid rgba(200, 220, 230, 0.28);
        color: #e8f1f5;
        font-family: 'Segoe UI', system-ui, sans-serif;
        font-size: 0.78rem;
        line-height: 1.45;
      }
      .legend h3 {
        margin: 0 0 0.4rem;
        font-size: 0.85rem;
        font-weight: 600;
        letter-spacing: 0.04em;
        text-transform: uppercase;
        opacity: 0.85;
      }
      .legend ul {
        margin: 0;
        padding: 0;
        list-style: none;
      }
      .legend li {
        margin: 0.15rem 0;
      }
      kbd {
        display: inline-block;
        min-width: 1.1rem;
        padding: 0.05rem 0.3rem;
        border-radius: 0.25rem;
        background: rgba(255, 255, 255, 0.1);
        border: 1px solid rgba(255, 255, 255, 0.22);
        font-size: 0.72rem;
        text-align: center;
      }
      .pad {
        pointer-events: auto;
        position: absolute;
        right: 1rem;
        bottom: 1rem;
        z-index: 3;
        display: grid;
        grid-template-columns: repeat(2, 4.4rem);
        gap: 0.45rem;
      }
      .pad button {
        min-height: 2.75rem;
        border: 1px solid rgba(220, 235, 245, 0.35);
        border-radius: 0.45rem;
        background: rgba(8, 22, 32, 0.78);
        color: #f2f7fa;
        font-weight: 600;
        font-size: 0.85rem;
        cursor: pointer;
      }
      .pad button:active {
        background: rgba(40, 90, 110, 0.9);
      }
      .pad__fire {
        grid-column: span 2;
        background: rgba(120, 48, 28, 0.85);
      }
    `,
  ],
})
export class ControlsOverlayComponent {
  private readonly engine = inject(GameEngineService);
  readonly input = inject(InputService);

  readonly playing = computed(() => this.engine.snapshot().phase === 'playing');
  readonly showPad = computed(() => this.engine.snapshot().settings.showOnScreenControls);
  readonly showLegend = computed(() => this.engine.snapshot().settings.showControlLegend);
  readonly anchorLabel = computed(() =>
    this.engine.snapshot().controls.anchorDeployed ? 'Raise' : 'Anchor',
  );

  steer(dir: number): void {
    this.input.nudge({ rudder: dir });
  }

  trim(delta: number): void {
    const sailTrim = Math.max(
      0,
      Math.min(1, this.engine.snapshot().controls.sailTrim + delta),
    );
    this.input.nudge({ sailTrim });
  }
}
