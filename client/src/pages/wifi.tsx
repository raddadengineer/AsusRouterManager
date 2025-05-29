import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import type { WifiNetwork } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/queryClient";
import TopBar from "@/components/top-bar";
import { 
  Wifi, 
  Plus, 
  Save, 
  RotateCcw, 
  Shield, 
  Users, 
  RadioIcon, 
  Settings,
  Eye,
  EyeOff,
  Zap,
  Signal,
  Lock,
  Unlock,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Gauge
} from "lucide-react";

export default function WiFiSettingsPage() {
  const { toast } = useToast();
  const [editingNetworks, setEditingNetworks] = useState<{ [key: number]: WifiNetwork }>({});
  const [showPasswords, setShowPasswords] = useState<{ [key: number]: boolean }>({});
  const [activeTab, setActiveTab] = useState("networks");
  const [isScanning, setIsScanning] = useState(false);
  const [nearbyNetworks, setNearbyNetworks] = useState<any[]>([]);

  const { data: wifiNetworks, isLoading } = useQuery<WifiNetwork[]>({
    queryKey: ["/api/wifi"],
    refetchInterval: 30000,
  });

  const updateNetworkMutation = useMutation({
    mutationFn: async ({ id, network }: { id: number; network: Partial<WifiNetwork> }) => {
      return await apiRequest("PUT", `/api/wifi/${id}`, network);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/wifi"] });
      toast({
        title: "WiFi Network Updated",
        description: "Settings have been applied to your ASUS router",
      });
      setEditingNetworks({});
    },
    onError: () => {
      toast({
        title: "Update Failed", 
        description: "Failed to update WiFi settings on router",
        variant: "destructive",
      });
    },
  });

  const scanNetworksMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/wifi/scan");
    },
    onSuccess: async (response) => {
      const data = await response.json();
      setNearbyNetworks(data.networks || []);
      toast({
        title: "WiFi Scan Complete",
        description: `Found ${data.networks?.length || 0} nearby networks`,
      });
      setIsScanning(false);
    },
    onError: () => {
      toast({
        title: "Scan Failed",
        description: "Could not scan for nearby networks",
        variant: "destructive",
      });
      setIsScanning(false);
    },
  });

  const restartWifiMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/wifi/restart");
    },
    onSuccess: () => {
      toast({
        title: "WiFi Restarted",
        description: "Wireless radios have been restarted",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/wifi"] });
    },
    onError: () => {
      toast({
        title: "Restart Failed",
        description: "Failed to restart WiFi radios",
        variant: "destructive",
      });
    },
  });

  const handleNetworkChange = (networkId: number, field: keyof WifiNetwork, value: any) => {
    setEditingNetworks(prev => ({
      ...prev,
      [networkId]: {
        ...prev[networkId],
        [field]: value,
      },
    }));
  };

  const handleSaveNetwork = (networkId: number) => {
    const editedNetwork = editingNetworks[networkId];
    if (editedNetwork) {
      updateNetworkMutation.mutate({ id: networkId, network: editedNetwork });
    }
  };

  const handleResetNetwork = (networkId: number) => {
    setEditingNetworks(prev => {
      const { [networkId]: _, ...rest } = prev;
      return rest;
    });
  };

  const getEditedNetwork = (network: WifiNetwork): WifiNetwork => {
    return editingNetworks[network.id] || network;
  };

  const hasChanges = (networkId: number): boolean => {
    return networkId in editingNetworks;
  };

  const togglePasswordVisibility = (networkId: number) => {
    setShowPasswords(prev => ({
      ...prev,
      [networkId]: !prev[networkId]
    }));
  };

  const handleScanNetworks = () => {
    setIsScanning(true);
    scanNetworksMutation.mutate();
  };

  const getSignalStrength = (rssi: number) => {
    if (rssi >= -50) return { level: "Excellent", percentage: 100, color: "text-green-500" };
    if (rssi >= -60) return { level: "Good", percentage: 75, color: "text-green-400" };
    if (rssi >= -70) return { level: "Fair", percentage: 50, color: "text-yellow-500" };
    return { level: "Poor", percentage: 25, color: "text-red-500" };
  };

  if (isLoading) {
    return (
      <div>
        <TopBar 
          title="WiFi Settings" 
          subtitle="Configure and manage wireless networks"
        />
        <div className="p-6 space-y-6">
          <Skeleton className="h-80 w-full" />
          <Skeleton className="h-80 w-full" />
        </div>
      </div>
    );
  }

  const band24Networks = wifiNetworks?.filter(network => network.band === "2.4GHz") || [];
  const band5Networks = wifiNetworks?.filter(network => network.band === "5GHz") || [];

  return (
    <div>
      <TopBar 
        title="WiFi Settings" 
        subtitle="Configure and manage wireless networks"
      />
      <div className="p-6 space-y-6">
        {/* Connection Status Alert */}
        <Alert>
          <Shield className="h-4 w-4" />
          <AlertDescription>
            Configure your ASUS router's wireless settings. Changes are applied directly to your router via SSH connection.
          </AlertDescription>
        </Alert>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="networks">WiFi Networks</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
            <TabsTrigger value="advanced">Advanced</TabsTrigger>
            <TabsTrigger value="analyzer">WiFi Analyzer</TabsTrigger>
          </TabsList>

          <TabsContent value="networks" className="space-y-6">
            {/* Header with control buttons */}
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">WiFi Networks</h3>
              <div className="flex space-x-2">
                <Button 
                  variant="outline"
                  onClick={() => restartWifiMutation.mutate()}
                  disabled={restartWifiMutation.isPending}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${restartWifiMutation.isPending ? 'animate-spin' : ''}`} />
                  Restart WiFi
                </Button>
                <Button className="bg-primary hover:bg-primary/90">
                  <Plus className="h-4 w-4 mr-2" />
                  Guest Network
                </Button>
              </div>
            </div>

            {/* WiFi Networks Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 2.4GHz Networks */}
          {band24Networks.map((network) => {
            const editedNetwork = getEditedNetwork(network);
            const isEdited = hasChanges(network.id);

            return (
              <Card key={network.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Wifi className="h-5 w-5 text-primary" />
                      <div>
                        <CardTitle className="text-base">2.4GHz Network</CardTitle>
                        <p className="text-sm text-muted-foreground">Primary wireless network</p>
                      </div>
                    </div>
                    <Switch
                      checked={editedNetwork.isEnabled}
                      onCheckedChange={(checked) => handleNetworkChange(network.id, 'isEnabled', checked)}
                    />
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor={`ssid-${network.id}`} className="text-sm font-medium">
                      Network Name (SSID)
                    </Label>
                    <Input
                      id={`ssid-${network.id}`}
                      value={editedNetwork.ssid}
                      onChange={(e) => handleNetworkChange(network.id, 'ssid', e.target.value)}
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor={`channel-${network.id}`} className="text-sm font-medium">
                      Channel
                    </Label>
                    <Select
                      value={editedNetwork.channel?.toString() || "auto"}
                      onValueChange={(value) => handleNetworkChange(network.id, 'channel', value === "auto" ? null : parseInt(value))}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="auto">Auto</SelectItem>
                        <SelectItem value="1">1</SelectItem>
                        <SelectItem value="6">6</SelectItem>
                        <SelectItem value="11">11</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor={`password-${network.id}`} className="text-sm font-medium">
                      Password
                    </Label>
                    <Input
                      id={`password-${network.id}`}
                      type="password"
                      value={editedNetwork.password || ""}
                      onChange={(e) => handleNetworkChange(network.id, 'password', e.target.value)}
                      className="mt-1"
                    />
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Connected Devices:</span>
                    <span className="font-medium">{editedNetwork.connectedDevices}</span>
                  </div>

                  {isEdited && (
                    <div className="flex justify-end space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleResetNetwork(network.id)}
                      >
                        <RotateCcw className="h-4 w-4 mr-1" />
                        Reset
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleSaveNetwork(network.id)}
                        disabled={updateNetworkMutation.isPending}
                      >
                        <Save className="h-4 w-4 mr-1" />
                        Save
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}

          {/* 5GHz Networks */}
          {band5Networks.map((network) => {
            const editedNetwork = getEditedNetwork(network);
            const isEdited = hasChanges(network.id);

            return (
              <Card key={network.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Wifi className="h-5 w-5 text-primary" />
                      <div>
                        <CardTitle className="text-base">5GHz Network</CardTitle>
                        <p className="text-sm text-muted-foreground">High-speed wireless network</p>
                      </div>
                    </div>
                    <Switch
                      checked={editedNetwork.isEnabled}
                      onCheckedChange={(checked) => handleNetworkChange(network.id, 'isEnabled', checked)}
                    />
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor={`ssid-${network.id}`} className="text-sm font-medium">
                      Network Name (SSID)
                    </Label>
                    <Input
                      id={`ssid-${network.id}`}
                      value={editedNetwork.ssid}
                      onChange={(e) => handleNetworkChange(network.id, 'ssid', e.target.value)}
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor={`channel-${network.id}`} className="text-sm font-medium">
                      Channel
                    </Label>
                    <Select
                      value={editedNetwork.channel?.toString() || "auto"}
                      onValueChange={(value) => handleNetworkChange(network.id, 'channel', value === "auto" ? null : parseInt(value))}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="auto">Auto</SelectItem>
                        <SelectItem value="36">36</SelectItem>
                        <SelectItem value="44">44</SelectItem>
                        <SelectItem value="149">149</SelectItem>
                        <SelectItem value="157">157</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor={`password-${network.id}`} className="text-sm font-medium">
                      Password
                    </Label>
                    <Input
                      id={`password-${network.id}`}
                      type="password"
                      value={editedNetwork.password || ""}
                      onChange={(e) => handleNetworkChange(network.id, 'password', e.target.value)}
                      className="mt-1"
                    />
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Connected Devices:</span>
                    <span className="font-medium">{editedNetwork.connectedDevices}</span>
                  </div>

                  {isEdited && (
                    <div className="flex justify-end space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleResetNetwork(network.id)}
                      >
                        <RotateCcw className="h-4 w-4 mr-1" />
                        Reset
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleSaveNetwork(network.id)}
                        disabled={updateNetworkMutation.isPending}
                      >
                        <Save className="h-4 w-4 mr-1" />
                        Save
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

          </TabsContent>

          <TabsContent value="security" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Shield className="h-5 w-5" />
                  <span>WiFi Security Settings</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <Label>Access Control</Label>
                    <div className="flex items-center space-x-2">
                      <Switch defaultChecked />
                      <span className="text-sm">Enable MAC Address Filtering</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch />
                      <span className="text-sm">Hide Network Name (SSID)</span>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <Label>Guest Network</Label>
                    <div className="flex items-center space-x-2">
                      <Switch />
                      <span className="text-sm">Enable Guest Network</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch />
                      <span className="text-sm">Isolate Guest Network</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="advanced" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <RadioIcon className="h-5 w-5" />
                    <span>Radio Settings</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Transmission Power (2.4GHz)</Label>
                    <Select defaultValue="100">
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="25">25%</SelectItem>
                        <SelectItem value="50">50%</SelectItem>
                        <SelectItem value="75">75%</SelectItem>
                        <SelectItem value="100">100%</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Transmission Power (5GHz)</Label>
                    <Select defaultValue="100">
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="25">25%</SelectItem>
                        <SelectItem value="50">50%</SelectItem>
                        <SelectItem value="75">75%</SelectItem>
                        <SelectItem value="100">100%</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Zap className="h-5 w-5" />
                    <span>Performance</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Switch defaultChecked />
                    <span className="text-sm">Enable Beamforming</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch defaultChecked />
                    <span className="text-sm">Enable Band Steering</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch />
                    <span className="text-sm">Enable Airtime Fairness</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="analyzer" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Signal className="h-5 w-5" />
                  <span>WiFi Analyzer</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <p className="text-sm text-muted-foreground">
                    Scan for nearby networks to optimize channel selection
                  </p>
                  <Button 
                    onClick={handleScanNetworks}
                    disabled={isScanning}
                    className="bg-primary hover:bg-primary/90"
                  >
                    {isScanning ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Signal className="h-4 w-4 mr-2" />}
                    {isScanning ? 'Scanning Networks...' : 'Scan for Networks'}
                  </Button>
                </div>
                
                {nearbyNetworks.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="font-medium">Nearby Networks ({nearbyNetworks.length})</h4>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {nearbyNetworks.map((network, index) => {
                        const signal = getSignalStrength(network.rssi || -70);
                        return (
                          <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex items-center space-x-3">
                              <Wifi className="h-4 w-4" />
                              <div>
                                <div className="font-medium">{network.ssid || 'Hidden Network'}</div>
                                <div className="text-sm text-muted-foreground">
                                  Channel {network.channel} • {network.band}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Badge variant={network.security ? "default" : "destructive"}>
                                {network.security ? <Lock className="h-3 w-3 mr-1" /> : <Unlock className="h-3 w-3 mr-1" />}
                                {network.security || 'Open'}
                              </Badge>
                              <div className={`text-sm ${signal.color}`}>
                                {signal.level}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Global Actions */}
        <div className="flex justify-end space-x-4">
          <Button variant="outline">
            Reset to Default
          </Button>
          <Button 
            className="bg-primary hover:bg-primary/90"
            disabled={Object.keys(editingNetworks).length === 0}
          >
            Save All Changes
          </Button>
        </div>
      </div>
    </div>
  );
}
