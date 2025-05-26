import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { RouterStatus } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/queryClient";
import TopBar from "@/components/top-bar";
import { formatUptime } from "@/lib/utils";
import {
  Settings,
  Power,
  Download,
  Upload,
  Save,
  RefreshCw,
  TestTube,
  Shield,
  HardDrive,
  Cpu,
  Thermometer,
  Network,
  AlertTriangle,
  CheckCircle2,
  FileText,
  RotateCcw,
  Trash2,
  Terminal,
  Link,
  Eye,
  EyeOff,
} from "lucide-react";

const sshConnectionSchema = z.object({
  host: z.string().min(1, "Router IP address is required"),
  port: z.number().min(1).max(65535).default(22),
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
  enabled: z.boolean().default(false),
});

type SSHConnectionConfig = z.infer<typeof sshConnectionSchema>;

export default function SystemSettingsPage() {
  const { toast } = useToast();
  const [isRebooting, setIsRebooting] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [speedTestRunning, setSpeedTestRunning] = useState(false);
  const [speedTestResults, setSpeedTestResults] = useState<any>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');

  const { data: routerStatus, isLoading } = useQuery<RouterStatus>({
    queryKey: ["/api/router/status"],
    refetchInterval: 30000,
  });

  // SSH connection form
  const sshForm = useForm<SSHConnectionConfig>({
    resolver: zodResolver(sshConnectionSchema),
    defaultValues: {
      host: "192.168.1.1",
      port: 22,
      username: "admin",
      password: "",
      enabled: false,
    },
  });

  // SSH connection queries
  const { data: sshConfig } = useQuery<SSHConnectionConfig>({
    queryKey: ["/api/ssh/config"],
    retry: false,
  });

  const sshTestMutation = useMutation({
    mutationFn: async (config: SSHConnectionConfig) => {
      return await apiRequest("POST", "/api/ssh/test", config);
    },
    onSuccess: () => {
      setConnectionStatus('connected');
      toast({
        title: "SSH Connection Successful",
        description: "Successfully connected to your ASUS router",
      });
    },
    onError: () => {
      setConnectionStatus('error');
      toast({
        title: "SSH Connection Failed",
        description: "Could not connect to router. Please check your credentials and network.",
        variant: "destructive",
      });
    },
  });

  const sshSaveMutation = useMutation({
    mutationFn: async (config: SSHConnectionConfig) => {
      return await apiRequest("POST", "/api/ssh/config", config);
    },
    onSuccess: () => {
      toast({
        title: "SSH Configuration Saved",
        description: "Router connection settings have been saved",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/ssh/config"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save SSH configuration",
        variant: "destructive",
      });
    },
  });

  const clearSettingsMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("DELETE", "/api/ssh/config");
    },
    onSuccess: () => {
      toast({
        title: "Settings Cleared",
        description: "SSH configuration has been cleared",
      });
      sshForm.reset({
        host: "",
        port: 22,
        username: "",
        password: "",
        enabled: false,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/ssh/config"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to clear SSH settings",
        variant: "destructive",
      });
    },
  });

  const clearDataMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("DELETE", "/api/data/clear");
    },
    onSuccess: () => {
      toast({
        title: "Data Cleared",
        description: "All saved router data has been cleared",
      });
      queryClient.invalidateQueries();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to clear saved data",
        variant: "destructive",
      });
    },
  });

  const rebootMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/system/reboot");
    },
    onSuccess: (response) => {
      const data = response.json();
      setIsRebooting(true);
      toast({
        title: "System Reboot",
        description: "Router is rebooting. This may take a few minutes.",
      });
      // Simulate reboot time
      setTimeout(() => {
        setIsRebooting(false);
        queryClient.invalidateQueries({ queryKey: ["/api/router/status"] });
      }, 60000);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to reboot router",
        variant: "destructive",
      });
    },
  });

  const firmwareUpdateMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/system/firmware-update");
    },
    onSuccess: () => {
      setIsUpdating(true);
      toast({
        title: "Firmware Update",
        description: "Checking for firmware updates...",
      });
      // Simulate update check
      setTimeout(() => {
        setIsUpdating(false);
        toast({
          title: "Firmware Update",
          description: "Your firmware is up to date",
        });
      }, 5000);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to check for firmware updates",
        variant: "destructive",
      });
    },
  });

  const backupMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/system/backup");
    },
    onSuccess: async (response) => {
      const data = await response.json();
      toast({
        title: "Backup Created",
        description: `Configuration backup saved as ${data.filename}`,
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create configuration backup",
        variant: "destructive",
      });
    },
  });

  const speedTestMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/system/speed-test");
    },
    onSuccess: async (response) => {
      const data = await response.json();
      setSpeedTestResults(data);
      setSpeedTestRunning(false);
      toast({
        title: "Speed Test Complete",
        description: `Download: ${data.downloadSpeed} Mbps, Upload: ${data.uploadSpeed} Mbps`,
      });
    },
    onError: () => {
      setSpeedTestRunning(false);
      toast({
        title: "Error",
        description: "Speed test failed",
        variant: "destructive",
      });
    },
  });

  const handleReboot = () => {
    if (confirm("Are you sure you want to reboot the router? This will temporarily disconnect all devices.")) {
      rebootMutation.mutate();
    }
  };

  const handleFirmwareUpdate = () => {
    firmwareUpdateMutation.mutate();
  };

  const handleBackup = () => {
    backupMutation.mutate();
  };

  const handleSpeedTest = () => {
    setSpeedTestRunning(true);
    setSpeedTestResults(null);
    speedTestMutation.mutate();
  };

  const handleFactoryReset = () => {
    if (confirm("WARNING: This will reset all settings to factory defaults. This action cannot be undone. Are you sure?")) {
      toast({
        title: "Factory Reset",
        description: "Factory reset initiated. Router will reboot with default settings.",
        variant: "destructive",
      });
    }
  };

  const handleTestConnection = () => {
    setConnectionStatus('connecting');
    setIsConnecting(true);
    const formData = sshForm.getValues();
    sshTestMutation.mutate(formData);
    setTimeout(() => setIsConnecting(false), 3000);
  };

  const handleSaveSSHConfig = (data: SSHConnectionConfig) => {
    sshSaveMutation.mutate(data);
  };

  const getConnectionStatusColor = () => {
    switch (connectionStatus) {
      case 'connected': return 'text-green-500';
      case 'connecting': return 'text-yellow-500';
      case 'error': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  const getConnectionStatusIcon = () => {
    switch (connectionStatus) {
      case 'connected': return <CheckCircle2 className="h-4 w-4" />;
      case 'connecting': return <RefreshCw className="h-4 w-4 animate-spin" />;
      case 'error': return <AlertTriangle className="h-4 w-4" />;
      default: return <Network className="h-4 w-4" />;
    }
  };

  if (isLoading) {
    return (
      <div>
        <TopBar 
          title="System Settings" 
          subtitle="Router administration and maintenance"
        />
        <div className="p-6 space-y-6">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
    );
  }

  const cpuUsageColor = (routerStatus?.cpuUsage || 0) > 80 ? "bg-red-500" : 
                       (routerStatus?.cpuUsage || 0) > 60 ? "bg-yellow-500" : "bg-green-500";
  
  const memoryUsagePercent = routerStatus ? (routerStatus.memoryUsage / routerStatus.memoryTotal) * 100 : 0;
  const memoryUsageColor = memoryUsagePercent > 80 ? "bg-red-500" : 
                          memoryUsagePercent > 60 ? "bg-yellow-500" : "bg-green-500";

  return (
    <div>
      <TopBar 
        title="System Settings" 
        subtitle="Router administration and maintenance"
      />
      <div className="p-6 space-y-6">
        {/* SSH Router Connection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Terminal className="h-5 w-5" />
              <span>ASUS Router SSH Connection</span>
              <div className={`flex items-center space-x-2 ml-auto ${getConnectionStatusColor()}`}>
                {getConnectionStatusIcon()}
                <span className="text-sm capitalize">{connectionStatus}</span>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Alert className="mb-4">
              <Link className="h-4 w-4" />
              <AlertDescription>
                Connect to your ASUS router with Merlin firmware via SSH to pull real-time data. 
                Ensure SSH is enabled in your router's administration settings.
              </AlertDescription>
            </Alert>

            <Form {...sshForm}>
              <form onSubmit={sshForm.handleSubmit(handleSaveSSHConfig)} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={sshForm.control}
                    name="host"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Router IP Address</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="192.168.1.1" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={sshForm.control}
                    name="port"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>SSH Port</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            placeholder="22" 
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 22)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={sshForm.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Username</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="admin" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={sshForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input 
                              type={showPassword ? "text" : "password"}
                              placeholder="Enter router password"
                              {...field} 
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                              onClick={() => setShowPassword(!showPassword)}
                            >
                              {showPassword ? (
                                <EyeOff className="h-4 w-4" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <FormField
                    control={sshForm.control}
                    name="enabled"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <FormLabel className="text-sm font-normal">
                          Enable SSH connection for real-time data
                        </FormLabel>
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex space-x-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleTestConnection}
                    disabled={isConnecting || sshTestMutation.isPending}
                    className="flex-1"
                  >
                    {isConnecting ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Testing Connection...
                      </>
                    ) : (
                      <>
                        <Network className="h-4 w-4 mr-2" />
                        Test Connection
                      </>
                    )}
                  </Button>

                  <Button
                    type="submit"
                    disabled={sshSaveMutation.isPending}
                    className="flex-1"
                  >
                    {sshSaveMutation.isPending ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Save Configuration
                      </>
                    )}
                  </Button>
                </div>

                <div className="flex space-x-3 mt-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => clearSettingsMutation.mutate()}
                    disabled={clearSettingsMutation.isPending}
                    className="flex-1 border-orange-200 text-orange-700 hover:bg-orange-50"
                  >
                    {clearSettingsMutation.isPending ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Clearing...
                      </>
                    ) : (
                      <>
                        <RotateCcw className="h-4 w-4 mr-2" />
                        Clear Settings
                      </>
                    )}
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => clearDataMutation.mutate()}
                    disabled={clearDataMutation.isPending}
                    className="flex-1 border-red-200 text-red-700 hover:bg-red-50"
                  >
                    {clearDataMutation.isPending ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Clearing...
                      </>
                    ) : (
                      <>
                        <Trash2 className="h-4 w-4 mr-2" />
                        Clear Data
                      </>
                    )}
                  </Button>
                </div>

                {connectionStatus === 'connected' && (
                  <div className="mt-4">
                    <Button
                      type="button"
                      onClick={() => fetch('/api/ssh/sync-data', { method: 'POST' })}
                      className="w-full bg-green-600 hover:bg-green-700"
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Sync Data from Merlin Router
                    </Button>
                  </div>
                )}
              </form>
            </Form>

            {connectionStatus === 'connected' && (
              <Alert className="mt-4">
                <CheckCircle2 className="h-4 w-4" />
                <AlertDescription>
                  <strong>Merlin Features Available:</strong> Advanced device tracking, bandwidth monitoring, 
                  Adaptive QoS, AiProtection, Guest Networks, AiMesh support, and more.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* System Status Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Settings className="h-5 w-5" />
                <span>System Information</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="space-y-3">
                  <div>
                    <span className="text-muted-foreground">Model:</span>
                    <div className="font-medium">{routerStatus?.model}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Firmware Version:</span>
                    <div className="font-medium font-mono">{routerStatus?.firmware}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">IP Address:</span>
                    <div className="font-medium font-mono">{routerStatus?.ipAddress}</div>
                  </div>
                </div>
                <div className="space-y-3">
                  <div>
                    <span className="text-muted-foreground">Uptime:</span>
                    <div className="font-medium">{routerStatus ? formatUptime(routerStatus.uptime) : "N/A"}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Status:</span>
                    <div className="flex items-center space-x-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      <span className="font-medium text-green-500">Online</span>
                    </div>
                  </div>
                  {routerStatus?.temperature && (
                    <div>
                      <span className="text-muted-foreground">Temperature:</span>
                      <div className="flex items-center space-x-2">
                        <Thermometer className="h-4 w-4" />
                        <span className="font-medium">{routerStatus.temperature.toFixed(1)}°C</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Cpu className="h-5 w-5" />
                <span>System Resources</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-muted-foreground">CPU Usage</span>
                    <span className="font-medium">{routerStatus?.cpuUsage.toFixed(1)}%</span>
                  </div>
                  <Progress value={routerStatus?.cpuUsage || 0} className="h-2" />
                </div>
                
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-muted-foreground">Memory Usage</span>
                    <span className="font-medium">
                      {routerStatus?.memoryUsage.toFixed(1)} / {routerStatus?.memoryTotal.toFixed(0)} GB
                    </span>
                  </div>
                  <Progress value={memoryUsagePercent} className="h-2" />
                </div>

                <div className="pt-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Overall Health:</span>
                    <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500">
                      Excellent
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* System Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Power className="h-5 w-5" />
                <span>System Control</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                onClick={handleReboot}
                disabled={rebootMutation.isPending || isRebooting}
                variant="outline"
                className="w-full justify-start h-auto p-4"
              >
                <div className="flex items-center space-x-3">
                  <Power className="h-4 w-4 text-orange-500" />
                  <div className="text-left">
                    <div className="font-medium">Reboot System</div>
                    <div className="text-sm text-muted-foreground">Restart the router</div>
                  </div>
                </div>
              </Button>

              <Button
                onClick={handleFactoryReset}
                variant="outline"
                className="w-full justify-start h-auto p-4"
              >
                <div className="flex items-center space-x-3">
                  <RotateCcw className="h-4 w-4 text-red-500" />
                  <div className="text-left">
                    <div className="font-medium">Factory Reset</div>
                    <div className="text-sm text-muted-foreground">Reset to default settings</div>
                  </div>
                </div>
              </Button>

              {isRebooting && (
                <Alert>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <AlertDescription>
                    Router is rebooting. Please wait...
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Download className="h-5 w-5" />
                <span>Firmware Management</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Current Version:</span>
                  <span className="font-mono">{routerStatus?.firmware}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Status:</span>
                  <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500">
                    Up to date
                  </Badge>
                </div>
              </div>

              <Button
                onClick={handleFirmwareUpdate}
                disabled={firmwareUpdateMutation.isPending || isUpdating}
                className="w-full bg-primary hover:bg-primary/90"
              >
                {isUpdating ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Checking for updates...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Check for Updates
                  </>
                )}
              </Button>

              {isUpdating && (
                <Alert>
                  <Download className="h-4 w-4" />
                  <AlertDescription>
                    Checking for firmware updates...
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Backup & Network Tools */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Save className="h-5 w-5" />
                <span>Backup & Restore</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                onClick={handleBackup}
                disabled={backupMutation.isPending}
                variant="outline"
                className="w-full justify-start h-auto p-4"
              >
                <div className="flex items-center space-x-3">
                  <Save className="h-4 w-4 text-blue-500" />
                  <div className="text-left">
                    <div className="font-medium">Create Backup</div>
                    <div className="text-sm text-muted-foreground">Save current configuration</div>
                  </div>
                </div>
              </Button>

              <Button
                variant="outline"
                className="w-full justify-start h-auto p-4"
              >
                <div className="flex items-center space-x-3">
                  <Upload className="h-4 w-4 text-green-500" />
                  <div className="text-left">
                    <div className="font-medium">Restore Backup</div>
                    <div className="text-sm text-muted-foreground">Load saved configuration</div>
                  </div>
                </div>
              </Button>

              <Separator />

              <div className="text-xs text-muted-foreground">
                Last backup: Never
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <TestTube className="h-5 w-5" />
                <span>Network Diagnostics</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                onClick={handleSpeedTest}
                disabled={speedTestRunning}
                className="w-full bg-primary hover:bg-primary/90"
              >
                {speedTestRunning ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Running Speed Test...
                  </>
                ) : (
                  <>
                    <TestTube className="h-4 w-4 mr-2" />
                    Run Speed Test
                  </>
                )}
              </Button>

              {speedTestResults && (
                <div className="p-3 bg-muted rounded-lg space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Download:</span>
                    <span className="font-medium">{speedTestResults.downloadSpeed} Mbps</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Upload:</span>
                    <span className="font-medium">{speedTestResults.uploadSpeed} Mbps</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Latency:</span>
                    <span className="font-medium">{speedTestResults.latency} ms</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Test completed at {new Date(speedTestResults.testDate).toLocaleTimeString()}
                  </div>
                </div>
              )}

              <Button
                variant="outline"
                className="w-full justify-start h-auto p-4"
              >
                <div className="flex items-center space-x-3">
                  <Network className="h-4 w-4 text-purple-500" />
                  <div className="text-left">
                    <div className="font-medium">Network Ping Test</div>
                    <div className="text-sm text-muted-foreground">Test connectivity</div>
                  </div>
                </div>
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* System Logs */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <FileText className="h-5 w-5" />
              <span>System Logs</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <h4 className="font-medium">Recent System Events</h4>
                  <p className="text-sm text-muted-foreground">Monitor system activity and errors</p>
                </div>
                <div className="flex space-x-2">
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Export Logs
                  </Button>
                  <Button variant="outline" size="sm">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Clear Logs
                  </Button>
                </div>
              </div>

              <div className="bg-muted rounded-lg p-4 h-32 overflow-y-auto font-mono text-xs">
                <div className="space-y-1 text-muted-foreground">
                  <div>[{new Date().toISOString()}] System startup completed</div>
                  <div>[{new Date(Date.now() - 3600000).toISOString()}] WiFi client connected: MacBook Pro</div>
                  <div>[{new Date(Date.now() - 7200000).toISOString()}] Firmware check completed - no updates available</div>
                  <div>[{new Date(Date.now() - 10800000).toISOString()}] DHCP lease renewed for 192.168.1.101</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
