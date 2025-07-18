
import { useState, useCallback } from 'react';

export interface ReportState {
  title: string;
  activeView: 'table' | 'chart';
  components: any[];
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
    try {
      // Simulate report execution
      await new Promise(resolve => setTimeout(resolve, 2000));
      console.log('Report executed successfully');
    } catch (error) {
      console.error('Error running report:', error);
    } finally {
      setIsRunning(false);
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
  };
};
