import Matter from "matter-js";
import { CAT } from "./categories";
import {
  checkpoints,
  collectibles,
  finish,
  groundPolylines,
  hazards,
  hiddenCollectibles,
  magnetSegments,
  platforms,
  type MagnetSegment,
} from "../levelData";

const { Bodies } = Matter;

export interface MagnetSurfaceInfo {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  length: number;
  tx: number; // tangent unit vector
  ty: number;
  nx: number; // normal unit vector (points "outward" - arbitrary but consistent)
  ny: number;
  zoneBody: Matter.Body;
}

export interface BuiltWorld {
  staticBodies: Matter.Body[];
  sensorBodies: Matter.Body[];
  collectibleBodies: Map<string, Matter.Body>;
  hiddenBodies: Map<string, Matter.Body>;
  checkpointBodies: Map<string, Matter.Body>;
  hazardBodies: Matter.Body[];
  finishBody: Matter.Body;
  magnetSurfaces: MagnetSurfaceInfo[];
}

function segmentBody(x1: number, y1: number, x2: number, y2: number, thickness: number, label: string) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const length = Math.hypot(dx, dy) || 1;
  const angle = Math.atan2(dy, dx);
  const cx = (x1 + x2) / 2;
  const cy = (y1 + y2) / 2;
  const body = Bodies.rectangle(cx, cy, length, thickness, {
    isStatic: true,
    angle,
    friction: 0.85,
    frictionStatic: 1,
    restitution: 0,
    label,
    collisionFilter: { category: CAT.GROUND, mask: 0xffffffff },
    render: { visible: false },
  });
  return body;
}

export function buildWorld(): BuiltWorld {
  const staticBodies: Matter.Body[] = [];
  const sensorBodies: Matter.Body[] = [];

  // Ground chains
  for (const chain of groundPolylines) {
    for (let i = 0; i < chain.length - 1; i++) {
      const a = chain[i];
      const b = chain[i + 1];
      staticBodies.push(segmentBody(a.x, a.y, b.x, b.y, 36, "ground"));
    }
  }

  // Platforms
  for (const p of platforms) {
    const body = Bodies.rectangle(p.x + p.w / 2, p.y + p.h / 2, p.w, p.h, {
      isStatic: true,
      angle: p.angle ?? 0,
      friction: 0.9,
      label: "platform",
      collisionFilter: { category: CAT.GROUND, mask: 0xffffffff },
      render: { visible: false },
    });
    staticBodies.push(body);
  }

  // Magnet surfaces: solid thin body + wider sensor detection zone
  const magnetSurfaces: MagnetSurfaceInfo[] = [];
  for (const seg of magnetSegments as MagnetSegment[]) {
    const solid = segmentBody(seg.x1, seg.y1, seg.x2, seg.y2, 18, "magnet-surface");
    staticBodies.push(solid);

    const dx = seg.x2 - seg.x1;
    const dy = seg.y2 - seg.y1;
    const length = Math.hypot(dx, dy) || 1;
    const tx = dx / length;
    const ty = dy / length;
    // normal = tangent rotated 90deg
    const nx = -ty;
    const ny = tx;

    const cx = (seg.x1 + seg.x2) / 2;
    const cy = (seg.y1 + seg.y2) / 2;
    const angle = Math.atan2(dy, dx);
    const zoneBody = Bodies.rectangle(cx, cy, length + 40, 120, {
      isStatic: true,
      isSensor: true,
      angle,
      label: `magnet-zone:${seg.id}`,
      collisionFilter: { category: CAT.MAGNET_ZONE, mask: CAT.PLAYER },
      render: { visible: false },
    });
    sensorBodies.push(zoneBody);

    magnetSurfaces.push({ id: seg.id, x1: seg.x1, y1: seg.y1, x2: seg.x2, y2: seg.y2, length, tx, ty, nx, ny, zoneBody });
  }

  // Hazards
  const hazardBodies: Matter.Body[] = [];
  for (const h of hazards) {
    const body = Bodies.rectangle(h.x + h.w / 2, h.y + h.h / 2, h.w, h.h, {
      isStatic: true,
      isSensor: true,
      label: "hazard",
      collisionFilter: { category: CAT.HAZARD, mask: CAT.PLAYER },
      render: { visible: false },
    });
    hazardBodies.push(body);
    sensorBodies.push(body);
  }

  // Collectibles
  const collectibleBodies = new Map<string, Matter.Body>();
  for (const c of collectibles) {
    const body = Bodies.circle(c.x, c.y, 15, {
      isStatic: true,
      isSensor: true,
      label: `collectible:${c.id}`,
      collisionFilter: { category: CAT.COLLECTIBLE, mask: CAT.PLAYER },
      render: { visible: false },
    });
    collectibleBodies.set(c.id, body);
    sensorBodies.push(body);
  }

  const hiddenBodies = new Map<string, Matter.Body>();
  for (const c of hiddenCollectibles) {
    const body = Bodies.circle(c.x, c.y, 18, {
      isStatic: true,
      isSensor: true,
      label: `hidden:${c.id}`,
      collisionFilter: { category: CAT.COLLECTIBLE, mask: CAT.PLAYER },
      render: { visible: false },
    });
    hiddenBodies.set(c.id, body);
    sensorBodies.push(body);
  }

  // Checkpoints
  const checkpointBodies = new Map<string, Matter.Body>();
  for (const cp of checkpoints) {
    const body = Bodies.rectangle(cp.x, cp.y, 40, 140, {
      isStatic: true,
      isSensor: true,
      label: `checkpoint:${cp.id}`,
      collisionFilter: { category: CAT.CHECKPOINT, mask: CAT.PLAYER },
      render: { visible: false },
    });
    checkpointBodies.set(cp.id, body);
    sensorBodies.push(body);
  }

  // Finish
  const finishBody = Bodies.rectangle(finish.x, finish.y, finish.w, finish.h, {
    isStatic: true,
    isSensor: true,
    label: "finish",
    collisionFilter: { category: CAT.FINISH, mask: CAT.PLAYER },
    render: { visible: false },
  });
  sensorBodies.push(finishBody);

  return {
    staticBodies,
    sensorBodies,
    collectibleBodies,
    hiddenBodies,
    checkpointBodies,
    hazardBodies,
    finishBody,
    magnetSurfaces,
  };
}
