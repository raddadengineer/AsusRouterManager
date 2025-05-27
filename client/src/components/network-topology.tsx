import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  Wifi, 
  Router, 
  Smartphone, 
  Laptop, 
  Tablet, 
  Monitor, 
  Tv,
  HardDrive,
  Radio,
  Circle,
  Cable,
  Network,
  Users,
  Activity,
  Signal,
  Zap,
  RefreshCw,
  Eye,
  Settings,
  Info
} from 'lucide-react';
import { cn, getDeviceIcon, getDeviceColorClass, formatBytes, formatSpeed } from '@/lib/utils';
import type { ConnectedDevice, RouterStatus, RouterFeatures } from '@shared/schema';

interface NetworkTopologyProps {
  className?: string;
}

// Device icon component
const DeviceIcon = ({ type, size = 20 }: { type: string; size?: number }) => {
  const iconProps = { size, className: "text-white" };
  
  switch (type.toLowerCase()) {
    case 'smartphone':
    case 'mobile':
      return <Smartphone {...iconProps} />;
    case 'laptop':
    case 'computer':
      return <Laptop {...iconProps} />;
    case 'tablet':
      return <Tablet {...iconProps} />;
    case 'desktop':
      return <Monitor {...iconProps} />;
    case 'tv':
    case 'streaming':
      return <Tv {...iconProps} />;
    case 'nas':
    case 'storage':
      return <HardDrive {...iconProps} />;
    default:
      return <Radio {...iconProps} />;
  }
};

// Connection line component
const ConnectionLine = ({ 
  from, 
  to, 
  type = 'wired',
  isActive = true 
}: { 
  from: { x: number; y: number }; 
  to: { x: number; y: number }; 
  type?: 'wired' | 'wireless';
  isActive?: boolean;
}) => {
  const strokeColor = isActive 
    ? (type === 'wireless' ? '#3b82f6' : '#10b981') 
    : '#6b7280';
  const strokeWidth = type === 'wireless' ? 2 : 3;
  const strokeDasharray = type === 'wireless' ? '5,5' : 'none';

  return (
    <line
      x1={from.x}
      y1={from.y}
      x2={to.x}
      y2={to.y}
      stroke={strokeColor}
      strokeWidth={strokeWidth}
      strokeDasharray={strokeDasharray}
      opacity={isActive ? 0.8 : 0.3}
    />
  );
};

// Network node component
const NetworkNode = ({ 
  node, 
  position, 
  isSelected, 
  onClick 
}: { 
  node: any; 
  position: { x: number; y: number }; 
  isSelected: boolean;
  onClick: () => void;
}) => {
  const getNodeColor = () => {
    if (node.type === 'router' || node.type === 'aimesh') return 'bg-blue-600';
    if (node.connectionType === 'wired') return 'bg-green-600';
    return 'bg-purple-600';
  };

  const getNodeSize = () => {
    return node.type === 'router' || node.type === 'aimesh' ? 'w-16 h-16' : 'w-12 h-12';
  };

  return (
    <g 
      transform={`translate(${position.x - 32}, ${position.y - 32})`}
      className="cursor-pointer"
      onClick={onClick}
    >
      {/* Node background with pulse effect for selected */}
      {isSelected && (
        <circle
          cx="32"
          cy="32"
          r="40"
          fill="none"
          stroke="#3b82f6"
          strokeWidth="2"
          opacity="0.6"
        >
          <animate
            attributeName="r"
            values="40;45;40"
            dur="2s"
            repeatCount="indefinite"
          />
        </circle>
      )}
      
      {/* Main node */}
      <foreignObject x="8" y="8" width="48" height="48">
        <div className={`${getNodeSize()} ${getNodeColor()} rounded-xl flex items-center justify-center shadow-lg hover:scale-110 transition-transform ${isSelected ? 'ring-2 ring-blue-400' : ''}`}>
          {node.type === 'router' || node.type === 'aimesh' ? (
            <Router className="h-6 w-6 text-white" />
          ) : (
            <DeviceIcon type={node.deviceType} size={20} />
          )}
        </div>
      </foreignObject>
      
      {/* Node label */}
      <text
        x="32"
        y="70"
        textAnchor="middle"
        className="text-xs font-medium fill-gray-900 dark:fill-gray-100"
      >
        {node.name}
      </text>
      
      {/* Status indicator */}
      <circle
        cx="50"
        cy="14"
        r="4"
        fill={node.isOnline ? '#10b981' : '#ef4444'}
        className="drop-shadow-sm"
      />
    </g>
  );
};

export default function NetworkTopology({ className }: NetworkTopologyProps) {
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'topology' | 'grid'>('topology');

  // Fetch connected devices
  const { data: devices, isLoading: devicesLoading } = useQuery({
    queryKey: ['/api/devices'],
  });

  // Fetch router features for AiMesh and wireless data
  const { data: routerFeatures, isLoading: featuresLoading } = useQuery({
    queryKey: ['/api/router/features'],
  });

  // Fetch router status
  const { data: routerStatus } = useQuery({
    queryKey: ['/api/router/status'],
  });

  if (devicesLoading || featuresLoading) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const connectedDevices = Array.isArray(devices) ? devices : [];
  const aiMeshData = routerFeatures?.aiMesh || { isMaster: true, nodeCount: 0, peers: [] };
  const wirelessData = routerFeatures?.wirelessClients || { total: 0, band24ghz: 0, band5ghz: 0, band6ghz: 0 };

  // Create network topology structure
  const createNetworkTopology = () => {
    const nodes = [];
    const connections = [];

    // Main router node
    const mainRouter = {
      id: 'main-router',
      name: routerStatus?.model || 'Main Router',
      type: 'router',
      isOnline: true,
      connectionType: 'wired',
      position: { x: 400, y: 200 }
    };
    nodes.push(mainRouter);

    // Add AiMesh nodes if they exist
    if (aiMeshData.peers && aiMeshData.peers.length > 0) {
      aiMeshData.peers.forEach((peer: string, index: number) => {
        const angle = (index * 120) * (Math.PI / 180); // Space AiMesh nodes around main router
        const radius = 150;
        const aimeshNode = {
          id: `aimesh-${index}`,
          name: `AiMesh Node ${index + 1}`,
          type: 'aimesh',
          isOnline: true,
          connectionType: 'wireless',
          macAddress: peer,
          position: {
            x: 400 + Math.cos(angle) * radius,
            y: 200 + Math.sin(angle) * radius
          }
        };
        nodes.push(aimeshNode);
        
        // Connection from main router to AiMesh node
        connections.push({
          from: mainRouter.id,
          to: aimeshNode.id,
          type: 'wireless',
          isActive: true
        });
      });
    }

    // Add connected devices
    connectedDevices.forEach((device: any, index: number) => {
      // Determine connection type based on device characteristics
      const isWireless = device.deviceType === 'smartphone' || 
                        device.deviceType === 'tablet' || 
                        device.deviceType === 'mobile' ||
                        (device.connectionType && device.connectionType.includes('wireless'));
      
      // Position devices around the network
      const angle = (index * (360 / Math.max(connectedDevices.length, 8))) * (Math.PI / 180);
      const radius = isWireless ? 280 : 180;
      
      const deviceNode = {
        id: `device-${device.id}`,
        name: device.name,
        type: 'device',
        deviceType: device.deviceType,
        isOnline: device.isOnline,
        connectionType: isWireless ? 'wireless' : 'wired',
        ipAddress: device.ipAddress,
        macAddress: device.macAddress,
        position: {
          x: 400 + Math.cos(angle) * radius,
          y: 200 + Math.sin(angle) * radius
        }
      };
      nodes.push(deviceNode);

      // Connect device to appropriate node
      const connectTo = isWireless && aiMeshData.peers.length > 0 
        ? `aimesh-${index % aiMeshData.peers.length}` // Distribute wireless devices among AiMesh nodes
        : 'main-router';
      
      connections.push({
        from: connectTo,
        to: deviceNode.id,
        type: isWireless ? 'wireless' : 'wired',
        isActive: device.isOnline
      });
    });

    return { nodes, connections };
  };

  const { nodes, connections } = createNetworkTopology();
  const selectedNodeData = nodes.find(node => node.id === selectedNode);

  // Separate devices by connection type
  const wiredDevices = connectedDevices.filter((device: any) => 
    device.deviceType !== 'smartphone' && 
    device.deviceType !== 'tablet' && 
    device.deviceType !== 'mobile'
  );
  const wirelessDevices = connectedDevices.filter((device: any) => 
    device.deviceType === 'smartphone' || 
    device.deviceType === 'tablet' || 
    device.deviceType === 'mobile'
  );

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <Card className="bg-gray-900 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
                <Network className="h-6 w-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-xl font-semibold text-gray-900 dark:text-gray-100">Interactive Network Topology</CardTitle>
                <p className="text-gray-600 dark:text-gray-400 text-sm">Real-time network visualization with AiMesh nodes</p>
              </div>
            </div>
            <div className="flex space-x-2">
              <Button
                variant={viewMode === 'topology' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('topology')}
              >
                <Network className="h-4 w-4 mr-2" />
                Topology
              </Button>
              <Button
                variant={viewMode === 'grid' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('grid')}
              >
                <Users className="h-4 w-4 mr-2" />
                Grid View
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{connectedDevices.length}</div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Total Devices</div>
            </div>
            <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{wirelessDevices.length}</div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Wireless Clients</div>
            </div>
            <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{wiredDevices.length}</div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Wired Devices</div>
            </div>
            <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{1 + aiMeshData.nodeCount}</div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Network Nodes</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Topology View */}
      {viewMode === 'topology' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Interactive Network Map */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-lg flex items-center space-x-2">
                <Network className="h-5 w-5 text-blue-600" />
                <span>Network Map</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative w-full h-96 bg-gray-50 dark:bg-gray-900 rounded-lg overflow-hidden">
                <svg width="100%" height="100%" viewBox="0 0 800 400">
                  {/* Connection lines */}
                  {connections.map((connection, index) => {
                    const fromNode = nodes.find(n => n.id === connection.from);
                    const toNode = nodes.find(n => n.id === connection.to);
                    if (!fromNode || !toNode) return null;
                    
                    return (
                      <ConnectionLine
                        key={index}
                        from={fromNode.position}
                        to={toNode.position}
                        type={connection.type}
                        isActive={connection.isActive}
                      />
                    );
                  })}
                  
                  {/* Network nodes */}
                  {nodes.map((node) => (
                    <NetworkNode
                      key={node.id}
                      node={node}
                      position={node.position}
                      isSelected={selectedNode === node.id}
                      onClick={() => setSelectedNode(selectedNode === node.id ? null : node.id)}
                    />
                  ))}
                </svg>
                
                {/* Legend */}
                <div className="absolute bottom-4 left-4 bg-white dark:bg-gray-800 rounded-lg p-3 shadow-lg">
                  <div className="text-xs font-medium mb-2 text-gray-900 dark:text-gray-100">Connection Types</div>
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-0.5 bg-green-500"></div>
                      <span className="text-xs text-gray-600 dark:text-gray-400">Wired</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-0.5 bg-blue-500 border-dashed border-b"></div>
                      <span className="text-xs text-gray-600 dark:text-gray-400">Wireless</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Device Details Panel */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                {selectedNodeData ? 'Device Details' : 'Network Overview'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selectedNodeData ? (
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
                      {selectedNodeData.type === 'router' || selectedNodeData.type === 'aimesh' ? (
                        <Router className="h-6 w-6 text-white" />
                      ) : (
                        <DeviceIcon type={selectedNodeData.deviceType} />
                      )}
                    </div>
                    <div>
                      <div className="font-medium text-gray-900 dark:text-gray-100">{selectedNodeData.name}</div>
                      <Badge variant={selectedNodeData.isOnline ? "default" : "secondary"} className="text-xs">
                        {selectedNodeData.isOnline ? 'Online' : 'Offline'}
                      </Badge>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Connection</span>
                      <span className="text-sm font-medium flex items-center space-x-1">
                        {selectedNodeData.connectionType === 'wireless' ? (
                          <Wifi className="h-3 w-3" />
                        ) : (
                          <Cable className="h-3 w-3" />
                        )}
                        <span className="capitalize">{selectedNodeData.connectionType}</span>
                      </span>
                    </div>
                    
                    {selectedNodeData.ipAddress && (
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">IP Address</span>
                        <span className="text-sm font-medium">{selectedNodeData.ipAddress}</span>
                      </div>
                    )}
                    
                    {selectedNodeData.macAddress && (
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">MAC Address</span>
                        <span className="text-sm font-medium font-mono">{selectedNodeData.macAddress}</span>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Click on any device or node in the network map to view detailed information.
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">AiMesh Status</span>
                      <Badge variant={aiMeshData.isMaster ? "default" : "secondary"}>
                        {aiMeshData.isMaster ? 'Master Router' : 'AiMesh Node'}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Network Nodes</span>
                      <span className="text-sm font-medium">{1 + aiMeshData.nodeCount}</span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Total Connections</span>
                      <span className="text-sm font-medium">{connections.length}</span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      ) : (
        /* Grid View */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Wired Devices */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center space-x-2">
                <Cable className="h-5 w-5 text-green-600" />
                <span>Wired Devices ({wiredDevices.length})</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {wiredDevices.map((device: any) => (
                  <div key={device.id} className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center">
                      <DeviceIcon type={device.deviceType} size={16} />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-sm text-gray-900 dark:text-gray-100">{device.name}</div>
                      <div className="text-xs text-gray-500">{device.ipAddress}</div>
                    </div>
                    <Badge variant={device.isOnline ? "default" : "secondary"} className="text-xs">
                      {device.isOnline ? 'Online' : 'Offline'}
                    </Badge>
                  </div>
                ))}
                {wiredDevices.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <Cable className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                    <p className="text-sm">No wired devices detected</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Wireless Devices */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center space-x-2">
                <Wifi className="h-5 w-5 text-blue-600" />
                <span>Wireless Devices ({wirelessDevices.length})</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {wirelessDevices.map((device: any) => (
                  <div key={device.id} className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                      <DeviceIcon type={device.deviceType} size={16} />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-sm text-gray-900 dark:text-gray-100">{device.name}</div>
                      <div className="text-xs text-gray-500">{device.ipAddress}</div>
                    </div>
                    <Badge variant={device.isOnline ? "default" : "secondary"} className="text-xs">
                      {device.isOnline ? 'Online' : 'Offline'}
                    </Badge>
                  </div>
                ))}
                {wirelessDevices.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <Wifi className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                    <p className="text-sm">No wireless devices detected</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}