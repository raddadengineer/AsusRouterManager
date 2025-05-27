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
        <div className="p-6">
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
          <InteractiveTopology className="h-[700px]" />
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
      <div className="p-6">
        <div className="mb-4 flex justify-between items-center">
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
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
          >
            <MousePointer2 className="h-4 w-4" />
            View Interactive Topology
          </Button>
        </div>
        
        <NetworkTopology className="h-[600px]" />
        
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 mb-2">
              <Grid3X3 className="h-5 w-5 text-blue-600" />
              <h3 className="font-medium text-gray-900 dark:text-gray-100">
                Topology Features
              </h3>
            </div>
            <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
              <li>• Real-time device status monitoring</li>
              <li>• Connection type visualization</li>
              <li>• Signal strength indicators</li>
              <li>• AiMesh node mapping</li>
            </ul>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 mb-2">
              <MousePointer2 className="h-5 w-5 text-green-600" />
              <h3 className="font-medium text-gray-900 dark:text-gray-100">
                Interactive Mode
              </h3>
            </div>
            <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
              <li>• Drag and rearrange devices</li>
              <li>• Zoom and pan controls</li>
              <li>• Detailed device tooltips</li>
              <li>• Live connection animations</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
