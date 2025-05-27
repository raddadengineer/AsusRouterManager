import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Dashboard from "@/pages/dashboard";
import NetworkTopology from "@/pages/topology";
import ConnectedDevices from "@/pages/devices";
import WiFiSettings from "@/pages/wifi";
import PortForwarding from "@/pages/port-forwarding";
import BandwidthMonitor from "@/pages/bandwidth";
import SystemSettings from "@/pages/system";
import SystemDetailsPage from "@/pages/system-details";
import NotFound from "@/pages/not-found";
import Sidebar from "@/components/sidebar";
import TopBar from "@/components/top-bar";

function Router() {
  return (
    <div className="flex h-screen bg-background text-foreground">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <div className="p-6">
          <Switch>
            <Route path="/" component={Dashboard} />
            <Route path="/topology" component={NetworkTopology} />
            <Route path="/devices" component={ConnectedDevices} />
            <Route path="/wifi" component={WiFiSettings} />
            <Route path="/port-forwarding" component={PortForwarding} />
            <Route path="/bandwidth" component={BandwidthMonitor} />
            <Route path="/system" component={SystemSettings} />
            <Route path="/system/details" component={SystemDetailsPage} />
            <Route component={NotFound} />
          </Switch>
        </div>
      </main>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <div className="dark">
          <Toaster />
          <Router />
        </div>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
