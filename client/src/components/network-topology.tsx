import { useQuery } from "@tanstack/react-query";
import type { ConnectedDevice, RouterStatus } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Router, Laptop, Smartphone, Monitor, Tv } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { getDeviceIcon } from "@/lib/utils";

interface NetworkTopologyProps {
  className?: string;
}

const DeviceIcon = ({ type }: { type: string }) => {
  const iconName = getDeviceIcon(type);
  
  switch (iconName) {
    case 'laptop':
      return <Laptop className="h-4 w-4 text-white" />;
    case 'mobile-alt':
      return <Smartphone className="h-4 w-4 text-white" />;
    case 'desktop':
      return <Monitor className="h-4 w-4 text-white" />;
    case 'tv':
      return <Tv className="h-4 w-4 text-white" />;
    default:
      return <Monitor className="h-4 w-4 text-white" />;
  }
};

const getDeviceColor = (type: string, isOnline: boolean) => {
  if (!isOnline) return 'bg-gray-500';
  
  switch (type.toLowerCase()) {
    case 'laptop':
      return 'bg-green-500';
    case 'mobile':
    case 'phone':
      return 'bg-blue-500';
    case 'desktop':
    case 'pc':
      return 'bg-orange-500';
    case 'tv':
      return 'bg-purple-500';
    default:
      return 'bg-gray-500';
  }
};

export default function NetworkTopology({ className }: NetworkTopologyProps) {
  const { data: devices, isLoading: devicesLoading } = useQuery<ConnectedDevice[]>({
    queryKey: ["/api/devices"],
    refetchInterval: 30000,
  });

  const { data: routerStatus, isLoading: statusLoading } = useQuery<RouterStatus>({
    queryKey: ["/api/router/status"],
    refetchInterval: 30000,
  });

  const isLoading = devicesLoading || statusLoading;

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Network Topology</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-80 w-full" />
        </CardContent>
      </Card>
    );
  }

  const onlineDevices = devices?.filter(device => device.isOnline) || [];

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Network Topology</CardTitle>
        <Button variant="ghost" size="icon">
          <RefreshCw className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        <div className="relative h-80 bg-gradient-to-br from-gray-900 to-gray-800 rounded-lg p-4 overflow-hidden">
          {/* Background pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 left-0 w-full h-full" style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='1'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
            }}></div>
          </div>

          {/* Router at center */}
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10">
            <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center border-4 border-white shadow-lg">
              <Router className="h-6 w-6 text-white" />
            </div>
            <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2">
              <Badge variant="secondary" className="text-xs font-medium bg-gray-900 text-white">
                {routerStatus?.model || "Router"}
              </Badge>
            </div>
            
            {/* Router pulse animation */}
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-16 h-16 border-2 border-primary rounded-full animate-ping opacity-20"></div>
          </div>

          {/* Connected devices positioned around the router */}
          {onlineDevices.slice(0, 8).map((device, index) => {
            const angle = (index / Math.max(onlineDevices.length, 1)) * 2 * Math.PI;
            const radius = 120;
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;

            return (
              <div key={device.id} className="absolute z-10">
                <div 
                  className="transform -translate-x-1/2 -translate-y-1/2"
                  style={{
                    left: `calc(50% + ${x}px)`,
                    top: `calc(50% + ${y}px)`,
                  }}
                >
                  {/* Device node */}
                  <div className={`w-10 h-10 ${getDeviceColor(device.deviceType, device.isOnline)} rounded-full flex items-center justify-center shadow-lg`}>
                    <DeviceIcon type={device.deviceType} />
                  </div>
                  
                  {/* Device label */}
                  <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2">
                    <Badge variant="secondary" className="text-xs bg-gray-900 text-white whitespace-nowrap">
                      {device.name.length > 10 ? `${device.name.substring(0, 10)}...` : device.name}
                    </Badge>
                  </div>

                  {/* Connection line to router */}
                  <svg 
                    className="absolute top-5 left-5 pointer-events-none"
                    style={{
                      width: `${Math.abs(x) + 20}px`,
                      height: `${Math.abs(y) + 20}px`,
                      transform: `translate(${x < 0 ? x : -x}px, ${y < 0 ? y : -y}px)`,
                    }}
                  >
                    <line
                      x1={x < 0 ? Math.abs(x) : 0}
                      y1={y < 0 ? Math.abs(y) : 0}
                      x2={x < 0 ? 0 : Math.abs(x)}
                      y2={y < 0 ? 0 : Math.abs(y)}
                      stroke="#0066CC"
                      strokeWidth="2"
                      strokeDasharray="5,5"
                      opacity="0.7"
                    />
                  </svg>

                  {/* Data flow animation */}
                  {(device.downloadSpeed || 0) > 0 && (
                    <div 
                      className="absolute w-2 h-2 bg-primary rounded-full opacity-60 animate-pulse"
                      style={{
                        left: `${x < 0 ? x / 2 : -x / 2}px`,
                        top: `${y < 0 ? y / 2 : -y / 2}px`,
                      }}
                    />
                  )}
                </div>
              </div>
            );
          })}

          {/* Network stats overlay */}
          <div className="absolute bottom-4 left-4 right-4">
            <div className="flex justify-between text-sm text-gray-300">
              <div>
                <span className="text-white font-medium">{onlineDevices.length}</span> devices online
              </div>
              <div>
                Total: <span className="text-white font-medium">{devices?.length || 0}</span> devices
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
