import { create } from "zustand";

interface AgentState {
  conversationId: string | null;
  isFullScreen: boolean;
  currentWorkflow: string | null;
  workflowStep: number;
  init: (opts: { conversationId: string | null }) => void;
  setWorkflow: (workflow: string | null, step?: number) => void;
  nextStep: () => void;
  resetWorkflow: () => void;
}

export const useAgentStore = create<AgentState>((set, get) => ({
  conversationId: null,
  isFullScreen: false,
  currentWorkflow: null,
  workflowStep: 0,
  
  init: ({ conversationId }) => set({ 
    conversationId,
    isFullScreen: true 
  }),
  
  setWorkflow: (workflow, step = 0) => set({ 
    currentWorkflow: workflow, 
    workflowStep: step 
  }),
  
  nextStep: () => set((state) => ({ 
    workflowStep: state.workflowStep + 1 
  })),
  
  resetWorkflow: () => set({ 
    currentWorkflow: null, 
    workflowStep: 0 
  }),
}));