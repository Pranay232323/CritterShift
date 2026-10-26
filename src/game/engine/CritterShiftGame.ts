import Matter from "matter-js";
import { buildWorld, type BuiltWorld } from "./terrainBuilder";
import { ShiftlingPlayer, type InputState } from "./player";
import { drawShiftling } from "./drawShiftling";
import { drawBackground } from "./background";
import { renderLevel } from "./renderLevel";
import { ParticleSystem } from "./particles";
import { audio } from "./audio";
import type { LevelDefinition } from "../levelData";
import type { VehicleDefinition } from "../vehicles";
import type { ColorScheme, HudSnapshot } from "../types";

const { Engine, World, Events } = Matter;
const HUD_UPDATE_INTERVAL = 1 / 12;

export interface CritterShiftCallbacks {
  onHud: (hud: HudSnapshot) => void;
  onComplete: (stats: { levelId: string; timeMs: number; energy: number; totalEnergy: number; hidden: number; totalHidden: number }) => void;
  onEnergyCollected: () => void;
}

const FIXED_DT = 1 / 60;
export class CritterShiftGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private engine: Matter.Engine;
  private world: BuiltWorld;
  private player: ShiftlingPlayer;
  private level: LevelDefinition;
  private particles = new ParticleSystem();
  private callbacks: CritterShiftCallbacks;

  private width = 960;
  private height = 540;

  private rafId = 0;
  private lastTime = 0;
  private accumulator = 0;
  private running = false;
  paused = false;

  private camX = 0;
  private camY = 0;

  private collected = new Set<string>();
  private hiddenFound = new Set<string>();
  private activeCheckpointId: string;
  private activeCheckpointPos: { x: number; y: number };

  private elapsedMs = 0;
  private levelComplete = false;
  private respawnCooldown = 0;
  private dustTimer = 0;
  private hudUpdateAccumulator = 0;

  private keys = {
    left: false,
    right: false,
    up: false,
    down: false,
    jump: false,
  };
  private pendingJump = false;
  private pendingForm = false;
  private pendingRecover = false;

  private timeSec = 0;

  private keydownHandler = (e: KeyboardEvent) => this.onKeyDown(e);
  private keyupHandler = (e: KeyboardEvent) => this.onKeyUp(e);

  constructor(
    canvas: HTMLCanvasElement,
    colors: ColorScheme,
    level: LevelDefinition,
    vehicle: VehicleDefinition,
    upgrades: { engine: number; suspension: number; jump: number },
    callbacks: CritterShiftCallbacks
  ) {
    this.canvas = canvas;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("2D canvas context unavailable");
    this.ctx = ctx;
    this.callbacks = callbacks;
    this.level = level;
    this.camX = level.startPosition.x;
    this.camY = level.startPosition.y - 60;
    const firstCheckpoint = level.checkpoints[0];
    this.activeCheckpointId = firstCheckpoint?.id ?? "";
    this.activeCheckpointPos = firstCheckpoint
      ? { x: firstCheckpoint.x, y: firstCheckpoint.y }
      : { ...level.startPosition };

    this.engine = Engine.create();
    this.engine.gravity.y = 1;
    this.engine.gravity.scale = 0.001;
    this.engine.positionIterations = 6;
    this.engine.velocityIterations = 4;

    this.world = buildWorld(level);
    World.add(this.engine.world, [...this.world.staticBodies, ...this.world.sensorBodies]);

    this.player = new ShiftlingPlayer(
      this.engine.world,
      this.engine,
      level.startPosition.x,
      level.startPosition.y,
      colors,
      vehicle,
      upgrades,
      {
        onLand: (impact) => {
          audio.play("land");
          if (impact > 0.3) {
            this.particles.spawnBurst(this.player.position.x, this.player.position.y + 14, "#f2e9d8", 6, { gravity: 0.3 });
          }
        },
        onJump: () => audio.play("jump"),
        onFormChange: () => audio.play("transform"),
        onMagnetAttach: () => audio.play("magnetAttach"),
        onMagnetDetach: () => audio.play("magnetDetach"),
      }
    );

    this.setupCollisions();
    window.addEventListener("keydown", this.keydownHandler);
    window.addEventListener("keyup", this.keyupHandler);
  }

  setColors(colors: ColorScheme) {
    this.player.colors = colors;
  }

  resize(width: number, height: number, dpr: number) {
    this.width = width;
    this.height = height;
    this.canvas.width = Math.round(width * dpr);
    this.canvas.height = Math.round(height * dpr);
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  start() {
    this.running = true;
    this.lastTime = performance.now();
    this.rafId = requestAnimationFrame(this.loop);
  }

  pause() {
    this.paused = true;
  }

  resume() {
    this.paused = false;
    this.lastTime = performance.now();
  }

  setControl(control: "left" | "right" | "up" | "down" | "jump", active: boolean) {
    if (control === "jump" && active && !this.keys.jump) this.pendingJump = true;
    this.keys[control] = active;
  }

  triggerAction(action: "form" | "recover") {
    if (action === "form") this.pendingForm = true;
    else this.pendingRecover = true;
  }

  destroy() {
    this.running = false;
    cancelAnimationFrame(this.rafId);
    window.removeEventListener("keydown", this.keydownHandler);
    window.removeEventListener("keyup", this.keyupHandler);
    World.clear(this.engine.world, false);
    Engine.clear(this.engine);
  }

  private onKeyDown(e: KeyboardEvent) {
    switch (e.code) {
      case "ArrowLeft":
      case "KeyA":
        this.keys.left = true;
        e.preventDefault();
        break;
      case "ArrowRight":
      case "KeyD":
        this.keys.right = true;
        e.preventDefault();
        break;
      case "ArrowUp":
      case "KeyW":
        this.keys.up = true;
        e.preventDefault();
        break;
      case "ArrowDown":
      case "KeyS":
        this.keys.down = true;
        e.preventDefault();
        break;
      case "Space":
        if (!this.keys.jump) this.pendingJump = true;
        this.keys.jump = true;
        e.preventDefault();
        break;
      case "KeyQ":
        this.pendingForm = true;
        break;
      case "KeyR":
        this.pendingRecover = true;
        break;
      default:
        break;
    }
  }

  private onKeyUp(e: KeyboardEvent) {
    switch (e.code) {
      case "ArrowLeft":
      case "KeyA":
        this.keys.left = false;
        break;
      case "ArrowRight":
      case "KeyD":
        this.keys.right = false;
        break;
      case "ArrowUp":
      case "KeyW":
        this.keys.up = false;
        break;
      case "ArrowDown":
      case "KeyS":
        this.keys.down = false;
        break;
      case "Space":
        this.keys.jump = false;
        break;
      default:
        break;
    }
  }

  private isPlayerBody(body: Matter.Body): boolean {
    return Boolean(body.plugin && (body.plugin as { isPlayer?: boolean }).isPlayer);
  }

  private setupCollisions() {
    Events.on(this.engine, "collisionStart", (evt) => {
      for (const pair of evt.pairs) {
        this.handlePair(pair.bodyA, pair.bodyB);
        this.handlePair(pair.bodyB, pair.bodyA);
      }
    });
    Events.on(this.engine, "collisionActive", (evt) => {
      for (const pair of evt.pairs) {
        const normalY = pair.collision.normal.y;
        this.handleActivePair(pair.bodyA, pair.bodyB, normalY);
        this.handleActivePair(pair.bodyB, pair.bodyA, -normalY);
      }
    });
    Events.on(this.engine, "collisionEnd", (evt) => {
      for (const pair of evt.pairs) {
        this.handleEndPair(pair.bodyA, pair.bodyB);
        this.handleEndPair(pair.bodyB, pair.bodyA);
      }
    });
  }

  private handlePair(a: Matter.Body, b: Matter.Body) {
    if (!this.isPlayerBody(a)) return;
    const label = b.label;
    if (label.startsWith("collectible:")) {
      const id = label.split(":")[1];
      if (!this.collected.has(id)) {
        this.collected.add(id);
        audio.play("collect");
        this.particles.spawnBurst(b.position.x, b.position.y, "#ffd23f", 10);
        this.callbacks.onEnergyCollected();
      }
    } else if (label.startsWith("hidden:")) {
      const id = label.split(":")[1];
      if (!this.hiddenFound.has(id)) {
        this.hiddenFound.add(id);
        audio.play("hidden");
        this.particles.spawnBurst(b.position.x, b.position.y, "#9ef2ff", 18);
      }
    } else if (label.startsWith("checkpoint:")) {
      const id = label.split(":")[1];
      if (this.activeCheckpointId !== id) {
        this.activeCheckpointId = id;
        const cp = this.level.checkpoints.find((c) => c.id === id);
        if (cp) this.activeCheckpointPos = { x: cp.x, y: cp.y };
        audio.play("checkpoint");
        this.particles.spawnBurst(b.position.x, b.position.y, "#54e08a", 14);
      }
    } else if (label === "hazard") {
      this.triggerRespawn();
    } else if (label === "finish") {
      this.triggerFinish();
    }
  }

  private handleActivePair(a: Matter.Body, b: Matter.Body, normalY: number) {
    if (!this.isPlayerBody(a)) return;
    if (b.label === "ground" || b.label === "platform" || b.label === "magnet-surface") {
      this.player.markGroundContact(normalY);
    } else if (b.label.startsWith("magnet-zone:")) {
      const id = b.label.split(":")[1];
      this.player.setNearMagnetZone(id, true);
    }
  }

  private handleEndPair(a: Matter.Body, b: Matter.Body) {
    if (!this.isPlayerBody(a)) return;
    if (b.label.startsWith("magnet-zone:")) {
      const id = b.label.split(":")[1];
      this.player.setNearMagnetZone(id, false);
    }
  }

  private triggerRespawn() {
    if (this.respawnCooldown > 0) return;
    this.respawnCooldown = 1.2;
    audio.play("hurt");
    this.particles.spawnBurst(this.player.position.x, this.player.position.y, "#ffffff", 12);
    this.player.respawn(this.activeCheckpointPos.x, this.activeCheckpointPos.y);
  }

  manualRecover() {
    this.triggerRespawn();
  }

  private triggerFinish() {
    if (this.levelComplete) return;
    this.levelComplete = true;
    audio.play("finish");
    for (let i = 0; i < 3; i++) {
      setTimeout(
        () => this.particles.spawnBurst(this.player.position.x, this.player.position.y - 20, "#ffd23f", 20, { gravity: 0.08 }),
        i * 140
      );
    }
    this.player.celebrating = true;
    this.callbacks.onComplete({
      levelId: this.level.id,
      timeMs: Math.round(this.elapsedMs),
      energy: this.collected.size,
      totalEnergy: this.level.collectibles.length,
      hidden: this.hiddenFound.size,
      totalHidden: this.level.hiddenCollectibles.length,
    });
  }

  private loop = (t: number) => {
    if (!this.running) return;
    const dtMs = Math.min(120, t - this.lastTime);
    this.lastTime = t;
    if (!this.paused && !this.levelComplete) {
      this.accumulator += dtMs / 1000;
      let steps = 0;
      while (this.accumulator >= FIXED_DT && steps < 6) {
        this.fixedUpdate(FIXED_DT);
        this.accumulator -= FIXED_DT;
        steps++;
      }
      if (this.accumulator >= FIXED_DT) this.accumulator %= FIXED_DT;
    }
    this.timeSec += dtMs / 1000;
    this.render();
    this.rafId = requestAnimationFrame(this.loop);
  };

  private fixedUpdate(dt: number) {
    this.respawnCooldown = Math.max(0, this.respawnCooldown - dt);
    this.elapsedMs += dt * 1000;

    const input: InputState = {
      left: this.keys.left,
      right: this.keys.right,
      up: this.keys.up,
      down: this.keys.down,
      jumpHeld: this.keys.jump,
      jumpPressed: this.pendingJump,
      formPressed: this.pendingForm,
      recoverPressed: this.pendingRecover,
    };
    this.pendingJump = false;

    if (this.pendingForm) {
      const nearMagnet = this.player.nearMagnetZones.size > 0;
      const flightZone = this.level.flightZones.some(
        (zone) => this.player.position.x >= zone.startX && this.player.position.x <= zone.endX
      );
      if (this.player.form === "magnet" || this.player.form === "glide") {
        this.player.switchForm("roll", this.world.magnetSurfaces);
      } else if (nearMagnet) {
        this.player.switchForm("magnet", this.world.magnetSurfaces);
      } else if (flightZone) {
        this.player.switchForm("glide", this.world.magnetSurfaces, true);
      }
      this.pendingForm = false;
    }
    if (this.pendingRecover) {
      this.triggerRespawn();
      this.pendingRecover = false;
    }

    this.player.update(dt, input, this.world.magnetSurfaces);
    const glideFlightZone = this.level.flightZones.find(
      (zone) => this.player.position.x >= zone.startX && this.player.position.x <= zone.endX + 80
    );
    if (this.player.form === "glide" && (!glideFlightZone || this.player.position.x > glideFlightZone.endX)) {
      this.player.switchForm("roll", this.world.magnetSurfaces);
    }

    // dust while rolling fast on the ground
    this.dustTimer -= dt;
    if (this.player.form === "roll" && this.player.grounded && Math.abs(this.player.velocity.x) > 2.5 && this.dustTimer <= 0) {
      this.dustTimer = 0.07;
      this.particles.spawnDust(this.player.position.x - this.player.facing * 22, this.player.position.y + 16, this.player.facing * Math.sign(this.player.velocity.x || 1));
    }

    if (this.player.position.y > this.level.deathY) this.triggerRespawn();

    Engine.update(this.engine, dt * 1000);
    this.particles.update(dt);

    // camera smoothing with mild look-ahead
    const lookAhead = Matter.Common.clamp(this.player.velocity.x * 10, -90, 90);
    const targetX = Matter.Common.clamp(this.player.position.x + lookAhead, this.level.worldMinX, this.level.worldMaxX);
    const targetY = Matter.Common.clamp(this.player.position.y - 40, -50, 760);
    this.camX += (targetX - this.camX) * Math.min(1, dt * 3.5);
    this.camY += (targetY - this.camY) * Math.min(1, dt * 3.5);

    this.hudUpdateAccumulator += dt;
    if (this.hudUpdateAccumulator >= HUD_UPDATE_INTERVAL) {
      this.hudUpdateAccumulator %= HUD_UPDATE_INTERVAL;
      this.emitHud();
    }
  }

  private emitHud() {
    const nearMagnet = this.player.nearMagnetZones.size > 0;
    const flightZone = this.level.flightZones.find(
      (zone) => this.player.position.x >= zone.startX && this.player.position.x <= zone.endX
    );
    let message: string | null = null;
    if (nearMagnet && this.player.form !== "magnet") message = "Press Q to switch to MAGNET near this surface!";
    else if (this.player.form === "glide") message = "Hold Space to flap across the gap";
    else if (this.player.form === "magnet" && this.player.attachedSurface) message = "Use ↑ ↓ ← → to choose a rail • Space to detach";
    else if (flightZone && this.player.form === "roll") message = "Obstacle flight zone · press Q to deploy wings, hold Space to flap";

    this.callbacks.onHud({
      form: this.player.form,
      energy: this.collected.size,
      totalEnergyInLevel: this.level.collectibles.length,
      hiddenFound: this.hiddenFound.size,
      totalHidden: this.level.hiddenCollectibles.length,
      elapsedMs: this.elapsedMs,
      speedKph: this.player.speedKph(),
      progress: Matter.Common.clamp(
        (this.player.position.x - this.level.startPosition.x) /
          (this.level.finish.x - this.level.startPosition.x),
        0,
        1
      ),
      grounded: this.player.grounded,
      nearMagnetSurface: nearMagnet,
      canGlide: Boolean(flightZone),
      magnetAttached: Boolean(this.player.attachedSurface),
      message,
    });
  }

  private render() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);
    drawBackground(ctx, this.width, this.height, this.camX, this.camY, this.timeSec, this.level.background);

    const toX = (x: number) => x - this.camX + this.width / 2;
    const toY = (y: number) => y - this.camY + this.height / 2;

    renderLevel(ctx, toX, toY, this.width, this.height, this.level, {
      collected: this.collected,
      hiddenFound: this.hiddenFound,
      activeCheckpointId: this.activeCheckpointId,
      attachedSurfaceId: this.player.attachedSurface?.id ?? null,
      nearMagnetIds: this.player.nearMagnetZones,
      magnetSurfaces: this.world.magnetSurfaces,
      timeSec: this.timeSec,
    });

    this.particles.draw(ctx, toX, toY);

    const px = toX(this.player.chassis.position.x);
    const py = toY(this.player.chassis.position.y);
    const wb = this.player.wheelBack
      ? { x: toX(this.player.wheelBack.position.x), y: toY(this.player.wheelBack.position.y), angle: this.player.wheelBack.angle }
      : null;
    const wf = this.player.wheelFront
      ? { x: toX(this.player.wheelFront.position.x), y: toY(this.player.wheelFront.position.y), angle: this.player.wheelFront.angle }
      : null;

    drawShiftling(
      ctx,
      px,
      py,
      this.player.colors,
      {
        form: this.player.form,
        vehicleId: this.player.vehicle.id,
        wheelRadius: this.player.vehicle.wheelRadius,
        angle: this.player.chassis.angle,
        facing: this.player.facing,
        squash: this.player.squash,
        wingT: this.player.wingT,
        magnetGlow: this.player.form === "magnet" ? Math.max(this.player.magnetGlow, 0.25) : 0,
        eyeBlink: this.player.eyeBlink,
        transformFlash: this.player.transformFlash,
        grounded: this.player.grounded,
        airTime: this.player.airTime,
        timeSec: this.timeSec,
        celebrating: this.player.celebrating,
      },
      wb,
      wf
    );
  }
}
