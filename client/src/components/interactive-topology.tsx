import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  Router, 
  Smartphone, 
  Laptop, 
  Tablet, 
  Monitor, 
  Tv,
  HardDrive,
  Wifi,
  Network,
  Activity,
  Signal,
  RefreshCw,
  Move,
  ZoomIn,
  ZoomOut
} from 'lucide-react';
import { cn, formatSpeed } from '@/lib/utils';
import type { ConnectedDevice, RouterStatus, RouterFeatures } from '@shared/schema';

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
  downloadSpeed?: number | null;
  uploadSpeed?: number | null;
}

interface NetworkConnection {
  from: string;
  to: string;
  type: 'ethernet' | 'wifi' | 'aimesh';
  strength: number;
}

interface InteractiveTopologyProps {
  className?: string;
}

export default function InteractiveTopology({ className }: InteractiveTopologyProps) {
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [draggedNode, setDraggedNode] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [nodePositions, setNodePositions] = useState<{ [key: string]: { x: number; y: number } }>({});
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isPanning, setIsPanning] = useState(false);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // Fetch real router data
  const { data: routerStatus } = useQuery<RouterStatus>({
    queryKey: ['/api/router/status'],
    refetchInterval: 10000
  });

  const { data: devices = [] } = useQuery<ConnectedDevice[]>({
    queryKey: ['/api/devices'],
    refetchInterval: 2000 // Fast progressive loading - refresh every 2 seconds
  });

  const { data: routerFeatures } = useQuery<RouterFeatures>({
    queryKey: ['/api/router/features'],
    refetchInterval: 5000 // Faster updates for real-time data
  });

  const { data: wifiNetworks = [] } = useQuery<any[]>({
    queryKey: ['/api/wifi'],
    refetchInterval: 3000 // Faster WiFi network updates
  });

  // Generate network nodes from real data
  const createNetworkNodes = useCallback((): NetworkNode[] => {
    const nodes: NetworkNode[] = [];
    const centerX = 400;
    const centerY = 300;

    // Main router (center)
    nodes.push({
      id: 'main-router',
      name: routerStatus?.model || 'ASUS Router',
      type: 'router',
      x: nodePositions['main-router']?.x ?? centerX,
      y: nodePositions['main-router']?.y ?? centerY,
      isOnline: true,
      ipAddress: routerStatus?.ipAddress,
      connectionType: 'ethernet'
    });

    // Add AiMesh node if available
    if (routerFeatures?.aimeshIsMaster) {
      nodes.push({
        id: 'aimesh-1',
        name: 'AiMesh Node',
        type: 'aimesh',
        x: nodePositions['aimesh-1']?.x ?? centerX + 250,
        y: nodePositions['aimesh-1']?.y ?? centerY - 150,
        isOnline: true,
        connectionType: 'aimesh'
      });
    }

    // Add real connected devices in a circular pattern
    devices.forEach((device, index) => {
      const deviceCount = devices.length;
      const angle = (index * 2 * Math.PI) / Math.max(deviceCount, 1);
      const baseRadius = 180;
      const radiusVariation = (index % 3) * 30; // Create depth
      const radius = baseRadius + radiusVariation;
      
      const defaultX = centerX + Math.cos(angle) * radius;
      const defaultY = centerY + Math.sin(angle) * radius;

      nodes.push({
        id: device.id.toString(),
        name: device.name,
        type: 'device',
        x: nodePositions[device.id.toString()]?.x ?? defaultX,
        y: nodePositions[device.id.toString()]?.y ?? defaultY,
        isOnline: device.isOnline,
        connectionType: device.connectionType || 'wifi',
        ipAddress: device.ipAddress,
        macAddress: device.macAddress,
        deviceType: device.deviceType,
        downloadSpeed: device.downloadSpeed,
        uploadSpeed: device.uploadSpeed
      });
    });

    return nodes;
  }, [routerStatus, devices, routerFeatures, nodePositions]);

  // Create connections between nodes
  const createConnections = useCallback((nodes: NetworkNode[]): NetworkConnection[] => {
    const connections: NetworkConnection[] = [];

    nodes.forEach(node => {
      if (node.type === 'device') {
        const isAiMeshConnected = node.connectionType === 'aimesh' && routerFeatures?.aimeshIsMaster;
        const targetNode = isAiMeshConnected ? 'aimesh-1' : 'main-router';
        
        connections.push({
          from: targetNode,
          to: node.id,
          type: node.connectionType === 'ethernet' ? 'ethernet' : 'wifi',
          strength: node.isOnline ? (node.connectionType === 'ethernet' ? 100 : 85) : 0
        });
      } else if (node.type === 'aimesh') {
        connections.push({
          from: 'main-router',
          to: node.id,
          type: 'aimesh',
          strength: 95
        });
      }
    });

    return connections;
  }, [routerFeatures]);

  const nodes = createNetworkNodes();
  const connections = createConnections(nodes);

  // Get appropriate icon for device type
  const getDeviceIcon = (node: NetworkNode) => {
    if (node.type === 'router') return <Router className="h-6 w-6" />;
    if (node.type === 'aimesh') return <Wifi className="h-6 w-6" />;
    
    switch (node.deviceType?.toLowerCase()) {
      case 'smartphone':
      case 'mobile':
        return <Smartphone className="h-5 w-5" />;
      case 'laptop':
      case 'computer':
        return <Laptop className="h-5 w-5" />;
      case 'tablet':
        return <Tablet className="h-5 w-5" />;
      case 'tv':
      case 'television':
        return <Tv className="h-5 w-5" />;
      case 'monitor':
        return <Monitor className="h-5 w-5" />;
      default:
        return <HardDrive className="h-5 w-5" />;
    }
  };

  // Get connection line color
  const getConnectionColor = (type: string) => {
    switch (type) {
      case 'ethernet': return '#3b82f6'; // Blue
      case 'aimesh': return '#8b5cf6';   // Purple
      default: return '#10b981';         // Green (WiFi)
    }
  };

  // Get node styling based on type and status
  const getNodeStyling = (node: NetworkNode) => {
    if (node.type === 'router') return 'bg-blue-500 border-blue-300 text-white';
    if (node.type === 'aimesh') return 'bg-purple-500 border-purple-300 text-white';
    if (!node.isOnline) return 'bg-gray-400 border-gray-300 text-white opacity-60';
    
    return node.connectionType === 'ethernet' 
      ? 'bg-blue-400 border-blue-200 text-white' 
      : 'bg-green-400 border-green-200 text-white';
  };

  // Drag and drop handlers
  const handleMouseDown = (e: React.MouseEvent, nodeId: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    setDraggedNode(nodeId);
    setDragOffset({
      x: (e.clientX - rect.left) / zoomLevel - panOffset.x,
      y: (e.clientY - rect.top) / zoomLevel - panOffset.y
    });
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!draggedNode || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / zoomLevel - panOffset.x - dragOffset.x;
    const y = (e.clientY - rect.top) / zoomLevel - panOffset.y - dragOffset.y;

    // Keep nodes within bounds
    const boundedX = Math.max(50, Math.min(750, x));
    const boundedY = Math.max(50, Math.min(550, y));

    setNodePositions(prev => ({
      ...prev,
      [draggedNode]: { x: boundedX, y: boundedY }
    }));
  }, [draggedNode, dragOffset, zoomLevel, panOffset]);

  const handleMouseUp = useCallback(() => {
    setDraggedNode(null);
    setIsPanning(false);
  }, []);

  // Zoom handlers
  const handleZoomIn = () => setZoomLevel(prev => Math.min(prev * 1.2, 3));
  const handleZoomOut = () => setZoomLevel(prev => Math.max(prev / 1.2, 0.3));
  const handleResetView = () => {
    setZoomLevel(1);
    setPanOffset({ x: 0, y: 0 });
    setNodePositions({});
  };

  // Set up event listeners
  useEffect(() => {
    if (draggedNode || isPanning) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [draggedNode, isPanning, handleMouseMove, handleMouseUp]);

  return (
    <TooltipProvider>
      <div className={cn("h-full", className)}>
        <Card className="h-full">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center space-x-2">
                <Network className="h-5 w-5" />
                <span>Interactive Network Topology</span>
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={handleZoomOut}>
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={handleZoomIn}>
                  <ZoomIn className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={handleResetView}>
                  <RefreshCw className="h-4 w-4" />
                </Button>
                <Badge variant="outline">
                  {devices.filter(d => d.isOnline).length}/{devices.length} online
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div 
              ref={containerRef}
              className="relative h-[600px] bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-blue-900 overflow-hidden cursor-move"
              style={{
                transform: `scale(${zoomLevel}) translate(${panOffset.x}px, ${panOffset.y}px)`,
                transformOrigin: 'top left'
              }}
            >
              {/* SVG for connection lines */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none">
                <defs>
                  <filter id="glow">
                    <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                    <feMerge> 
                      <feMergeNode in="coloredBlur"/>
                      <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                  </filter>
                </defs>
                
                {connections.map((connection, index) => {
                  const fromNode = nodes.find(n => n.id === connection.from);
                  const toNode = nodes.find(n => n.id === connection.to);
                  
                  if (!fromNode || !toNode) return null;

                  const opacity = connection.strength / 100;
                  const strokeWidth = connection.strength > 80 ? 4 : 3;
                  const color = getConnectionColor(connection.type);

                  return (
                    <g key={index}>
                      {/* Connection line */}
                      <line
                        x1={fromNode.x}
                        y1={fromNode.y}
                        x2={toNode.x}
                        y2={toNode.y}
                        stroke={color}
                        strokeWidth={strokeWidth}
                        strokeDasharray={connection.type === 'wifi' ? '8,4' : 'none'}
                        opacity={opacity}
                        filter="url(#glow)"
                        className="transition-all duration-300"
                      />
                      
                      {/* Animated data flow */}
                      {connection.strength > 0 && toNode.isOnline && (
                        <circle r="3" fill={color} opacity="0.8">
                          <animateMotion
                            dur="2s"
                            repeatCount="indefinite"
                            path={`M${fromNode.x},${fromNode.y} L${toNode.x},${toNode.y}`}
                          />
                        </circle>
                      )}
                    </g>
                  );
                })}
              </svg>

              {/* Network nodes */}
              {nodes.map((node) => (
                <Tooltip key={node.id}>
                  <TooltipTrigger asChild>
                    <div
                      className={cn(
                        "absolute transform -translate-x-1/2 -translate-y-1/2 transition-all duration-200 cursor-grab select-none",
                        "hover:scale-110 active:scale-105 touch-manipulation",
                        "min-w-[60px] min-h-[60px] sm:min-w-[80px] sm:min-h-[80px]",
                        draggedNode === node.id && "cursor-grabbing scale-110 z-50",
                        selectedNode === node.id && "scale-125 z-40"
                      )}
                      style={{
                        left: node.x,
                        top: node.y
                      }}
                      onMouseDown={(e) => handleMouseDown(e, node.id)}
                      onTouchStart={(e) => {
                        e.preventDefault();
                        const touch = e.touches[0];
                        const mouseEvent = new MouseEvent('mousedown', {
                          clientX: touch.clientX,
                          clientY: touch.clientY,
                          bubbles: true
                        });
                        handleMouseDown(mouseEvent as any, node.id);
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedNode(selectedNode === node.id ? null : node.id);
                      }}
                    >
                      <div className={cn(
                        "relative p-2 sm:p-3 rounded-xl border-2 shadow-lg backdrop-blur-sm",
                        "flex flex-col items-center justify-center",
                        "min-w-[50px] min-h-[50px] sm:min-w-[70px] sm:min-h-[70px]",
                        getNodeStyling(node)
                      )}>
                        {/* Device icon */}
                        <div className="flex items-center justify-center mb-1">
                          <div className="scale-75 sm:scale-100">
                            {getDeviceIcon(node)}
                          </div>
                        </div>

                        {/* Device name */}
                        <div className="text-center">
                          <div className="text-xs font-medium truncate max-w-[60px] sm:max-w-[80px]">
                            {node.name}
                          </div>
                        </div>

                        {/* Status indicator */}
                        <div className={cn(
                          "absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-white",
                          node.isOnline ? "bg-green-400" : "bg-red-400"
                        )} />

                        {/* Activity indicator for active connections */}
                        {node.isOnline && (node.downloadSpeed || 0) > 0 && (
                          <div className="absolute -bottom-1 -left-1">
                            <Activity className="h-3 w-3 text-green-300 animate-pulse" />
                          </div>
                        )}

                        {/* Signal strength for WiFi devices */}
                        {node.connectionType === 'wifi' && node.isOnline && (
                          <div className="absolute -top-1 -left-1">
                            <Signal className="h-3 w-3 text-green-300" />
                          </div>
                        )}
                      </div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-[280px]">
                    <div className="space-y-2">
                      <div className="font-semibold text-base">{node.name}</div>
                      
                      {node.ipAddress && (
                        <div className="text-sm">
                          <span className="text-gray-500">IP:</span> {node.ipAddress}
                        </div>
                      )}
                      
                      {node.macAddress && (
                        <div className="text-sm">
                          <span className="text-gray-500">MAC:</span> {node.macAddress}
                        </div>
                      )}
                      
                      {node.downloadSpeed !== null && node.uploadSpeed !== null && (
                        <div className="text-sm">
                          <span className="text-gray-500">Speed:</span> ↓ {formatSpeed(node.downloadSpeed || 0)} | ↑ {formatSpeed(node.uploadSpeed || 0)}
                        </div>
                      )}
                      
                      <div className="flex gap-1 flex-wrap">
                        <Badge variant={node.isOnline ? "default" : "secondary"} className="text-xs">
                          {node.isOnline ? "Online" : "Offline"}
                        </Badge>
                        {node.connectionType && (
                          <Badge variant="outline" className="text-xs">
                            {node.connectionType.toUpperCase()}
                          </Badge>
                        )}
                        {node.deviceType && (
                          <Badge variant="secondary" className="text-xs">
                            {node.deviceType}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </TooltipContent>
                </Tooltip>
              ))}

              {/* Mobile-responsive Connection legend */}
              <div className="absolute bottom-2 left-2 lg:bottom-4 lg:left-4 bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm p-2 lg:p-4 rounded-lg shadow-lg border max-w-[150px] lg:max-w-none">
                <div className="text-xs lg:text-sm font-semibold mb-2 lg:mb-3">Connection Types</div>
                <div className="space-y-1 lg:space-y-2 text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-0.5 bg-blue-500"></div>
                    <span className="text-xs">Ethernet</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <svg width="16" height="2" className="lg:w-5">
                      <line x1="0" y1="1" x2="16" y2="1" stroke="#10b981" strokeWidth="2" strokeDasharray="3,1" />
                    </svg>
                    <span className="text-xs">WiFi</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-0.5 bg-purple-500"></div>
                    <span className="text-xs">AiMesh</span>
                  </div>
                </div>
                <div className="mt-2 pt-2 border-t text-xs text-gray-600 dark:text-gray-400 flex items-center gap-1 lg:flex hidden">
                  <Move className="h-3 w-3" />
                  <span>Drag nodes</span>
                </div>
                <div className="mt-2 pt-2 border-t text-xs text-gray-600 dark:text-gray-400 flex items-center gap-1 lg:hidden">
                  <Move className="h-3 w-3" />
                  <span>Touch & drag</span>
                </div>
              </div>

              {/* Mobile-responsive Network statistics */}
              <div className="absolute top-2 right-2 lg:top-4 lg:right-4 bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm p-2 lg:p-4 rounded-lg shadow-lg border max-w-[140px] lg:max-w-none">
                <div className="text-xs lg:text-sm font-semibold mb-2 lg:mb-3">Network Stats</div>
                <div className="space-y-1 lg:space-y-2 text-xs">
                  <div className="flex justify-between gap-2 lg:gap-6">
                    <span className="text-xs">Devices:</span>
                    <span className="font-mono font-semibold text-xs">{devices.length}</span>
                  </div>
                  <div className="flex justify-between gap-2 lg:gap-6">
                    <span className="text-xs">Online:</span>
                    <span className="font-mono font-semibold text-green-600 text-xs">{devices.filter(d => d.isOnline).length}</span>
                  </div>
                  <div className="flex justify-between gap-2 lg:gap-6">
                    <span className="text-xs">WiFi:</span>
                    <span className="font-mono font-semibold text-xs">{wifiNetworks.length}</span>
                  </div>
                  {routerFeatures?.aimeshIsMaster && (
                    <div className="flex justify-between gap-2 lg:gap-6">
                      <span className="text-xs">AiMesh:</span>
                      <span className="font-mono font-semibold text-purple-600 text-xs">Yes</span>
                    </div>
                  )}
                  <div className="flex justify-between gap-2 lg:gap-6 hidden lg:flex">
                    <span>Router:</span>
                    <span className="font-mono font-semibold">{routerStatus?.model || 'Unknown'}</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
}