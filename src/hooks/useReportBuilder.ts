
import { useState, useCallback } from 'react';

interface CanvasItem {
  id: string;
  type: 'table' | 'metric' | 'chart' | 'formula';
  position: { x: number; y: number };
  size: { width: number; height: number };
  data: any;
}

export interface ReportState {
  title: string;
  activeView: 'table' | 'chart';
  components: CanvasItem[];
  selectedComponent: CanvasItem | null;
  status: 'ready' | 'running' | 'error' | 'success';
  progress: number;
  filters: any[];
  lastSaved: Date | null;
}

export interface UndoRedoState {
  past: ReportState[];
  present: ReportState;
  future: ReportState[];
}

export const useReportBuilder = () => {
  const initialState: ReportState = {
    title: 'New Report',
    activeView: 'table',
    components: [],
    selectedComponent: null,
    status: 'ready',
    progress: 0,
    filters: [],
    lastSaved: null,
  };

  const [undoRedoState, setUndoRedoState] = useState<UndoRedoState>({
    past: [],
    present: initialState,
    future: [],
  });

  const [isRunning, setIsRunning] = useState(false);

  const updateState = useCallback((newState: Partial<ReportState>) => {
    setUndoRedoState(current => ({
      past: [...current.past, current.present],
      present: { ...current.present, ...newState },
      future: [],
    }));
  }, []);

  const undo = useCallback(() => {
    setUndoRedoState(current => {
      if (current.past.length === 0) return current;
      
      const previous = current.past[current.past.length - 1];
      const newPast = current.past.slice(0, current.past.length - 1);
      
      return {
        past: newPast,
        present: previous,
        future: [current.present, ...current.future],
      };
    });
  }, []);

  const redo = useCallback(() => {
    setUndoRedoState(current => {
      if (current.future.length === 0) return current;
      
      const next = current.future[0];
      const newFuture = current.future.slice(1);
      
      return {
        past: [...current.past, current.present],
        present: next,
        future: newFuture,
      };
    });
  }, []);

  const runReport = useCallback(async () => {
    setIsRunning(true);
    
    // Update status to running
    setUndoRedoState(current => ({
      ...current,
      present: { ...current.present, status: 'running', progress: 0 }
    }));

    try {
      // Simulate report execution with progress updates
      const phases = [
        { message: 'Initializing report...', progress: 10 },
        { message: 'Loading data sources...', progress: 30 },
        { message: 'Processing components...', progress: 50 },
        { message: 'Rendering widgets...', progress: 70 },
        { message: 'Applying transformations...', progress: 85 },
        { message: 'Finalizing report...', progress: 100 }
      ];
      
      for (const phase of phases) {
        await new Promise(resolve => setTimeout(resolve, 500));
        setUndoRedoState(current => ({
          ...current,
          present: { ...current.present, progress: phase.progress }
        }));
      }
      
      // Update status to success
      setUndoRedoState(current => ({
        ...current,
        present: { ...current.present, status: 'success', progress: 100 }
      }));
      
      console.log('Report executed successfully');
      
      // Auto-reset after a delay
      setTimeout(() => {
        setUndoRedoState(current => ({
          ...current,
          present: { ...current.present, status: 'ready', progress: 0 }
        }));
        setIsRunning(false);
      }, 2000);
      
    } catch (error) {
      setUndoRedoState(current => ({
        ...current,
        present: { ...current.present, status: 'error', progress: 0 }
      }));
      setIsRunning(false);
      console.error('Error running report:', error);
    }
  }, []);

  const canUndo = undoRedoState.past.length > 0;
  const canRedo = undoRedoState.future.length > 0;

  return {
    reportState: undoRedoState.present,
    updateState,
    undo,
    redo,
    canUndo,
    canRedo,
    runReport,
    isRunning,
    status: undoRedoState.present.status,
    progress: undoRedoState.present.progress,
  };
};
