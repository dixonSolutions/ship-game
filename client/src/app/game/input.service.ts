import { Injectable, OnDestroy, inject } from '@angular/core';
import { GameEngineService } from './game-engine.service';

/** Keyboard / pointer / touch / gamepad control mapper. */
@Injectable({ providedIn: 'root' })
export class InputService implements OnDestroy {
  private readonly engine = inject(GameEngineService);
  private readonly pressed = new Set<string>();
  private raf = 0;
  private pointerDown = false;
  private canvas?: HTMLElement;
  private prevPadFire = false;
  private prevPadAnchor = false;

  private boundKeyDown = (e: KeyboardEvent) => this.onKey(e, true);
  private boundKeyUp = (e: KeyboardEvent) => this.onKey(e, false);
  private boundPointerDown = (e: PointerEvent) => this.onPointerDown(e);
  private boundPointerMove = (e: PointerEvent) => this.onPointerMove(e);
  private boundPointerUp = () => {
    this.pointerDown = false;
  };

  start(): void {
    window.addEventListener('keydown', this.boundKeyDown);
    window.addEventListener('keyup', this.boundKeyUp);

    this.canvas = document.querySelector('app-scene-host canvas') ?? undefined;
    const target = this.canvas ?? window;
    target.addEventListener('pointerdown', this.boundPointerDown as EventListener);
    window.addEventListener('pointermove', this.boundPointerMove);
    window.addEventListener('pointerup', this.boundPointerUp);

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
    window.removeEventListener('pointermove', this.boundPointerMove);
    window.removeEventListener('pointerup', this.boundPointerUp);
    this.canvas?.removeEventListener('pointerdown', this.boundPointerDown as EventListener);
    cancelAnimationFrame(this.raf);
  }

  /** Touch HUD helpers */
  nudge(partial: Parameters<GameEngineService['patchControls']>[0]): void {
    this.engine.patchControls(partial);
  }

  fire(): void {
    this.engine.patchControls({ fireCannon: true });
  }

  toggleAnchor(): void {
    this.engine.patchControls({
      anchorDeployed: !this.engine.snapshot().controls.anchorDeployed,
    });
  }

  private onKey(e: KeyboardEvent, down: boolean): void {
    const key = e.key.toLowerCase();
    if (down) this.pressed.add(key);
    else this.pressed.delete(key);

    if (!down) return;
    if (key === ' ' || key === 'f') {
      e.preventDefault();
      this.fire();
    }
    if (key === 'a' || key === 'x') {
      this.toggleAnchor();
    }
    if (key === 'escape') {
      const phase = this.engine.snapshot().phase;
      if (phase === 'playing') this.engine.setPhase('paused');
      else if (phase === 'paused') this.engine.setPhase('playing');
    }
  }

  private onPointerDown(e: PointerEvent): void {
    if (this.engine.snapshot().phase !== 'playing') return;
    // Ignore UI clicks
    const el = e.target as HTMLElement | null;
    if (el?.closest?.('app-hud, app-overlays, button, .touch-pad')) return;
    this.pointerDown = true;
    this.updateAimFromPointer(e);
    if (e.button === 2 || e.pointerType === 'touch') {
      // right-click / tap-hold aim only; fire on space / fire button
    }
  }

  private onPointerMove(e: PointerEvent): void {
    if (!this.pointerDown && e.pointerType !== 'mouse') return;
    if (this.engine.snapshot().phase !== 'playing') return;
    this.updateAimFromPointer(e);
  }

  private updateAimFromPointer(e: PointerEvent): void {
    const nx = e.clientX / Math.max(1, window.innerWidth) * 2 - 1;
    const ny = -(e.clientY / Math.max(1, window.innerHeight) * 2 - 1);
    this.engine.patchControls({
      cannonAimYaw: nx * 1.1,
      cannonAimPitch: Math.max(-0.1, Math.min(0.55, ny * 0.45 + 0.15)),
    });
  }

  private applyContinuous(): void {
    if (this.engine.snapshot().phase !== 'playing') return;

    let rudder = 0;
    let sailDelta = 0;
    let throttle = 0;

    if (this.pressed.has('arrowleft') || this.pressed.has('q')) rudder -= 1;
    if (this.pressed.has('arrowright') || this.pressed.has('e')) rudder += 1;
    if (this.pressed.has('arrowup') || this.pressed.has('w')) sailDelta += 0.025;
    if (this.pressed.has('arrowdown') || this.pressed.has('s')) sailDelta -= 0.025;
    if (this.pressed.has('shift') || this.pressed.has('z')) throttle = 1;

    const controls = this.engine.snapshot().controls;
    this.engine.patchControls({
      rudder,
      throttle,
      sailTrim: Math.max(0, Math.min(1, controls.sailTrim + sailDelta)),
    });
  }

  private pollGamepad(): void {
    if (this.engine.snapshot().phase !== 'playing') return;
    const pads = navigator.getGamepads?.() ?? [];
    const pad = pads[0];
    if (!pad) return;

    const firePressed = !!(pad.buttons[0]?.pressed || pad.buttons[5]?.pressed);
    const anchorPressed = !!pad.buttons[2]?.pressed;
    if (firePressed && !this.prevPadFire) this.fire();
    if (anchorPressed && !this.prevPadAnchor) this.toggleAnchor();
    this.prevPadFire = firePressed;
    this.prevPadAnchor = anchorPressed;

    this.engine.patchControls({
      rudder: pad.axes[0] ?? 0,
      sailTrim: Math.max(0, Math.min(1, 0.5 + (pad.axes[1] ?? 0) * -0.5)),
      throttle: pad.buttons[7]?.value ?? 0,
      cannonAimYaw: pad.axes[2] ?? this.engine.snapshot().controls.cannonAimYaw,
      cannonAimPitch: Math.max(-0.1, Math.min(0.55, 0.15 - (pad.axes[3] ?? 0) * 0.4)),
    });
  }
}
