import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
  effect,
  inject,
} from '@angular/core';
import * as THREE from 'three';
import { GameEngineService } from './game-engine.service';
import type { AiShipState, CrewMember, GameSnapshot, ShotVisual } from '../systems/types';

interface ShipVisual {
  root: THREE.Group;
  sail: THREE.Mesh;
  rudder: THREE.Mesh;
  wake: THREE.Points;
  crew: THREE.Group[];
  damageLight: THREE.PointLight;
}

/** Full-bleed Three.js ocean scene with procedural ships, weather, and FX. */
@Component({
  selector: 'app-scene-host',
  standalone: true,
  template: `<canvas #canvas class="scene-canvas" aria-label="Sailing scene"></canvas>`,
  styles: [
    `
      :host {
        display: block;
        position: absolute;
        inset: 0;
        z-index: 0;
      }
      .scene-canvas {
        width: 100%;
        height: 100%;
        display: block;
        touch-action: none;
      }
    `,
  ],
})
export class SceneHost implements AfterViewInit, OnDestroy {
  @ViewChild('canvas', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;

  private readonly engine = inject(GameEngineService);
  private renderer?: THREE.WebGLRenderer;
  private scene?: THREE.Scene;
  private camera?: THREE.PerspectiveCamera;
  private sun?: THREE.DirectionalLight;
  private hemi?: THREE.HemisphereLight;
  private ocean?: THREE.Mesh;
  private oceanMaterial?: THREE.ShaderMaterial;
  private sky?: THREE.Mesh;
  private playerVisual?: ShipVisual;
  private aiVisuals = new Map<string, ShipVisual>();
  private rain?: THREE.Points;
  private spray?: THREE.Points;
  private lightningBolt?: THREE.Mesh;
  private shotMeshes = new Map<string, THREE.Object3D>();
  private aimLine?: THREE.Line;
  private resizeObserver?: ResizeObserver;
  private raf = 0;
  private clock = new THREE.Clock();

  constructor() {
    effect(() => {
      const snap = this.engine.snapshot();
      this.syncFromSnapshot(snap);
    });
  }

  ngAfterViewInit(): void {
    this.initThree();
    this.engine.start();
  }

  ngOnDestroy(): void {
    cancelAnimationFrame(this.raf);
    this.resizeObserver?.disconnect();
    this.engine.stop();
    this.renderer?.dispose();
  }

  private initThree(): void {
    const canvas = this.canvasRef.nativeElement;
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x6f8ea3, 0.01);

    const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 800);
    camera.position.set(0, 14, 24);

    const sun = new THREE.DirectionalLight(0xfff1d6, 1.55);
    sun.position.set(40, 55, 18);
    scene.add(sun);
    const hemi = new THREE.HemisphereLight(0xb8d4ef, 0x1a3040, 0.55);
    scene.add(hemi);

    const sky = new THREE.Mesh(
      new THREE.SphereGeometry(600, 32, 16),
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        uniforms: {
          uTop: { value: new THREE.Color(0x87b7e0) },
          uHorizon: { value: new THREE.Color(0xd7e6f2) },
          uBottom: { value: new THREE.Color(0x1d3a4d) },
          uFlash: { value: 0 },
        },
        vertexShader: `
          varying vec3 vPos;
          void main() {
            vPos = position;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          uniform vec3 uTop;
          uniform vec3 uHorizon;
          uniform vec3 uBottom;
          uniform float uFlash;
          varying vec3 vPos;
          void main() {
            float h = normalize(vPos).y * 0.5 + 0.5;
            vec3 col = mix(uBottom, uHorizon, smoothstep(0.0, 0.45, h));
            col = mix(col, uTop, smoothstep(0.4, 1.0, h));
            col += vec3(uFlash);
            gl_FragColor = vec4(col, 1.0);
          }
        `,
      }),
    );
    scene.add(sky);

    const oceanMat = new THREE.ShaderMaterial({
      transparent: false,
      uniforms: {
        uTime: { value: 0 },
        uWaveHeight: { value: 0.85 },
        uChop: { value: 0.42 },
        uSwell: { value: 0.55 },
        uWindDir: { value: new THREE.Vector2(0.7, 0.7) },
        uWindStrength: { value: 0.55 },
        uWaveLength: { value: 22 },
        uColorDeep: { value: new THREE.Color(0x0a2f48) },
        uColorShallow: { value: new THREE.Color(0x2a7194) },
        uSunDir: { value: new THREE.Vector3(0.4, 0.8, 0.2).normalize() },
        uFoam: { value: 0.28 },
      },
      vertexShader: `
        uniform float uTime;
        uniform float uWaveHeight;
        uniform float uChop;
        uniform float uSwell;
        uniform vec2 uWindDir;
        uniform float uWindStrength;
        uniform float uWaveLength;
        varying vec3 vWorld;
        varying float vWave;
        varying float vCrest;

        float hash(vec2 p) {
          return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
        }

        float waveHeight(vec2 p) {
          vec2 dir = normalize(uWindDir);
          vec2 crossDir = vec2(-dir.y, dir.x);
          float along = dot(p, dir);
          float across = dot(p, crossDir);
          float t = uTime;
          float w = clamp(uWindStrength, 0.05, 1.0);
          float H = uWaveHeight;
          float k1 = 6.28318 / max(8.0, uWaveLength);

          float swell =
            sin(along * k1 + t * (0.55 + w * 0.45)) * 0.48 * uSwell +
            sin(along * k1 * 0.55 + across * k1 * 0.2 + t * 0.38) * 0.26 * uSwell +
            sin(along * k1 * 0.28 + t * 0.22) * 0.14 * uSwell;

          float k2 = k1 * 2.25;
          float mid =
            sin(along * k2 * 0.9 + across * k2 * 0.38 + t * 1.4) * 0.26 * uChop +
            cos(across * k2 + along * k2 * 0.22 + t * 1.15) * 0.2 * uChop +
            sin(along * k2 * 1.35 - across * k2 * 0.65 + t * 1.8) * 0.12 * uChop;

          float k3 = k1 * 4.8;
          float phase = hash(floor(p * 0.1)) * 6.28318;
          float micro =
            sin(along * k3 + across * k3 * 1.35 + t * 2.6 + phase) * 0.12 * uChop * w +
            sin(across * k3 * 1.8 - along * k3 * 0.45 + t * 3.1) * 0.09 * uChop +
            cos(along * k3 * 0.7 + across * k3 * 2.0 + t * 3.6 + phase * 0.5) * 0.06 * uChop;

          float crestWave = pow(max(0.0, sin(along * k1 * 1.15 + t * 0.95)), 2.8) * 0.16 * uChop * w;
          return (swell + mid + micro + crestWave) * H;
        }

        void main() {
          vec3 pos = position;
          float h = waveHeight(pos.xz);
          pos.y = h;
          vWave = h;
          // Crest factor for foam (steep rising faces)
          float hx = waveHeight(pos.xz + vec2(0.45, 0.0)) - h;
          float hz = waveHeight(pos.xz + vec2(0.0, 0.45)) - h;
          vCrest = clamp(length(vec2(hx, hz)) * 1.8 + h * 0.35, 0.0, 1.5);
          vec4 world = modelMatrix * vec4(pos, 1.0);
          vWorld = world.xyz;
          gl_Position = projectionMatrix * viewMatrix * world;
        }
      `,
      fragmentShader: `
        uniform vec3 uColorDeep;
        uniform vec3 uColorShallow;
        uniform vec3 uSunDir;
        uniform float uFoam;
        uniform float uWindStrength;
        uniform float uChop;
        varying vec3 vWorld;
        varying float vWave;
        varying float vCrest;
        void main() {
          vec3 dx = dFdx(vWorld);
          vec3 dy = dFdy(vWorld);
          vec3 n = normalize(cross(dx, dy));
          float fresnel = pow(1.0 - max(dot(n, vec3(0.0, 1.0, 0.0)), 0.0), 2.4);
          float ndl = max(dot(n, uSunDir), 0.0);
          float depthMix = clamp(vWave * 0.28 + 0.4 + uWindStrength * 0.08, 0.0, 1.0);
          vec3 col = mix(uColorDeep, uColorShallow, depthMix);
          // Darker troughs, brighter windward faces
          col *= 0.82 + ndl * 0.28;
          col += vec3(0.45, 0.65, 0.78) * fresnel * (0.4 + uChop * 0.2);
          col += vec3(1.0, 0.96, 0.85) * pow(ndl, 42.0) * 0.45;
          // Whitecaps on steep crests / wind streaks
          float foamMask = smoothstep(0.5, 1.15, vCrest) * uFoam * (0.45 + uWindStrength * 0.55);
          foamMask += smoothstep(0.75, 1.8, vWave) * uFoam * 0.28;
          foamMask += pow(max(0.0, 1.0 - n.y), 2.6) * uChop * 0.12;
          col = mix(col, vec3(0.88, 0.94, 0.97), clamp(foamMask, 0.0, 0.7));
          gl_FragColor = vec4(col, 1.0);
        }
      `,
    });

    const segments = 192;
    const oceanGeo = new THREE.PlaneGeometry(520, 520, segments, segments);
    oceanGeo.rotateX(-Math.PI / 2);
    const ocean = new THREE.Mesh(oceanGeo, oceanMat);
    scene.add(ocean);

    const playerVisual = this.createShipVisual(0xc4a574, true);
    scene.add(playerVisual.root);

    const rainGeo = new THREE.BufferGeometry();
    const rainCount = 1200;
    const rainPos = new Float32Array(rainCount * 3);
    for (let i = 0; i < rainCount; i++) {
      rainPos[i * 3] = (Math.random() - 0.5) * 60;
      rainPos[i * 3 + 1] = Math.random() * 30;
      rainPos[i * 3 + 2] = (Math.random() - 0.5) * 60;
    }
    rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPos, 3));
    const rain = new THREE.Points(
      rainGeo,
      new THREE.PointsMaterial({ color: 0xb7c9d6, size: 0.08, transparent: true, opacity: 0 }),
    );
    scene.add(rain);

    const sprayGeo = new THREE.BufferGeometry();
    const sprayCount = 420;
    const sprayPos = new Float32Array(sprayCount * 3);
    const sprayVel = new Float32Array(sprayCount * 3);
    for (let i = 0; i < sprayCount; i++) {
      sprayPos[i * 3] = 0;
      sprayPos[i * 3 + 1] = -10;
      sprayPos[i * 3 + 2] = 0;
      sprayVel[i * 3] = 0;
      sprayVel[i * 3 + 1] = 0;
      sprayVel[i * 3 + 2] = 0;
    }
    sprayGeo.setAttribute('position', new THREE.BufferAttribute(sprayPos, 3));
    sprayGeo.setAttribute('velocity', new THREE.BufferAttribute(sprayVel, 3));
    const spray = new THREE.Points(
      sprayGeo,
      new THREE.PointsMaterial({
        color: 0xe8f3fa,
        size: 0.22,
        transparent: true,
        opacity: 0.65,
        depthWrite: false,
      }),
    );
    scene.add(spray);

    const bolt = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.02, 40, 5),
      new THREE.MeshBasicMaterial({ color: 0xeaf4ff, transparent: true, opacity: 0 }),
    );
    bolt.visible = false;
    scene.add(bolt);

    const aimGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(),
      new THREE.Vector3(0, 0, -20),
    ]);
    const aimLine = new THREE.Line(
      aimGeo,
      new THREE.LineBasicMaterial({ color: 0xffc978, transparent: true, opacity: 0.55 }),
    );
    scene.add(aimLine);

    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;
    this.sun = sun;
    this.hemi = hemi;
    this.ocean = ocean;
    this.oceanMaterial = oceanMat;
    this.sky = sky;
    this.playerVisual = playerVisual;
    this.rain = rain;
    this.spray = spray;
    this.lightningBolt = bolt;
    this.aimLine = aimLine;

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(canvas.parentElement ?? canvas);
    this.resize();

    const renderLoop = () => {
      this.raf = requestAnimationFrame(renderLoop);
      const dt = this.clock.getDelta();
      this.animateFrame(dt);
      renderer.render(scene, camera);
    };
    renderLoop();
  }

  private createShipVisual(hullColor: number, withCrew: boolean): ShipVisual {
    const root = new THREE.Group();

    const hull = new THREE.Mesh(
      new THREE.BoxGeometry(2.4, 0.9, 6.2),
      new THREE.MeshStandardMaterial({ color: hullColor, roughness: 0.72, metalness: 0.05 }),
    );
    hull.position.y = 0.45;
    hull.scale.set(1, 1, 1);
    // Taper bow slightly via a second wedge
    const bow = new THREE.Mesh(
      new THREE.ConeGeometry(1.1, 2.2, 4),
      new THREE.MeshStandardMaterial({ color: hullColor, roughness: 0.72 }),
    );
    bow.rotation.x = Math.PI / 2;
    bow.position.set(0, 0.45, 3.4);

    const deck = new THREE.Mesh(
      new THREE.BoxGeometry(2.1, 0.12, 5.2),
      new THREE.MeshStandardMaterial({ color: 0x8b6a45, roughness: 0.85 }),
    );
    deck.position.y = 0.95;

    const mast = new THREE.Mesh(
      new THREE.CylinderGeometry(0.09, 0.12, 5.2, 8),
      new THREE.MeshStandardMaterial({ color: 0x5c4030, roughness: 0.8 }),
    );
    mast.position.y = 3.1;

    const sail = new THREE.Mesh(
      new THREE.PlaneGeometry(2.8, 3.6, 8, 8),
      new THREE.MeshStandardMaterial({
        color: 0xf3efe4,
        side: THREE.DoubleSide,
        roughness: 0.92,
        metalness: 0,
      }),
    );
    sail.position.set(0.85, 2.7, 0.1);

    const rudder = new THREE.Mesh(
      new THREE.BoxGeometry(0.12, 0.7, 0.55),
      new THREE.MeshStandardMaterial({ color: 0x4a3424, roughness: 0.75 }),
    );
    rudder.position.set(0, 0.15, -3.2);

    const cannonL = new THREE.Mesh(
      new THREE.CylinderGeometry(0.1, 0.12, 1.1, 8),
      new THREE.MeshStandardMaterial({ color: 0x2c2c2c, metalness: 0.6, roughness: 0.35 }),
    );
    cannonL.rotation.z = Math.PI / 2;
    cannonL.position.set(-1.2, 0.9, 0.3);
    const cannonR = cannonL.clone();
    cannonR.position.x = 1.2;

    root.add(hull, bow, deck, mast, sail, rudder, cannonL, cannonR);

    const wakeGeo = new THREE.BufferGeometry();
    const wakeCount = 40;
    wakeGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(wakeCount * 3), 3));
    const wake = new THREE.Points(
      wakeGeo,
      new THREE.PointsMaterial({ color: 0xd9e8f0, size: 0.22, transparent: true, opacity: 0.5 }),
    );
    root.add(wake);

    const damageLight = new THREE.PointLight(0xff6a3d, 0, 8);
    damageLight.position.set(0, 1.2, 0);
    root.add(damageLight);

    const crew: THREE.Group[] = [];
    if (withCrew) {
      // Placeholders — positions updated from snapshot crew offsets.
      for (let i = 0; i < 5; i++) {
        const figure = this.createCrewFigure();
        root.add(figure);
        crew.push(figure);
      }
    }

    return { root, sail, rudder, wake, crew, damageLight };
  }

  private createCrewFigure(): THREE.Group {
    const g = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.12, 0.35, 4, 8),
      new THREE.MeshStandardMaterial({ color: 0x3d5a6c, roughness: 0.7 }),
    );
    body.position.y = 0.35;
    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.12, 8, 8),
      new THREE.MeshStandardMaterial({ color: 0xd2b48c, roughness: 0.65 }),
    );
    head.position.y = 0.72;
    g.add(body, head);
    return g;
  }

  private animateFrame(dt: number): void {
    const snap = this.engine.snapshot();
    if (!this.oceanMaterial) return;

    const reduce = snap.settings.accessibility.reduceMotion;
    this.oceanMaterial.uniforms['uTime']!.value = reduce ? snap.ocean.time * 0.25 : snap.ocean.time;
    this.oceanMaterial.uniforms['uWaveHeight']!.value = snap.ocean.waveHeight;
    this.oceanMaterial.uniforms['uChop']!.value = snap.ocean.chop;
    this.oceanMaterial.uniforms['uSwell']!.value = snap.ocean.swell;
    this.oceanMaterial.uniforms['uWindStrength']!.value = snap.ocean.windStrength;
    this.oceanMaterial.uniforms['uWaveLength']!.value = snap.ocean.waveLength;
    const windDir = this.oceanMaterial.uniforms['uWindDir']!.value as THREE.Vector2;
    windDir.set(Math.sin(snap.ocean.windDirectionRad), Math.cos(snap.ocean.windDirectionRad));
    this.oceanMaterial.uniforms['uFoam']!.value =
      0.22 + snap.ocean.chop * 0.4 + snap.ocean.windStrength * 0.25;

    this.animateRain(snap, dt);
    this.animateSpray(snap, dt);
    this.animateWake(this.playerVisual, snap.player.speed);
    for (const ai of snap.aiShips) {
      this.animateWake(this.aiVisuals.get(ai.id), ai.ship.speed);
    }
    this.syncShots(snap.shotVisuals);
  }

  private animateRain(snap: GameSnapshot, dt: number): void {
    if (!this.rain) return;
    const mat = this.rain.material as THREE.PointsMaterial;
    const intensity = snap.weather.precipitation;
    mat.opacity = intensity * 0.75;
    this.rain.visible = intensity > 0.05;
    if (!this.rain.visible) return;

    const pos = this.rain.geometry.attributes['position'] as THREE.BufferAttribute;
    const speed = 18 + intensity * 22;
    for (let i = 0; i < pos.count; i++) {
      let y = pos.getY(i) - speed * dt;
      if (y < 0) y = 18 + Math.random() * 12;
      pos.setY(i, y);
      pos.setX(i, pos.getX(i) + snap.player.position.x * 0); // keep local
    }
    // Keep rain centered on player
    this.rain.position.set(snap.player.position.x, 0, snap.player.position.z);
    pos.needsUpdate = true;
  }

  private animateSpray(snap: GameSnapshot, dt: number): void {
    if (!this.spray || !this.playerVisual) return;
    const pos = this.spray.geometry.attributes['position'] as THREE.BufferAttribute;
    const vel = this.spray.geometry.attributes['velocity'] as THREE.BufferAttribute;
    const base = snap.player.position;
    const heading = snap.player.heading;
    const fwdX = Math.sin(heading);
    const fwdZ = Math.cos(heading);
    const rightX = Math.cos(heading);
    const rightZ = -Math.sin(heading);
    const windX = Math.sin(snap.ocean.windDirectionRad);
    const windZ = Math.cos(snap.ocean.windDirectionRad);
    const energy =
      snap.player.speed * 0.12 +
      snap.ocean.chop * 0.55 +
      snap.ocean.windStrength * 0.35 +
      Math.abs(snap.player.heel) * 0.8;

    for (let i = 0; i < pos.count; i++) {
      let x = pos.getX(i);
      let y = pos.getY(i);
      let z = pos.getZ(i);
      let vx = vel.getX(i);
      let vy = vel.getY(i);
      let vz = vel.getZ(i);

      // Respawn droplets near bow / beam when dead or below water
      if (y < base.y - 0.2 || Math.hypot(x - base.x, z - base.z) > 14) {
        const side = Math.random() > 0.5 ? 1 : -1;
        const along = -1.2 - Math.random() * 3.5;
        const beam = side * (0.6 + Math.random() * (1.1 + energy));
        x = base.x + fwdX * along + rightX * beam;
        y = base.y + 0.15 + Math.random() * 0.35;
        z = base.z + fwdZ * along + rightZ * beam;
        const kick = 1.2 + energy * 2.2 + Math.random() * 1.5;
        vx = -fwdX * (0.8 + Math.random()) * kick * 0.35 + windX * snap.ocean.windStrength * 1.8 + rightX * side * kick;
        vy = 1.5 + Math.random() * (2.2 + energy * 2.5);
        vz = -fwdZ * (0.8 + Math.random()) * kick * 0.35 + windZ * snap.ocean.windStrength * 1.8 + rightZ * side * kick;
      }

      vx += windX * snap.ocean.windStrength * dt * 2.5;
      vz += windZ * snap.ocean.windStrength * dt * 2.5;
      vy -= 9.5 * dt;
      x += vx * dt;
      y += vy * dt;
      z += vz * dt;

      pos.setXYZ(i, x, y, z);
      vel.setXYZ(i, vx, vy, vz);
    }
    pos.needsUpdate = true;
    vel.needsUpdate = true;
    (this.spray.material as THREE.PointsMaterial).opacity = Math.min(0.85, 0.12 + energy * 0.35);
    (this.spray.material as THREE.PointsMaterial).size = 0.14 + Math.min(0.2, energy * 0.08);
  }

  private animateWake(visual: ShipVisual | undefined, speed: number): void {
    if (!visual) return;
    const pos = visual.wake.geometry.attributes['position'] as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      const t = i / pos.count;
      pos.setXYZ(i, (Math.random() - 0.5) * 0.8 * t, 0.05 + Math.random() * 0.1, -1.5 - t * 6);
    }
    pos.needsUpdate = true;
    (visual.wake.material as THREE.PointsMaterial).opacity = Math.min(0.65, speed * 0.08);
  }

  private syncFromSnapshot(snap: GameSnapshot): void {
    if (!this.scene || !this.camera || !this.playerVisual || !this.sun || !this.hemi || !this.sky) {
      return;
    }

    const quality = snap.settings.graphicsQuality;
    if (this.renderer) {
      const ratio = quality === 'low' ? 1 : quality === 'medium' ? 1.5 : Math.min(devicePixelRatio, 2);
      this.renderer.setPixelRatio(ratio);
    }

    this.applyShipVisual(this.playerVisual, snap.player, snap.controls.sailTrim, snap.controls.rudder);
    this.syncCrew(this.playerVisual, snap.crew, snap.ocean.time);

    // Camera chase
    const reduce = snap.settings.accessibility.reduceMotion;
    const camDist = reduce ? 20 : 18;
    const camHeight = reduce ? 12 : 10 + snap.ocean.waveHeight * 0.35;
    const target = new THREE.Vector3(
      snap.player.position.x,
      snap.player.position.y + 2.2,
      snap.player.position.z,
    );
    const desired = new THREE.Vector3(
      snap.player.position.x - Math.sin(snap.player.heading) * camDist,
      camHeight,
      snap.player.position.z - Math.cos(snap.player.heading) * camDist,
    );
    this.camera.position.lerp(desired, reduce ? 1 : 0.08);
    this.camera.lookAt(target);

    // Day/night lighting
    const day = snap.timeOfDay;
    const sunHeight = Math.sin(day * Math.PI * 2 - Math.PI / 2);
    this.sun.intensity = 0.35 + Math.max(0, sunHeight) * 1.3;
    this.sun.position.set(Math.cos(day * Math.PI * 2) * 50, 20 + sunHeight * 40, Math.sin(day * Math.PI * 2) * 30);
    this.hemi.intensity = 0.25 + Math.max(0.15, sunHeight * 0.5);

    const skyMat = this.sky.material as THREE.ShaderMaterial;
    const night = sunHeight < 0;
    skyMat.uniforms['uTop']!.value.set(night ? 0x0b1830 : 0x87b7e0);
    skyMat.uniforms['uHorizon']!.value.set(night ? 0x24364f : 0xd7e6f2);
    skyMat.uniforms['uBottom']!.value.set(night ? 0x0a1622 : 0x1d3a4d);
    skyMat.uniforms['uFlash']!.value = snap.weather.lightningFlash;

    if (this.scene.fog instanceof THREE.FogExp2) {
      const fogBoost = snap.settings.accessibility.highContrast ? 0.6 : 1;
      // Keep density modest so wind chop and foam still read in storms/fog.
      this.scene.fog.density = (0.004 + (1 - snap.weather.visibility) * 0.022) * fogBoost;
      this.scene.fog.color.set(night ? 0x1a2738 : 0x4d6f82);
    }

    // Lightning bolt
    if (this.lightningBolt) {
      const flash = snap.weather.lightningFlash;
      this.lightningBolt.visible = flash > 0.2;
      (this.lightningBolt.material as THREE.MeshBasicMaterial).opacity = flash;
      if (flash > 0.85) {
        this.lightningBolt.position.set(
          snap.player.position.x + (Math.random() - 0.5) * 40,
          20,
          snap.player.position.z + (Math.random() - 0.5) * 40,
        );
      }
    }

    // Aim line
    if (this.aimLine) {
      const yaw = snap.player.heading + snap.controls.cannonAimYaw;
      const origin = new THREE.Vector3(
        snap.player.position.x,
        snap.player.position.y + 1.3,
        snap.player.position.z,
      );
      const end = origin
        .clone()
        .add(new THREE.Vector3(Math.sin(yaw) * 28, Math.sin(snap.controls.cannonAimPitch) * 6, Math.cos(yaw) * 28));
      const positions = this.aimLine.geometry.attributes['position'] as THREE.BufferAttribute;
      positions.setXYZ(0, origin.x, origin.y, origin.z);
      positions.setXYZ(1, end.x, end.y, end.z);
      positions.needsUpdate = true;
      this.aimLine.visible = snap.phase === 'playing';
    }

    // AI ships
    const aliveIds = new Set<string>();
    for (const ai of snap.aiShips) {
      aliveIds.add(ai.id);
      let visual = this.aiVisuals.get(ai.id);
      if (!visual) {
        visual = this.createShipVisual(this.factionColor(ai), false);
        this.scene.add(visual.root);
        this.aiVisuals.set(ai.id, visual);
      }
      this.applyShipVisual(visual, ai.ship, 0.75, 0);
      visual.root.visible = ai.ship.sinkProgress < 0.98;
    }
    for (const [id, visual] of this.aiVisuals) {
      if (!aliveIds.has(id)) {
        this.scene.remove(visual.root);
        this.aiVisuals.delete(id);
      }
    }
  }

  private applyShipVisual(
    visual: ShipVisual,
    ship: GameSnapshot['player'],
    sailTrim: number,
    rudder: number,
  ): void {
    visual.root.position.set(ship.position.x, ship.position.y, ship.position.z);
    visual.root.rotation.y = ship.heading;
    visual.root.rotation.z = -ship.heel;
    visual.root.rotation.x = ship.pitch;
    visual.sail.scale.set(0.35 + sailTrim * 0.75, 0.45 + sailTrim * 0.7, 1);
    visual.sail.rotation.y = Math.sin(sailTrim * Math.PI) * 0.25;
    visual.rudder.rotation.y = rudder * 0.55;
    visual.damageLight.intensity = (1 - ship.hullIntegrity) * 2.2;
    const hullMat = (visual.root.children[0] as THREE.Mesh).material as THREE.MeshStandardMaterial;
    hullMat.color.offsetHSL(0, 0, 0); // keep base
    hullMat.emissive = new THREE.Color(0x331108).multiplyScalar((1 - ship.hullIntegrity) * 0.45);
  }

  private syncCrew(visual: ShipVisual, crew: CrewMember[], time: number): void {
    crew.forEach((member, i) => {
      const figure = visual.crew[i];
      if (!figure) return;
      figure.position.set(
        member.deckOffset.x,
        member.deckOffset.y + Math.sin(time * 2 + i) * 0.03,
        member.deckOffset.z,
      );
      figure.rotation.y = Math.sin(time * 0.7 + i) * 0.15;
    });
  }

  private factionColor(ai: AiShipState): number {
    if (ai.faction === 'pirate') return 0x6b2d2d;
    if (ai.faction === 'navy') return 0x2f4f7a;
    return 0x8a9aaa;
  }

  private syncShots(shots: ShotVisual[]): void {
    if (!this.scene) return;
    const alive = new Set(shots.map((s) => s.id));

    for (const shot of shots) {
      let obj = this.shotMeshes.get(shot.id);
      if (!obj) {
        if (shot.kind === 'cannon') {
          const geo = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(shot.origin.x, shot.origin.y, shot.origin.z),
            new THREE.Vector3(shot.target.x, shot.target.y, shot.target.z),
          ]);
          obj = new THREE.Line(
            geo,
            new THREE.LineBasicMaterial({ color: 0xffe0a0, transparent: true, opacity: 0.9 }),
          );
        } else if (shot.kind === 'smoke') {
          obj = new THREE.Mesh(
            new THREE.SphereGeometry(0.35, 8, 8),
            new THREE.MeshBasicMaterial({ color: 0xbbbbbb, transparent: true, opacity: 0.45 }),
          );
          obj.position.set(shot.origin.x, shot.origin.y, shot.origin.z);
        } else {
          obj = new THREE.Mesh(
            new THREE.SphereGeometry(0.55, 8, 8),
            new THREE.MeshBasicMaterial({ color: 0xff8a3d, transparent: true, opacity: 0.85 }),
          );
          obj.position.set(shot.target.x, shot.target.y, shot.target.z);
        }
        this.scene.add(obj);
        this.shotMeshes.set(shot.id, obj);
      }

      const life = 1 - shot.age / shot.lifetime;
      if (shot.kind === 'smoke' || shot.kind === 'impact') {
        const mesh = obj as THREE.Mesh;
        const mat = mesh.material as THREE.MeshBasicMaterial;
        mat.opacity = life * (shot.kind === 'impact' ? 0.85 : 0.4);
        const s = shot.kind === 'impact' ? 1 + shot.age * 2.5 : 1 + shot.age * 1.4;
        mesh.scale.setScalar(s);
      } else {
        const line = obj as THREE.Line;
        (line.material as THREE.LineBasicMaterial).opacity = life;
      }
    }

    for (const [id, obj] of this.shotMeshes) {
      if (!alive.has(id)) {
        this.scene.remove(obj);
        this.shotMeshes.delete(id);
      }
    }
  }

  private resize(): void {
    if (!this.renderer || !this.camera) return;
    const canvas = this.canvasRef.nativeElement;
    const width = canvas.clientWidth || window.innerWidth;
    const height = canvas.clientHeight || window.innerHeight;
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / Math.max(1, height);
    this.camera.updateProjectionMatrix();
  }
}
