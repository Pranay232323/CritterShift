export interface VehicleDefinition {
  id: string;
  name: string;
  description: string;
  cost: number;
  drive: number;
  maxSpeed: number;
  jump: number;
  suspension: number;
  wheelRadius: number;
  bodyWidth: number;
  bodyHeight: number;
}

export const VEHICLES: VehicleDefinition[] = [
  {
    id: "sprout",
    name: "Sprout Scout",
    description: "A balanced starter buggy with dependable grip.",
    cost: 0,
    drive: 0.19,
    maxSpeed: 13,
    jump: 8.8,
    suspension: 0.72,
    wheelRadius: 15,
    bodyWidth: 58,
    bodyHeight: 26,
  },
  {
    id: "bumble",
    name: "Bumble Buggy",
    description: "Extra torque and chunky tires for steep climbs.",
    cost: 80,
    drive: 0.25,
    maxSpeed: 15,
    jump: 8.2,
    suspension: 0.82,
    wheelRadius: 17,
    bodyWidth: 64,
    bodyHeight: 30,
  },
  {
    id: "cloudhopper",
    name: "Cloud Hopper",
    description: "A light chassis built for long jumps and gentle landings.",
    cost: 140,
    drive: 0.21,
    maxSpeed: 13.5,
    jump: 10.2,
    suspension: 0.76,
    wheelRadius: 14,
    bodyWidth: 54,
    bodyHeight: 24,
  },
];

export function getVehicle(id: string): VehicleDefinition {
  return VEHICLES.find((vehicle) => vehicle.id === id) ?? VEHICLES[0];
}
