// Collision category bitmasks shared across the physics world.
export const CAT = {
  GROUND: 0x0001,
  PLAYER: 0x0002,
  COLLECTIBLE: 0x0004,
  HAZARD: 0x0008,
  CHECKPOINT: 0x0010,
  FINISH: 0x0020,
  MAGNET_ZONE: 0x0040,
} as const;
