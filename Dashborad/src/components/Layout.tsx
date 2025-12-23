import { NavLink } from "@/components/NavLink";
import { Activity, Database, Zap, Settings, PlayCircle } from "lucide-react";

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout = ({ children }: LayoutProps) => {
  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b border-border bg-card">
        <div className="container mx-auto px-4">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="h-6 w-6 text-primary" />
              <h1 className="text-xl font-bold text-foreground">IoT Monitor</h1>
            </div>
            
            <div className="flex gap-1">
              <NavLink
                to="/"
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground rounded-md hover:bg-secondary"
                activeClassName="text-primary bg-secondary"
              >
                <Activity className="h-4 w-4" />
                Dashboard
              </NavLink>
              <NavLink
                to="/devices"
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground rounded-md hover:bg-secondary"
                activeClassName="text-primary bg-secondary"
              >
                <Database className="h-4 w-4" />
                Devices
              </NavLink>
              <NavLink
                to="/control"
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground rounded-md hover:bg-secondary"
                activeClassName="text-primary bg-secondary"
              >
                <Zap className="h-4 w-4" />
                Control Center
              </NavLink>
              <NavLink
                to="/actions"
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground rounded-md hover:bg-secondary"
                activeClassName="text-primary bg-secondary"
              >
                <PlayCircle className="h-4 w-4" />
                Actions
              </NavLink>
              <NavLink
                to="/settings"
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground rounded-md hover:bg-secondary"
                activeClassName="text-primary bg-secondary"
              >
                <Settings className="h-4 w-4" />
                Settings
              </NavLink>
            </div>
          </div>
        </div>
      </nav>
      
      <main className="container mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  );
};
