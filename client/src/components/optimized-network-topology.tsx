import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { 
  Wifi, 
  Router, 
  Smartphone, 
  Laptop, 
  Tablet, 
  Monitor, 
  Tv,
  HardDrive,
  Network,
  Users,
  Activity,
  Settings,
  Zap,
  Eye,
  RefreshCw
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ConnectedDevice, RouterStatus, RouterFeatures } from '@shared/schema';

interface OptimizedNetworkTopologyProps {
  className?: string;
  maxDevices?: number;
  performanceMode?: 'high' | 'balanced' | 'quality';
}

interface NetworkNode {
  id: string;
  name: string;
  type: 'router' | 'device' | 'aimesh';
  x: number;
  y: number;
  isOnline: boolean;
  connectionType?: string;
  ipAddress?: string;
  macAddress?: string;
  deviceType?: string;
  priority?: number;
  visible?: boolean;
}

interface PerformanceSettings {
  maxVisibleNodes: number;
  animationEnabled: boolean;
  detailLevel: 'minimal' | 'standard' | 'detailed';
  refreshRate: number;
  virtualizationEnabled: boolean;
}

const DeviceIcon = ({ type, size = 20 }: { type?: string; size?: number }) => {
  const iconProps = { size, className: "text-white" };
  
  switch (type?.toLowerCase()) {
    case 'smartphone':
    case 'mobile':
      return <Smartphone {...iconProps} />;
    case 'laptop':
    case 'computer':
      return <Laptop {...iconProps} />;
    case 'tablet':
      return <Tablet {...iconProps} />;
    case 'tv':
    case 'smart_tv':
      return <Tv {...iconProps} />;
    case 'monitor':
      return <Monitor {...iconProps} />;
    case 'storage':
    case 'nas':
      return <HardDrive {...iconProps} />;
    default:
      return <Monitor {...iconProps} />;
  }
};

const OptimizedNetworkNode = ({ 
  node, 
  onClick, 
  isSelected, 
  performanceMode 
}: { 
  node: NetworkNode; 
  onClick: () => void; 
  isSelected: boolean;
  performanceMode: string;
}) => {
  const getNodeColor = (type: string, isOnline: boolean) => {
    if (!isOnline) return 'bg-gray-400';
    switch (type) {
      case 'router': return 'bg-blue-600';
      case 'aimesh': return 'bg-purple-600';
      default: return 'bg-green-600';
    }
  };

  const nodeSize = performanceMode === 'high' ? 32 : 40;
  const showDetails = performanceMode !== 'high';

  return (
    <g
      onClick={onClick}
      className="cursor-pointer group"
      transform={`translate(${node.x - nodeSize/2}, ${node.y - nodeSize/2})`}
    >
      {/* Node circle */}
      <circle
        cx={nodeSize/2}
        cy={nodeSize/2}
        r={nodeSize/2}
        className={cn(
          getNodeColor(node.type, node.isOnline),
          'transition-all duration-200',
          isSelected ? 'ring-4 ring-blue-300' : 'group-hover:ring-2 group-hover:ring-blue-200'
        )}
        fill="currentColor"
      />
      
      {/* Device icon */}
      <foreignObject
        x={nodeSize/2 - 10}
        y={nodeSize/2 - 10}
        width={20}
        height={20}
      >
        <div className="flex items-center justify-center w-full h-full">
          {node.type === 'router' || node.type === 'aimesh' ? (
            <Router size={16} className="text-white" />
          ) : (
            <DeviceIcon type={node.deviceType} size={16} />
          )}
        </div>
      </foreignObject>

      {/* Node label (conditional based on performance mode) */}
      {showDetails && (
        <text
          x={nodeSize/2}
          y={nodeSize + 15}
          textAnchor="middle"
          className="text-xs fill-gray-700 dark:fill-gray-300 font-medium"
        >
          {node.name.length > 12 ? `${node.name.substring(0, 12)}...` : node.name}
        </text>
      )}

      {/* Status indicator */}
      <circle
        cx={nodeSize - 6}
        cy={6}
        r={4}
        className={node.isOnline ? 'fill-green-400' : 'fill-red-400'}
      />
    </g>
  );
};

const ConnectionLine = ({ 
  from, 
  to, 
  type, 
  performanceMode 
}: { 
  from: { x: number; y: number }; 
  to: { x: number; y: number }; 
  type: string;
  performanceMode: string;
}) => {
  const strokeWidth = performanceMode === 'high' ? 1 : 2;
  const isWireless = type.includes('wireless') || type === 'wifi';
  
  return (
    <line
      x1={from.x}
      y1={from.y}
      x2={to.x}
      y2={to.y}
      stroke={isWireless ? '#3B82F6' : '#10B981'}
      strokeWidth={strokeWidth}
      strokeDasharray={isWireless ? '5,5' : 'none'}
      className="transition-all duration-200"
      opacity={0.7}
    />
  );
};

export default function OptimizedNetworkTopology({ 
  className, 
  maxDevices = 50,
  performanceMode = 'balanced'
}: OptimizedNetworkTopologyProps) {
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [performanceSettings, setPerformanceSettings] = useState<PerformanceSettings>({
    maxVisibleNodes: maxDevices,
    animationEnabled: performanceMode !== 'high',
    detailLevel: performanceMode === 'high' ? 'minimal' : 'standard',
    refreshRate: performanceMode === 'high' ? 10000 : 5000,
    virtualizationEnabled: maxDevices > 20
  });
  const [viewportBounds, setViewportBounds] = useState({ 
    minX: 0, minY: 0, maxX: 800, maxY: 400 
  });

  // Fetch data with performance-optimized intervals
  const { data: devices } = useQuery({
    queryKey: ['/api/devices'],
    refetchInterval: performanceSettings.refreshRate,
  });

  const { data: routerFeatures } = useQuery({
    queryKey: ['/api/router/features'],
    refetchInterval: performanceSettings.refreshRate * 2, // Less frequent for features
  });

  const { data: routerStatus } = useQuery({
    queryKey: ['/api/router/status'],
    refetchInterval: performanceSettings.refreshRate,
  });

  // Memoized network topology calculation with performance optimizations
  const networkTopology = useMemo(() => {
    const connectedDevices = Array.isArray(devices) ? devices : [];
    const aiMeshData = (routerFeatures as any)?.aiMesh || { isMaster: true, nodeCount: 0, peers: [] };
    
    const nodes: NetworkNode[] = [];
    const connections: any[] = [];

    // Main router node
    const mainRouter: NetworkNode = {
      id: 'main-router',
      name: (routerStatus as any)?.model || 'Main Router',
      type: 'router',
      x: 400,
      y: 200,
      isOnline: true,
      connectionType: 'wired',
      priority: 1,
      visible: true
    };
    nodes.push(mainRouter);

    // Performance optimization: Prioritize and limit devices
    const prioritizedDevices = connectedDevices
      .filter(device => device.isOnline) // Only show online devices for performance
      .sort((a, b) => {
        // Prioritize by connection speed and device type
        const scoreA = (a.downloadSpeed || 0) + (a.uploadSpeed || 0);
        const scoreB = (b.downloadSpeed || 0) + (b.uploadSpeed || 0);
        return scoreB - scoreA;
      })
      .slice(0, performanceSettings.maxVisibleNodes - 1); // Reserve space for router

    // Add AiMesh nodes
    if (aiMeshData.peers && aiMeshData.peers.length > 0) {
      aiMeshData.peers.slice(0, 3).forEach((peer: string, index: number) => { // Limit AiMesh nodes
        const angle = (index * 120) * (Math.PI / 180);
        const radius = 150;
        const aimeshNode: NetworkNode = {
          id: `aimesh-${index}`,
          name: `AiMesh Node ${index + 1}`,
          type: 'aimesh',
          x: 400 + Math.cos(angle) * radius,
          y: 200 + Math.sin(angle) * radius,
          isOnline: true,
          connectionType: 'wireless',
          macAddress: peer,
          priority: 2,
          visible: true
        };
        nodes.push(aimeshNode);
        
        connections.push({
          from: mainRouter,
          to: aimeshNode,
          type: 'wireless'
        });
      });
    }

    // Add devices with viewport culling for performance
    prioritizedDevices.forEach((device: any, index: number) => {
      const angle = (index * (360 / Math.max(prioritizedDevices.length, 8))) * (Math.PI / 180);
      const isWireless = device.deviceType === 'smartphone' || 
                        device.deviceType === 'tablet' || 
                        device.deviceType === 'mobile';
      const radius = isWireless ? 280 : 180;
      
      const x = 400 + Math.cos(angle) * radius;
      const y = 200 + Math.sin(angle) * radius;
      
      // Viewport culling for performance
      const isVisible = performanceSettings.virtualizationEnabled ? 
        (x >= viewportBounds.minX && x <= viewportBounds.maxX && 
         y >= viewportBounds.minY && y <= viewportBounds.maxY) : true;

      const deviceNode: NetworkNode = {
        id: `device-${device.id}`,
        name: device.name,
        type: 'device',
        x,
        y,
        isOnline: device.isOnline,
        connectionType: isWireless ? 'wireless' : 'wired',
        ipAddress: device.ipAddress,
        macAddress: device.macAddress,
        deviceType: device.deviceType,
        priority: 3,
        visible: isVisible
      };

      if (isVisible || !performanceSettings.virtualizationEnabled) {
        nodes.push(deviceNode);

        // Connect to appropriate node
        const connectTo = isWireless && aiMeshData.peers.length > 0 
          ? nodes.find(n => n.id === `aimesh-${index % aiMeshData.peers.length}`)
          : mainRouter;
        
        connections.push({
          from: connectTo,
          to: deviceNode,
          type: isWireless ? 'wireless' : 'wired'
        });
      }
    });

    return { nodes, connections };
  }, [devices, routerFeatures, routerStatus, performanceSettings, viewportBounds]);

  const handlePerformanceModeChange = (mode: 'high' | 'balanced' | 'quality') => {
    const newSettings = {
      high: { maxVisibleNodes: 20, animationEnabled: false, detailLevel: 'minimal' as const, refreshRate: 10000, virtualizationEnabled: true },
      balanced: { maxVisibleNodes: 50, animationEnabled: true, detailLevel: 'standard' as const, refreshRate: 5000, virtualizationEnabled: true },
      quality: { maxVisibleNodes: 100, animationEnabled: true, detailLevel: 'detailed' as const, refreshRate: 3000, virtualizationEnabled: false }
    };
    setPerformanceSettings(newSettings[mode]);
  };

  const selectedNodeData = networkTopology.nodes.find(node => node.id === selectedNode);
  const onlineDevices = networkTopology.nodes.filter(node => node.type === 'device' && node.isOnline);
  const wirelessDevices = onlineDevices.filter(node => node.connectionType?.includes('wireless'));
  const wiredDevices = onlineDevices.filter(node => !node.connectionType?.includes('wireless'));

  return (
    <div className={cn("space-y-6", className)}>
      {/* Performance Controls */}
      <Card className="border border-gray-200 dark:border-gray-700">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center space-x-2">
                <Zap className="h-5 w-5 text-yellow-500" />
                <span>Performance Optimized Network Topology</span>
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Showing {networkTopology.nodes.length - 1} of {Array.isArray(devices) ? devices.length : 0} devices
              </p>
            </div>
            <div className="flex space-x-2">
              <Button
                variant={performanceMode === 'high' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handlePerformanceModeChange('high')}
              >
                <Zap className="h-4 w-4 mr-1" />
                High Performance
              </Button>
              <Button
                variant={performanceMode === 'balanced' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handlePerformanceModeChange('balanced')}
              >
                <Activity className="h-4 w-4 mr-1" />
                Balanced
              </Button>
              <Button
                variant={performanceMode === 'quality' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handlePerformanceModeChange('quality')}
              >
                <Eye className="h-4 w-4 mr-1" />
                Quality
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-muted rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-primary">{onlineDevices.length}</div>
              <div className="text-xs text-muted-foreground">Visible Devices</div>
            </div>
            <div className="bg-muted rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-blue-600">{wirelessDevices.length}</div>
              <div className="text-xs text-muted-foreground">Wireless</div>
            </div>
            <div className="bg-muted rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-green-600">{wiredDevices.length}</div>
              <div className="text-xs text-muted-foreground">Wired</div>
            </div>
            <div className="bg-muted rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-purple-600">
                {networkTopology.nodes.filter(n => n.type === 'aimesh').length + 1}
              </div>
              <div className="text-xs text-muted-foreground">Network Nodes</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Network Visualization */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg flex items-center space-x-2">
              <Network className="h-5 w-5 text-blue-600" />
              <span>Optimized Network Map</span>
              <Badge variant="secondary" className="ml-2">
                {performanceMode} mode
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative w-full h-96 bg-muted/30 rounded-lg overflow-hidden">
              <svg width="100%" height="100%" viewBox="0 0 800 400">
                {/* Connection lines */}
                {networkTopology.connections.map((connection, index) => (
                  <ConnectionLine
                    key={index}
                    from={{ x: connection.from.x, y: connection.from.y }}
                    to={{ x: connection.to.x, y: connection.to.y }}
                    type={connection.type}
                    performanceMode={performanceMode}
                  />
                ))}
                
                {/* Network nodes */}
                {networkTopology.nodes.map((node) => (
                  <OptimizedNetworkNode
                    key={node.id}
                    node={node}
                    onClick={() => setSelectedNode(selectedNode === node.id ? null : node.id)}
                    isSelected={selectedNode === node.id}
                    performanceMode={performanceMode}
                  />
                ))}
              </svg>
              
              {/* Performance info overlay */}
              <div className="absolute top-4 right-4 bg-background/80 backdrop-blur rounded-lg p-2 text-xs">
                <div className="flex items-center space-x-2">
                  <RefreshCw className="h-3 w-3" />
                  <span>Refresh: {performanceSettings.refreshRate/1000}s</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Device Details Panel */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {selectedNodeData ? 'Device Details' : 'Performance Settings'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedNodeData ? (
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center">
                    {selectedNodeData.type === 'router' || selectedNodeData.type === 'aimesh' ? (
                      <Router className="h-6 w-6 text-white" />
                    ) : (
                      <DeviceIcon type={selectedNodeData.deviceType} size={24} />
                    )}
                  </div>
                  <div>
                    <div className="font-medium">{selectedNodeData.name}</div>
                    <Badge variant={selectedNodeData.isOnline ? "default" : "secondary"} className="text-xs">
                      {selectedNodeData.isOnline ? 'Online' : 'Offline'}
                    </Badge>
                  </div>
                </div>
                
                <Separator />
                
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Type</span>
                    <span className="capitalize">{selectedNodeData.connectionType}</span>
                  </div>
                  {selectedNodeData.ipAddress && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">IP Address</span>
                      <span className="font-mono">{selectedNodeData.ipAddress}</span>
                    </div>
                  )}
                  {selectedNodeData.macAddress && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">MAC Address</span>
                      <span className="font-mono text-xs">{selectedNodeData.macAddress}</span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="virtualization">Virtualization</Label>
                  <Switch
                    id="virtualization"
                    checked={performanceSettings.virtualizationEnabled}
                    onCheckedChange={(checked) => 
                      setPerformanceSettings(prev => ({ ...prev, virtualizationEnabled: checked }))
                    }
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <Label htmlFor="animations">Animations</Label>
                  <Switch
                    id="animations"
                    checked={performanceSettings.animationEnabled}
                    onCheckedChange={(checked) => 
                      setPerformanceSettings(prev => ({ ...prev, animationEnabled: checked }))
                    }
                  />
                </div>

                <Separator />

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Max Visible Nodes</span>
                    <span>{performanceSettings.maxVisibleNodes}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Refresh Rate</span>
                    <span>{performanceSettings.refreshRate/1000}s</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Detail Level</span>
                    <span className="capitalize">{performanceSettings.detailLevel}</span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}