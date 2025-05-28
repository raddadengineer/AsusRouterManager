import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PlayCircle, Clock, CheckCircle, AlertCircle, RefreshCw, Info, Code, Database, Edit, Save, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface BackgroundJob {
  id: string;
  name: string;
  description: string;
  cronExpression: string;
  isEnabled: boolean;
  lastRun?: Date;
  nextRun?: Date;
  status: 'running' | 'stopped' | 'error';
  errorMessage?: string;
}

export default function BackgroundServicesManager() {
  const { toast } = useToast();
  const [editingJobId, setEditingJobId] = useState<string | null>(null);
  const [editCronExpression, setEditCronExpression] = useState<string>('');

  // Define available background services that should always be visible
  const defaultServices: BackgroundJob[] = [
    {
      id: 'device-discovery',
      name: 'Device Discovery',
      description: 'Scans network for new connected devices',
      cronExpression: '*/2 * * * *',
      isEnabled: true,
      status: 'stopped'
    },
    {
      id: 'device-detail-sync',
      name: 'Device Detail Sync',
      description: 'Updates device connection details and signal strength',
      cronExpression: '*/2 * * * *',
      isEnabled: true,
      status: 'stopped'
    },
    {
      id: 'bandwidth-monitoring',
      name: 'Bandwidth Monitoring',
      description: 'Monitors real-time bandwidth usage',
      cronExpression: '*/1 * * * *',
      isEnabled: true,
      status: 'stopped'
    },
    {
      id: 'router-health-check',
      name: 'Router Health Check',
      description: 'Monitors router system performance',
      cronExpression: '*/5 * * * *',
      isEnabled: true,
      status: 'stopped'
    },
    {
      id: 'wifi-network-scan',
      name: 'WiFi Network Scan',
      description: 'Scans for available WiFi networks',
      cronExpression: '*/10 * * * *',
      isEnabled: true,
      status: 'stopped'
    }
  ];

  const { data: backendJobs, isLoading, refetch } = useQuery<BackgroundJob[]>({
    queryKey: ["/api/background/jobs"],
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  // Use backend data if available, otherwise show default services
  const jobs = backendJobs && backendJobs.length > 0 ? backendJobs : defaultServices;

  const runJobMutation = useMutation({
    mutationFn: async (jobId: string) => {
      const response = await fetch("/api/background/run-job", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId }),
      });
      
      if (!response.ok) {
        throw new Error("Failed to run job");
      }
      
      return response.json();
    },
    onSuccess: (data, jobId) => {
      toast({
        title: "Job executed successfully",
        description: `Background process "${jobId}" has been run immediately.`,
      });
      refetch();
    },
    onError: (error, jobId) => {
      toast({
        title: "Failed to run job",
        description: `Could not execute "${jobId}". Please check your router connection.`,
        variant: "destructive",
      });
    }
  });

  const updateScheduleMutation = useMutation({
    mutationFn: async ({ jobId, cronExpression }: { jobId: string; cronExpression: string }) => {
      const response = await fetch(`/api/background-services/${jobId}/schedule`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cronExpression }),
      });
      
      if (!response.ok) {
        throw new Error("Failed to update schedule");
      }
      
      return response.json();
    },
    onSuccess: (data, { jobId }) => {
      toast({
        title: "Schedule Updated",
        description: `Schedule for "${jobId}" has been updated successfully.`,
      });
      setEditingJobId(null);
      setEditCronExpression('');
      refetch();
    },
    onError: (error, { jobId }) => {
      toast({
        title: "Failed to update schedule",
        description: `Could not update schedule for "${jobId}". Please check the cron expression format.`,
        variant: "destructive",
      });
    }
  });

  const handleEditSchedule = (job: BackgroundJob) => {
    setEditingJobId(job.id);
    setEditCronExpression(job.cronExpression);
  };

  const handleSaveSchedule = () => {
    if (editingJobId && editCronExpression.trim()) {
      updateScheduleMutation.mutate({
        jobId: editingJobId,
        cronExpression: editCronExpression.trim()
      });
    }
  };

  const handleCancelEdit = () => {
    setEditingJobId(null);
    setEditCronExpression('');
  };

  const getStatusBadge = (job: BackgroundJob) => {
    switch (job.status) {
      case 'running':
        return <Badge className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />Running</Badge>;
      case 'stopped':
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Stopped</Badge>;
      case 'error':
        return <Badge variant="destructive"><AlertCircle className="h-3 w-3 mr-1" />Error</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const getJobDetails = (jobId: string) => {
    const details = {
      'device-discovery': {
        purpose: 'Scans your network to discover and track connected devices',
        scripts: [
          'cat /proc/net/arp | grep -v "00:00:00:00:00:00" | wc -l',
          'arp -a | grep -E "([0-9a-f]{2}:){5}[0-9a-f]{2}"',
          'brctl showmacs br0 | tail -n +2'
        ],
        dataCollected: [
          'Device MAC addresses and IP assignments',
          'Device hostnames and connection types',
          'Online/offline status for each device',
          'Connection timestamps and last seen data'
        ],
        databaseTables: ['connected_devices'],
        frequency: 'Every 2 minutes'
      },
      'device-detail-sync': {
        purpose: 'Enriches device information with detailed connection data',
        scripts: [
          'wl -i wl0 assoclist | head -20',
          'wl -i wl1 assoclist | head -20', 
          'cat /tmp/dhcp.leases',
          'ifconfig wl0 | grep "inet addr"'
        ],
        dataCollected: [
          'Wireless signal strength (RSSI)',
          'Connection bandwidth and speeds',
          'Device manufacturer identification',
          'Wireless band assignments (2.4GHz/5GHz/6GHz)'
        ],
        databaseTables: ['connected_devices'],
        frequency: 'Every 3 minutes'
      },
      'bandwidth-monitoring': {
        purpose: 'Tracks network traffic and bandwidth usage in real-time',
        scripts: [
          'cat /proc/net/dev | grep br0',
          'iftop -n -t -s 10 2>/dev/null | head -20',
          'cat /tmp/bwdpi/bwdpi.app.db'
        ],
        dataCollected: [
          'Download and upload speeds',
          'Total data transferred',
          'Per-device bandwidth usage',
          'Network throughput statistics'
        ],
        databaseTables: ['bandwidth_data'],
        frequency: 'Every 30 seconds'
      },
      'router-health-check': {
        purpose: 'Monitors router system status and WiFi network configuration',
        scripts: [
          'for i in $(nvram get wl_ifnames); do if ifconfig "$i" 2>/dev/null | grep -q "UP"; then echo "$i"; fi; done | wc -l',
          'ifconfig | cut -d \' \' -f1 | grep -E \'^wl[0-9]+\\.[1-3]$\' | xargs -n1 -I{} sh -c \'if ifconfig {} | grep -q "UP"; then echo {}; fi\' | wc -l',
          'cat /proc/cpuinfo | grep "cpu MHz"',
          'free -m | grep Mem',
          'uptime | awk \'{print $3$4}\''
        ],
        dataCollected: [
          'Active WiFi network count (your optimized script)',
          'Active guest network count (your improved script)', 
          'Router CPU and memory usage',
          'System uptime and temperature',
          'Router feature status (VPN, QoS, AI Protection)'
        ],
        databaseTables: ['router_status', 'router_features'],
        frequency: 'Every 5 minutes'
      },
      'wifi-network-scan': {
        purpose: 'Discovers and analyzes WiFi networks and their configurations',
        scripts: [
          'nvram show | grep ssid',
          'wl scanresults | head -50',
          'iwlist scan | grep ESSID'
        ],
        dataCollected: [
          'Available WiFi networks and signal strength',
          'Network security configurations',
          'Channel assignments and interference',
          'Guest network configurations'
        ],
        databaseTables: ['wifi_networks'],
        frequency: 'Every 10 minutes'
      }
    };
    
    return details[jobId as keyof typeof details] || {
      purpose: 'Background service details not available',
      scripts: [],
      dataCollected: [],
      databaseTables: [],
      frequency: 'Unknown'
    };
  };

  const getJobDisplayName = (jobId: string) => {
    const jobNames: { [key: string]: string } = {
      'device-discovery': 'Device Discovery',
      'device-detail-sync': 'Device Detail Sync',
      'bandwidth-monitoring': 'Bandwidth Monitoring',
      'router-health-check': 'Router Health Check',
      'wifi-network-scan': 'WiFi Network Scan'
    };
    return jobNames[jobId] || jobId;
  };

  const getJobDescription = (jobId: string) => {
    const descriptions: { [key: string]: string } = {
      'device-discovery': 'Scans for connected devices on the network',
      'device-detail-sync': 'Collects detailed information about each device',
      'bandwidth-monitoring': 'Monitors network bandwidth usage',
      'router-health-check': 'Checks router system health and status',
      'wifi-network-scan': 'Scans for available WiFi networks'
    };
    return descriptions[jobId] || 'Background process for network management';
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Background Services</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-2">
                  <div className="h-4 bg-muted rounded w-32"></div>
                  <div className="h-3 bg-muted rounded w-48"></div>
                </div>
                <div className="h-8 bg-muted rounded w-20"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center">
          <RefreshCw className="h-5 w-5 mr-2" />
          Background Services
        </CardTitle>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh Status
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {jobs && jobs.length > 0 ? (
            jobs.map((job) => (
              <div key={job.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="font-medium">{getJobDisplayName(job.id)}</h3>
                    {getStatusBadge(job)}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {getJobDescription(job.id)}
                  </p>
                  <div className="flex items-center space-x-4 mt-2 text-xs text-muted-foreground">
                    <div className="flex items-center space-x-2">
                      <span>Schedule:</span>
                      {editingJobId === job.id ? (
                        <div className="flex items-center space-x-2">
                          <Input
                            value={editCronExpression}
                            onChange={(e) => setEditCronExpression(e.target.value)}
                            className="h-6 text-xs font-mono min-w-32"
                            placeholder="* * * * *"
                          />
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0"
                            onClick={handleSaveSchedule}
                            disabled={updateScheduleMutation.isPending}
                          >
                            <Save className="h-3 w-3 text-green-600" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0"
                            onClick={handleCancelEdit}
                          >
                            <X className="h-3 w-3 text-red-600" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-1">
                          <span className="font-mono">{job.cronExpression}</span>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-5 w-5 p-0"
                            onClick={() => handleEditSchedule(job)}
                          >
                            <Edit className="h-3 w-3 text-blue-600" />
                          </Button>
                        </div>
                      )}
                    </div>
                    {job.lastRun && (
                      <span>Last run: {new Date(job.lastRun).toLocaleString()}</span>
                    )}
                  </div>
                </div>
                <div className="flex space-x-2 ml-4">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Info className="h-4 w-4 mr-2" />
                        Details
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle className="flex items-center space-x-2">
                          <Code className="h-5 w-5" />
                          <span>{getJobDisplayName(job.id)} - Technical Details</span>
                        </DialogTitle>
                      </DialogHeader>
                      <div className="space-y-6">
                        {/* Purpose */}
                        <div>
                          <h3 className="font-semibold mb-2 flex items-center">
                            <Info className="h-4 w-4 mr-2 text-blue-500" />
                            Purpose
                          </h3>
                          <p className="text-sm text-gray-700 dark:text-gray-200 bg-blue-50 dark:bg-blue-950/30 p-3 rounded-lg">
                            {getJobDetails(job.id).purpose}
                          </p>
                        </div>

                        {/* Scripts Being Executed */}
                        <div>
                          <h3 className="font-semibold mb-2 flex items-center">
                            <Code className="h-4 w-4 mr-2 text-green-500" />
                            Scripts & Commands
                          </h3>
                          <div className="space-y-2">
                            {getJobDetails(job.id).scripts.map((script, index) => (
                              <div key={index} className="bg-gray-100 dark:bg-gray-800 p-3 rounded-lg font-mono text-sm">
                                <code className="text-gray-800 dark:text-gray-200">{script}</code>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Data Collected */}
                        <div>
                          <h3 className="font-semibold mb-2 flex items-center">
                            <Database className="h-4 w-4 mr-2 text-purple-500" />
                            Data Collected & Stored
                          </h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <h4 className="text-sm font-medium mb-2">Information Gathered:</h4>
                              <ul className="space-y-1 text-sm text-muted-foreground">
                                {getJobDetails(job.id).dataCollected.map((data, index) => (
                                  <li key={index} className="flex items-start">
                                    <span className="w-2 h-2 bg-purple-500 rounded-full mt-2 mr-2 flex-shrink-0"></span>
                                    {data}
                                  </li>
                                ))}
                              </ul>
                            </div>
                            <div>
                              <h4 className="text-sm font-medium mb-2">Database Tables:</h4>
                              <div className="space-y-1">
                                {getJobDetails(job.id).databaseTables.map((table, index) => (
                                  <Badge key={index} variant="outline" className="mr-2 mb-1">
                                    {table}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Execution Info */}
                        <div className="bg-muted/50 p-4 rounded-lg">
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="font-medium">Frequency:</span>
                              <span className="ml-2 text-muted-foreground">{getJobDetails(job.id).frequency}</span>
                            </div>
                            <div>
                              <span className="font-medium">Status:</span>
                              <span className="ml-2">{getStatusBadge(job)}</span>
                            </div>
                            {job.lastRun && (
                              <div className="col-span-2">
                                <span className="font-medium">Last Execution:</span>
                                <span className="ml-2 text-muted-foreground">
                                  {new Date(job.lastRun).toLocaleString()}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => runJobMutation.mutate(job.id)}
                    disabled={runJobMutation.isPending}
                  >
                    <PlayCircle className={`h-4 w-4 mr-2 ${runJobMutation.isPending ? 'animate-spin' : ''}`} />
                    {runJobMutation.isPending ? 'Running...' : 'Run Now'}
                  </Button>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <RefreshCw className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No background services found</p>
              <p className="text-sm">Background services will appear here once the router is connected</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}