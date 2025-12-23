export interface SensorData {
  id: string;
  name: string;
  type: string;
  unit: string;
  currentValue: number;
  maxValue24h: number;
  lastUpdate: Date;
  status: "online" | "offline" | "error" | "warning";
  readings: SensorReading[];
}

export interface SensorReading {
  timestamp: Date;
  value: number;
}

export interface Device {
  id: string;
  name: string;
  type: string;
  ipAddress: string;
  status: "online" | "offline" | "error";
  connectedAt: Date;
  lastSeen: Date;
}

export interface ControllableDevice {
  id: string;
  name: string;
  type: string;
  state: boolean;
  status: "online" | "offline" | "error";
}
