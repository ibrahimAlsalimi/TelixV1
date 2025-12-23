import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { mockSensors } from "@/utils/mockData";
import { Separator } from "@/components/ui/separator";

const Settings = () => {
  const { toast } = useToast();
  const [botToken, setBotToken] = useState("");
  const [chatId, setChatId] = useState("");
  const [enabled, setEnabled] = useState(true);
  const [thresholds, setThresholds] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      // Load Telegram settings
      const { data: telegramData } = await supabase
        .from("telegram_settings")
        .select("*")
        .limit(1)
        .maybeSingle();

      if (telegramData) {
        setBotToken(telegramData.bot_token);
        setChatId(telegramData.chat_id);
        setEnabled(telegramData.enabled);
      }

      // Load sensor thresholds
      const { data: thresholdData } = await supabase
        .from("sensor_thresholds")
        .select("*");

      if (thresholdData) {
        const thresholdMap: Record<string, number> = {};
        thresholdData.forEach(t => {
          thresholdMap[t.sensor_id] = t.threshold_value;
        });
        setThresholds(thresholdMap);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load settings",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const saveTelegramSettings = async () => {
    if (!botToken || !chatId) {
      toast({
        title: "Validation Error",
        description: "Please fill in both Bot Token and Chat ID",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      const { data: existing } = await supabase
        .from("telegram_settings")
        .select("id")
        .limit(1)
        .maybeSingle();

      if (existing) {
        await supabase
          .from("telegram_settings")
          .update({ bot_token: botToken, chat_id: chatId, enabled })
          .eq("id", existing.id);
      } else {
        await supabase
          .from("telegram_settings")
          .insert({ bot_token: botToken, chat_id: chatId, enabled });
      }

      toast({
        title: "Success",
        description: "Telegram settings saved successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save Telegram settings",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const saveThresholds = async () => {
    setIsSaving(true);
    try {
      for (const [sensorId, value] of Object.entries(thresholds)) {
        if (value > 0) {
          const { data: existing } = await supabase
            .from("sensor_thresholds")
            .select("id")
            .eq("sensor_id", sensorId)
            .maybeSingle();

          if (existing) {
            await supabase
              .from("sensor_thresholds")
              .update({ threshold_value: value })
              .eq("id", existing.id);
          } else {
            await supabase
              .from("sensor_thresholds")
              .insert({ sensor_id: sensorId, threshold_value: value });
          }
        }
      }

      toast({
        title: "Success",
        description: "Sensor thresholds saved successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save thresholds",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">Loading settings...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground mt-1">Configure notifications and sensor thresholds</p>
      </div>

      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle>Telegram Notifications</CardTitle>
          <CardDescription>Configure Telegram bot for alert notifications</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="botToken">Bot Token</Label>
            <Input
              id="botToken"
              type="password"
              placeholder="Enter your Telegram Bot Token"
              value={botToken}
              onChange={(e) => setBotToken(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Get your bot token from @BotFather on Telegram
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="chatId">Chat ID</Label>
            <Input
              id="chatId"
              placeholder="Enter your Chat ID"
              value={chatId}
              onChange={(e) => setChatId(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Get your chat ID from @userinfobot on Telegram
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="enabled"
              checked={enabled}
              onCheckedChange={setEnabled}
            />
            <Label htmlFor="enabled">Enable Telegram notifications</Label>
          </div>

          <Button onClick={saveTelegramSettings} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save Telegram Settings"}
          </Button>
        </CardContent>
      </Card>

      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle>Sensor Thresholds</CardTitle>
          <CardDescription>Set alert thresholds for each sensor</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {mockSensors.map((sensor) => (
            <div key={sensor.id}>
              <div className="flex items-center justify-between py-3">
                <div>
                  <p className="font-medium text-foreground">{sensor.name}</p>
                  <p className="text-sm text-muted-foreground">
                    Current: {sensor.currentValue} {sensor.unit}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    step="0.1"
                    placeholder="Threshold"
                    className="w-32"
                    value={thresholds[sensor.id] || ""}
                    onChange={(e) =>
                      setThresholds({
                        ...thresholds,
                        [sensor.id]: parseFloat(e.target.value) || 0,
                      })
                    }
                  />
                  <span className="text-sm text-muted-foreground min-w-12">
                    {sensor.unit}
                  </span>
                </div>
              </div>
              <Separator />
            </div>
          ))}

          <Button onClick={saveThresholds} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save Thresholds"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default Settings;
