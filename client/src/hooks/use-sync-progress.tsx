import { useState, useCallback } from 'react';

interface SyncPhase {
  id: string;
  name: string;
  description: string;
  progress: number;
  status: 'pending' | 'loading' | 'complete' | 'error';
}

export function useSyncProgress() {
  const [isVisible, setIsVisible] = useState(false);
  const [currentPhase, setCurrentPhase] = useState<string>('');
  const [phases, setPhases] = useState<SyncPhase[]>([
    {
      id: 'essential',
      name: 'Essential Data',
      description: 'Router status, system info, and bandwidth',
      progress: 0,
      status: 'pending'
    },
    {
      id: 'devices',
      name: 'Connected Devices',
      description: 'Network devices and connection details',
      progress: 0,
      status: 'pending'
    },
    {
      id: 'advanced',
      name: 'Advanced Features',
      description: 'WiFi networks and Merlin features',
      progress: 0,
      status: 'pending'
    }
  ]);

  const startSync = useCallback(() => {
    setIsVisible(true);
    setCurrentPhase('essential');
    setPhases(prevPhases => 
      prevPhases.map(phase => ({
        ...phase,
        progress: 0,
        status: phase.id === 'essential' ? 'loading' : 'pending'
      }))
    );
  }, []);

  const updatePhaseProgress = useCallback((phaseId: string, progress: number) => {
    setPhases(prevPhases =>
      prevPhases.map(phase =>
        phase.id === phaseId
          ? { ...phase, progress, status: 'loading' }
          : phase
      )
    );
  }, []);

  const completePhase = useCallback((phaseId: string) => {
    setPhases(prevPhases =>
      prevPhases.map(phase =>
        phase.id === phaseId
          ? { ...phase, progress: 100, status: 'complete' }
          : phase
      )
    );
    
    // Move to next phase
    const phaseOrder = ['essential', 'devices', 'advanced'];
    const currentIndex = phaseOrder.indexOf(phaseId);
    const nextPhase = phaseOrder[currentIndex + 1];
    
    if (nextPhase) {
      setCurrentPhase(nextPhase);
      setPhases(prevPhases =>
        prevPhases.map(phase =>
          phase.id === nextPhase
            ? { ...phase, status: 'loading' }
            : phase
        )
      );
    }
  }, []);

  const finishSync = useCallback(() => {
    setPhases(prevPhases =>
      prevPhases.map(phase => ({
        ...phase,
        progress: 100,
        status: 'complete'
      }))
    );
    setCurrentPhase('');
  }, []);

  const hideProgress = useCallback(() => {
    setIsVisible(false);
  }, []);

  const overallProgress = phases.reduce((total, phase) => total + phase.progress, 0) / phases.length;

  return {
    isVisible,
    phases,
    currentPhase,
    overallProgress,
    startSync,
    updatePhaseProgress,
    completePhase,
    finishSync,
    hideProgress
  };
}