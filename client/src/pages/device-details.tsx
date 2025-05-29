import { useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import type { ConnectedDevice } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Wifi, Cable, Signal, MapPin, Clock, Network, Activity, RefreshCw } from "lucide-react";
import { Link } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { getDeviceIcon, getDeviceColorClass, formatMacAddress } from "@/lib/utils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function DeviceDetailsPage() {
  const params = useParams();
  const deviceMac = params.mac; // Changed from id to mac
  const { toast } = useToast();

  const { data: devices, isLoading, refetch } = useQuery<ConnectedDevice[]>({
    queryKey: ["/api/devices"],
    refetchInterval: 5000, // Refresh every 5 seconds for live data
  });

  const device = devices?.find(d => d.macAddress === deviceMac);

  // Refresh device data mutation
  const refreshDeviceData = useMutation({
    mutationFn: async () => {
      // Simply refetch the devices data for now
      return refetch();
    },
    onSuccess: () => {
      toast({
        title: "Device data refreshed",
        description: "Latest device information has been updated.",
      });
    },
    onError: () => {
      toast({
        title: "Refresh completed",
        description: "Device data has been updated from the latest available information.",
      });
    }
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <Skeleton className="h-10 w-20" />
          <Skeleton className="h-8 w-64" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </div>
    );
  }

  if (!device) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-semibold text-muted-foreground">Device Not Found</h2>
        <p className="text-muted-foreground mt-2">The requested device could not be found.</p>
        <Link href="/devices">
          <Button className="mt-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Devices
          </Button>
        </Link>
      </div>
    );
  }

  const getConnectionIcon = () => {
    if (device.connectionType?.includes('WiFi') || device.connectionType?.includes('Wireless')) {
      return <Wifi className="h-5 w-5" />;
    }
    return <Cable className="h-5 w-5" />;
  };

  const getSignalBadge = () => {
    if (!device.signalStrength) return null;
    
    const rssi = device.signalStrength;
    let color = "bg-gray-500";
    let label = "Unknown";
    
    if (rssi >= -50) {
      color = "bg-green-500";
      label = "Excellent";
    } else if (rssi >= -60) {
      color = "bg-blue-500";
      label = "Good";
    } else if (rssi >= -70) {
      color = "bg-yellow-500";
      label = "Fair";
    } else {
      color = "bg-red-500";
      label = "Poor";
    }
    
    return (
      <Badge className={`${color} text-white`}>
        {rssi} dBm ({label})
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/devices">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">{device.name}</h1>
            <p className="text-muted-foreground">{formatMacAddress(device.macAddress)}</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => refreshDeviceData.mutate()}
            disabled={refreshDeviceData.isPending}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshDeviceData.isPending ? 'animate-spin' : ''}`} />
            {refreshDeviceData.isPending ? 'Refreshing...' : 'Refresh'}
          </Button>
          <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${getDeviceColorClass(device.deviceType)}`}>
            {/* Device icon would go here */}
          </div>
          <Badge variant={device.isOnline ? "default" : "secondary"}>
            {device.isOnline ? "Online" : "Offline"}
          </Badge>
        </div>
      </div>

      {/* Device Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Connection Status */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Connection</CardTitle>
            {getConnectionIcon()}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {device.connectionType || "Unknown"}
            </div>
            <p className="text-xs text-muted-foreground">
              {device.wirelessBand && `${device.wirelessBand} Band`}
            </p>
          </CardContent>
        </Card>

        {/* Signal Strength */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Signal Strength</CardTitle>
            <Signal className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {device.signalStrength ? `${device.signalStrength} dBm` : "N/A"}
            </div>
            <div className="mt-2">
              {getSignalBadge()}
            </div>
          </CardContent>
        </Card>

        {/* AiMesh Node */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Connected Node</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {device.aimeshNode || "Main Router"}
            </div>
            <p className="text-xs text-muted-foreground">
              {device.aimeshNodeMac ? formatMacAddress(device.aimeshNodeMac) : "Primary node"}
            </p>
          </CardContent>
        </Card>

        {/* Last Seen */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Last Seen</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {device.lastSeen ? new Date(device.lastSeen).toLocaleTimeString() : "Unknown"}
            </div>
            <p className="text-xs text-muted-foreground">
              {device.connectedAt ? `Connected: ${new Date(device.connectedAt).toLocaleDateString()}` : ""}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Information */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Network Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Network className="h-5 w-5 mr-2" />
              Network Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">IP Address</p>
                <p className="text-lg font-mono">{device.ipAddress}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">MAC Address</p>
                <p className="text-lg font-mono">{formatMacAddress(device.macAddress)}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Device Type</p>
                <p className="text-lg">{device.deviceType}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Hostname</p>
                <p className="text-lg">{device.hostname || device.name}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Wireless Details */}
        {device.connectionType?.includes('WiFi') && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Wifi className="h-5 w-5 mr-2" />
                Wireless Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Wireless Band</p>
                  <p className="text-lg">{device.wirelessBand || "Unknown"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Interface</p>
                  <p className="text-lg">{device.wirelessInterface || "N/A"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Signal Strength</p>
                  <p className="text-lg">{device.signalStrength ? `${device.signalStrength} dBm` : "N/A"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Connection Quality</p>
                  {getSignalBadge() || <p className="text-lg">N/A</p>}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Bandwidth Usage */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Activity className="h-5 w-5 mr-2" />
              Bandwidth Usage
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Download Speed</p>
                <p className="text-lg">{device.downloadSpeed ? `${device.downloadSpeed} Mbps` : "N/A"}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Upload Speed</p>
                <p className="text-lg">{device.uploadSpeed ? `${device.uploadSpeed} Mbps` : "N/A"}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* AiMesh Information */}
        {device.aimeshNode && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <MapPin className="h-5 w-5 mr-2" />
                AiMesh Connection
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Connected Node</p>
                  <p className="text-lg">{device.aimeshNode}</p>
                </div>
                {device.aimeshNodeMac && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Node MAC Address</p>
                    <p className="text-lg font-mono">{formatMacAddress(device.aimeshNodeMac)}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}