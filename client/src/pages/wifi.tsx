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
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/queryClient";
import TopBar from "@/components/top-bar";
import { Wifi, Plus, Save, RotateCcw } from "lucide-react";

export default function WiFiSettingsPage() {
  const { toast } = useToast();
  const [editingNetworks, setEditingNetworks] = useState<{ [key: number]: WifiNetwork }>({});

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
        title: "Success",
        description: "WiFi network updated successfully",
      });
      setEditingNetworks({});
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update WiFi network",
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
        {/* Header with Add Network button */}
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">WiFi Networks</h3>
          <Button className="bg-primary hover:bg-primary/90">
            <Plus className="h-4 w-4 mr-2" />
            Add Network
          </Button>
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
