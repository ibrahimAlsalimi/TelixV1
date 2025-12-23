import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Status = "online" | "offline" | "error" | "warning";

interface StatusBadgeProps {
  status: Status | string; // allow unexpected values from API
  className?: string;
}

export const StatusBadge = ({ status, className }: StatusBadgeProps) => {
  const statusConfig = {
    online: {
      label: "Online",
      className: "bg-success/20 text-success border-success/30",
    },
    offline: {
      label: "Offline",
      className: "bg-muted text-muted-foreground border-border",
    },
    error: {
      label: "Error",
      className: "bg-destructive/20 text-destructive border-destructive/30",
    },
    warning: {
      label: "Warning",
      className: "bg-warning/20 text-warning border-warning/30",
    },
  } satisfies Record<Status, { label: string; className: string }>;

  // Fallback so unknown or missing statuses don't break the UI
  const config = statusConfig[status as Status] ?? {
    label: status || "Unknown",
    className: "bg-muted text-muted-foreground border-border",
  };

  return (
    <Badge variant="outline" className={cn(config.className, className)}>
      <span className="relative mr-1.5 flex h-2 w-2">
        {status === "online" && (
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75"></span>
        )}
        <span className={cn(
          "relative inline-flex h-2 w-2 rounded-full",
          status === "online" && "bg-success",
          status === "offline" && "bg-muted-foreground",
          status === "error" && "bg-destructive",
          status === "warning" && "bg-warning"
        )}></span>
      </span>
      {config.label}
    </Badge>
  );
};
