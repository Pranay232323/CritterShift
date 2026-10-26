import Matter from "matter-js";
import { CAT } from "./categories";
import type { MagnetSurfaceInfo } from "./terrainBuilder";
import type { ColorScheme, MovementForm } from "../types";
import type { VehicleDefinition } from "../vehicles";

const { Bodies, Body, Constraint, World } = Matter;

function normalizeAngle(angle: number): number {
  return ((angle + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI;
}

export interface InputState {
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
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
  vehicle: VehicleDefinition;
  upgrades: { engine: number; suspension: number; jump: number };

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
  private magnetSide: 1 | -1 = 1;

  formCooldown = 0;
  recoverCooldown = 0;

  alive = true;

  constructor(
    world: Matter.World,
    engine: Matter.Engine,
    x: number,
    y: number,
    colors: ColorScheme,
    vehicle: VehicleDefinition,
    upgrades: { engine: number; suspension: number; jump: number },
    events: PlayerEvents = {}
  ) {
    this.world = world;
    this.engine = engine;
    this.colors = colors;
    this.vehicle = vehicle;
    this.upgrades = upgrades;
    this.events = events;
    this.group = Body.nextGroup(true);

    this.chassis = Bodies.rectangle(x, y, vehicle.bodyWidth, vehicle.bodyHeight, {
      density: 0.0018,
      friction: 0.2,
      frictionAir: 0.01,
      restitution: 0.05,
      collisionFilter: { group: this.group, category: CAT.PLAYER, mask: 0xffffffff },
      chamfer: { radius: 12 },
      label: "chassis",
    });
    (this.chassis.plugin as { isPlayer?: boolean }).isPlayer = true;
    World.add(world, this.chassis);
    this.spawnWheels();
  }

  private spawnWheels() {
    const pos = this.chassis.position;
    const angle = this.chassis.angle;
    const backOffset = Matter.Vector.rotate({ x: -23, y: 14 }, angle);
    const frontOffset = Matter.Vector.rotate({ x: 23, y: 14 }, angle);

    this.wheelBack =     Bodies.circle(pos.x + backOffset.x, pos.y + backOffset.y, this.vehicle.wheelRadius, {
      density: 0.0022,
      friction: 1,
      frictionStatic: 1.2,
      restitution: 0.05,
      collisionFilter: { group: this.group, category: CAT.PLAYER, mask: 0xffffffff },
      label: "wheel",
    });
    this.wheelFront =     Bodies.circle(pos.x + frontOffset.x, pos.y + frontOffset.y, this.vehicle.wheelRadius, {
      density: 0.0022,
      friction: 1,
      frictionStatic: 1.2,
      restitution: 0.05,
      collisionFilter: { group: this.group, category: CAT.PLAYER, mask: 0xffffffff },
      label: "wheel",
    });

    const cBack = Constraint.create({
      bodyA: this.chassis,
      pointA: { x: -23, y: 14 },
      bodyB: this.wheelBack,
      stiffness: Math.max(0.42, this.vehicle.suspension - this.upgrades.suspension * 0.045),
      damping: 0.3,
      length: 2,
    });
    const cFront = Constraint.create({
      bodyA: this.chassis,
      pointA: { x: 23, y: 14 },
      bodyB: this.wheelFront,
      stiffness: Math.max(0.42, this.vehicle.suspension - this.upgrades.suspension * 0.045),
      damping: 0.3,
      length: 2,
    });

    this.constraints = [cBack, cFront];
    (this.wheelBack.plugin as { isPlayer?: boolean }).isPlayer = true;
    (this.wheelFront.plugin as { isPlayer?: boolean }).isPlayer = true;
    World.add(this.world, [this.wheelBack, this.wheelFront, cBack, cFront]);
    Body.setVelocity(this.wheelBack, this.chassis.velocity);
    Body.setVelocity(this.wheelFront, this.chassis.velocity);
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

  switchForm(target: MovementForm, magnetSurfaces: MagnetSurfaceInfo[], glideAllowed = false) {
    if (this.form === target || this.formCooldown > 0) return;
    if (target === "glide" && !glideAllowed) return;
    if (this.form === "magnet" && this.attachedSurface) this.detachMagnet(true);
    this.form = target;
    this.formCooldown = 0.22;
    this.transformFlash = 1;

    this.wingT = 0;
    if (target === "glide") {
      const liftVelocity = Math.min(this.chassis.velocity.y, -6.2);
      for (const body of [this.chassis, this.wheelBack, this.wheelFront]) {
        if (body) Body.setVelocity(body, { x: body.velocity.x, y: liftVelocity });
      }
      this.airTime = 0;
    }
    if (target === "magnet") {
      for (const surf of magnetSurfaces) {
        if (this.nearMagnetZones.has(surf.id)) {
          this.tryAttach(surf);
          break;
        }
      }
    }
    this.events.onFormChange?.(this.form);
  }

  private tryAttach(surf: MagnetSurfaceInfo) {
    this.attachedSurface = surf;
    const rel = { x: this.chassis.position.x - surf.x1, y: this.chassis.position.y - surf.y1 };
    this.magnetT = rel.x * surf.tx + rel.y * surf.ty;
    this.magnetT = Matter.Common.clamp(this.magnetT, 8, surf.length - 8);
    this.magnetSide = Math.sign(rel.x * surf.nx + rel.y * surf.ny) >= 0 ? 1 : -1;
    this.events.onMagnetAttach?.();
  }

  private detachMagnet(silent = false) {
    if (!this.attachedSurface) return;
    const surf = this.attachedSurface;
    this.attachedSurface = null;
    // push slightly away from surface so we don't instantly re-collide
    const push = Matter.Vector.mult({ x: surf.nx, y: surf.ny }, this.magnetSide * 8);
    this.moveVehicle(push, 0);
    if (!silent) this.events.onMagnetDetach?.();
  }

  respawn(x: number, y: number) {
    this.detachMagnet(true);
    this.form = "roll";
    this.attachedSurface = null;
    this.nearMagnetZones.clear();
    this.magnetGlow = 0;
    this.formCooldown = 0;
    Body.setPosition(this.chassis, { x, y: y - 10 });
    Body.setVelocity(this.chassis, { x: 0, y: 0 });
    Body.setAngularVelocity(this.chassis, 0);
    Body.setAngle(this.chassis, 0);
    if (this.wheelBack && this.wheelFront) {
      const backOffset = { x: x - 23, y: y + 14 };
      const frontOffset = { x: x + 23, y: y + 14 };
      Body.setPosition(this.wheelBack, backOffset);
      Body.setPosition(this.wheelFront, frontOffset);
      Body.setVelocity(this.wheelBack, { x: 0, y: 0 });
      Body.setVelocity(this.wheelFront, { x: 0, y: 0 });
      Body.setAngle(this.wheelBack, 0);
      Body.setAngle(this.wheelFront, 0);
      Body.setAngularVelocity(this.wheelBack, 0);
      Body.setAngularVelocity(this.wheelFront, 0);
    }
    this.grounded = false;
    this.groundedTimer = 0;
    this.jumpBufferTimer = 0;
    this.airTime = 0;
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

    const enginePower = this.vehicle.drive + this.upgrades.engine * 0.035;
    const topSpeed = this.vehicle.maxSpeed + this.upgrades.engine * 0.8;
    const horizontalDrive = steer * (this.grounded ? enginePower : enginePower * 0.28);
    const coastingSpeed = steer === 0 ? this.chassis.velocity.x * 0.997 : this.chassis.velocity.x;
    const horizontalSpeed = Matter.Common.clamp(coastingSpeed + horizontalDrive, -topSpeed, topSpeed);
    Body.setVelocity(this.chassis, { x: horizontalSpeed, y: this.chassis.velocity.y });
    if (this.wheelBack) Body.setVelocity(this.wheelBack, { x: horizontalSpeed, y: this.wheelBack.velocity.y });
    if (this.wheelFront) Body.setVelocity(this.wheelFront, { x: horizontalSpeed, y: this.wheelFront.velocity.y });
    const targetWheelSpin = horizontalSpeed / this.vehicle.wheelRadius;
    for (const wheel of [this.wheelBack, this.wheelFront]) {
      if (wheel) {
        Body.setAngularVelocity(wheel, wheel.angularVelocity + (targetWheelSpin - wheel.angularVelocity) * 0.35);
      }
    }

    // Give the player a small air-roll correction for cleaner landings.
    if (!this.grounded) {
      Body.setAngularVelocity(this.chassis, Matter.Common.clamp(this.chassis.angularVelocity * 0.96 + steer * 0.012, -0.18, 0.18));
    } else {
      const uprightAngle = normalizeAngle(this.chassis.angle);
      Body.setAngularVelocity(this.chassis, Matter.Common.clamp(
        this.chassis.angularVelocity * 0.72 - uprightAngle * 0.045,
        -0.16,
        0.16
      ));
    }

    if (this.jumpBufferTimer > 0 && this.grounded) {
      const jumpVy = -(this.vehicle.jump + this.upgrades.jump * 0.55);
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
    this.wingT = Math.min(1, this.wingT + dtSec * 4);

    const steer = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    const vx = Matter.Common.clamp(this.chassis.velocity.x + steer * 0.12, -this.vehicle.maxSpeed, this.vehicle.maxSpeed);

    let vy = this.chassis.velocity.y;
    if (input.jumpPressed) vy = Math.min(vy - 2.4 - this.upgrades.jump * 0.08, -3);
    else if (input.jumpHeld) vy -= 0.48 + this.upgrades.jump * 0.025;
    vy = Matter.Common.clamp(vy, -5.5, 6.2);

    for (const body of [this.chassis, this.wheelBack, this.wheelFront]) {
      if (body) Body.setVelocity(body, { x: vx, y: vy });
    }

    // bank angle follows vertical speed + steer for visual feedback
    const targetAngle = Matter.Common.clamp(vy * 0.05 + steer * 0.18, -0.55, 0.55);
    Body.setAngle(this.chassis, this.chassis.angle + (targetAngle - this.chassis.angle) * 0.18);
    Body.setAngularVelocity(this.chassis, 0);

    this.grounded = this.groundedTimer > 0;
    this.groundedTimer = Math.max(0, this.groundedTimer - dtSec);
    if (this.grounded && this.chassis.velocity.y >= 0 && this.airTime > 0.35) {
      this.switchForm("roll", []);
    }
    this.airTime += dtSec;
  }

  private updateMagnet(dtSec: number, input: InputState, magnetSurfaces: MagnetSurfaceInfo[]) {
    this.magnetGlow = Math.min(1, this.magnetGlow + dtSec * 5);

    if (!this.attachedSurface) {
      const steer = (input.right ? 1 : 0) - (input.left ? 1 : 0);
      const drive = this.vehicle.drive + this.upgrades.engine * 0.035;
      const vx = Matter.Common.clamp(this.chassis.velocity.x + steer * drive * 0.6, -this.vehicle.maxSpeed, this.vehicle.maxSpeed);
      Body.setVelocity(this.chassis, { x: vx, y: Matter.Common.clamp(this.chassis.velocity.y, -12, 12) });

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

    const surf = this.attachedSurface;

    if (input.jumpPressed) {
      this.detachMagnet();
      const steer = (input.right ? 1 : 0) - (input.left ? 1 : 0);
      const velocity = {
        x: surf.nx * this.magnetSide * 6 + surf.tx * steer * 2,
        y: surf.ny * this.magnetSide * 6 + surf.ty * steer * 2,
      };
      for (const body of [this.chassis, this.wheelBack, this.wheelFront]) {
        if (body) Body.setVelocity(body, velocity);
      }
      return;
    }

    const direction = {
      x: Number(input.right) - Number(input.left),
      y: Number(input.down) - Number(input.up),
    };
    const speedPerStep = 3.4;
    const amount = (direction.x * surf.tx + direction.y * surf.ty) * speedPerStep;
    let nextT = Matter.Common.clamp(this.magnetT + amount, 0, surf.length);
    const endpoint = this.magnetT + amount < 0
      ? "start"
      : this.magnetT + amount > surf.length
        ? "end"
        : this.magnetT <= 1
          ? "start"
          : this.magnetT >= surf.length - 1
            ? "end"
            : null;
    if (endpoint && (direction.x !== 0 || direction.y !== 0)) {
      const atStart = endpoint === "start";
      const joint = atStart ? { x: surf.x1, y: surf.y1 } : { x: surf.x2, y: surf.y2 };
      const requestLength = Math.hypot(direction.x, direction.y) || 1;
      const request = { x: direction.x / requestLength, y: direction.y / requestLength };
      const route = magnetSurfaces
        .filter((candidate) => candidate.id !== surf.id)
        .map((candidate) => {
          const startsAtJoint = Math.hypot(candidate.x1 - joint.x, candidate.y1 - joint.y) <= 24;
          const endsAtJoint = Math.hypot(candidate.x2 - joint.x, candidate.y2 - joint.y) <= 24;
          const outgoing = startsAtJoint
            ? { x: candidate.tx, y: candidate.ty }
            : endsAtJoint
              ? { x: -candidate.tx, y: -candidate.ty }
              : null;
          return { candidate, startsAtJoint, endsAtJoint, outgoing };
        })
        .filter((candidate) => candidate.outgoing !== null)
        .map((candidate) => ({
          ...candidate,
          alignment: candidate.outgoing!.x * request.x + candidate.outgoing!.y * request.y,
        }))
        .sort((a, b) => b.alignment - a.alignment)[0];

      if (route && route.alignment > 0.5) {
        const previousNormal = { x: surf.nx * this.magnetSide, y: surf.ny * this.magnetSide };
        const nextSide = route.candidate.nx * previousNormal.x + route.candidate.ny * previousNormal.y >= 0 ? 1 : -1;
        this.attachedSurface = route.candidate;
        this.magnetSide = nextSide;
        nextT = route.startsAtJoint ? 0 : route.candidate.length;
      }
    }

    const activeSurface = this.attachedSurface ?? surf;
    this.magnetT = nextT;
    const attachDist = 50;
    const targetX = activeSurface.x1 + activeSurface.tx * this.magnetT + activeSurface.nx * this.magnetSide * attachDist;
    const targetY = activeSurface.y1 + activeSurface.ty * this.magnetT + activeSurface.ny * this.magnetSide * attachDist;
    const delta = { x: targetX - this.chassis.position.x, y: targetY - this.chassis.position.y };
    const targetAngle = Math.atan2(activeSurface.ty, activeSurface.tx);
    const angleDelta = normalizeAngle(targetAngle - this.chassis.angle);
    this.moveVehicle(delta, angleDelta);
    const routeSpeed = (direction.x * activeSurface.tx + direction.y * activeSurface.ty) * speedPerStep;
    const velocity = { x: activeSurface.tx * routeSpeed, y: activeSurface.ty * routeSpeed };
    for (const body of [this.chassis, this.wheelBack, this.wheelFront]) {
      if (body) Body.setVelocity(body, velocity);
    }

    this.grounded = true;
    this.groundedTimer = 0.15;
  }



  private moveVehicle(delta: Matter.Vector, angleDelta: number) {
    const origin = this.chassis.position;
    const bodies = [this.chassis, this.wheelBack, this.wheelFront];
    for (const body of bodies) {
      if (!body) continue;
      const relative = Matter.Vector.sub(body.position, origin);
      const rotated = Matter.Vector.rotate(relative, angleDelta);
      Body.setPosition(body, {
        x: origin.x + delta.x + rotated.x,
        y: origin.y + delta.y + rotated.y,
      });
      Body.setAngle(body, body.angle + angleDelta);
      Body.setAngularVelocity(body, 0);
    }
  }

  markGroundContact(surfaceNormalY: number) {
    if (surfaceNormalY > -0.35) return;
    if (this.form === "glide" && this.chassis.velocity.y < 0.2) return;
    this.groundedTimer = 0.16;
  }

  speedKph() {
    const v = this.wheelBack?.velocity ?? this.chassis.velocity;
    return Math.round(Math.hypot(v.x, v.y) * 3.1);
  }
}
