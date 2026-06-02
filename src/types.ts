export type Point = {
  id: string;
  name: string;
  location: google.maps.LatLngLiteral;
  type: 'loading' | 'unloading' | 'transit' | 'custom';
  company?: string;
  sequenceIndex: number;
};

export type TruckDimensions = {
  width: number;
  height: number;
  length: number;
};

export type CargoItem = {
  id: string;
  name: string;
  width: number;
  height: number;
  length: number;
  color: string;
  position: [number, number, number]; // x, y, z
  rotation: [number, number, number]; // x, y, z
  pointId?: string; // Reference to the Point ID
};

export type Trip = {
  id: string;
  name: string; // e.g. Client name
  createdAt: number;
  points: Point[];
  unmappedAddresses?: ParsedWaypoint[];
  truckDimensions?: TruckDimensions;
  cargoItems?: CargoItem[];
};

export type RouteSegment = {
  fromId: string;
  toId: string;
  path: google.maps.LatLngLiteral[];
  color: string;
  distance: string;
  duration: string;
  avoidTolls: boolean;
  waypoints?: Point[];
};

export type ParsedWaypoint = {
  type: string;
  address: string;
  company?: string;
};
