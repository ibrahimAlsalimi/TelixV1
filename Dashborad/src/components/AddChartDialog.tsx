import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Plus, Loader2, ArrowLeft } from "lucide-react";
import { api, ApiDevice } from "@/utils/api";
import { StatusBadge } from "./StatusBadge";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

interface AddChartDialogProps {
  onDeviceSelect: (device: ApiDevice, dataType: string) => void;
}

export const AddChartDialog = ({ onDeviceSelect }: AddChartDialogProps) => {
  const [open, setOpen] = useState(false);
  const [devices, setDevices] = useState<ApiDevice[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedDevice, setSelectedDevice] = useState<ApiDevice | null>(null);
  const [selectedDataType, setSelectedDataType] = useState<string>("");

  useEffect(() => {
    if (open) {
      loadDevices();
      setSelectedDevice(null);
      setSelectedDataType("");
    }
  }, [open]);

  const loadDevices = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.getDevices();
      setDevices(data || []);
    } catch (err) {
      console.error("Failed to load devices:", err);
      setError(err instanceof Error ? err.message : "Failed to load devices. Check if the backend is running.");
      setDevices([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeviceSelect = (device: ApiDevice) => {
    if (device.data_types && device.data_types.length > 0) {
      setSelectedDevice(device);
      setSelectedDataType(device.data_types[0]);
    } else {
      // If no data types, add with empty string
      onDeviceSelect(device, "");
      setOpen(false);
    }
  };

  const handleConfirm = () => {
    if (selectedDevice && selectedDataType) {
      onDeviceSelect(selectedDevice, selectedDataType);
      setOpen(false);
    }
  };

  const handleBack = () => {
    setSelectedDevice(null);
    setSelectedDataType("");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add New Chart
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {selectedDevice ? "Select Data Type" : "Add New Chart"}
          </DialogTitle>
          <DialogDescription>
            {selectedDevice
              ? `Choose which data type to monitor for ${selectedDevice.name}`
              : "Select a device to add its chart to the dashboard"}
          </DialogDescription>
        </DialogHeader>

        {!selectedDevice ? (
          <>
            {isLoading && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            )}

            {error && (
              <div className="p-4 border border-destructive/30 bg-destructive/10 rounded-md">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            {!isLoading && !error && devices.length === 0 && (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No devices available</p>
              </div>
            )}

            {!isLoading && !error && devices.length > 0 && (
              <div className="space-y-2">
                {devices.map((device) => (
                  <div
                    key={device.device_id}
                    className="p-4 border border-border rounded-lg hover:bg-accent cursor-pointer transition-colors"
                    onClick={() => handleDeviceSelect(device)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-foreground">{device.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          {device.type} • ID: {device.device_id}
                        </p>
                      </div>
                      <StatusBadge status={device.status} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="space-y-4">
            <Button variant="ghost" size="sm" onClick={handleBack}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to devices
            </Button>

            <div className="p-4 border border-border rounded-lg bg-muted/30">
              <h4 className="font-medium text-foreground mb-1">{selectedDevice.name}</h4>
              <p className="text-sm text-muted-foreground">
                {selectedDevice.type} • ID: {selectedDevice.device_id}
              </p>
            </div>

            <div className="space-y-3">
              <Label className="text-base">Select Data Type</Label>
              <RadioGroup value={selectedDataType} onValueChange={setSelectedDataType}>
                {selectedDevice.data_types?.map((dataType) => (
                  <div key={dataType} className="flex items-center space-x-2">
                    <RadioGroupItem value={dataType} id={dataType} />
                    <Label
                      htmlFor={dataType}
                      className="font-normal capitalize cursor-pointer"
                    >
                      {dataType}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={handleBack}>
                Cancel
              </Button>
              <Button onClick={handleConfirm} disabled={!selectedDataType}>
                Add Chart
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
