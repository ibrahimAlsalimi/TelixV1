// Replace with your backend server IP and port
// For local development: "http://localhost:5000/api"
// For network access: "http://YOUR_SERVER_IP:5000/api" (e.g., "http://192.168.1.100:5000/api")
const API_BASE_URL = "http://localhost:5000/api";

export interface ApiDevice {
  device_id: string;
  name: string;
  type: string;
  ip_address?: string;
  status: "online" | "offline" | "error";
  connected_at?: string;
  last_seen?: string;
  data_types?: string[];
  command_types?: string[];
  ssid?: string;
  ip?: string;
  pub_topic?: string;
  sub_topic?: string;
}

export interface SensorReading {
  timestamp: string;
  value: number;
}

export interface TimeRange {
  label: string;
  value: string;
  hours?: number;
}

export const timeRanges: TimeRange[] = [
  { label: "Last 24 Hours", value: "24h", hours: 24 },
  { label: "Last Week", value: "7d", hours: 168 },
  { label: "Last Month", value: "30d", hours: 720 },
];

// Helper to parse JSON array fields from DB
const parseJsonArray = (value: unknown): string[] => {
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
};

// Normalize status strings to lower-case and default to offline
const normalizeStatus = (status: unknown): "online" | "offline" | "error" | string => {
  if (typeof status === "string") return status.toLowerCase();
  return "offline";
};

// Helper to normalize device data from API
const normalizeDevice = (device: any): ApiDevice => ({
  ...device,
  status: normalizeStatus(device.status) as any,
  data_types: parseJsonArray(device.data_types),
  command_types: parseJsonArray(device.commands || device.command_types),
});

// Helper for safe fetch with error handling
const safeFetch = async (url: string, options?: RequestInit): Promise<Response> => {
  try {
    const response = await fetch(url, options);
    return response;
  } catch (error) {
    // Network error, CORS, or connection refused
    throw new Error(`Network error: Unable to connect to backend at ${API_BASE_URL}. Is the server running?`);
  }
};

export const api = {
  async getDevices(): Promise<ApiDevice[]> {
    const response = await safeFetch(`${API_BASE_URL}/devices`);
    if (!response.ok) {
      throw new Error(`Failed to fetch devices: ${response.status}`);
    }
    const data = await response.json();
    return Array.isArray(data) ? data.map(normalizeDevice) : [];
  },

  async getClients(): Promise<ApiDevice[]> {
    // Use same endpoint as getDevices for client list
    return this.getDevices();
  },

  async getDeviceDataTypes(deviceId: string): Promise<string[]> {
    const response = await safeFetch(`${API_BASE_URL}/devices/${deviceId}/datatypes`);
    if (!response.ok) {
      throw new Error(`Failed to fetch data types: ${response.status}`);
    }
    const data = await response.json();
    return Array.isArray(data) ? data : [];
  },

  async getSensorReadings(
    deviceId: string,
    timeRange: string = "24h",
    dataType?: string
  ): Promise<SensorReading[]> {
    const params = new URLSearchParams({ range: timeRange });
    if (dataType) params.append("type", dataType);
    
    const response = await safeFetch(
      `${API_BASE_URL}/devices/${deviceId}/readings?${params.toString()}`
    );
    if (!response.ok) {
      throw new Error(`Failed to fetch sensor readings: ${response.status}`);
    }
    const data = await response.json();
    return Array.isArray(data) ? data : [];
  },

  async getDeviceDetails(deviceId: string): Promise<ApiDevice> {
    const response = await safeFetch(`${API_BASE_URL}/devices/${deviceId}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch device details: ${response.status}`);
    }
    const data = await response.json();
    return normalizeDevice(data);
  },

  async sendDeviceCommand(deviceId: string, command: string | number): Promise<void> {
    const response = await safeFetch(`${API_BASE_URL}/devices/${deviceId}/command`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ command }),
    });
    if (!response.ok) {
      throw new Error(`Failed to send command: ${response.status}`);
    }
  },

  async getControllableDevices(): Promise<ApiDevice[]> {
    const response = await safeFetch(`${API_BASE_URL}/devices/commandable`);
    if (!response.ok) {
      throw new Error(`Failed to fetch controllable devices: ${response.status}`);
    }
    const data = await response.json();
    return Array.isArray(data) ? data.map(normalizeDevice) : [];
  },
};
