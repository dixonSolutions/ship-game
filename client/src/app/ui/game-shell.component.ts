import { Component, OnInit, inject } from '@angular/core';
import { SceneHost } from '../game/scene-host';
import { InputService } from '../game/input.service';
import { HudComponent } from './hud.component';
import { OverlaysComponent } from './overlays.component';
import { ControlsOverlayComponent } from './controls-overlay.component';

@Component({
  selector: 'app-game-shell',
  standalone: true,
  imports: [SceneHost, HudComponent, OverlaysComponent, ControlsOverlayComponent],
  template: `
    <main class="shell">
      <app-scene-host />
      <app-hud />
      <app-controls-overlay />
      <app-overlays />
    </main>
  `,
  styles: [
    `
      :host,
      .shell {
        display: block;
        position: relative;
        width: 100%;
        height: 100%;
        overflow: hidden;
        background: #061018;
      }
    `,
  ],
})
export class GameShellComponent implements OnInit {
  private readonly input = inject(InputService);

  ngOnInit(): void {
    this.input.start();
  }
}
