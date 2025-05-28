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

  const connectedDevices = devices || [];
  const connectedDevicesCount = devices?.filter(device => device.isOnline).length || 0;
  const totalNetworkUsage = devices?.reduce((total, device) => 
    device.isOnline ? total + (device.downloadSpeed || 0) + (device.uploadSpeed || 0) : total, 0
  ) || 0;

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
          {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-muted-foreground">Connected Devices</h3>
              <Users className="h-4 w-4 text-primary" />
            </div>
            <div className="flex items-end space-x-2">
              {devicesLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <>
                  <span className="text-2xl font-bold">{connectedDevicesCount}</span>
                  <span className="text-green-500 text-sm flex items-center">
                    <span className="mr-1">↑</span>
                    {Math.max(0, connectedDevicesCount - 20)}
                  </span>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-muted-foreground">Network Usage</h3>
              <TrendingUp className="h-4 w-4 text-primary" />
            </div>
            <div className="space-y-2">
              <div className="flex items-end space-x-2">
                {devicesLoading ? (
                  <Skeleton className="h-8 w-20" />
                ) : (
                  <>
                    <span className="text-2xl font-bold">{totalNetworkUsage.toFixed(0)}</span>
                    <span className="text-sm text-muted-foreground">MB/s</span>
                  </>
                )}
              </div>
              <Progress value={Math.min((totalNetworkUsage / 100) * 100, 100)} className="h-2" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-muted-foreground">CPU Usage</h3>
              <Cpu className="h-4 w-4 text-primary" />
            </div>
            <div className="space-y-2">
              <div className="flex items-end space-x-2">
                {statusLoading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <>
                    <span className="text-2xl font-bold">{routerStatus?.cpuUsage.toFixed(0)}</span>
                    <span className="text-sm text-muted-foreground">%</span>
                  </>
                )}
              </div>
              <Progress 
                value={routerStatus?.cpuUsage || 0} 
                className="h-2"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-muted-foreground">Memory Usage</h3>
              <HardDrive className="h-4 w-4 text-primary" />
            </div>
            <div className="space-y-2">
              <div className="flex items-end space-x-2">
                {statusLoading ? (
                  <Skeleton className="h-8 w-20" />
                ) : (
                  <>
                    <span className="text-2xl font-bold">{((routerStatus?.memoryUsage || 0) * 1024).toFixed(0)}</span>
                    <span className="text-sm text-muted-foreground">/ {((routerStatus?.memoryTotal || 0) * 1024).toFixed(0)} MB</span>
                  </>
                )}
              </div>
              <Progress 
                value={routerStatus ? (routerStatus.memoryUsage / routerStatus.memoryTotal) * 100 : 0} 
                className="h-2"
              />
            </div>
          </CardContent>
        </Card>
      </div>

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
                {routerStatus ? Math.round(100 - (routerStatus.memoryUsage / routerStatus.memoryTotal) * 100) : 0}%
              </div>
              <div className="text-sm text-muted-foreground">Health Score</div>
              <div className="text-xs text-green-600 dark:text-green-400 mt-1">
                {routerStatus?.temperature ? `${routerStatus.temperature.toFixed(0)}°C` : 'Good'}
              </div>
            </div>

            {/* Active Networks */}
            <div className="text-center p-4 bg-purple-50 dark:bg-purple-950/30 rounded-lg">
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                {wifiNetworks?.filter(network => network.enabled).length || 0}
              </div>
              <div className="text-sm text-muted-foreground">WiFi Networks</div>
              <div className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                {wifiNetworks?.filter(network => network.name?.toLowerCase().includes('guest')).length || 0} Guest
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
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>Router Online</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${wifiNetworks?.some(n => n.enabled) ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                <span>WiFi Active</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${connectedDevicesCount > 0 ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                <span>Devices Connected</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">


        {/* Router Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Network className="h-5 w-5 text-blue-600" />
              <span>Router Information</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {statusLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
              </div>
            ) : (
              <div className="space-y-3 text-sm">
                <div className="flex justify-between py-2 border-b border-border/50">
                  <span className="text-muted-foreground font-medium">Model:</span>
                  <span className="font-medium">{routerStatus?.model}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-border/50">
                  <span className="text-muted-foreground font-medium">Firmware:</span>
                  <span className="font-medium">{routerStatus?.firmware}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-border/50">
                  <span className="text-muted-foreground font-medium">IP Address:</span>
                  <span className="font-mono font-medium">{routerStatus?.ipAddress}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-border/50">
                  <span className="text-muted-foreground font-medium">Uptime:</span>
                  <span className="font-medium">{routerStatus ? formatUptime(routerStatus.uptime) : "N/A"}</span>
                </div>
                {routerStatus?.temperature && (
                  <div className="flex justify-between py-2">
                    <span className="text-muted-foreground font-medium">Temperature:</span>
                    <span className="font-medium text-orange-600">{routerStatus.temperature.toFixed(1)}°C</span>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
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
                    {devices?.slice(0, 5).map((device) => (
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
                        <div className="text-right">
                          <Badge variant={device.isOnline ? "default" : "secondary"} className="text-xs">
                            {device.isOnline ? "Online" : "Offline"}
                          </Badge>
                          {device.isOnline && (device.downloadSpeed || device.uploadSpeed) && (
                            <div className="text-xs text-muted-foreground mt-1">
                              ↓{(device.downloadSpeed || 0).toFixed(1)} ↑{(device.uploadSpeed || 0).toFixed(1)} Mbps
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
