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

/** Three.js ocean + ship scene host — procedural placeholders, full-bleed canvas. */
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
  private playerMesh?: THREE.Group;
  private ocean?: THREE.Mesh;
  private aiMeshes = new Map<string, THREE.Group>();
  private resizeObserver?: ResizeObserver;
  private raf = 0;

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
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
    renderer.setClearColor(0x0b1c2c);

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x6f8ea3, 0.012);

    const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 500);
    camera.position.set(0, 12, 22);

    const sun = new THREE.DirectionalLight(0xfff2d6, 1.4);
    sun.position.set(20, 40, 10);
    scene.add(sun);
    scene.add(new THREE.AmbientLight(0x6b8cae, 0.55));

    const oceanGeo = new THREE.PlaneGeometry(400, 400, 64, 64);
    oceanGeo.rotateX(-Math.PI / 2);
    const oceanMat = new THREE.MeshStandardMaterial({
      color: 0x1a4b63,
      roughness: 0.35,
      metalness: 0.1,
      flatShading: true,
    });
    const ocean = new THREE.Mesh(oceanGeo, oceanMat);
    scene.add(ocean);

    const player = this.createShipMesh(0xc4a574);
    scene.add(player);

    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;
    this.playerMesh = player;
    this.ocean = ocean;

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(canvas.parentElement ?? canvas);
    this.resize();

    const renderLoop = () => {
      this.raf = requestAnimationFrame(renderLoop);
      this.animateOcean();
      renderer.render(scene, camera);
    };
    renderLoop();
  }

  private createShipMesh(color: number): THREE.Group {
    const group = new THREE.Group();
    const hull = new THREE.Mesh(
      new THREE.BoxGeometry(2.2, 0.8, 5.5),
      new THREE.MeshStandardMaterial({ color, roughness: 0.7 }),
    );
    hull.position.y = 0.4;
    const mast = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.1, 4.5, 8),
      new THREE.MeshStandardMaterial({ color: 0x5c4030 }),
    );
    mast.position.y = 2.6;
    const sail = new THREE.Mesh(
      new THREE.PlaneGeometry(2.4, 3.2),
      new THREE.MeshStandardMaterial({
        color: 0xf3efe4,
        side: THREE.DoubleSide,
        roughness: 0.9,
      }),
    );
    sail.position.set(0.7, 2.4, 0);
    group.add(hull, mast, sail);
    return group;
  }

  private animateOcean(): void {
    if (!this.ocean) return;
    const geo = this.ocean.geometry as THREE.PlaneGeometry;
    const pos = geo.attributes['position'];
    const t = performance.now() * 0.001;
    const snap = this.engine.snapshot();
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const y =
        Math.sin(x * 0.15 + t * 1.2) * snap.ocean.waveHeight * 0.35 +
        Math.cos(z * 0.12 + t * 0.9) * snap.ocean.waveHeight * 0.25;
      pos.setY(i, y);
    }
    pos.needsUpdate = true;
    geo.computeVertexNormals();
  }

  private syncFromSnapshot(snap: ReturnType<GameEngineService['snapshot']>): void {
    if (!this.scene || !this.camera || !this.playerMesh) return;

    this.playerMesh.position.set(snap.player.position.x, snap.player.position.y, snap.player.position.z);
    this.playerMesh.rotation.y = snap.player.heading;
    this.playerMesh.rotation.z = -snap.player.heel;
    this.playerMesh.rotation.x = snap.player.pitch;

    const camDist = 18;
    this.camera.position.set(
      snap.player.position.x - Math.sin(snap.player.heading) * camDist,
      10 + snap.ocean.waveHeight,
      snap.player.position.z - Math.cos(snap.player.heading) * camDist,
    );
    this.camera.lookAt(snap.player.position.x, 2, snap.player.position.z);

    if (this.scene.fog instanceof THREE.FogExp2) {
      this.scene.fog.density = 0.008 + (1 - snap.weather.visibility) * 0.04;
    }

    for (const ai of snap.aiShips) {
      let mesh = this.aiMeshes.get(ai.id);
      if (!mesh) {
        mesh = this.createShipMesh(ai.hostile ? 0x6b2d2d : 0x8a9aaa);
        this.scene.add(mesh);
        this.aiMeshes.set(ai.id, mesh);
      }
      mesh.position.set(ai.ship.position.x, ai.ship.position.y, ai.ship.position.z);
      mesh.rotation.y = ai.ship.heading;
      mesh.visible = ai.ship.hullIntegrity > 0;
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
