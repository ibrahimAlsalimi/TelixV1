import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Trash2, PlayCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { api, ApiDevice } from "@/utils/api";

interface AutomationRule {
  id: string;
  name: string;
  enabled: boolean;
  sensorDeviceId: string;
  sensorDataType: string;
  condition: "above" | "below" | "equals";
  threshold: number;
  actionType: "device_command" | "telegram" | "notification";
  targetDeviceId?: string;
  command?: string | number;
  message?: string;
}

const STORAGE_KEY = "automation-rules";

const Actions = () => {
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [devices, setDevices] = useState<ApiDevice[]>([]);
  const [sensorDevices, setSensorDevices] = useState<ApiDevice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState<string | null>(null);
  
  // Form state
  const [formData, setFormData] = useState<Partial<AutomationRule>>({
    name: "",
    enabled: true,
    sensorDeviceId: "",
    sensorDataType: "",
    condition: "above",
    threshold: 0,
    actionType: "device_command",
    targetDeviceId: "",
    command: "",
    message: "",
  });

  useEffect(() => {
    loadRules();
    loadDevices();
  }, []);

  useEffect(() => {
    // Start checking rules periodically
    const interval = setInterval(checkRules, 5000); // Check every 5 seconds
    return () => clearInterval(interval);
  }, [rules, devices]);

  const loadRules = () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setRules(JSON.parse(stored));
      }
    } catch (error) {
      console.error("Failed to load rules:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveRules = (newRules: AutomationRule[]) => {
    setRules(newRules);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newRules));
  };

  const loadDevices = async () => {
    try {
      const allDevices = await api.getDevices();
      setDevices(allDevices);
      
      // Filter devices that have data types (sensors)
      const sensors = allDevices.filter(d => d.data_types && d.data_types.length > 0);
      setSensorDevices(sensors);
    } catch (error) {
      console.error("Failed to load devices:", error);
      toast.error("Failed to load devices");
    }
  };

  const checkRules = async () => {
    for (const rule of rules) {
      if (!rule.enabled) continue;

      try {
        // Get latest sensor reading
        const readings = await api.getSensorReadings(
          rule.sensorDeviceId,
          "1h",
          rule.sensorDataType
        );

        if (readings.length === 0) continue;

        const latestReading = readings[readings.length - 1];
        const value = latestReading.value;

        // Check condition
        let conditionMet = false;
        switch (rule.condition) {
          case "above":
            conditionMet = value > rule.threshold;
            break;
          case "below":
            conditionMet = value < rule.threshold;
            break;
          case "equals":
            conditionMet = Math.abs(value - rule.threshold) < 0.1;
            break;
        }

        if (conditionMet) {
          await executeRule(rule);
        }
      } catch (error) {
        console.error(`Error checking rule ${rule.id}:`, error);
      }
    }
  };

  const executeRule = async (rule: AutomationRule) => {
    try {
      switch (rule.actionType) {
        case "device_command":
          if (rule.targetDeviceId && rule.command !== undefined) {
            await api.sendDeviceCommand(rule.targetDeviceId, rule.command);
            toast.success(`Rule "${rule.name}" executed: Command sent to device`);
          }
          break;
        case "telegram":
          // TODO: Implement Telegram notification
          toast.info(`Rule "${rule.name}" triggered: ${rule.message || "Telegram notification"}`);
          break;
        case "notification":
          toast.info(`Rule "${rule.name}" triggered: ${rule.message || "Notification"}`);
          break;
      }
    } catch (error) {
      console.error(`Error executing rule ${rule.id}:`, error);
      toast.error(`Failed to execute rule "${rule.name}"`);
    }
  };

  const handleAddRule = () => {
    setIsEditing(null);
    setFormData({
      name: "",
      enabled: true,
      sensorDeviceId: "",
      sensorDataType: "",
      condition: "above",
      threshold: 0,
      actionType: "device_command",
      targetDeviceId: "",
      command: "",
      message: "",
    });
    setIsDialogOpen(true);
  };

  const handleEditRule = (rule: AutomationRule) => {
    setIsEditing(rule.id);
    setFormData(rule);
    setIsDialogOpen(true);
  };

  const handleSaveRule = () => {
    if (!formData.name || !formData.sensorDeviceId || !formData.sensorDataType) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (formData.actionType === "device_command" && (!formData.targetDeviceId || formData.command === undefined)) {
      toast.error("Please specify target device and command");
      return;
    }

    const newRule: AutomationRule = {
      id: isEditing || `rule-${Date.now()}`,
      name: formData.name!,
      enabled: formData.enabled ?? true,
      sensorDeviceId: formData.sensorDeviceId!,
      sensorDataType: formData.sensorDataType!,
      condition: formData.condition || "above",
      threshold: formData.threshold || 0,
      actionType: formData.actionType || "device_command",
      targetDeviceId: formData.targetDeviceId,
      command: formData.command,
      message: formData.message,
    };

    if (isEditing) {
      const updatedRules = rules.map(r => r.id === isEditing ? newRule : r);
      saveRules(updatedRules);
      toast.success("Rule updated");
    } else {
      saveRules([...rules, newRule]);
      toast.success("Rule added");
    }

    setIsDialogOpen(false);
    setIsEditing(null);
  };

  const handleDeleteRule = (id: string) => {
    const updatedRules = rules.filter(r => r.id !== id);
    saveRules(updatedRules);
    toast.success("Rule deleted");
  };

  const toggleRule = (id: string) => {
    const updatedRules = rules.map(r =>
      r.id === id ? { ...r, enabled: !r.enabled } : r
    );
    saveRules(updatedRules);
  };

  const selectedSensorDevice = sensorDevices.find(d => d.device_id === formData.sensorDeviceId);
  const controllableDevices = devices.filter(d => d.command_types && d.command_types.length > 0);

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
          <h1 className="text-3xl font-bold text-foreground">Automation Actions</h1>
          <p className="text-muted-foreground mt-1">Create rules to automate your IoT devices</p>
        </div>
        <Button onClick={handleAddRule} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Rule
        </Button>
      </div>

      {rules.length === 0 && (
        <Card className="border-border bg-card">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <PlayCircle className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">
              No automation rules yet. Create your first rule to get started.
            </p>
            <Button onClick={handleAddRule}>
              <Plus className="h-4 w-4 mr-2" />
              Create Rule
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {rules.map((rule) => {
          const sensorDevice = sensorDevices.find(d => d.device_id === rule.sensorDeviceId);
          const targetDevice = devices.find(d => d.device_id === rule.targetDeviceId);

          return (
            <Card key={rule.id} className="border-border bg-card">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{rule.name}</CardTitle>
                    <CardDescription className="mt-1">
                      {sensorDevice?.name} ({rule.sensorDataType})
                    </CardDescription>
                  </div>
                  <Switch
                    checked={rule.enabled}
                    onCheckedChange={() => toggleRule(rule.id)}
                  />
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Condition:</span>
                    <Badge variant="outline">
                      {rule.condition} {rule.threshold}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Action:</span>
                    <Badge variant="secondary">
                      {rule.actionType === "device_command" && targetDevice
                        ? `${targetDevice.name}`
                        : rule.actionType}
                    </Badge>
                  </div>
                </div>
                <div className="flex gap-2 pt-2 border-t border-border">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleEditRule(rule)}
                    className="flex-1"
                  >
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDeleteRule(rule.id)}
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

      {/* Dialog for Add/Edit Rule */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isEditing ? "Edit Rule" : "Create Automation Rule"}</DialogTitle>
            <DialogDescription>
              Define a condition and action to automate your IoT system
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 mt-4">
              <div className="space-y-2">
                <Label htmlFor="name">Rule Name *</Label>
                <Input
                  id="name"
                  placeholder="e.g., Turn on AC when temp high"
                  value={formData.name || ""}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div className="space-y-4 border-t border-border pt-4">
                <h3 className="font-semibold">Sensor Condition</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Sensor Device *</Label>
                    <Select
                      value={formData.sensorDeviceId || ""}
                      onValueChange={(value) => {
                        setFormData({ ...formData, sensorDeviceId: value, sensorDataType: "" });
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select sensor device" />
                      </SelectTrigger>
                      <SelectContent>
                        {sensorDevices.map((device) => (
                          <SelectItem key={device.device_id} value={device.device_id}>
                            {device.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Data Type *</Label>
                    <Select
                      value={formData.sensorDataType || ""}
                      onValueChange={(value) => setFormData({ ...formData, sensorDataType: value })}
                      disabled={!selectedSensorDevice}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select data type" />
                      </SelectTrigger>
                      <SelectContent>
                        {selectedSensorDevice?.data_types?.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Condition *</Label>
                    <Select
                      value={formData.condition || "above"}
                      onValueChange={(value: "above" | "below" | "equals") =>
                        setFormData({ ...formData, condition: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="above">Above</SelectItem>
                        <SelectItem value="below">Below</SelectItem>
                        <SelectItem value="equals">Equals</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Threshold Value *</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={formData.threshold || 0}
                      onChange={(e) =>
                        setFormData({ ...formData, threshold: parseFloat(e.target.value) || 0 })
                      }
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4 border-t border-border pt-4">
                <h3 className="font-semibold">Action</h3>
                <div className="space-y-2">
                  <Label>Action Type *</Label>
                  <Select
                    value={formData.actionType || "device_command"}
                    onValueChange={(value: "device_command" | "telegram" | "notification") =>
                      setFormData({ ...formData, actionType: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="device_command">Send Device Command</SelectItem>
                      <SelectItem value="telegram">Send Telegram Message</SelectItem>
                      <SelectItem value="notification">Show Notification</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {formData.actionType === "device_command" && (
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Target Device *</Label>
                      <Select
                        value={formData.targetDeviceId || ""}
                        onValueChange={(value) => setFormData({ ...formData, targetDeviceId: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select target device" />
                        </SelectTrigger>
                        <SelectContent>
                          {controllableDevices.map((device) => (
                            <SelectItem key={device.device_id} value={device.device_id}>
                              {device.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Command *</Label>
                      <Input
                        placeholder="ON, OFF, or number"
                        value={formData.command?.toString() || ""}
                        onChange={(e) => {
                          const value = e.target.value;
                          setFormData({
                            ...formData,
                            command: isNaN(Number(value)) ? value : Number(value),
                          });
                        }}
                      />
                    </div>
                  </div>
                )}

                {(formData.actionType === "telegram" || formData.actionType === "notification") && (
                  <div className="space-y-2">
                    <Label>Message</Label>
                    <Input
                      placeholder="Enter message to send"
                      value={formData.message || ""}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    />
                  </div>
                )}
              </div>

              <div className="flex gap-4 pt-4 border-t border-border">
                <Button onClick={handleSaveRule} className="flex-1">
                  {isEditing ? "Update Rule" : "Create Rule"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsDialogOpen(false);
                    setIsEditing(null);
                  }}
                >
                  Cancel
                </Button>
              </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Actions;

