import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import TopBar from "@/components/top-bar";
import { formatUptime } from "@/lib/utils";
import {
  ArrowLeft,
  Cpu,
  HardDrive,
  MemoryStick,
  Thermometer,
  Network,
  Wifi,
  Shield,
  Activity,
  Info,
  Zap,
  Users,
  Signal,
} from "lucide-react";
import { Link } from "wouter";

export default function SystemDetailsPage() {
  const { data: routerStatus } = useQuery<any>({
    queryKey: ["/api/router/status"],
    refetchInterval: 30000,
  });

  const { data: connectedDevices } = useQuery<any[]>({
    queryKey: ["/api/devices"],
    refetchInterval: 30000,
  });

  const { data: wifiNetworks } = useQuery<any[]>({
    queryKey: ["/api/wifi"],
    refetchInterval: 30000,
  });

  const cpuUsageColor = (routerStatus?.cpuUsage || 0) > 80 ? "bg-red-500" : 
                       (routerStatus?.cpuUsage || 0) > 60 ? "bg-yellow-500" : "bg-green-500";
  
  const memoryUsagePercent = routerStatus ? (routerStatus.memoryUsage / routerStatus.memoryTotal) * 100 : 0;
  const memoryUsageColor = memoryUsagePercent > 80 ? "bg-red-500" : 
                          memoryUsagePercent > 60 ? "bg-yellow-500" : "bg-green-500";

  const storageUsagePercent = routerStatus?.storageUsage && routerStatus?.storageTotal 
    ? (routerStatus.storageUsage / routerStatus.storageTotal) * 100 : 0;

  const wifiClients24 = connectedDevices?.filter(device => device.connectionType === '2.4GHz')?.length || 0;
  const wifiClients5 = connectedDevices?.filter(device => device.connectionType === '5GHz')?.length || 0;
  const wifiClients6 = connectedDevices?.filter(device => device.connectionType === '6GHz')?.length || 0;

  return (
    <div>
      <TopBar 
        title="System Information Details" 
        subtitle="Comprehensive router hardware and system metrics"
      />
      <div className="p-6 space-y-6">
        {/* Back Button */}
        <Link href="/system">
          <Button variant="outline" className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to System Settings
          </Button>
        </Link>

        {/* Hardware Information */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Info className="h-5 w-5" />
                <span>Hardware Information</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-3 text-sm">
                <div>
                  <span className="text-muted-foreground">Model:</span>
                  <div className="font-medium">{routerStatus?.model || 'ASUS Router'}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Firmware Build:</span>
                  <div className="font-medium font-mono">{routerStatus?.firmware || 'Unknown'}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Bootloader:</span>
                  <div className="font-medium font-mono">CFE {routerStatus?.bootloader || 'Unknown'}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">CPU Model:</span>
                  <div className="font-medium">{routerStatus?.cpuModel || 'ARM Processor'}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">CPU Cores:</span>
                  <div className="font-medium">{routerStatus?.cpuCores || 'Unknown'} cores</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Wireless Driver:</span>
                  <div className="font-medium">Broadcom wl {routerStatus?.wirelessDriver || 'Unknown'}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Shield className="h-5 w-5" />
                <span>Features & Capabilities</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500">
                  AiProtection
                </Badge>
                <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500">
                  Adaptive QoS
                </Badge>
                <Badge variant="outline" className="bg-purple-500/10 text-purple-500 border-purple-500">
                  AiMesh
                </Badge>
                <Badge variant="outline" className="bg-orange-500/10 text-orange-500 border-orange-500">
                  Guest Network
                </Badge>
                <Badge variant="outline" className="bg-cyan-500/10 text-cyan-500 border-cyan-500">
                  VPN Server
                </Badge>
                <Badge variant="outline" className="bg-pink-500/10 text-pink-500 border-pink-500">
                  Merlin Firmware
                </Badge>
              </div>
              <div className="pt-2 space-y-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Uptime:</span>
                  <div className="font-medium">{routerStatus ? formatUptime(routerStatus.uptime) : "Unknown"}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">HW Acceleration:</span>
                  <div className="font-medium text-green-500">Enabled (Runner)</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* System Resources Details */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Cpu className="h-5 w-5" />
                <span>CPU Details</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-muted-foreground">Usage</span>
                  <span className="font-medium">{routerStatus?.cpuUsage?.toFixed(1) || '0'}%</span>
                </div>
                <Progress value={routerStatus?.cpuUsage || 0} className={`h-2 ${cpuUsageColor}`} />
              </div>
              
              {routerStatus?.temperature && (
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-muted-foreground">Temperature</span>
                    <span className="font-medium flex items-center space-x-1">
                      <Thermometer className="h-3 w-3" />
                      <span>{routerStatus.temperature.toFixed(1)}°C</span>
                    </span>
                  </div>
                  <Progress 
                    value={(routerStatus.temperature / 80) * 100} 
                    className={`h-2 ${routerStatus.temperature > 70 ? 'bg-red-500' : routerStatus.temperature > 60 ? 'bg-yellow-500' : 'bg-green-500'}`}
                  />
                </div>
              )}

              {routerStatus?.loadAverage && (
                <div className="text-sm">
                  <span className="text-muted-foreground">Load Average:</span>
                  <div className="font-medium font-mono">{routerStatus.loadAverage}</div>
                  <div className="text-xs text-muted-foreground">1min, 5min, 15min</div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Memory className="h-5 w-5" />
                <span>Memory Details</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-muted-foreground">Total Usage</span>
                  <span className="font-medium">
                    {routerStatus ? `${routerStatus.memoryUsage.toFixed(1)} / ${routerStatus.memoryTotal.toFixed(1)} GB` : 'N/A'}
                  </span>
                </div>
                <Progress value={memoryUsagePercent} className={`h-2 ${memoryUsageColor}`} />
              </div>
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Used:</span>
                  <span className="font-medium">{memoryUsagePercent.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Free:</span>
                  <span className="font-medium">{(100 - memoryUsagePercent).toFixed(1)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Available:</span>
                  <span className="font-medium">{routerStatus?.memoryTotal ? ((routerStatus.memoryTotal - routerStatus.memoryUsage) * 1024).toFixed(0) : 'N/A'} MB</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Buffers:</span>
                  <span className="font-medium">~{routerStatus ? (routerStatus.memoryTotal * 0.05).toFixed(0) : 'N/A'} MB</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Cached:</span>
                  <span className="font-medium">~{routerStatus ? (routerStatus.memoryTotal * 0.15).toFixed(0) : 'N/A'} MB</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <HardDrive className="h-5 w-5" />
                <span>Storage Details</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {routerStatus?.storageUsage && (
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-muted-foreground">Total Usage</span>
                    <span className="font-medium">
                      {routerStatus.storageUsage.toFixed(1)} / {routerStatus.storageTotal?.toFixed(1) || '8.0'} GB
                    </span>
                  </div>
                  <Progress value={storageUsagePercent} className="h-2" />
                </div>
              )}
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">NVRAM Usage:</span>
                  <span className="font-medium">~0.5 / 0.5 MB</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">JFFS Usage:</span>
                  <span className="font-medium">{routerStatus?.storageUsage ? (routerStatus.storageUsage * 0.8).toFixed(1) : 'N/A'} GB</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">/tmp Usage:</span>
                  <span className="font-medium">{routerStatus?.storageUsage ? (routerStatus.storageUsage * 0.2).toFixed(1) : 'N/A'} GB</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Available:</span>
                  <span className="font-medium">{routerStatus?.storageTotal && routerStatus?.storageUsage ? (routerStatus.storageTotal - routerStatus.storageUsage).toFixed(1) : 'N/A'} GB</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Network & Connections */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Network className="h-5 w-5" />
                <span>Network Status</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">LAN IP:</span>
                  <div className="font-medium font-mono">{routerStatus?.ipAddress || '192.168.1.1'}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">WAN IP:</span>
                  <div className="font-medium font-mono">xxx.xxx.xxx.xxx</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Active Connections:</span>
                  <div className="font-medium">{routerStatus?.activeConnections || connectedDevices?.length || '0'}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Max Connections:</span>
                  <div className="font-medium">{routerStatus?.maxConnections || '65,536'}</div>
                </div>
              </div>
              
              <div className="pt-2">
                <div className="flex items-center space-x-2">
                  <Activity className="h-4 w-4 text-green-500" />
                  <span className="text-sm text-green-500 font-medium">Network Status: Online</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Wifi className="h-5 w-5" />
                <span>Wireless Clients</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Signal className="h-4 w-4" />
                    <span className="text-sm">2.4GHz Band</span>
                  </div>
                  <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500">
                    {wifiClients24} clients
                  </Badge>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Signal className="h-4 w-4" />
                    <span className="text-sm">5GHz Band</span>
                  </div>
                  <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500">
                    {wifiClients5} clients
                  </Badge>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Signal className="h-4 w-4" />
                    <span className="text-sm">6GHz Band</span>
                  </div>
                  <Badge variant="outline" className="bg-purple-500/10 text-purple-500 border-purple-500">
                    {wifiClients6} clients
                  </Badge>
                </div>
              </div>
              
              <div className="pt-2 border-t">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Total Wireless:</span>
                  <span className="font-medium">{wifiClients24 + wifiClients5 + wifiClients6} devices</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Hardware Acceleration & Advanced Features */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Zap className="h-5 w-5" />
              <span>Hardware Acceleration & Advanced Features</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Network Acceleration</h4>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Flow Cache:</span>
                    <span className="text-green-500">Enabled</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Runner:</span>
                    <span className="text-green-500">Active</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Cut Through:</span>
                    <span className="text-green-500">Enabled</span>
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Security Features</h4>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">AiProtection:</span>
                    <span className="text-green-500">Active</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Firewall:</span>
                    <span className="text-green-500">Enabled</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">DoS Protection:</span>
                    <span className="text-green-500">Enabled</span>
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <h4 className="font-medium text-sm">QoS & Traffic</h4>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Adaptive QoS:</span>
                    <span className="text-green-500">Enabled</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Traffic Control:</span>
                    <span className="text-green-500">Active</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Bandwidth Monitor:</span>
                    <span className="text-green-500">Running</span>
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Wireless Features</h4>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">AiMesh:</span>
                    <span className="text-blue-500">Ready</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Smart Connect:</span>
                    <span className="text-green-500">Enabled</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Guest Network:</span>
                    <span className="text-orange-500">Available</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}