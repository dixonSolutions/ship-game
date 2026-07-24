import { Injectable, inject, OnDestroy } from '@angular/core';
import { GameEngineService } from './game-engine.service';

/** Keyboard / pointer / gamepad-friendly control mapper. */
@Injectable({ providedIn: 'root' })
export class InputService implements OnDestroy {
  private readonly engine = inject(GameEngineService);
  private readonly pressed = new Set<string>();
  private raf = 0;
  private boundKeyDown = (e: KeyboardEvent) => this.onKey(e, true);
  private boundKeyUp = (e: KeyboardEvent) => this.onKey(e, false);

  start(): void {
    window.addEventListener('keydown', this.boundKeyDown);
    window.addEventListener('keyup', this.boundKeyUp);
    const pump = () => {
      this.applyContinuous();
      this.pollGamepad();
      this.raf = requestAnimationFrame(pump);
    };
    this.raf = requestAnimationFrame(pump);
  }

  ngOnDestroy(): void {
    window.removeEventListener('keydown', this.boundKeyDown);
    window.removeEventListener('keyup', this.boundKeyUp);
    cancelAnimationFrame(this.raf);
  }

  private onKey(e: KeyboardEvent, down: boolean): void {
    const key = e.key.toLowerCase();
    if (down) this.pressed.add(key);
    else this.pressed.delete(key);

    if (!down) return;
    if (key === ' ') {
      e.preventDefault();
      this.engine.patchControls({ fireCannon: true });
    }
    if (key === 'a') {
      this.engine.patchControls({
        anchorDeployed: !this.engine.snapshot().controls.anchorDeployed,
      });
    }
    if (key === 'escape') {
      const phase = this.engine.snapshot().phase;
      if (phase === 'playing') this.engine.setPhase('paused');
      else if (phase === 'paused') this.engine.setPhase('playing');
    }
  }

  private applyContinuous(): void {
    let rudder = 0;
    let sailDelta = 0;
    let throttle = 0;

    if (this.pressed.has('arrowleft') || this.pressed.has('q')) rudder -= 1;
    if (this.pressed.has('arrowright') || this.pressed.has('e')) rudder += 1;
    if (this.pressed.has('arrowup') || this.pressed.has('w')) sailDelta += 0.02;
    if (this.pressed.has('arrowdown') || this.pressed.has('s')) sailDelta -= 0.02;
    if (this.pressed.has('shift')) throttle = 1;

    const controls = this.engine.snapshot().controls;
    this.engine.patchControls({
      rudder,
      throttle,
      sailTrim: Math.max(0, Math.min(1, controls.sailTrim + sailDelta)),
    });
  }

  private pollGamepad(): void {
    const pads = navigator.getGamepads?.() ?? [];
    const pad = pads[0];
    if (!pad) return;
    this.engine.patchControls({
      rudder: pad.axes[0] ?? 0,
      sailTrim: Math.max(0, Math.min(1, 0.5 + (pad.axes[1] ?? 0) * -0.5)),
      throttle: pad.buttons[7]?.value ?? 0,
      fireCannon: pad.buttons[0]?.pressed ?? false,
    });
  }
}
