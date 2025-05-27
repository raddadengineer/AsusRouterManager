import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  source?: string;
}

interface SystemLogsProps {
  logType: 'app' | 'router';
}

export default function SystemLogs({ logType }: SystemLogsProps) {
  const [autoRefresh, setAutoRefresh] = useState(true);

  const { data: logs, isLoading, refetch } = useQuery<LogEntry[]>({
    queryKey: [`/api/logs/${logType}`],
    refetchInterval: autoRefresh ? 5000 : false, // Refresh every 5 seconds if auto-refresh is enabled
  });

  // Sample logs when no backend data is available
  const sampleAppLogs: LogEntry[] = [
    {
      timestamp: new Date().toISOString(),
      level: 'INFO',
      message: 'Background service: Device Discovery completed successfully',
      source: 'background-services'
    },
    {
      timestamp: new Date(Date.now() - 30000).toISOString(),
      level: 'INFO',
      message: 'Background service: Bandwidth Monitoring completed successfully',
      source: 'background-services'
    },
    {
      timestamp: new Date(Date.now() - 60000).toISOString(),
      level: 'INFO',
      message: 'SSH connection established to router',
      source: 'ssh-client'
    },
    {
      timestamp: new Date(Date.now() - 120000).toISOString(),
      level: 'INFO',
      message: 'Application startup completed',
      source: 'server'
    },
    {
      timestamp: new Date(Date.now() - 180000).toISOString(),
      level: 'INFO',
      message: 'Database connection established',
      source: 'database'
    }
  ];

  const sampleRouterLogs: LogEntry[] = [
    {
      timestamp: new Date().toISOString(),
      level: 'INFO',
      message: 'WiFi client connected: MacBook-Pro.local (wl1)',
      source: 'wireless'
    },
    {
      timestamp: new Date(Date.now() - 45000).toISOString(),
      level: 'INFO',
      message: 'DHCP lease renewed: 192.168.1.105 -> AA:BB:CC:DD:EE:FF',
      source: 'dhcp'
    },
    {
      timestamp: new Date(Date.now() - 90000).toISOString(),
      level: 'WARN',
      message: 'High CPU usage detected: 85%',
      source: 'system'
    },
    {
      timestamp: new Date(Date.now() - 150000).toISOString(),
      level: 'INFO',
      message: 'AiMesh node connected: RT-AX86U_Node (192.168.1.2)',
      source: 'aimesh'
    },
    {
      timestamp: new Date(Date.now() - 210000).toISOString(),
      level: 'INFO',
      message: 'Firmware check completed - up to date',
      source: 'system'
    }
  ];

  // Use actual logs when available, otherwise show empty state
  const displayLogs = logs && logs.length > 0 ? logs : [];

  const getLevelColor = (level: string) => {
    switch (level.toUpperCase()) {
      case 'ERROR':
        return 'text-red-400';
      case 'WARN':
        return 'text-yellow-400';
      case 'INFO':
        return 'text-blue-400';
      case 'DEBUG':
        return 'text-gray-400';
      default:
        return 'text-muted-foreground';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isLoading}
          >
            <RefreshCw className={`h-3 w-3 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            variant={autoRefresh ? "default" : "outline"}
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            Auto-refresh {autoRefresh ? 'ON' : 'OFF'}
          </Button>
        </div>
        <div className="text-xs text-muted-foreground">
          {displayLogs.length} entries
        </div>
      </div>

      <div className="bg-black text-green-400 p-4 rounded-lg font-mono text-xs h-64 overflow-y-auto">
        <div className="space-y-1">
          {displayLogs.length > 0 ? (
            displayLogs.map((log, index) => (
              <div key={index} className="flex flex-wrap gap-2">
                <span className="text-gray-400">
                  [{formatTimestamp(log.timestamp)}]
                </span>
                <span className={`font-semibold ${getLevelColor(log.level)}`}>
                  {log.level}
                </span>
                {log.source && (
                  <span className="text-purple-400">
                    [{log.source}]
                  </span>
                )}
                <span className="text-green-400 flex-1">
                  {log.message}
                </span>
              </div>
            ))
          ) : (
            <div className="text-gray-400 text-center py-8">
              <div className="mb-2">No {logType} logs available</div>
              <div className="text-xs">
                {logType === 'router' 
                  ? 'Connect to your router via SSH to see live router logs' 
                  : 'Logs will appear here as the application runs'}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}