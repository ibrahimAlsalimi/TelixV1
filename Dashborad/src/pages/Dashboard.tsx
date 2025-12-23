import { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/StatusBadge";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { TrendingUp, Thermometer, Maximize2, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AddChartDialog } from "@/components/AddChartDialog";
import { ChartExpandModal } from "@/components/ChartExpandModal";
import { api, ApiDevice, timeRanges } from "@/utils/api";
import { useToast } from "@/hooks/use-toast";

interface DashboardSensor {
  id: string;
  name: string;
  type: string;
  dataType: string;
  unit: string;
  currentValue: number;
  maxValue24h: number;
  lastUpdate: Date;
  status: "online" | "offline" | "error" | "warning";
  readings: { timestamp: Date; value: number }[];
  selectedTimeRange: string;
}

const STORAGE_KEY = "dashboard-sensors";
const POLL_INTERVAL = 3000; // 3 seconds

// Helper function to get unit based on data_type
const getUnitFromDataType = (dataType: string): string => {
  const lowerDataType = dataType.toLowerCase();
  
  switch (lowerDataType) {
    case "light":
      return "lx";
    case "temperature":
      return "°C";
    case "humidity":
      return "%";
    case "pressure":
      return "hPa";
    case "altitude":
      return "m";
    case "gas":
      return "kOhm"; // or "ppm" depending on sensor
    default:
      return ""; // No unit for unknown types
  }
};

const Dashboard = () => {
  const [sensors, setSensors] = useState<DashboardSensor[]>([]);
  const [isLoading, setIsLoading] = useState<Record<string, boolean>>({});
  const [expandedChart, setExpandedChart] = useState<DashboardSensor | null>(null);
  const [isPolling, setIsPolling] = useState(true);
  const { toast } = useToast();
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const reloadSensorData = useCallback(async (
    deviceId: string,
    dataType: string,
    timeRange: string = "24h",
    showLoading: boolean = true
  ) => {
    try {
      if (showLoading) {
        setIsLoading((prev) => ({ ...prev, [deviceId]: true }));
      }

      const readings = await api.getSensorReadings(deviceId, timeRange, dataType);

      const chartData = readings.map((r) => ({
        timestamp: new Date(r.timestamp),
        value: r.value,
      }));

      const currentValue = chartData.length > 0 ? chartData[chartData.length - 1].value : 0;
      const maxValue = Math.max(...chartData.map((r) => r.value), 0);

      const deviceDetails = await api.getDeviceDetails(deviceId);

      // Get the correct unit based on data_type
      const unit = getUnitFromDataType(dataType);

      const sensor: DashboardSensor = {
        id: deviceId,
        name: deviceDetails.name,
        type: deviceDetails.type,
        dataType,
        unit,
        currentValue,
        maxValue24h: maxValue,
        lastUpdate: new Date(),
        status: deviceDetails.status as any,
        readings: chartData,
        selectedTimeRange: timeRange,
      };

      setSensors((prev) => {
        const existing = prev.find((s) => s.id === deviceId && s.dataType === dataType);
        if (existing) {
          return prev.map((s) =>
            s.id === deviceId && s.dataType === dataType ? sensor : s
          );
        }
        return [...prev, sensor];
      });
    } catch (error) {
      console.error("Failed to reload sensor data:", error);
    } finally {
      if (showLoading) {
        setIsLoading((prev) => ({ ...prev, [deviceId]: false }));
      }
    }
  }, []);

  // Load sensors from localStorage on mount
  useEffect(() => {
    const loadSensorsFromStorage = async () => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const storedSensors = JSON.parse(stored);
          for (const sensor of storedSensors) {
            await reloadSensorData(sensor.id, sensor.dataType, sensor.selectedTimeRange, false);
          }
        }
      } catch (error) {
        console.error("Failed to load sensors from storage:", error);
      }
    };
    loadSensorsFromStorage();
  }, [reloadSensorData]);

  // Save sensors to localStorage whenever they change
  useEffect(() => {
    if (sensors.length > 0) {
      const toStore = sensors.map((s) => ({
        id: s.id,
        name: s.name,
        type: s.type,
        dataType: s.dataType,
        status: s.status,
        selectedTimeRange: s.selectedTimeRange,
      }));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toStore));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [sensors]);

  // Polling for live updates
  const refreshAllCharts = useCallback(async () => {
    if (sensors.length === 0) return;
    
    try {
      await Promise.all(
        sensors.map((sensor) =>
          reloadSensorData(sensor.id, sensor.dataType, sensor.selectedTimeRange, false)
        )
      );
    } catch (error) {
      console.error("Failed to refresh charts:", error);
    }
  }, [sensors, reloadSensorData]);

  useEffect(() => {
    if (isPolling && sensors.length > 0) {
      pollIntervalRef.current = setInterval(refreshAllCharts, POLL_INTERVAL);
    }

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [isPolling, sensors.length, refreshAllCharts]);

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatLastUpdate = (date: Date) => {
    const seconds = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  };


  const handleAddDevice = async (device: ApiDevice, dataType: string) => {
    const exists = sensors.some(
      (s) => s.id === device.device_id && s.dataType === dataType
    );
    if (exists) {
      toast({
        title: "Already Added",
        description: `${device.name} (${dataType}) is already on the dashboard.`,
        variant: "destructive",
      });
      return;
    }

    try {
      await reloadSensorData(device.device_id, dataType, "24h");

      toast({
        title: "Chart Added",
        description: `${device.name} (${dataType}) has been added to the dashboard.`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add chart",
        variant: "destructive",
      });
    }
  };

  const handleTimeRangeChange = async (
    sensorId: string,
    dataType: string,
    timeRange: string
  ) => {
    try {
      setIsLoading((prev) => ({ ...prev, [sensorId]: true }));

      const readings = await api.getSensorReadings(sensorId, timeRange, dataType);

      const chartData = readings.map((r) => ({
        timestamp: new Date(r.timestamp),
        value: r.value,
      }));

      setSensors((prev) =>
        prev.map((sensor) =>
          sensor.id === sensorId && sensor.dataType === dataType
            ? {
                ...sensor,
                readings: chartData,
                selectedTimeRange: timeRange,
                currentValue: chartData.length > 0 ? chartData[chartData.length - 1].value : 0,
                maxValue24h: Math.max(...chartData.map((r) => r.value), 0),
                lastUpdate: new Date(),
              }
            : sensor
        )
      );
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update chart",
        variant: "destructive",
      });
    } finally {
      setIsLoading((prev) => ({ ...prev, [sensorId]: false }));
    }
  };

  const handleRemoveChart = (sensorId: string, dataType: string) => {
    setSensors((prev) => prev.filter((s) => !(s.id === sensorId && s.dataType === dataType)));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Telix
            </h1>
            <Badge variant="outline" className="text-xs">IoT Platform</Badge>
          </div>
          <h2 className="text-2xl font-semibold text-foreground">Data Visualization</h2>
          <p className="text-muted-foreground mt-1">Real-time sensor monitoring and analytics</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={isPolling ? "default" : "outline"}
            size="sm"
            onClick={() => setIsPolling(!isPolling)}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isPolling ? "animate-spin" : ""}`} />
            {isPolling ? "Live" : "Paused"}
          </Button>
          <AddChartDialog onDeviceSelect={handleAddDevice} />
        </div>
      </div>

      {sensors.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">
            No charts added yet. Click "Add New Chart" to get started.
          </p>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {sensors.map((sensor) => (
          <Card key={`${sensor.id}-${sensor.dataType}`} className="border-border bg-card relative">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <Thermometer className="h-5 w-5 text-primary" />
                  <CardTitle className="text-lg">{sensor.name}</CardTitle>
                </div>
                <StatusBadge status={sensor.status} />
              </div>
              <CardDescription className="text-muted-foreground">
                {sensor.type} • {sensor.dataType} • ID: {sensor.id}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Current Value</p>
                  <p className="text-2xl font-bold text-foreground">
                    {sensor.currentValue.toFixed(1)}
                    {sensor.unit && <span className="text-sm text-muted-foreground ml-1">{sensor.unit}</span>}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <TrendingUp className="h-3 w-3" />
                    Peak
                  </p>
                  <p className="text-2xl font-bold text-primary">
                    {sensor.maxValue24h.toFixed(1)}
                    {sensor.unit && <span className="text-sm text-muted-foreground ml-1">{sensor.unit}</span>}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {timeRanges.map((range) => (
                  <Button
                    key={range.value}
                    size="sm"
                    variant={sensor.selectedTimeRange === range.value ? "default" : "outline"}
                    onClick={() => handleTimeRangeChange(sensor.id, sensor.dataType, range.value)}
                    disabled={isLoading[sensor.id]}
                  >
                    {range.label}
                  </Button>
                ))}
              </div>

              <div className="pt-2">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-muted-foreground">
                    {timeRanges.find((r) => r.value === sensor.selectedTimeRange)?.label}
                  </p>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setExpandedChart(sensor)}
                    disabled={isLoading[sensor.id]}
                  >
                    <Maximize2 className="h-4 w-4" />
                  </Button>
                </div>
                
                {isLoading[sensor.id] ? (
                  <div className="flex items-center justify-center h-[120px]">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={120}>
                    <LineChart data={sensor.readings}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis
                        dataKey="timestamp"
                        tickFormatter={formatTime}
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={10}
                        tickLine={false}
                      />
                      <YAxis
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={10}
                        tickLine={false}
                        label={{ 
                          value: sensor.unit || '', 
                          angle: -90, 
                          position: 'insideLeft',
                          style: { textAnchor: 'middle', fill: 'hsl(var(--muted-foreground))', fontSize: 10 }
                        }}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "var(--radius)",
                        }}
                        labelFormatter={(value) => formatTime(new Date(value))}
                        formatter={(value: number) => [
                          value.toFixed(2) + (sensor.unit ? " " + sensor.unit : ""),
                          sensor.dataType,
                        ]}
                      />
                      <Line
                        type="monotone"
                        dataKey="value"
                        stroke="hsl(var(--primary))"
                        strokeWidth={2}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>

              <div className="pt-2 border-t border-border flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  Last update: {formatLastUpdate(sensor.lastUpdate)}
                </p>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleRemoveChart(sensor.id, sensor.dataType)}
                  className="text-destructive hover:text-destructive"
                >
                  Remove
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <ChartExpandModal
        open={expandedChart !== null}
        onOpenChange={(open) => !open && setExpandedChart(null)}
        title={expandedChart?.name || ""}
        unit={expandedChart?.unit || ""}
        data={expandedChart?.readings || []}
      />
    </div>
  );
};

export default Dashboard;
