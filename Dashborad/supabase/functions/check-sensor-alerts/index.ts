import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface SensorData {
  id: string;
  name: string;
  currentValue: number;
  unit: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { sensorData } = await req.json() as { sensorData: SensorData };

    console.log("Checking alerts for sensor:", sensorData.id);

    // Get Telegram settings
    const { data: telegramSettings, error: telegramError } = await supabase
      .from("telegram_settings")
      .select("*")
      .eq("enabled", true)
      .limit(1)
      .maybeSingle();

    if (telegramError) {
      console.error("Error fetching Telegram settings:", telegramError);
      throw telegramError;
    }

    if (!telegramSettings) {
      console.log("Telegram notifications not configured or disabled");
      return new Response(
        JSON.stringify({ message: "Telegram not configured" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get threshold for this sensor
    const { data: threshold, error: thresholdError } = await supabase
      .from("sensor_thresholds")
      .select("*")
      .eq("sensor_id", sensorData.id)
      .maybeSingle();

    if (thresholdError) {
      console.error("Error fetching threshold:", thresholdError);
      throw thresholdError;
    }

    if (!threshold) {
      console.log("No threshold configured for sensor:", sensorData.id);
      return new Response(
        JSON.stringify({ message: "No threshold configured" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if value exceeds threshold
    if (sensorData.currentValue > threshold.threshold_value) {
      console.log("Threshold exceeded! Sending Telegram alert...");

      const message = `🚨 *Alert: Threshold Exceeded*\n\n` +
        `*Sensor:* ${sensorData.name}\n` +
        `*ID:* ${sensorData.id}\n` +
        `*Current Value:* ${sensorData.currentValue} ${sensorData.unit}\n` +
        `*Threshold:* ${threshold.threshold_value} ${sensorData.unit}\n` +
        `*Time:* ${new Date().toLocaleString()}\n\n` +
        `[View Dashboard](${Deno.env.get("SUPABASE_URL")?.replace("/supabase", "")})`;

      const telegramUrl = `https://api.telegram.org/bot${telegramSettings.bot_token}/sendMessage`;
      
      const telegramResponse = await fetch(telegramUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          chat_id: telegramSettings.chat_id,
          text: message,
          parse_mode: "Markdown",
        }),
      });

      const telegramResult = await telegramResponse.json();

      if (!telegramResponse.ok) {
        console.error("Telegram API error:", telegramResult);
        throw new Error(`Telegram API error: ${JSON.stringify(telegramResult)}`);
      }

      console.log("Alert sent successfully to Telegram");

      return new Response(
        JSON.stringify({ 
          message: "Alert sent successfully",
          telegramResult 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else {
      console.log("Value within threshold, no alert needed");
      return new Response(
        JSON.stringify({ message: "Value within threshold" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (error: any) {
    console.error("Error in check-sensor-alerts:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
