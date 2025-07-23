
import { create } from 'zustand';

export interface WorkpaperMetadata {
  id: string; // TODO: will come from backend
  title: string;
  description?: string;
  createdAt: string; // TODO: will come from backend
  updatedAt: string; // TODO: will come from backend
  templateId?: string; // TODO: for uploaded templates
  isTemplate: boolean;
}

export interface WorkpaperState {
  metadata: WorkpaperMetadata;
  mode: 'blank' | 'upload';
  isDirty: boolean;
  lastSaved: Date | null;
}

interface WorkpaperActions {
  // Metadata
  setTitle: (title: string) => void;
  setDescription: (description: string) => void;
  setMode: (mode: 'blank' | 'upload') => void;
  
  // State management
  setDirty: (isDirty: boolean) => void;
  setLastSaved: (date: Date) => void;
  
  // TODO: Backend integration
  saveWorkpaper: () => Promise<void>;
  loadWorkpaper: (id: string) => Promise<void>;
}

export const useWorkpaperStore = create<WorkpaperState & WorkpaperActions>((set, get) => ({
  // Initial state
  metadata: {
    id: 'new-workpaper', // TODO: generate or get from backend
    title: 'New Workpaper',
    description: '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isTemplate: false,
  },
  mode: 'blank',
  isDirty: false,
  lastSaved: null,

  // Metadata actions
  setTitle: (title) => {
    set(state => ({
      metadata: { ...state.metadata, title },
      isDirty: true,
    }));
  },

  setDescription: (description) => {
    set(state => ({
      metadata: { ...state.metadata, description },
      isDirty: true,
    }));
  },

  setMode: (mode) => {
    set({ mode });
  },

  // State management
  setDirty: (isDirty) => set({ isDirty }),
  setLastSaved: (date) => set({ lastSaved: date }),

  // TODO: Backend integration
  saveWorkpaper: async () => {
    // TODO: Implement save to backend
    console.log('Saving workpaper...');
    set({ isDirty: false, lastSaved: new Date() });
  },

  loadWorkpaper: async (id) => {
    // TODO: Implement load from backend
    console.log('Loading workpaper:', id);
  },
}));
