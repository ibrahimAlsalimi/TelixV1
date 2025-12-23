-- Create devices table to store device configurations
CREATE TABLE public.devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  ip_address TEXT,
  status TEXT NOT NULL DEFAULT 'offline',
  telemetry_config JSONB NOT NULL,
  connected_at TIMESTAMPTZ DEFAULT now(),
  last_seen TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create sensor thresholds table
CREATE TABLE public.sensor_thresholds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sensor_id TEXT NOT NULL UNIQUE,
  threshold_value NUMERIC NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create telegram settings table (single row config)
CREATE TABLE public.telegram_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bot_token TEXT NOT NULL,
  chat_id TEXT NOT NULL,
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sensor_thresholds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.telegram_settings ENABLE ROW LEVEL SECURITY;

-- Create policies (allowing public access for local dashboard use)
CREATE POLICY "Allow all operations on devices" ON public.devices FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on sensor_thresholds" ON public.sensor_thresholds FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on telegram_settings" ON public.telegram_settings FOR ALL USING (true) WITH CHECK (true);