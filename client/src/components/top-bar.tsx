import { useState } from "react";
import { Search, Settings, Power, TestTube, Download, Save } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { NotificationPanel } from "@/components/notification-panel";

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
  const { toast } = useToast();
  
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    if (onSearch) {
      onSearch(query);
    } else {
      setLocalSearchQuery(query);
    }
  };

  const handleQuickAction = (action: string) => {
    switch (action) {
      case 'reboot':
        toast({
          title: "Router Reboot",
          description: "Reboot command sent to router",
        });
        break;
      case 'speed-test':
        toast({
          title: "Speed Test",
          description: "Running network speed test...",
        });
        break;
      case 'firmware-update':
        toast({
          title: "Firmware Update",
          description: "Checking for firmware updates...",
        });
        break;
      case 'backup':
        toast({
          title: "Backup Settings",
          description: "Creating router configuration backup...",
        });
        break;
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
              placeholder="Search devices, networks, settings..."
              value={searchQuery}
              onChange={handleSearchChange}
              className="pl-10 w-64 bg-background border-border focus:ring-primary"
            />
          </div>
          
          {/* Quick Actions Gear Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <Settings className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Quick Actions</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handleQuickAction('speed-test')}>
                <TestTube className="mr-2 h-4 w-4 text-primary" />
                Run Speed Test
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleQuickAction('firmware-update')}>
                <Download className="mr-2 h-4 w-4 text-green-500" />
                Update Firmware
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleQuickAction('backup')}>
                <Save className="mr-2 h-4 w-4 text-yellow-500" />
                Backup Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handleQuickAction('reboot')} className="text-red-600">
                <Power className="mr-2 h-4 w-4" />
                Reboot Router
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Notification Panel */}
          <NotificationPanel />
        </div>
      </div>
    </header>
  );
}
