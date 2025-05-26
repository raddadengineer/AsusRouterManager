import { useQuery } from "@tanstack/react-query";
import type { RouterStatus, ConnectedDevice } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import BandwidthChart from "@/components/bandwidth-chart";
import NetworkTopology from "@/components/network-topology";
import DeviceTable from "@/components/device-table";
import { useToast } from "@/hooks/use-toast";
import { formatUptime } from "@/lib/utils";
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

  const connectedDevicesCount = devices?.filter(device => device.isOnline).length || 0;
  const totalNetworkUsage = devices?.reduce((total, device) => 
    device.isOnline ? total + device.downloadSpeed + device.uploadSpeed : total, 0
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
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-muted-foreground">Connected Tablet</h3>
              <Tablet className="h-4 w-4 text-primary" />
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
                    <span className="text-2xl font-bold">{routerStatus?.memoryUsage.toFixed(1)}</span>
                    <span className="text-sm text-muted-foreground">/ {routerStatus?.memoryTotal.toFixed(0)} GB</span>
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

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Network Topology */}
        <div className="lg:col-span-2">
          <NetworkTopology />
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              variant="outline"
              className="w-full justify-between h-auto p-4"
              onClick={() => handleQuickAction('reboot')}
            >
              <div className="flex items-center space-x-3">
                <Power className="h-4 w-4 text-red-500" />
                <span>Reboot Router</span>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </Button>

            <Button
              variant="outline"
              className="w-full justify-between h-auto p-4"
              onClick={() => handleQuickAction('speed-test')}
            >
              <div className="flex items-center space-x-3">
                <TestTube className="h-4 w-4 text-primary" />
                <span>Run Speed Test</span>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </Button>

            <Button
              variant="outline"
              className="w-full justify-between h-auto p-4"
              onClick={() => handleQuickAction('firmware-update')}
            >
              <div className="flex items-center space-x-3">
                <Download className="h-4 w-4 text-green-500" />
                <span>Update Firmware</span>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </Button>

            <Button
              variant="outline"
              className="w-full justify-between h-auto p-4"
              onClick={() => handleQuickAction('backup')}
            >
              <div className="flex items-center space-x-3">
                <Save className="h-4 w-4 text-yellow-500" />
                <span>Backup Settings</span>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </Button>

            {/* Router Information */}
            <div className="mt-8 p-4 bg-muted rounded-lg">
              <h4 className="font-medium mb-3">Router Information</h4>
              {statusLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                </div>
              ) : (
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Model:</span>
                    <span>{routerStatus?.model}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Firmware:</span>
                    <span>{routerStatus?.firmware}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">IP Address:</span>
                    <span className="font-mono">{routerStatus?.ipAddress}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Uptime:</span>
                    <span>{routerStatus ? formatUptime(routerStatus.uptime) : "N/A"}</span>
                  </div>
                  {routerStatus?.temperature && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Temperature:</span>
                      <span>{routerStatus.temperature.toFixed(1)}°C</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tables Section */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <DeviceTable showSearch={false} />
        <BandwidthChart />
      </div>
    </div>
  );
}
