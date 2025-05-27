import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SearchProvider } from "@/hooks/use-search";
import Dashboard from "@/pages/dashboard";
import NetworkTopology from "@/pages/topology";
import ConnectedDevices from "@/pages/devices";
import WiFiSettings from "@/pages/wifi";
import PortForwarding from "@/pages/port-forwarding";
import BandwidthMonitor from "@/pages/bandwidth";
import SystemSettings from "@/pages/system";
import SystemDetailsPage from "@/pages/system-details";
import DeviceDetailsPage from "@/pages/device-details";
import AiMeshPage from "@/pages/aimesh";
import DeviceGroupsPage from "@/pages/device-groups";
import NotFound from "@/pages/not-found";
import Sidebar from "@/components/sidebar";
import TopBar from "@/components/top-bar";
import { useState } from "react";
import { Menu } from "lucide-react";

function Router() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <div className="flex h-screen bg-background text-foreground">
      <Sidebar isOpen={sidebarOpen} onToggle={toggleSidebar} />
      
      <div className="flex-1 flex flex-col">
        {/* Mobile Header */}
        <div className="md:hidden flex items-center justify-between p-4 border-b border-border bg-card">
          <button
            onClick={toggleSidebar}
            className="p-2 rounded-lg hover:bg-accent"
          >
            <Menu className="h-6 w-6" />
          </button>
          <h1 className="text-lg font-semibold">ASUS Manager</h1>
          <div className="w-10" /> {/* Spacer for center alignment */}
        </div>
        
        <main className="flex-1 overflow-auto">
          <div className="p-4 md:p-6">
            <Switch>
              <Route path="/" component={Dashboard} />
              <Route path="/topology" component={NetworkTopology} />
              <Route path="/devices" component={ConnectedDevices} />
              <Route path="/devices/:id" component={DeviceDetailsPage} />
              <Route path="/device-groups" component={DeviceGroupsPage} />
              <Route path="/wifi" component={WiFiSettings} />
              <Route path="/port-forwarding" component={PortForwarding} />
              <Route path="/aimesh" component={AiMeshPage} />
              <Route path="/bandwidth" component={BandwidthMonitor} />
              <Route path="/system" component={SystemSettings} />
              <Route path="/system/details" component={SystemDetailsPage} />
              <Route component={NotFound} />
            </Switch>
          </div>
        </main>
      </div>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <SearchProvider>
          <div className="dark">
            <Toaster />
            <Router />
          </div>
        </SearchProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
