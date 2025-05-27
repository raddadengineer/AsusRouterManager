import { useState } from "react";
import NetworkTopology from "@/components/network-topology";
import InteractiveTopology from "@/components/interactive-topology";
import TopBar from "@/components/top-bar";
import { Button } from "@/components/ui/button";
import { MousePointer2, Grid3X3, ArrowLeft } from "lucide-react";

export default function NetworkTopologyPage() {
  const [showInteractive, setShowInteractive] = useState(false);

  if (showInteractive) {
    return (
      <div>
        <TopBar 
          title="Interactive Network Topology" 
          subtitle="Drag and explore your real network connections live"
        />
        <div className="p-3 sm:p-6">
          <div className="mb-4">
            <Button
              onClick={() => setShowInteractive(false)}
              variant="outline"
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Overview
            </Button>
          </div>
          <InteractiveTopology className="h-[400px] sm:h-[500px] lg:h-[700px]" />
        </div>
      </div>
    );
  }

  return (
    <div>
      <TopBar 
        title="Network Topology" 
        subtitle="Overview of your network layout and connections"
      />
      <div className="p-3 sm:p-6">
        <div className="mb-4 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Network Overview
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Visual representation of your router and connected devices
            </p>
          </div>
          <Button
            onClick={() => setShowInteractive(true)}
            className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 w-full sm:w-auto"
          >
            <MousePointer2 className="h-4 w-4" />
            <span className="sm:inline">View Interactive Topology</span>
          </Button>
        </div>
        
        {/* Network Topology Visualization */}
        <div className="mb-8 relative z-10">
          <NetworkTopology className="h-[400px] sm:h-[500px] lg:h-[600px] w-full" />
        </div>
        
        {/* Feature Information Cards */}
        <div className="relative z-20">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <Grid3X3 className="h-6 w-6 text-blue-600" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Topology Features
                </h3>
              </div>
              <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-blue-600 rounded-full"></div>
                  Real-time device status monitoring
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-blue-600 rounded-full"></div>
                  Connection type visualization
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-blue-600 rounded-full"></div>
                  Signal strength indicators
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-blue-600 rounded-full"></div>
                  AiMesh node mapping
                </li>
              </ul>
            </div>
            
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <MousePointer2 className="h-6 w-6 text-green-600" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Interactive Mode
                </h3>
              </div>
              <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-green-600 rounded-full"></div>
                  Drag and rearrange devices
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-green-600 rounded-full"></div>
                  Zoom and pan controls
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-green-600 rounded-full"></div>
                  Detailed device tooltips
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-green-600 rounded-full"></div>
                  Live connection animations
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
