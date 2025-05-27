import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Wifi, WifiOff, RefreshCw, Clock, Activity, TrendingUp } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface SyncStats {
  lastSync: Date | null;
  syncCount: number;
  avgSyncTime: number;
  failureCount: number;
  isBackground: boolean;
}

interface SyncStatusProps {
  isConnected: boolean;
  isActiveSync: boolean;
  syncStats: SyncStats;
  onManualSync: () => void;
  className?: string;
}

export default function SyncStatus({ 
  isConnected, 
  isActiveSync, 
  syncStats, 
  onManualSync,
  className 
}: SyncStatusProps) {
  const getSyncStatusBadge = () => {
    if (!isConnected) {
      return <Badge variant="destructive" className="gap-1"><WifiOff className="h-3 w-3" />Disconnected</Badge>;
    }
    if (isActiveSync) {
      return <Badge variant="secondary" className="gap-1"><RefreshCw className="h-3 w-3 animate-spin" />Syncing</Badge>;
    }
    if (syncStats.isBackground) {
      return <Badge variant="outline" className="gap-1"><Activity className="h-3 w-3" />Background</Badge>;
    }
    return <Badge variant="default" className="gap-1"><Wifi className="h-3 w-3" />Connected</Badge>;
  };

  const getSuccessRate = () => {
    if (syncStats.syncCount === 0) return 100;
    return ((syncStats.syncCount - syncStats.failureCount) / syncStats.syncCount * 100);
  };

  const formatSyncTime = (ms: number) => {
    if (ms < 1000) return `${Math.round(ms)}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm font-medium">Sync Status</CardTitle>
            <CardDescription className="text-xs">
              Real-time router data synchronization
            </CardDescription>
          </div>
          {getSyncStatusBadge()}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3">
        {/* Last Sync Info */}
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1 text-muted-foreground">
            <Clock className="h-3 w-3" />
            Last sync
          </div>
          <span className="font-medium">
            {syncStats.lastSync 
              ? formatDistanceToNow(syncStats.lastSync, { addSuffix: true })
              : 'Never'
            }
          </span>
        </div>

        {/* Success Rate */}
        {syncStats.syncCount > 0 && (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Success Rate</span>
              <span className="font-medium">{getSuccessRate().toFixed(1)}%</span>
            </div>
            <Progress value={getSuccessRate()} className="h-1" />
          </div>
        )}

        {/* Sync Statistics */}
        {syncStats.syncCount > 0 && (
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="space-y-1">
              <div className="text-muted-foreground">Total Syncs</div>
              <div className="font-medium">{syncStats.syncCount}</div>
            </div>
            <div className="space-y-1">
              <div className="text-muted-foreground">Avg Time</div>
              <div className="font-medium">{formatSyncTime(syncStats.avgSyncTime)}</div>
            </div>
          </div>
        )}

        {/* Manual Sync Button */}
        <Button 
          onClick={onManualSync}
          disabled={!isConnected || isActiveSync}
          size="sm"
          variant="outline"
          className="w-full h-7 text-xs"
        >
          {isActiveSync ? (
            <>
              <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
              Syncing...
            </>
          ) : (
            <>
              <RefreshCw className="h-3 w-3 mr-1" />
              Manual Sync
            </>
          )}
        </Button>

        {/* Failure indicator */}
        {syncStats.failureCount > 0 && (
          <div className="text-xs text-orange-600 dark:text-orange-400">
            {syncStats.failureCount} failed sync{syncStats.failureCount > 1 ? 's' : ''}
          </div>
        )}
      </CardContent>
    </Card>
  );
}