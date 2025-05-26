import { useState } from "react";
import { Search, Bell } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface TopBarProps {
  title?: string;
  subtitle?: string;
}

export default function TopBar({ 
  title = "Dashboard", 
  subtitle = "Router management and monitoring" 
}: TopBarProps) {
  const [searchQuery, setSearchQuery] = useState("");

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
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 w-64 bg-background border-border focus:ring-primary"
            />
          </div>
          
          {/* Notification Bell */}
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-5 w-5" />
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              3
            </Badge>
          </Button>
        </div>
      </div>
    </header>
  );
}
