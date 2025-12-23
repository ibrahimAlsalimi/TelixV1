import { SensorData, Device, ControllableDevice } from "@/types/sensor";

// Generate mock sensor readings for the last 24 hours
const generateReadings = (baseValue: number, variance: number, points: number = 48) => {
  const readings = [];
  const now = new Date();
  
  for (let i = points; i >= 0; i--) {
    const timestamp = new Date(now.getTime() - i * 30 * 60 * 1000); // 30-minute intervals
    const value = baseValue + (Math.random() - 0.5) * variance;
    readings.push({ timestamp, value: Math.max(0, value) });
  }
  
  return readings;
};

export const mockSensors: SensorData[] = [
  {
    id: "temp-001",
    name: "Room Temperature",
    type: "Temperature",
    unit: "°C",
    currentValue: 22.5,
    maxValue24h: 24.8,
    lastUpdate: new Date(),
    status: "online",
    readings: generateReadings(22.5, 3),
  },
  {
    id: "hum-001",
    name: "Room Humidity",
    type: "Humidity",
    unit: "%",
    currentValue: 45.2,
    maxValue24h: 58.3,
    lastUpdate: new Date(Date.now() - 2 * 60 * 1000),
    status: "online",
    readings: generateReadings(45, 15),
  },
  {
    id: "press-001",
    name: "Atmospheric Pressure",
    type: "Pressure",
    unit: "hPa",
    currentValue: 1013.2,
    maxValue24h: 1015.7,
    lastUpdate: new Date(Date.now() - 5 * 60 * 1000),
    status: "online",
    readings: generateReadings(1013, 5),
  },
  {
    id: "co2-001",
    name: "CO2 Level",
    type: "Air Quality",
    unit: "ppm",
    currentValue: 420,
    maxValue24h: 680,
    lastUpdate: new Date(Date.now() - 1 * 60 * 1000),
    status: "warning",
    readings: generateReadings(420, 150),
  },
  {
    id: "light-001",
    name: "Light Intensity",
    type: "Light",
    unit: "lux",
    currentValue: 350,
    maxValue24h: 1200,
    lastUpdate: new Date(),
    status: "online",
    readings: generateReadings(350, 500),
  },
];

export const mockDevices: Device[] = [
  {
    id: "rpi-001",
    name: "Raspberry Pi 4 - Main Hub",
    type: "Controller",
    ipAddress: "192.168.1.100",
    status: "online",
    connectedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    lastSeen: new Date(),
  },
  {
    id: "esp32-001",
    name: "ESP32 - Sensor Node 1",
    type: "Sensor Node",
    ipAddress: "192.168.1.101",
    status: "online",
    connectedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    lastSeen: new Date(Date.now() - 1 * 60 * 1000),
  },
  {
    id: "esp32-002",
    name: "ESP32 - Sensor Node 2",
    type: "Sensor Node",
    ipAddress: "192.168.1.102",
    status: "online",
    connectedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    lastSeen: new Date(Date.now() - 30 * 1000),
  },
  {
    id: "arduino-001",
    name: "Arduino Nano - Environmental",
    type: "Sensor",
    ipAddress: "192.168.1.103",
    status: "offline",
    connectedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
    lastSeen: new Date(Date.now() - 2 * 60 * 60 * 1000),
  },
];

export const mockControllableDevices: ControllableDevice[] = [
  {
    id: "relay-001",
    name: "Living Room Light",
    type: "Light",
    state: true,
    status: "online",
  },
  {
    id: "relay-002",
    name: "Ventilation Fan",
    type: "Fan",
    state: false,
    status: "online",
  },
  {
    id: "relay-003",
    name: "Water Pump",
    type: "Pump",
    state: false,
    status: "online",
  },
  {
    id: "relay-004",
    name: "Heater",
    type: "Heater",
    state: true,
    status: "online",
  },
  {
    id: "relay-005",
    name: "Alarm System",
    type: "Security",
    state: false,
    status: "error",
  },
];
