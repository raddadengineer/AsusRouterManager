import { useQuery } from "@tanstack/react-query";
import type { RouterStatus, ConnectedDevice } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import BandwidthChart from "@/components/bandwidth-chart";
import OptimizedNetworkTopology from "@/components/optimized-network-topology";
import DeviceTable from "@/components/device-table";
import TopBar from "@/components/top-bar";
import { useToast } from "@/hooks/use-toast";
import { formatUptime } from "@/lib/utils";
import { Link } from "wouter";
import {
  Tablet,
  TrendingUp,
  Cpu,
  HardDrive,
  Power,
  TestTube,
  Download,
  Save,
  ChevronRight,
  ArrowRight,
  Network,
  Users,
  Router,
} from "lucide-react";

export default function Dashboard() {
  const { toast } = useToast();

  const { data: routerStatus, isLoading: statusLoading } = useQuery<RouterStatus>({
    queryKey: ["/api/router/status"],
    refetchInterval: 30000,
  });

  const { data: devices, isLoading: devicesLoading } = useQuery<ConnectedDevice[]>({
    queryKey: ["/api/devices"],
    refetchInterval: 30000,
  });

  const { data: wifiNetworks } = useQuery({
    queryKey: ["/api/wifi"],
    refetchInterval: 30000,
  });

  const { data: routerFeatures } = useQuery({
    queryKey: ["/api/router/features"],
    refetchInterval: 30000,
  });

  const { data: bandwidthData } = useQuery({
    queryKey: ["/api/bandwidth"],
    refetchInterval: 5000, // Update every 5 seconds for real-time network usage
    staleTime: 0, // Always consider data stale
  });

  const connectedDevices = devices || [];
  const connectedDevicesCount = devices?.filter(device => device.isOnline).length || 0;
  
  // Calculate real-time network usage from actual bandwidth data
  const networkUsage = (() => {
    if (!bandwidthData || bandwidthData.length === 0) return { total: 0, unit: 'KB/s', download: 0, upload: 0 };
    
    // Get the most recent bandwidth reading
    const latestBandwidth = bandwidthData[bandwidthData.length - 1];
    if (!latestBandwidth) return { total: 0, unit: 'KB/s', download: 0, upload: 0 };
    
    // Convert from bytes to KB/s
    const downloadKbps = (latestBandwidth.downloadSpeed || 0) / 1024;
    const uploadKbps = (latestBandwidth.uploadSpeed || 0) / 1024;
    const totalKbps = downloadKbps + uploadKbps;
    
    // Choose appropriate unit based on size
    if (totalKbps >= 1024) {
      return {
        total: totalKbps / 1024,
        unit: 'MB/s',
        download: downloadKbps / 1024,
        upload: uploadKbps / 1024
      };
    } else {
      return {
        total: totalKbps,
        unit: 'KB/s',
        download: downloadKbps,
        upload: uploadKbps
      };
    }
  })();

  const totalNetworkUsage = networkUsage.total;

  const handleQuickAction = async (action: string) => {
    try {
      const response = await fetch(`/api/system/${action}`, {
        method: 'POST',
        credentials: 'include',
      });
      
      if (response.ok) {
        const result = await response.json();
        toast({
          title: "Action completed",
          description: result.message,
        });
      } else {
        throw new Error('Action failed');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to ${action.replace('-', ' ')}`,
        variant: "destructive",
      });
    }
  };

  return (
    <div>
      <TopBar 
        title="Dashboard" 
        subtitle="Router management and monitoring overview"
      />
      <div className="p-6">
        <div className="space-y-6">

      {/* Device Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Cpu className="h-5 w-5 text-orange-600" />
            <span>Device Overview</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* CPU Usage */}
            <div className="text-center p-4 bg-orange-50 dark:bg-orange-950/30 rounded-lg">
              <div className="flex items-center justify-center mb-3">
                <Cpu className="h-8 w-8 text-orange-600 dark:text-orange-400" />
              </div>
              <div className="text-3xl font-bold text-orange-600 dark:text-orange-400 mb-2">
                {statusLoading ? (
                  <Skeleton className="h-8 w-12 mx-auto" />
                ) : (
                  `${routerStatus?.cpuUsage?.toFixed(1) || '0.0'}%`
                )}
              </div>
              <div className="text-sm text-muted-foreground mb-2">CPU Usage</div>
              <div className="text-xs text-muted-foreground mb-2" style={{ height: '16px' }}>
                {/* Spacer for alignment */}
              </div>
              {!statusLoading && (
                <Progress 
                  value={routerStatus?.cpuUsage || 0} 
                  className="h-2"
                />
              )}
            </div>

            {/* Memory Usage */}
            <div className="text-center p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
              <div className="flex items-center justify-center mb-3">
                <HardDrive className="h-8 w-8 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-2">
                {statusLoading ? (
                  <Skeleton className="h-8 w-16 mx-auto" />
                ) : (
                  `${routerStatus ? ((routerStatus.memoryUsage / routerStatus.memoryTotal) * 100).toFixed(1) : '0.0'}%`
                )}
              </div>
              <div className="text-sm text-muted-foreground mb-2">Memory Usage</div>
              {!statusLoading && (
                <>
                  <div className="text-xs text-muted-foreground mb-2">
                    {(routerStatus?.memoryUsage || 0).toFixed(0)}MB / {(routerStatus?.memoryTotal || 0).toFixed(0)}MB
                  </div>
                  <Progress 
                    value={routerStatus ? (routerStatus.memoryUsage / routerStatus.memoryTotal) * 100 : 0} 
                    className="h-2"
                  />
                </>
              )}
            </div>

            {/* Internet Traffic */}
            <div className="text-center p-4 bg-green-50 dark:bg-green-950/30 rounded-lg">
              <div className="flex items-center justify-center mb-3">
                <TrendingUp className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
              <div className="text-sm text-muted-foreground mb-3">Internet Traffic</div>
              
              {/* Download and Upload Side by Side */}
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 mb-1">
                    {devicesLoading ? (
                      <Skeleton className="h-6 w-12 mx-auto" />
                    ) : (
                      `${networkUsage.download.toFixed(1)}`
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">↓ Download</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600 dark:text-orange-400 mb-1">
                    {devicesLoading ? (
                      <Skeleton className="h-6 w-12 mx-auto" />
                    ) : (
                      `${networkUsage.upload.toFixed(1)}`
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">↑ Upload</div>
                </div>
              </div>
              
              <div className="text-xs text-muted-foreground mb-2">{networkUsage.unit}</div>
              
              {!devicesLoading && (
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Download</span>
                    <span>{networkUsage.download.toFixed(1)} {networkUsage.unit}</span>
                  </div>
                  <Progress 
                    value={Math.min((networkUsage.download / (networkUsage.unit === 'MB/s' ? 100 : 1000)) * 100, 100)} 
                    className="h-1 bg-blue-100 dark:bg-blue-900"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground mt-2">
                    <span>Upload</span>
                    <span>{networkUsage.upload.toFixed(1)} {networkUsage.unit}</span>
                  </div>
                  <Progress 
                    value={Math.min((networkUsage.upload / (networkUsage.unit === 'MB/s' ? 100 : 1000)) * 100, 100)} 
                    className="h-1 bg-orange-100 dark:bg-orange-900"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Device Status Bar */}
          <div className="mt-6 p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Device Performance</span>
            </div>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${
                  !routerStatus ? 'bg-gray-400' :
                  (routerStatus.cpuUsage || 0) < 20 ? 'bg-green-500' :
                  (routerStatus.cpuUsage || 0) < 60 ? 'bg-yellow-500' :
                  (routerStatus.cpuUsage || 0) < 90 ? 'bg-orange-500' : 'bg-red-500'
                }`}></div>
                <span>{
                  !routerStatus ? 'CPU Unknown' :
                  (routerStatus.cpuUsage || 0) < 20 ? 'CPU Excellent' :
                  (routerStatus.cpuUsage || 0) < 60 ? 'CPU Good' :
                  (routerStatus.cpuUsage || 0) < 90 ? 'CPU High' : 'CPU Critical'
                }</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${
                  !routerStatus ? 'bg-gray-400' :
                  ((routerStatus.memoryUsage / routerStatus.memoryTotal) * 100) < 70 ? 'bg-green-500' :
                  ((routerStatus.memoryUsage / routerStatus.memoryTotal) * 100) < 85 ? 'bg-yellow-500' :
                  ((routerStatus.memoryUsage / routerStatus.memoryTotal) * 100) < 95 ? 'bg-orange-500' : 'bg-red-500'
                }`}></div>
                <span>{
                  !routerStatus ? 'Memory Unknown' :
                  ((routerStatus.memoryUsage / routerStatus.memoryTotal) * 100) < 70 ? 'Memory Excellent' :
                  ((routerStatus.memoryUsage / routerStatus.memoryTotal) * 100) < 85 ? 'Memory Good' :
                  ((routerStatus.memoryUsage / routerStatus.memoryTotal) * 100) < 95 ? 'Memory High' : 'Memory Critical'
                }</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${
                  totalNetworkUsage < 10 ? 'bg-green-500' :
                  totalNetworkUsage < 50 ? 'bg-yellow-500' :
                  totalNetworkUsage < 100 ? 'bg-orange-500' : 'bg-red-500'
                }`}></div>
                <span>{
                  totalNetworkUsage < 10 ? 'Network Light' :
                  totalNetworkUsage < 50 ? 'Network Active' :
                  totalNetworkUsage < 100 ? 'Network Heavy' : 'Network Saturated'
                }</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Network Overview */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Network className="h-5 w-5 text-blue-600" />
            <span>Network Overview</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Total Connected Devices */}
            <div className="text-center p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {connectedDevicesCount}
              </div>
              <div className="text-sm text-muted-foreground">Total Devices</div>
              <div className="text-xs text-green-600 dark:text-green-400 mt-1">
                {connectedDevices?.filter(device => device.isOnline).length || 0} Online
              </div>
            </div>

            {/* Network Uptime */}
            <div className="text-center p-4 bg-green-50 dark:bg-green-950/30 rounded-lg">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {routerStatus ? Math.floor(routerStatus.uptime / 24 / 3600) : 0}
              </div>
              <div className="text-sm text-muted-foreground">Days Uptime</div>
              <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                {routerStatus ? formatUptime(routerStatus.uptime) : "N/A"}
              </div>
            </div>

            {/* Router Health */}
            <div className="text-center p-4 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg">
              <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                {routerStatus ? (() => {
                  // Calculate comprehensive health score based on multiple metrics
                  let healthScore = 100;
                  
                  // Memory usage penalty (0-30 points)
                  const memoryUsagePercent = (routerStatus.memoryUsage / routerStatus.memoryTotal) * 100;
                  if (memoryUsagePercent > 90) healthScore -= 30;
                  else if (memoryUsagePercent > 80) healthScore -= 20;
                  else if (memoryUsagePercent > 70) healthScore -= 10;
                  
                  // CPU usage penalty (0-25 points)
                  const cpuUsage = routerStatus.cpuUsage || 0;
                  if (cpuUsage > 90) healthScore -= 25;
                  else if (cpuUsage > 80) healthScore -= 20;
                  else if (cpuUsage > 60) healthScore -= 15;
                  else if (cpuUsage > 40) healthScore -= 10;
                  else if (cpuUsage > 20) healthScore -= 5;
                  
                  // Temperature penalty (0-20 points) - if available
                  if (routerStatus.temperature) {
                    if (routerStatus.temperature > 80) healthScore -= 20;
                    else if (routerStatus.temperature > 70) healthScore -= 15;
                    else if (routerStatus.temperature > 60) healthScore -= 10;
                    else if (routerStatus.temperature > 50) healthScore -= 5;
                  }
                  
                  // Network performance bonus/penalty (0-15 points)
                  if (totalNetworkUsage > 80) healthScore -= 15;
                  else if (totalNetworkUsage > 60) healthScore -= 10;
                  else if (totalNetworkUsage > 40) healthScore -= 5;
                  
                  // Device count penalty for high loads (0-10 points)
                  if (connectedDevicesCount > 100) healthScore -= 10;
                  else if (connectedDevicesCount > 80) healthScore -= 5;
                  
                  return Math.max(0, Math.round(healthScore));
                })() : 0}%
              </div>
              <div className="text-sm text-muted-foreground">Health Score</div>
              <div className="text-xs text-green-600 dark:text-green-400 mt-1">
                {routerStatus ? (() => {
                  const healthScore = routerStatus ? (() => {
                    let score = 100;
                    const memoryUsagePercent = (routerStatus.memoryUsage / routerStatus.memoryTotal) * 100;
                    const cpuUsage = routerStatus.cpuUsage || 0;
                    
                    if (memoryUsagePercent > 90) score -= 30;
                    else if (memoryUsagePercent > 80) score -= 20;
                    else if (memoryUsagePercent > 70) score -= 10;
                    
                    if (cpuUsage > 90) score -= 25;
                    else if (cpuUsage > 80) score -= 20;
                    else if (cpuUsage > 60) score -= 15;
                    else if (cpuUsage > 40) score -= 10;
                    else if (cpuUsage > 20) score -= 5;
                    
                    if (routerStatus.temperature) {
                      if (routerStatus.temperature > 80) score -= 20;
                      else if (routerStatus.temperature > 70) score -= 15;
                      else if (routerStatus.temperature > 60) score -= 10;
                      else if (routerStatus.temperature > 50) score -= 5;
                    }
                    
                    if (totalNetworkUsage > 80) score -= 15;
                    else if (totalNetworkUsage > 60) score -= 10;
                    else if (totalNetworkUsage > 40) score -= 5;
                    
                    if (connectedDevicesCount > 100) score -= 10;
                    else if (connectedDevicesCount > 80) score -= 5;
                    
                    return Math.max(0, Math.round(score));
                  })() : 0;
                  
                  if (healthScore >= 90) return 'Excellent';
                  else if (healthScore >= 80) return 'Very Good';
                  else if (healthScore >= 70) return 'Good';
                  else if (healthScore >= 60) return 'Fair';
                  else if (healthScore >= 50) return 'Poor';
                  else return 'Critical';
                })() : 'Unknown'}
              </div>
            </div>

            {/* Active Networks */}
            <div className="text-center p-4 bg-purple-50 dark:bg-purple-950/30 rounded-lg">
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                {wifiNetworks?.length || 0}
              </div>
              <div className="text-sm text-muted-foreground">WiFi Networks</div>
              <div className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                {routerFeatures?.guestNetworkEnabled ? '1' : '0'} Guest Active
              </div>
            </div>
          </div>

          {/* Network Status Bar */}
          <div className="mt-6 p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Network Status</span>
              <span className="text-xs text-muted-foreground">
                Last updated: {routerStatus?.lastUpdated ? new Date(routerStatus.lastUpdated).toLocaleTimeString() : 'Never'}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${
                  !routerStatus ? 'bg-gray-400' :
                  routerStatus.uptime > 86400 ? 'bg-green-500' : // > 1 day
                  routerStatus.uptime > 3600 ? 'bg-yellow-500' : // > 1 hour
                  'bg-orange-500' // < 1 hour
                }`}></div>
                <span>{
                  !routerStatus ? 'Router Unknown' :
                  routerStatus.uptime > 86400 ? 'Router Stable' :
                  routerStatus.uptime > 3600 ? 'Router Online' :
                  'Router Starting'
                }</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${
                  !wifiNetworks || wifiNetworks.length === 0 ? 'bg-gray-400' :
                  wifiNetworks.filter(n => n.isEnabled).length >= 3 ? 'bg-green-500' :
                  wifiNetworks.filter(n => n.isEnabled).length >= 2 ? 'bg-yellow-500' :
                  wifiNetworks.filter(n => n.isEnabled).length >= 1 ? 'bg-orange-500' : 'bg-red-500'
                }`}></div>
                <span>{
                  !wifiNetworks || wifiNetworks.length === 0 ? 'WiFi Unknown' :
                  `WiFi Active (${wifiNetworks.filter(n => n.isEnabled).length}/${wifiNetworks.length})`
                }</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${
                  connectedDevicesCount === 0 ? 'bg-gray-400' :
                  connectedDevicesCount >= 50 ? 'bg-green-500' :
                  connectedDevicesCount >= 20 ? 'bg-yellow-500' :
                  connectedDevicesCount >= 5 ? 'bg-orange-500' : 'bg-blue-500'
                }`}></div>
                <span>{
                  connectedDevicesCount === 0 ? 'No Devices' :
                  connectedDevicesCount >= 50 ? `${connectedDevicesCount} Devices (High Load)` :
                  connectedDevicesCount >= 20 ? `${connectedDevicesCount} Devices (Active)` :
                  connectedDevicesCount >= 5 ? `${connectedDevicesCount} Devices (Normal)` :
                  `${connectedDevicesCount} Devices (Light)`
                }</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">



      </div>

          {/* Connected Devices Summary */}
          <div className="grid grid-cols-1 gap-6">
            {/* Connected Devices Summary */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center space-x-2">
                    <Users className="h-5 w-5 text-green-600" />
                    <span>Connected Devices</span>
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    {connectedDevicesCount} devices online
                  </p>
                </div>
                <Link href="/devices">
                  <Button variant="outline" size="sm" className="shrink-0">
                    View All
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </Link>
              </CardHeader>
              <CardContent>
                {devicesLoading ? (
                  <div className="space-y-3">
                    {[...Array(5)].map((_, i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {devices
                      ?.sort((a, b) => {
                        // First priority: Online devices
                        if (a.isOnline !== b.isOnline) return b.isOnline ? 1 : -1;
                        
                        // Second priority: Total bandwidth activity (download + upload)
                        const aTotalBandwidth = (a.downloadSpeed || 0) + (a.uploadSpeed || 0);
                        const bTotalBandwidth = (b.downloadSpeed || 0) + (b.uploadSpeed || 0);
                        if (aTotalBandwidth !== bTotalBandwidth) return bTotalBandwidth - aTotalBandwidth;
                        
                        // Third priority: Most recently connected (if available)
                        if (a.lastSeen && b.lastSeen) {
                          return new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime();
                        }
                        
                        // Final priority: Alphabetical by name
                        return a.name.localeCompare(b.name);
                      })
                      .slice(0, 5)
                      .map((device) => (
                      <div key={device.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                            <Tablet className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <div className="font-medium text-sm">{device.name}</div>
                            <div className="text-xs text-muted-foreground">{device.ipAddress}</div>
                          </div>
                        </div>
                        <div className="text-right min-w-[120px] flex-shrink-0">
                          <Badge variant={device.isOnline ? "default" : "secondary"} className="text-xs mb-1">
                            {device.isOnline ? "Online" : "Offline"}
                          </Badge>
                          {device.isOnline && (
                            <div className="text-xs text-muted-foreground whitespace-nowrap">
                              <div>↓{(device.downloadSpeed || 0).toFixed(1)} Mbps</div>
                              <div>↑{(device.uploadSpeed || 0).toFixed(1)} Mbps</div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                    {devices && devices.length > 5 && (
                      <div className="text-center pt-2">
                        <Link href="/devices">
                          <Button variant="ghost" size="sm" className="text-primary">
                            View {devices.length - 5} more devices
                            <ArrowRight className="h-4 w-4 ml-2" />
                          </Button>
                        </Link>
                      </div>
                    )}
                    {(!devices || devices.length === 0) && (
                      <div className="text-center py-8 text-muted-foreground">
                        <Tablet className="h-12 w-12 mx-auto mb-3 opacity-50" />
                        <p>No devices connected</p>
                        <p className="text-sm">Connect to your router to see devices</p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Bandwidth Chart */}
          <div className="mt-6">
            <BandwidthChart />
          </div>
        </div>
      </div>
    </div>
  );
}
