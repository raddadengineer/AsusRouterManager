import { Progress } from "@/components/ui/progress";
import { CheckCircle, Loader2, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface SyncPhase {
  id: string;
  name: string;
  description: string;
  progress: number;
  status: 'pending' | 'loading' | 'complete' | 'error';
}

interface SyncProgressProps {
  phases: SyncPhase[];
  currentPhase?: string;
  overallProgress: number;
  isVisible: boolean;
  onClose?: () => void;
}

export default function SyncProgress({ 
  phases, 
  currentPhase, 
  overallProgress, 
  isVisible,
  onClose 
}: SyncProgressProps) {
  if (!isVisible) return null;

  const getPhaseIcon = (phase: SyncPhase) => {
    switch (phase.status) {
      case 'complete':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'loading':
        return <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />;
      case 'error':
        return <CheckCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Clock className="h-5 w-5 text-gray-400 dark:text-gray-600" />;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 p-6 w-full max-w-md">
        <div className="text-center mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Syncing Router Data
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Loading authentic data from your ASUS router
          </p>
        </div>

        {/* Overall Progress */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Overall Progress
            </span>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {Math.round(overallProgress)}%
            </span>
          </div>
          <Progress value={overallProgress} className="h-2" />
        </div>

        {/* Phase Details */}
        <div className="space-y-3">
          {phases.map((phase) => (
            <div
              key={phase.id}
              className={cn(
                "flex items-center gap-3 p-3 rounded-lg transition-colors",
                phase.status === 'loading' && "bg-blue-50 dark:bg-blue-950/20",
                phase.status === 'complete' && "bg-green-50 dark:bg-green-950/20",
                phase.status === 'error' && "bg-red-50 dark:bg-red-950/20"
              )}
            >
              {getPhaseIcon(phase)}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {phase.name}
                  </p>
                  {phase.status === 'loading' && (
                    <span className="text-xs text-blue-600 dark:text-blue-400">
                      {Math.round(phase.progress)}%
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  {phase.description}
                </p>
                {phase.status === 'loading' && (
                  <Progress value={phase.progress} className="h-1 mt-2" />
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Close button when complete */}
        {overallProgress >= 100 && (
          <div className="mt-6 text-center">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium transition-colors"
            >
              Continue to Dashboard
            </button>
          </div>
        )}
      </div>
    </div>
  );
}