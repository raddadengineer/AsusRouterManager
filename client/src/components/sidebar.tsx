import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import type { RouterStatus } from "@shared/schema";
import { formatUptime } from "@/lib/utils";
import { useState, useEffect } from "react";
import {
  Wifi,
  BarChart3,
  Network,
  Tablet,
  Settings,
  ArrowRightLeft,
  TrendingUp,
  CheckCircle2,
  Menu,
  X,
  Router,
} from "lucide-react";

const navigationItems = [
  {
    href: "/",
    label: "Dashboard",
    icon: BarChart3,
  },
  {
    href: "/topology",
    label: "Network Topology",
    icon: Network,
  },
  {
    href: "/devices",
    label: "Connected Devices",
    icon: Tablet,
  },
  {
    href: "/wifi",
    label: "WiFi Settings",
    icon: Wifi,
  },
  {
    href: "/port-forwarding",
    label: "Port Forwarding",
    icon: ArrowRightLeft,
  },
  {
    href: "/aimesh",
    label: "AiMesh Network",
    icon: Router,
  },
  {
    href: "/bandwidth",
    label: "Bandwidth Monitor",
    icon: TrendingUp,
  },
  {
    href: "/system",
    label: "System Settings",
    icon: Settings,
  },
];

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

export default function Sidebar({ isOpen, onToggle }: SidebarProps) {
  const [location] = useLocation();

  const { data: routerStatus } = useQuery<RouterStatus>({
    queryKey: ["/api/router/status"],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Close sidebar when clicking on a navigation item on mobile
  const handleNavClick = () => {
    if (window.innerWidth < 768) {
      onToggle();
    }
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={onToggle}
        />
      )}
      
      {/* Sidebar */}
      <aside className={cn(
        "fixed md:static inset-y-0 left-0 z-50 w-60 bg-sidebar shadow-lg flex flex-col border-r border-sidebar-border transition-transform duration-300 ease-in-out",
        isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      )}>
        {/* Close button for mobile */}
        <div className="md:hidden flex justify-end p-4">
          <button
            onClick={onToggle}
            className="p-2 rounded-lg hover:bg-sidebar-accent"
          >
            <X className="h-5 w-5 text-sidebar-foreground" />
          </button>
        </div>
      {/* Header */}
      <div className="p-6 border-b border-sidebar-border">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <Wifi className="h-4 w-4 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-sidebar-foreground">ASUS Manager</h1>
            <p className="text-xs text-muted-foreground">
              {routerStatus?.model || "Loading..."}
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {navigationItems.map((item) => {
            const isActive = location === item.href;
            const Icon = item.icon;

            return (
              <li key={item.href}>
                <Link href={item.href}>
                  <a
                    onClick={handleNavClick}
                    className={cn(
                      "flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors",
                      isActive
                        ? "bg-primary/20 text-primary border-l-2 border-primary"
                        : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="text-sm font-medium">{item.label}</span>
                  </a>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer - Router Status */}
      <div className="p-4 border-t border-sidebar-border">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
            <CheckCircle2 className="h-4 w-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-sidebar-foreground">Online</p>
            <p className="text-xs text-muted-foreground truncate">
              {routerStatus ? formatUptime(routerStatus.uptime) : "Loading..."}
            </p>
          </div>
        </div>
      </div>
    </aside>
    </>
  );
}
