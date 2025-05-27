import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { PlayCircle, Clock, CheckCircle, AlertCircle, RefreshCw, Edit2, Save, X } from "lucide-react";
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
  const [editingJob, setEditingJob] = useState<string | null>(null);
  const [editedCronExpression, setEditedCronExpression] = useState("");

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
        title: "Schedule updated successfully",
        description: `Background service "${jobId}" schedule has been updated.`,
      });
      setEditingJob(null);
      setEditedCronExpression("");
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

  const startEdit = (job: BackgroundJob) => {
    setEditingJob(job.id);
    setEditedCronExpression(job.cronExpression);
  };

  const cancelEdit = () => {
    setEditingJob(null);
    setEditedCronExpression("");
  };

  const saveEdit = () => {
    if (editingJob && editedCronExpression.trim()) {
      updateScheduleMutation.mutate({
        jobId: editingJob,
        cronExpression: editedCronExpression.trim()
      });
    }
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
                    {editingJob === job.id ? (
                      <div className="flex items-center space-x-2">
                        <span>Schedule:</span>
                        <Input
                          value={editedCronExpression}
                          onChange={(e) => setEditedCronExpression(e.target.value)}
                          placeholder="e.g., */5 * * * *"
                          className="h-6 w-32 text-xs"
                        />
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={saveEdit}
                          disabled={updateScheduleMutation.isPending}
                          className="h-6 px-2"
                        >
                          <Save className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={cancelEdit}
                          className="h-6 px-2"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <span>Schedule: {job.cronExpression}</span>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => startEdit(job)}
                          className="h-5 px-1 opacity-50 hover:opacity-100"
                        >
                          <Edit2 className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                    {job.lastRun && (
                      <span>Last run: {new Date(job.lastRun).toLocaleString()}</span>
                    )}
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => runJobMutation.mutate(job.id)}
                  disabled={runJobMutation.isPending}
                  className="ml-4"
                >
                  <PlayCircle className={`h-4 w-4 mr-2 ${runJobMutation.isPending ? 'animate-spin' : ''}`} />
                  {runJobMutation.isPending ? 'Running...' : 'Run Now'}
                </Button>
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