import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { api, ApiDevice } from "@/utils/api";
import { Plus, Zap, Lightbulb, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ControlWidget {
  id: string;
  device: ApiDevice;
  state: boolean | number;
  controlType: "switch" | "slider";
}

const STORAGE_KEY = "control-widgets";

const Control = () => {
  const [widgets, setWidgets] = useState<ControlWidget[]>([]);
  const [controllableDevices, setControllableDevices] = useState<ApiDevice[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState<Record<string, boolean>>({});

  // Load widgets from localStorage on mount
  useEffect(() => {
    const loadWidgets = async () => {
      setIsLoading(true);
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const storedWidgets = JSON.parse(stored);
          // Keep stored widgets with their cached device data, don't require API refresh
          const loadedWidgets: ControlWidget[] = [];
          for (const w of storedWidgets) {
            try {
              const device = await api.getDeviceDetails(w.deviceId);
              if (device && device.command_types && device.command_types.length > 0) {
                loadedWidgets.push({
                  id: w.id,
                  device,
                  state: w.state,
                  controlType: w.controlType,
                });
              }
            } catch {
              // API failed, keep widget with minimal device data
              loadedWidgets.push({
                id: w.id,
                device: {
                  device_id: w.deviceId,
                  name: w.deviceName || "Unknown Device",
                  type: w.deviceType || "Unknown",
                  status: "offline",
                  data_types: [],
                  command_types: w.commandTypes || [],
                },
                state: w.state,
                controlType: w.controlType,
              });
            }
          }
          setWidgets(loadedWidgets);
        }
      } catch (error) {
        console.error("Failed to load widgets:", error);
      } finally {
        setIsLoading(false);
      }
    };
    loadWidgets();
  }, []);

  // Save widgets to localStorage whenever they change
  useEffect(() => {
    if (!isLoading) {
      const toStore = widgets.map((w) => ({
        id: w.id,
        deviceId: w.device.device_id,
        deviceName: w.device.name,
        deviceType: w.device.type,
        commandTypes: w.device.command_types,
        state: w.state,
        controlType: w.controlType,
      }));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toStore));
    }
  }, [widgets, isLoading]);

  // Load controllable devices when dialog opens
  useEffect(() => {
    if (isDialogOpen) {
      loadControllableDevices();
    }
  }, [isDialogOpen]);

  const loadControllableDevices = async () => {
    try {
      const devices = await api.getControllableDevices();
      // Filter out devices that already have widgets
      const existingDeviceIds = widgets.map((w) => w.device.device_id);
      const available = (devices || []).filter((d) => !existingDeviceIds.includes(d.device_id));
      setControllableDevices(available);
    } catch (error) {
      console.error("Failed to load controllable devices:", error);
      toast.error("Failed to load devices. Check if the backend is running.");
      setControllableDevices([]);
    }
  };

  const getControlType = (commandTypes: string[]): "switch" | "slider" | null => {
    if (!commandTypes || commandTypes.length === 0) return null;
    const lower = commandTypes.map((c) => c.toLowerCase());
    // Check for numeric/slider types first
    if (lower.includes("int") || lower.includes("integer") || lower.includes("brightness") || 
        lower.includes("level") || lower.includes("percent") || lower.includes("value")) {
      return "slider";
    }
    // Check for boolean/switch types
    if (lower.includes("switch") || lower.includes("toggle") || lower.includes("bool") || 
        lower.includes("boolean") || lower.includes("on") || lower.includes("off")) {
      return "switch";
    }
    // Default to switch if none match but has commands
    return "switch";
  };

  // Detect command format from command types
  const getCommandForState = (commandTypes: string[], newState: boolean | number): string | number => {
    if (typeof newState === "number") {
      return newState;
    }
    const lower = commandTypes.map((c) => c.toLowerCase());
    // Check if device uses numeric commands (0/1) instead of text
    if (lower.includes("int") || lower.includes("integer") || lower.includes("numeric")) {
      return newState ? 1 : 0;
    }
    // Check for specific command formats
    if (lower.includes("on") || lower.includes("off")) {
      return newState ? "ON" : "OFF";
    }
    // Default to ON/OFF
    return newState ? "ON" : "OFF";
  };

  const handleAddWidget = () => {
    if (!selectedDeviceId) return;

    const device = controllableDevices.find((d) => d.device_id === selectedDeviceId);
    if (!device || !device.command_types) return;

    const controlType = getControlType(device.command_types);
    if (!controlType) return;

    const newWidget: ControlWidget = {
      id: `${device.device_id}-${Date.now()}`,
      device,
      state: controlType === "switch" ? false : 50,
      controlType,
    };

    setWidgets((prev) => [...prev, newWidget]);
    setSelectedDeviceId("");
    setIsDialogOpen(false);
    toast.success(`${device.name} control added`);
  };

  const handleRemoveWidget = (widgetId: string) => {
    setWidgets((prev) => prev.filter((w) => w.id !== widgetId));
    toast.success("Control removed");
  };

  const handleSwitchToggle = async (widget: ControlWidget, newState: boolean) => {
    setIsSending((prev) => ({ ...prev, [widget.id]: true }));
    
    try {
      // Detect command format from device command types
      const command = getCommandForState(
        widget.device.command_types || [],
        newState
      );
      
      await api.sendDeviceCommand(widget.device.device_id, command);
      
      // Update local state with the actual new state (not inverted)
      setWidgets((prev) =>
        prev.map((w) => (w.id === widget.id ? { ...w, state: newState } : w))
      );

      const commandStr = typeof command === "number" ? command : (command ? "ON" : "OFF");
      toast.success(`${widget.device.name} turned ${commandStr}`);
    } catch (error) {
      toast.error("Failed to send command");
      // Revert state on error
      setWidgets((prev) =>
        prev.map((w) => (w.id === widget.id ? { ...w, state: !newState } : w))
      );
    } finally {
      setIsSending((prev) => ({ ...prev, [widget.id]: false }));
    }
  };

  const handleSliderChange = async (widget: ControlWidget, value: number[]) => {
    const newValue = value[0];
    
    // Update local state immediately for responsiveness
    setWidgets((prev) =>
      prev.map((w) => (w.id === widget.id ? { ...w, state: newValue } : w))
    );
  };

  const handleSliderCommit = async (widget: ControlWidget, value: number[]) => {
    const newValue = value[0];
    setIsSending((prev) => ({ ...prev, [widget.id]: true }));

    try {
      await api.sendDeviceCommand(widget.device.device_id, newValue);
      toast.success(`${widget.device.name} set to ${newValue}`);
    } catch (error) {
      toast.error("Failed to send command");
    } finally {
      setIsSending((prev) => ({ ...prev, [widget.id]: false }));
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Control Center</h1>
          <p className="text-muted-foreground mt-1">Remote control your IoT devices</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Add Control
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border">
            <DialogHeader>
              <DialogTitle>Add Device Control</DialogTitle>
              <DialogDescription>
                Select a controllable device to add to your control panel.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Select Device</label>
                <Select value={selectedDeviceId} onValueChange={setSelectedDeviceId}>
                  <SelectTrigger className="bg-background border-border">
                    <SelectValue placeholder="Choose a device..." />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border z-50">
                    {controllableDevices.length === 0 ? (
                      <div className="p-4 text-center text-sm text-muted-foreground">
                        No controllable devices available
                      </div>
                    ) : (
                      controllableDevices.map((device) => (
                        <SelectItem key={device.device_id} value={device.device_id}>
                          <div className="flex items-center gap-2">
                            <span>{device.name}</span>
                            <span className="text-xs text-muted-foreground">
                              ({device.command_types?.join(", ")})
                            </span>
                          </div>
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              {selectedDeviceId && (
                <div className="p-3 rounded-lg bg-secondary/50 text-sm">
                  {(() => {
                    const device = controllableDevices.find(
                      (d) => d.device_id === selectedDeviceId
                    );
                    if (!device?.command_types) return null;
                    const controlType = getControlType(device.command_types);
                    return (
                      <p className="text-muted-foreground">
                        This device will use a{" "}
                        <span className="font-medium text-foreground">
                          {controlType === "switch" ? "Toggle Switch" : "Slider"}
                        </span>{" "}
                        control.
                      </p>
                    );
                  })()}
                </div>
              )}

              <Button
                onClick={handleAddWidget}
                disabled={!selectedDeviceId}
                className="w-full"
              >
                Add Control
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {widgets.length === 0 && (
        <div className="text-center py-12">
          <Zap className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground mb-4">
            No control widgets added yet. Click "Add Control" to get started.
          </p>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {widgets.map((widget) => {
          const isOnline = widget.device.status?.toString().toLowerCase() === "online";

          return (
            <Card key={widget.id} className="border-border bg-card">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className={`p-2 rounded-lg ${
                        widget.state && isOnline ? "bg-primary/20" : "bg-muted"
                      }`}
                    >
                      <Lightbulb
                        className={`h-5 w-5 ${
                          widget.state && isOnline
                            ? "text-primary"
                            : "text-muted-foreground"
                        }`}
                      />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{widget.device.name}</CardTitle>
                      <CardDescription className="text-muted-foreground text-xs mt-1">
                        {widget.device.type}
                      </CardDescription>
                    </div>
                  </div>
                  <StatusBadge status={widget.device.status} />
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {widget.controlType === "switch" ? (
                  <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-secondary/30">
                    <div>
                      <p className="text-sm font-medium text-foreground">Power</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {widget.state ? "Currently ON" : "Currently OFF"}
                      </p>
                    </div>
                    <Switch
                      checked={widget.state as boolean}
                      onCheckedChange={(checked) => handleSwitchToggle(widget, checked)}
                      disabled={!isOnline || isSending[widget.id]}
                    />
                  </div>
                ) : (
                  <div className="p-4 rounded-lg border border-border bg-secondary/30 space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-foreground">Level</p>
                      <p className="text-lg font-bold text-primary">{widget.state}%</p>
                    </div>
                    <Slider
                      value={[widget.state as number]}
                      onValueChange={(value) => handleSliderChange(widget, value)}
                      onValueCommit={(value) => handleSliderCommit(widget, value)}
                      max={100}
                      step={1}
                      disabled={!isOnline || isSending[widget.id]}
                      className="w-full"
                    />
                  </div>
                )}

                {!isOnline && (
                  <p className="text-xs text-destructive">
                    Device is {widget.device.status}. Control disabled.
                  </p>
                )}

                <div className="pt-2 border-t border-border flex items-center justify-between">
                  <p className="text-xs text-muted-foreground font-mono">
                    ID: {widget.device.device_id}
                  </p>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleRemoveWidget(widget.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default Control;
