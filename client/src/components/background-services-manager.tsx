import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { queryClient } from '@/lib/queryClient';
import { apiRequest } from '@/lib/queryClient';
import {
  Settings,
  Play,
  Square,
  Clock,
  Activity,
  AlertTriangle,
  CheckCircle2,
  Edit,
  Save,
  X,
  Info
} from 'lucide-react';

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
  const [editCronExpression, setEditCronExpression] = useState('');

  const { data: backgroundJobs = [], isLoading } = useQuery<BackgroundJob[]>({
    queryKey: ['/api/background-services'],
    refetchInterval: 10000 // Refresh every 10 seconds
  });

  const startJobMutation = useMutation({
    mutationFn: async (jobId: string) => {
      return apiRequest(`/api/background-services/${jobId}/start`, 'POST');
    },
    onSuccess: (_, jobId) => {
      queryClient.invalidateQueries({ queryKey: ['/api/background-services'] });
      const job = backgroundJobs.find(j => j.id === jobId);
      toast({
        title: "Service Started",
        description: `${job?.name} has been started successfully.`
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to start background service",
        variant: "destructive"
      });
    }
  });

  const stopJobMutation = useMutation({
    mutationFn: async (jobId: string) => {
      return apiRequest(`/api/background-services/${jobId}/stop`, 'POST');
    },
    onSuccess: (_, jobId) => {
      queryClient.invalidateQueries({ queryKey: ['/api/background-services'] });
      const job = backgroundJobs.find(j => j.id === jobId);
      toast({
        title: "Service Stopped",
        description: `${job?.name} has been stopped successfully.`
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to stop background service",
        variant: "destructive"
      });
    }
  });

  const updateScheduleMutation = useMutation({
    mutationFn: async ({ jobId, cronExpression }: { jobId: string; cronExpression: string }) => {
      return apiRequest(`/api/background-services/${jobId}/schedule`, 'PUT', { cronExpression });
    },
    onSuccess: (_, { jobId }) => {
      queryClient.invalidateQueries({ queryKey: ['/api/background-services'] });
      const job = backgroundJobs.find(j => j.id === jobId);
      setEditingJob(null);
      setEditCronExpression('');
      toast({
        title: "Schedule Updated",
        description: `${job?.name} schedule has been updated successfully.`
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update schedule",
        variant: "destructive"
      });
    }
  });

  const getStatusBadge = (job: BackgroundJob) => {
    switch (job.status) {
      case 'running':
        return <Badge variant="default" className="bg-blue-600"><Activity className="h-3 w-3 mr-1" />Running</Badge>;
      case 'stopped':
        return <Badge variant="secondary"><Square className="h-3 w-3 mr-1" />Stopped</Badge>;
      case 'error':
        return <Badge variant="destructive"><AlertTriangle className="h-3 w-3 mr-1" />Error</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const handleEditSchedule = (job: BackgroundJob) => {
    setEditingJob(job.id);
    setEditCronExpression(job.cronExpression);
  };

  const handleSaveSchedule = (jobId: string) => {
    updateScheduleMutation.mutate({ jobId, cronExpression: editCronExpression });
  };

  const handleCancelEdit = () => {
    setEditingJob(null);
    setEditCronExpression('');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-3">
          <Settings className="h-6 w-6" />
          Background Services
        </CardTitle>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Manage automated data collection and monitoring processes
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Background services continuously collect device data, monitor network status, and update connection information to improve network mapping accuracy.
          </AlertDescription>
        </Alert>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="border rounded-lg p-4 space-y-3">
                <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-3 bg-gray-200 rounded animate-pulse w-3/4"></div>
                <div className="flex gap-2">
                  <div className="h-6 bg-gray-200 rounded animate-pulse w-16"></div>
                  <div className="h-6 bg-gray-200 rounded animate-pulse w-20"></div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {backgroundJobs.map((job) => (
              <div key={job.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                        {job.name}
                      </h3>
                      {getStatusBadge(job)}
                      <Switch
                        checked={job.isEnabled}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            startJobMutation.mutate(job.id);
                          } else {
                            stopJobMutation.mutate(job.id);
                          }
                        }}
                        disabled={startJobMutation.isPending || stopJobMutation.isPending}
                      />
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {job.description}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditSchedule(job)}
                      disabled={editingJob !== null}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <Separator />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <Label className="text-gray-600 dark:text-gray-400">Schedule</Label>
                    {editingJob === job.id ? (
                      <div className="flex items-center gap-2 mt-1">
                        <Input
                          value={editCronExpression}
                          onChange={(e) => setEditCronExpression(e.target.value)}
                          placeholder="* * * * *"
                          className="font-mono text-sm"
                        />
                        <Button
                          size="sm"
                          onClick={() => handleSaveSchedule(job.id)}
                          disabled={updateScheduleMutation.isPending}
                        >
                          <Save className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleCancelEdit}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="font-mono text-sm bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded mt-1">
                        {job.cronExpression}
                      </div>
                    )}
                  </div>
                  <div>
                    <Label className="text-gray-600 dark:text-gray-400">Next Run</Label>
                    <div className="text-sm mt-1">
                      {job.nextRun ? (
                        <span className="text-green-600 dark:text-green-400">
                          {new Date(job.nextRun).toLocaleString()}
                        </span>
                      ) : (
                        <span className="text-gray-500">Not scheduled</span>
                      )}
                    </div>
                  </div>
                  <div>
                    <Label className="text-gray-600 dark:text-gray-400">Last Run</Label>
                    <div className="text-sm mt-1">
                      {job.lastRun ? (
                        <span className="text-gray-700 dark:text-gray-300">
                          {new Date(job.lastRun).toLocaleString()}
                        </span>
                      ) : (
                        <span className="text-gray-500">Never</span>
                      )}
                    </div>
                  </div>
                  <div>
                    <Label className="text-gray-600 dark:text-gray-400">Status</Label>
                    <div className="text-sm mt-1">
                      {job.status === 'error' && job.errorMessage ? (
                        <span className="text-red-600 dark:text-red-400">
                          {job.errorMessage}
                        </span>
                      ) : (
                        <span className="text-green-600 dark:text-green-400">
                          {job.isEnabled ? 'Active' : 'Disabled'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <h4 className="font-semibold mb-2 text-gray-900 dark:text-gray-100">Cron Expression Help</h4>
          <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
            <p><code className="bg-gray-200 dark:bg-gray-700 px-1 rounded">*/2 * * * *</code> - Every 2 minutes</p>
            <p><code className="bg-gray-200 dark:bg-gray-700 px-1 rounded">*/5 * * * *</code> - Every 5 minutes</p>
            <p><code className="bg-gray-200 dark:bg-gray-700 px-1 rounded">0 * * * *</code> - Every hour</p>
            <p><code className="bg-gray-200 dark:bg-gray-700 px-1 rounded">0 0 * * *</code> - Every day at midnight</p>
            <p className="text-xs mt-2">Format: minute hour day month weekday</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}