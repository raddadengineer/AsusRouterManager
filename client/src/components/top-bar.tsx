import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Bell } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface TopBarProps {
  title?: string;
  subtitle?: string;
  onSearch?: (query: string) => void;
  searchQuery?: string;
}

export default function TopBar({ 
  title = "Dashboard", 
  subtitle = "Router management and monitoring",
  onSearch,
  searchQuery: externalSearchQuery
}: TopBarProps) {
  const [localSearchQuery, setLocalSearchQuery] = useState("");
  const searchQuery = externalSearchQuery !== undefined ? externalSearchQuery : localSearchQuery;
  
  // Get router status for notifications
  const { data: routerStatus } = useQuery<any>({
    queryKey: ["/api/router/status"],
    refetchInterval: 30000,
  });

  const { data: connectedDevices } = useQuery<any[]>({
    queryKey: ["/api/devices"],
    refetchInterval: 30000,
  });

  const { data: backgroundJobs } = useQuery<any[]>({
    queryKey: ["/api/background/jobs"],
    refetchInterval: 30000,
  });

  // Calculate notification count based on router conditions
  const getNotificationCount = () => {
    let count = 0;

    // High CPU usage notification
    if (routerStatus?.cpuUsage > 80) count++;
    
    // High memory usage notification
    if (routerStatus?.memoryUsage && routerStatus?.memoryTotal) {
      const memoryPercent = (routerStatus.memoryUsage / routerStatus.memoryTotal) * 100;
      if (memoryPercent > 85) count++;
    }

    // Background service errors
    const errorJobs = backgroundJobs?.filter(job => job.status === 'error') || [];
    count += errorJobs.length;

    // New devices connected (devices without names or with default names)
    const newDevices = connectedDevices?.filter(device => 
      !device.name || device.name.includes('Unknown') || device.name.includes('Device')
    ) || [];
    if (newDevices.length > 0) count++;

    return count;
  };

  const notificationCount = getNotificationCount();
  
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    if (onSearch) {
      onSearch(query);
    } else {
      setLocalSearchQuery(query);
    }
  };

  return (
    <header className="bg-card px-6 py-4 border-b border-border">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-card-foreground">{title}</h2>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search devices..."
              value={searchQuery}
              onChange={handleSearchChange}
              className="pl-10 w-64 bg-background border-border focus:ring-primary"
            />
          </div>
          
          {/* Notification Bell */}
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-5 w-5" />
            {notificationCount > 0 && (
              <Badge 
                variant="destructive" 
                className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
              >
                {notificationCount > 9 ? '9+' : notificationCount}
              </Badge>
            )}
          </Button>
        </div>
      </div>
    </header>
  );
}
