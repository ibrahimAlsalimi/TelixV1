# IoT Monitoring Dashboard - Project Documentation

## Project Overview

This is a web-based IoT Monitoring Dashboard built with React, TypeScript, Vite, and Lovable Cloud (Supabase backend). It's designed to run on a Raspberry Pi for monitoring and controlling IoT sensors and devices on a local network.

## Technology Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS + shadcn/ui components
- **Backend**: Lovable Cloud (Supabase)
- **Database**: PostgreSQL (via Supabase)
- **Routing**: React Router v6
- **State Management**: React Query (TanStack Query)

---

## Project Structure

```
├── public/                  # Static assets
├── src/                     # Source code
│   ├── components/          # React components
│   ├── hooks/              # Custom React hooks
│   ├── integrations/       # Third-party integrations
│   ├── lib/                # Utility libraries
│   ├── pages/              # Page components
│   ├── types/              # TypeScript type definitions
│   ├── utils/              # Helper functions
│   ├── App.tsx             # Main app component
│   ├── main.tsx            # App entry point
│   └── index.css           # Global styles & design tokens
├── supabase/               # Backend configuration
│   ├── functions/          # Edge functions
│   └── migrations/         # Database migrations
└── Configuration files
```

---

## Configuration Files

### `package.json`
**Purpose**: Defines project dependencies and scripts.
**Key Dependencies**:
- React & React DOM for UI
- React Router for navigation
- Supabase client for backend
- Tailwind CSS for styling
- shadcn/ui components

**Modification**: Use `npm install <package>` to add dependencies. Don't edit directly.

### `.env`
**Purpose**: Environment variables for Supabase connection.
**Variables**:
- `VITE_SUPABASE_URL`: Your Supabase project URL
- `VITE_SUPABASE_PUBLISHABLE_KEY`: Public API key
- `VITE_SUPABASE_PROJECT_ID`: Project identifier

**Modification**: Auto-generated. Don't edit manually.

### `tailwind.config.ts`
**Purpose**: Tailwind CSS configuration.
**Contains**:
- Custom color themes
- Extended utilities
- shadcn/ui integration

**Modification**: Add custom colors, fonts, or spacing here.

### `vite.config.ts`
**Purpose**: Vite build tool configuration.
**Modification**: Add plugins, configure build options, or alias paths here.

### `tsconfig.json`
**Purpose**: TypeScript compiler configuration.
**Modification**: Adjust TypeScript rules if needed.

### `index.html`
**Purpose**: HTML entry point for the app.
**Contains**:
- Meta tags for SEO
- App title and description
- Root div where React mounts

**Modification**: Update meta tags, title, or add external scripts here.

---

## Source Files

### `src/main.tsx`
**Purpose**: Application entry point.
**What it does**:
- Renders the root `<App />` component
- Mounts React to the DOM

**Modification**: Rarely needs changes. Add global providers here if needed.

### `src/App.tsx`
**Purpose**: Main application component and routing configuration.
**What it does**:
- Sets up React Query client
- Configures React Router with all routes
- Wraps app with providers (Tooltips, Toasts)

**Routes**:
- `/` - Dashboard (Index page)
- `/devices` - Connected Devices list
- `/control` - Device Control page
- `/add-device` - Add New Device form
- `/settings` - Settings page
- `*` - 404 Not Found page

**Modification**: Add new routes here. Always add custom routes ABOVE the `*` catch-all route.

### `src/index.css`
**Purpose**: Global styles and design system tokens.
**Contains**:
- CSS variables for colors (light/dark mode)
- Typography settings
- Animation keyframes
- Design system tokens

**Modification**: Update color schemes, add gradients, or define new CSS variables here. All colors should be in HSL format.

---

## Components

### `src/components/Layout.tsx`
**Purpose**: Main layout wrapper with navigation.
**What it does**:
- Renders navigation bar with links
- Wraps page content in consistent layout
- Highlights active route

**Modification**: Add/remove navigation links, change layout structure, or update styling.

### `src/components/NavLink.tsx`
**Purpose**: Custom navigation link component.
**What it does**:
- Wraps React Router's `NavLink`
- Adds active state styling
- Provides consistent link behavior

**Modification**: Change active/pending link styles or add hover effects.

### `src/components/StatusBadge.tsx`
**Purpose**: Reusable status indicator badge.
**What it does**:
- Displays device status (Online, Offline, Error, Warning)
- Shows animated dot for online status
- Uses semantic color tokens

**Modification**: Add new status types or change colors/animations.

### `src/components/ui/*`
**Purpose**: shadcn/ui component library.
**What they do**:
- Provide pre-built, accessible UI components
- Button, Card, Input, Badge, Dialog, etc.

**Modification**: Customize variants, add new variants, or adjust default styles. These are meant to be edited!

---

## Pages

### `src/pages/Index.tsx`
**Purpose**: Dashboard home page.
**What it does**:
- Displays real-time sensor data overview
- Shows charts and statistics
- Main landing page after login

**Modification**: Add widgets, charts, or summary cards here.

### `src/pages/Dashboard.tsx`
**Purpose**: Alternative dashboard view (if different from Index).
**Modification**: Customize data visualization or layout.

### `src/pages/Devices.tsx`
**Purpose**: Lists all connected IoT devices.
**What it does**:
- Fetches devices from Supabase
- Displays device cards with status, IP, timestamps
- Shows summary statistics (total, online, offline)

**Data Flow**:
1. `loadDevices()` fetches from `devices` table
2. Merges with mock data (if any)
3. Renders device cards

**Modification**: 
- Change card layout
- Add filtering/sorting
- Update displayed fields
- Remove mock data merge when ready for production

### `src/pages/Control.tsx`
**Purpose**: Remote control interface for IoT devices.
**What it does**:
- Allows users to control devices (toggle ON/OFF)
- Sends control commands via API

**Modification**: Add new control types, update UI, or change API endpoints.

### `src/pages/AddDevice.tsx`
**Purpose**: Form to register new IoT devices.
**What it does**:
- Collects device information (name, type, IP)
- Allows defining telemetry fields dynamically
- Saves device to `devices` table in Supabase

**Data Structure**:
```typescript
{
  device_id: string,      // Auto-generated
  name: string,           // User input
  type: string,           // User input
  ip_address: string,     // Optional
  status: 'offline',      // Default
  telemetry_config: [     // Array of fields
    {
      field: string,      // e.g., "temperature"
      type: string,       // e.g., "float"
      unit: string        // e.g., "°C"
    }
  ]
}
```

**Modification**: Add validation, change form fields, or update telemetry schema.

### `src/pages/Settings.tsx`
**Purpose**: Application settings configuration.
**What it does**:
- Configure Telegram notifications (bot token, chat ID)
- Set sensor thresholds for alerts
- Save settings to Supabase

**Database Tables Used**:
- `telegram_settings`: Stores bot token, chat ID, enabled status
- `sensor_thresholds`: Stores threshold values per sensor

**Modification**: Add new settings sections, new alert types, or configuration options.

### `src/pages/NotFound.tsx`
**Purpose**: 404 error page.
**What it does**:
- Displays friendly message for invalid routes
- Provides link back to home

**Modification**: Customize error message or styling.

---

## Backend (Supabase/Lovable Cloud)

### `supabase/config.toml`
**Purpose**: Supabase project configuration.
**Modification**: Auto-managed. Don't edit manually.

### `src/integrations/supabase/client.ts`
**Purpose**: Supabase client initialization.
**What it does**:
- Creates authenticated Supabase client
- Configures auth storage and token refresh

**Usage**:
```typescript
import { supabase } from "@/integrations/supabase/client";
await supabase.from('devices').select('*');
```

**Modification**: Auto-generated. Don't edit manually.

### `src/integrations/supabase/types.ts`
**Purpose**: TypeScript types for database schema.
**What it contains**:
- Type definitions for all tables
- Insert/Update types for each table

**Modification**: Auto-generated from database schema. Don't edit manually.

---

## Database Tables

### `devices`
**Purpose**: Stores registered IoT devices.
**Columns**:
- `id` (uuid): Primary key
- `device_id` (text): Unique device identifier
- `name` (text): Device name
- `type` (text): Device type
- `ip_address` (text): Device IP address
- `status` (text): Connection status (online/offline/error)
- `telemetry_config` (jsonb): Array of telemetry field definitions
- `connected_at` (timestamp): First connection time
- `last_seen` (timestamp): Last activity time
- `created_at` (timestamp): Record creation time

**Modification**: Use database migrations to add columns or change schema.

### `sensor_thresholds`
**Purpose**: Stores alert thresholds for sensors.
**Columns**:
- `id` (uuid): Primary key
- `sensor_id` (text): Sensor identifier
- `threshold_value` (numeric): Alert threshold
- `created_at` (timestamp): Record creation time
- `updated_at` (timestamp): Last update time

**Modification**: Use database migrations to modify.

### `telegram_settings`
**Purpose**: Stores Telegram notification configuration.
**Columns**:
- `id` (uuid): Primary key
- `bot_token` (text): Telegram bot token
- `chat_id` (text): Telegram chat ID
- `enabled` (boolean): Notifications on/off
- `created_at` (timestamp): Record creation time
- `updated_at` (timestamp): Last update time

**Modification**: Use database migrations to modify.

---

## Edge Functions

### `supabase/functions/check-sensor-alerts/index.ts`
**Purpose**: Serverless function to check sensor data and send Telegram alerts.
**What it does**:
1. Receives sensor data via HTTP POST
2. Fetches threshold configuration from database
3. Compares sensor value to threshold
4. Sends Telegram message if threshold exceeded

**Request Format**:
```json
{
  "sensorData": {
    "sensorId": "temp_sensor_01",
    "sensorName": "Temperature Sensor",
    "currentValue": 35.5,
    "unit": "°C"
  }
}
```

**Modification**: Change alert logic, add new notification channels, or customize message format.

**Testing**: Call this function from your IoT devices when new sensor readings arrive.

---

## Utilities & Types

### `src/lib/utils.ts`
**Purpose**: Utility functions.
**Contains**:
- `cn()`: Combines Tailwind classes with class-variance-authority

**Modification**: Add helper functions here.

### `src/types/sensor.ts`
**Purpose**: TypeScript types for sensors.
**Modification**: Define sensor data structures here.

### `src/utils/mockData.ts`
**Purpose**: Mock data for development/testing.
**Modification**: Update or remove when connecting real devices.

---

## Hooks

### `src/hooks/use-mobile.tsx`
**Purpose**: Detects mobile screen sizes.
**Modification**: Adjust breakpoint if needed.

### `src/hooks/use-toast.ts`
**Purpose**: Toast notification hook.
**Modification**: Customize toast behavior or styling.

---

## How to Modify Common Features

### Adding a New Page
1. Create new page file in `src/pages/`
2. Add route in `src/App.tsx`
3. Add navigation link in `src/components/Layout.tsx`

### Adding a New Database Table
1. Use Lovable Cloud UI or write migration SQL
2. Types will auto-generate in `src/integrations/supabase/types.ts`
3. Query using `supabase.from('table_name')`

### Changing Colors/Theme
1. Edit CSS variables in `src/index.css`
2. Ensure all colors are in HSL format
3. Update `tailwind.config.ts` if adding new color names

### Adding a New Component
1. Create component file in `src/components/`
2. Use shadcn/ui components as building blocks
3. Import and use in pages

### Modifying Edge Functions
1. Edit function file in `supabase/functions/`
2. Functions deploy automatically
3. Test using HTTP POST requests

---

## Running the Project

### Development
```bash
npm install          # Install dependencies
npm run dev         # Start dev server
```

### Production
```bash
npm run build       # Build for production
npm run preview     # Preview production build
```

### On Raspberry Pi
```bash
# Install Node.js first
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Clone and run
git clone <your-repo-url>
cd <project-folder>
npm install
npm run dev
```

Access at: `http://<raspberry-pi-ip>:5173`

---

## Important Notes

### Files You Should NOT Edit
- `src/integrations/supabase/client.ts` - Auto-generated
- `src/integrations/supabase/types.ts` - Auto-generated
- `.env` - Auto-managed
- `package.json` - Use npm commands instead
- `supabase/config.toml` - Auto-managed

### Files You SHOULD Edit
- `src/pages/*` - Your page logic
- `src/components/*` - Your UI components
- `src/index.css` - Design system
- `tailwind.config.ts` - Theme customization
- `supabase/functions/*` - Backend logic

### Database Changes
Always use migrations or Lovable Cloud UI. Never edit types.ts manually.

### Security
All tables have Row Level Security (RLS) enabled with public access policies. Modify RLS policies for production use.

---

## Getting Help

- Check console logs for errors
- Review network requests in browser dev tools
- Refer to Lovable documentation: https://docs.lovable.dev
- Check Supabase docs for database queries: https://supabase.com/docs

---

## Next Steps

1. Remove mock data when real devices connect
2. Implement authentication for production
3. Configure proper RLS policies
4. Set up InfluxDB integration for time-series data
5. Add data visualization charts
6. Implement MQTT for device communication
7. Add user management
