import Matter from "matter-js";
import { CAT } from "./categories";
import type { MagnetSurfaceInfo } from "./terrainBuilder";
import type { ColorScheme, MovementForm } from "../types";

const { Bodies, Body, Constraint, World } = Matter;

export interface InputState {
  left: boolean;
  right: boolean;
  jumpHeld: boolean;
  jumpPressed: boolean;
  formPressed: boolean;
  recoverPressed: boolean;
}

export interface PlayerEvents {
  onLand?: (impactSpeed: number) => void;
  onFormChange?: (form: MovementForm) => void;
  onMagnetAttach?: () => void;
  onMagnetDetach?: () => void;
  onJump?: () => void;
}

export class ShiftlingPlayer {
  world: Matter.World;
  engine: Matter.Engine;
  colors: ColorScheme;
  events: PlayerEvents;

  chassis: Matter.Body;
  wheelBack: Matter.Body | null = null;
  wheelFront: Matter.Body | null = null;
  constraints: Matter.Constraint[] = [];
  group: number;

  form: MovementForm = "roll";
  grounded = false;
  groundedTimer = 0; // coyote time
  jumpBufferTimer = 0;
  airTime = 0;
  facing: 1 | -1 = 1;

  // visual state
  squash = 0; // landing squash animation 0..1
  wingT = 0; // 0 folded -> 1 open
  magnetGlow = 0;
  eyeBlinkTimer = 2 + Math.random() * 3;
  eyeBlink = false;
  celebrating = false;
  transformFlash = 0;
  collectPulse = 0;

  // magnet
  nearMagnetZones: Set<string> = new Set();
  attachedSurface: MagnetSurfaceInfo | null = null;
  magnetT = 0; // distance along surface tangent

  formCooldown = 0;
  recoverCooldown = 0;

  alive = true;

  constructor(world: Matter.World, engine: Matter.Engine, x: number, y: number, colors: ColorScheme, events: PlayerEvents = {}) {
    this.world = world;
    this.engine = engine;
    this.colors = colors;
    this.events = events;
    this.group = Body.nextGroup(true);

    this.chassis = Bodies.rectangle(x, y, 58, 26, {
      density: 0.0018,
      friction: 0.2,
      frictionAir: 0.01,
      restitution: 0.05,
      collisionFilter: { group: this.group, category: CAT.PLAYER, mask: 0xffffffff },
      chamfer: { radius: 10 },
      label: "chassis",
    });
    (this.chassis.plugin as { isPlayer?: boolean }).isPlayer = true;
    World.add(world, this.chassis);
    this.spawnWheels();
  }

  private spawnWheels() {
    const pos = this.chassis.position;
    const angle = this.chassis.angle;
    const backOffset = Matter.Vector.rotate({ x: -23, y: 10 }, angle);
    const frontOffset = Matter.Vector.rotate({ x: 23, y: 10 }, angle);

    this.wheelBack = Bodies.circle(pos.x + backOffset.x, pos.y + backOffset.y, 15, {
      density: 0.0022,
      friction: 1,
      frictionStatic: 1.2,
      restitution: 0.05,
      collisionFilter: { group: this.group, category: CAT.PLAYER, mask: 0xffffffff },
      label: "wheel",
    });
    this.wheelFront = Bodies.circle(pos.x + frontOffset.x, pos.y + frontOffset.y, 15, {
      density: 0.0022,
      friction: 1,
      frictionStatic: 1.2,
      restitution: 0.05,
      collisionFilter: { group: this.group, category: CAT.PLAYER, mask: 0xffffffff },
      label: "wheel",
    });

    const cBack = Constraint.create({
      bodyA: this.chassis,
      pointA: { x: -23, y: 10 },
      bodyB: this.wheelBack,
      stiffness: 0.42,
      damping: 0.28,
      length: 2,
    });
    const cFront = Constraint.create({
      bodyA: this.chassis,
      pointA: { x: 23, y: 10 },
      bodyB: this.wheelFront,
      stiffness: 0.42,
      damping: 0.28,
      length: 2,
    });

    this.constraints = [cBack, cFront];
    (this.wheelBack.plugin as { isPlayer?: boolean }).isPlayer = true;
    (this.wheelFront.plugin as { isPlayer?: boolean }).isPlayer = true;
    World.add(this.world, [this.wheelBack, this.wheelFront, cBack, cFront]);
    Body.setVelocity(this.wheelBack, this.chassis.velocity);
    Body.setVelocity(this.wheelFront, this.chassis.velocity);
  }

  private removeWheels() {
    if (this.wheelBack) World.remove(this.world, this.wheelBack);
    if (this.wheelFront) World.remove(this.world, this.wheelFront);
    for (const c of this.constraints) World.remove(this.world, c);
    this.wheelBack = null;
    this.wheelFront = null;
    this.constraints = [];
  }

  get position() {
    return this.chassis.position;
  }

  get velocity() {
    return this.chassis.velocity;
  }

  setNearMagnetZone(id: string, near: boolean) {
    if (near) this.nearMagnetZones.add(id);
    else this.nearMagnetZones.delete(id);
  }

  switchForm(target: MovementForm, magnetSurfaces: MagnetSurfaceInfo[]) {
    if (this.form === target || this.formCooldown > 0) return;
    // leaving magnet: detach cleanly
    if (this.form === "magnet" && this.attachedSurface) {
      this.detachMagnet(true);
    }
    this.form = target;
    this.formCooldown = 0.22;
    this.transformFlash = 1;

    if (target === "roll") {
      if (!this.wheelBack) this.spawnWheels();
    } else {
      // leaving roll: remove wheels, keep chassis momentum
      if (this.wheelBack) {
        const avgVel = Matter.Vector.mult(
          Matter.Vector.add(this.wheelBack.velocity, this.wheelFront ? this.wheelFront.velocity : this.wheelBack.velocity),
          0.5
        );
        this.removeWheels();
        Body.setVelocity(this.chassis, avgVel);
      }
      if (target === "glide") {
        this.wingT = 0;
      }
      if (target === "magnet") {
        // try immediate attach if already overlapping a zone
        for (const surf of magnetSurfaces) {
          if (this.nearMagnetZones.has(surf.id)) {
            this.tryAttach(surf);
            break;
          }
        }
      }
    }
    this.events.onFormChange?.(this.form);
  }

  private tryAttach(surf: MagnetSurfaceInfo) {
    this.attachedSurface = surf;
    const rel = { x: this.chassis.position.x - surf.x1, y: this.chassis.position.y - surf.y1 };
    this.magnetT = rel.x * surf.tx + rel.y * surf.ty;
    this.magnetT = Math.max(4, Math.min(surf.length - 4, this.magnetT));
    this.events.onMagnetAttach?.();
  }

  private detachMagnet(silent = false) {
    if (!this.attachedSurface) return;
    const surf = this.attachedSurface;
    this.attachedSurface = null;
    // push slightly away from surface so we don't instantly re-collide
    const push = Matter.Vector.mult({ x: surf.nx, y: surf.ny }, 4);
    Body.setPosition(this.chassis, Matter.Vector.add(this.chassis.position, push));
    if (!silent) this.events.onMagnetDetach?.();
  }

  respawn(x: number, y: number, colorsUnchanged = true) {
    this.detachMagnet(true);
    if (this.form !== "roll") {
      this.form = "roll";
      if (!this.wheelBack) this.spawnWheels();
    }
    Body.setPosition(this.chassis, { x, y: y - 10 });
    Body.setVelocity(this.chassis, { x: 0, y: 0 });
    Body.setAngularVelocity(this.chassis, 0);
    Body.setAngle(this.chassis, 0);
    if (this.wheelBack && this.wheelFront) {
      const backOffset = { x: x - 23, y: y + 10 };
      const frontOffset = { x: x + 23, y: y + 10 };
      Body.setPosition(this.wheelBack, backOffset);
      Body.setPosition(this.wheelFront, frontOffset);
      Body.setVelocity(this.wheelBack, { x: 0, y: 0 });
      Body.setVelocity(this.wheelFront, { x: 0, y: 0 });
    }
    this.grounded = false;
    this.airTime = 0;
    void colorsUnchanged;
  }

  /** Fixed-timestep physics + behaviour update. dtSec is the fixed step duration in seconds. */
  update(dtSec: number, input: InputState, magnetSurfaces: MagnetSurfaceInfo[]) {
    this.formCooldown = Math.max(0, this.formCooldown - dtSec);
    this.recoverCooldown = Math.max(0, this.recoverCooldown - dtSec);
    this.collectPulse = Math.max(0, this.collectPulse - dtSec * 2);
    this.transformFlash = Math.max(0, this.transformFlash - dtSec * 2);
    this.jumpBufferTimer = input.jumpPressed ? 0.12 : Math.max(0, this.jumpBufferTimer - dtSec);

    if (input.left && !input.right) this.facing = -1;
    else if (input.right && !input.left) this.facing = 1;

    // eye blink timer (pure cosmetic)
    this.eyeBlinkTimer -= dtSec;
    if (this.eyeBlinkTimer <= 0) {
      this.eyeBlink = !this.eyeBlink;
      this.eyeBlinkTimer = this.eyeBlink ? 0.12 : 2 + Math.random() * 3;
    }

    if (this.form === "roll") this.updateRoll(dtSec, input);
    else if (this.form === "glide") this.updateGlide(dtSec, input);
    else this.updateMagnet(dtSec, input, magnetSurfaces);

    if (this.squash > 0) this.squash = Math.max(0, this.squash - dtSec * 3.2);
  }

  // NOTE on physics calibration: Matter.js integrates with Verlet-style steps where
  // Body.applyForce()'s effect on velocity is scaled by deltaTime^2 (~277.8 at our
  // fixed 60Hz step), which makes naive "intuitive" force magnitudes behave very
  // differently than expected. Per Matter's own docs, when precise, predictable
  // control is required it is more reliable to drive bodies directly via
  // Body.setVelocity / Body.setAngularVelocity / Body.setPosition - that is the
  // approach used below for all player-controlled motion. Gravity, suspension and
  // wheel-ground friction are left to Matter's native rigid body simulation.

  private updateRoll(dtSec: number, input: InputState) {
    const wasGrounded = this.grounded;
    this.grounded = this.groundedTimer > 0;
    this.groundedTimer = Math.max(0, this.groundedTimer - dtSec);
    if (!wasGrounded && this.grounded) {
      const impact = Math.min(1, Math.abs(this.chassis.velocity.y) / 14);
      this.squash = impact;
      if (impact > 0.15) this.events.onLand?.(impact);
      this.airTime = 0;
    }
    if (!this.grounded) this.airTime += dtSec;

    const steer = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    const maxW = 0.85 + Math.min(0.3, Math.abs(this.chassis.velocity.x) * 0.025);
    let targetW = 0;
    if (steer !== 0) targetW = steer * maxW;
    const accelRate = targetW !== 0 ? 0.22 : 0.12;

    for (const wheel of [this.wheelBack, this.wheelFront]) {
      if (!wheel) continue;
      const newW = wheel.angularVelocity + (targetW - wheel.angularVelocity) * accelRate;
      Body.setAngularVelocity(wheel, newW);
    }

    const horizontalDrive = steer * (this.grounded ? 0.055 : 0.025);
    const horizontalSpeed = Matter.Common.clamp(this.chassis.velocity.x + horizontalDrive, -12.5, 12.5);
    Body.setVelocity(this.chassis, { x: horizontalSpeed, y: this.chassis.velocity.y });
    if (this.wheelBack) Body.setVelocity(this.wheelBack, { x: horizontalSpeed, y: this.wheelBack.velocity.y });
    if (this.wheelFront) Body.setVelocity(this.wheelFront, { x: horizontalSpeed, y: this.wheelFront.velocity.y });

    // Give the player a small air-roll correction for cleaner landings.
    if (!this.grounded) {
      Body.setAngularVelocity(this.chassis, Matter.Common.clamp(this.chassis.angularVelocity * 0.96 + steer * 0.012, -0.18, 0.18));
    }

    if (this.jumpBufferTimer > 0 && this.grounded) {
      const jumpVy = -8.6;
      Body.setVelocity(this.chassis, { x: this.chassis.velocity.x, y: jumpVy });
      if (this.wheelBack) Body.setVelocity(this.wheelBack, { x: this.wheelBack.velocity.x, y: jumpVy });
      if (this.wheelFront) Body.setVelocity(this.wheelFront, { x: this.wheelFront.velocity.x, y: jumpVy });
      this.grounded = false;
      this.groundedTimer = 0;
      this.jumpBufferTimer = 0;
      this.events.onJump?.();
    } else if (!input.jumpHeld && this.chassis.velocity.y < -3) {
      const cutJumpVelocity = (body: Matter.Body | null) => {
        if (body && body.velocity.y < -3) {
          Body.setVelocity(body, { x: body.velocity.x, y: body.velocity.y * 0.92 });
        }
      };
      cutJumpVelocity(this.chassis);
      cutJumpVelocity(this.wheelBack);
      cutJumpVelocity(this.wheelFront);
    }
  }

  private updateGlide(dtSec: number, input: InputState) {
    void dtSec;
    this.wingT = Math.min(1, this.wingT + dtSec * 4);

    const steer = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    const vx = Matter.Common.clamp(this.chassis.velocity.x + steer * 0.11, -10, 10);

    let vy = this.chassis.velocity.y;
    if (input.jumpPressed) vy -= 0.7;
    else if (input.jumpHeld) vy -= 0.12;
    vy = Matter.Common.clamp(vy, -5.5, 6.5);

    Body.setVelocity(this.chassis, { x: vx, y: vy });

    // bank angle follows vertical speed + steer for visual feedback
    const targetAngle = Matter.Common.clamp(vy * 0.05 + steer * 0.18, -0.55, 0.55);
    Body.setAngle(this.chassis, this.chassis.angle + (targetAngle - this.chassis.angle) * 0.18);
    Body.setAngularVelocity(this.chassis, 0);

    this.grounded = this.groundedTimer > 0;
    this.groundedTimer = Math.max(0, this.groundedTimer - dtSec);
  }

  private updateMagnet(dtSec: number, input: InputState, magnetSurfaces: MagnetSurfaceInfo[]) {
    this.magnetGlow = Math.min(1, this.magnetGlow + dtSec * 5);

    if (!this.attachedSurface) {
      // drifting / searching: gentle floaty fall, mild steering, looking for a surface
      const steer = (input.right ? 1 : 0) - (input.left ? 1 : 0);
      let vx = this.chassis.velocity.x + steer * 0.1;
      vx = Matter.Common.clamp(vx, -4, 4);
      let vy = this.chassis.velocity.y;
      vy = Matter.Common.clamp(vy, -3, 3);
      Body.setVelocity(this.chassis, { x: vx, y: vy });

      for (const surf of magnetSurfaces) {
        if (this.nearMagnetZones.has(surf.id)) {
          this.tryAttach(surf);
          break;
        }
      }
      this.grounded = this.groundedTimer > 0;
      this.groundedTimer = Math.max(0, this.groundedTimer - dtSec);
      return;
    }

    // attached: snap kinematically onto the surface line and slide along its tangent
    const surf = this.attachedSurface;

    if (input.jumpPressed) {
      this.detachMagnet();
      Body.setVelocity(this.chassis, { x: surf.nx * 6, y: surf.ny * 6 });
      return;
    }

    const steer = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    const speedPerStep = 4.6;
    this.magnetT = Matter.Common.clamp(this.magnetT + steer * speedPerStep, -30, surf.length + 30);

    if (this.magnetT <= -28 || this.magnetT >= surf.length + 28) {
      this.detachMagnet();
      return;
    }

    const attachDist = 30;
    const targetX = surf.x1 + surf.tx * this.magnetT + surf.nx * attachDist;
    const targetY = surf.y1 + surf.ty * this.magnetT + surf.ny * attachDist;

    // move a large fraction of the way to the target point each step: stiff,
    // stable "stuck to the surface" feel without any spring-force overshoot risk.
    const newX = this.chassis.position.x + (targetX - this.chassis.position.x) * 0.4;
    const newY = this.chassis.position.y + (targetY - this.chassis.position.y) * 0.4;
    Body.setPosition(this.chassis, { x: newX, y: newY });
    Body.setVelocity(this.chassis, { x: surf.tx * steer * speedPerStep, y: surf.ty * steer * speedPerStep });

    const targetAngle = Math.atan2(surf.ty, surf.tx);
    Body.setAngle(this.chassis, targetAngle);
    Body.setAngularVelocity(this.chassis, 0);

    this.grounded = true;
    this.groundedTimer = 0.15;
  }

  markGroundContact() {
    this.groundedTimer = 0.16;
  }

  speedKph() {
    const v = this.form === "roll" && this.wheelBack ? this.wheelBack.velocity : this.chassis.velocity;
    return Math.round(Math.hypot(v.x, v.y) * 3.1);
  }
}
