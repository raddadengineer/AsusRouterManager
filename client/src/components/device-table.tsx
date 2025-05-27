import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { ConnectedDevice } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RefreshCw, Search, Laptop, Smartphone, Monitor, Tv } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { getDeviceIcon, getDeviceColorClass, formatMacAddress } from "@/lib/utils";

interface DeviceTableProps {
  className?: string;
  showSearch?: boolean;
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

export default function DeviceTable({ className, showSearch = true }: DeviceTableProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const { data: devices, isLoading, refetch } = useQuery<ConnectedDevice[]>({
    queryKey: ["/api/devices"],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const filteredDevices = devices?.filter(device =>
    device.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    device.ipAddress.includes(searchQuery) ||
    device.macAddress.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Connected Devices</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Connected Devices</CardTitle>
          <div className="flex items-center space-x-2">
            {showSearch && (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search devices..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-40"
                />
              </div>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => refetch()}
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {filteredDevices.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {searchQuery ? "No devices match your search" : "No devices connected"}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Device</TableHead>
                  <TableHead>IP Address</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Usage</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDevices.map((device) => (
                  <TableRow key={device.id} className="hover:bg-muted/50">
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <div className={`device-icon ${getDeviceColorClass(device.deviceType)}`}>
                          <DeviceIcon type={device.deviceType} />
                        </div>
                        <div>
                          <div className="font-medium">{device.name}</div>
                          <div className="text-sm text-muted-foreground font-mono">
                            {formatMacAddress(device.macAddress)}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {device.ipAddress}
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={device.isOnline ? "default" : "secondary"}
                        className={device.isOnline ? "bg-green-500 hover:bg-green-600" : "bg-red-500 hover:bg-red-600"}
                      >
                        {device.isOnline ? "Online" : "Offline"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {device.isOnline ? (
                        <div className="space-y-1">
                          <div>↓ {device.downloadSpeed.toFixed(1)} MB/s</div>
                          <div>↑ {device.uploadSpeed.toFixed(1)} MB/s</div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">0 MB/s</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
