import { create } from 'zustand';

export interface Message {
  id: string;
  author: "user" | "agent";
  content: string | { text: string; data?: any };
  timestamp: number;
  isError?: boolean;
  toolCall?: {
    name: string;
    params: Record<string, any>;
    result?: any;
  };
  requiresData?: boolean;
  dataCollected?: boolean;
  missingParams?: string[];
  actionType?: string;
  validationErrors?: {
    missing: string[];
    invalid: string[];
  };
  toolIntroduction?: {
    toolType: 'system' | 'workflow';
    toolName: string;
    requiredParameters: Array<{
      name: string;
      type: string;
      description: string;
      required: boolean;
    }>;
    followUpQuestions: string[];
  };
}

interface RecoveryState {
  pendingStep?: any;
  missingField?: string;
}

interface FeedbackContext {
  lastPlanId?: string;
  lastStepId?: string;
  toolName?: string;
}

interface ChatState {
  messages: Message[];
  isLoading: boolean;
  error: string | null;
  conversationId: string | null;
  recovery: RecoveryState;
  feedbackContext: FeedbackContext;
  registrationModeActive: boolean;
  action?: {
    type: string;
    payload: any;
  };
  send: (text: string) => Promise<any>;
  load: (conversationId: string) => Promise<void>;
  startNew: () => void;
  addMessage: (message: Message) => void;
  markDataCollected: (messageId: string) => void;
  setRecovery: (recovery: RecoveryState) => void;
  setFeedbackContext: (context: FeedbackContext) => void;
  setAction: (action: ChatState['action']) => void;
  setRegistrationModeActive: (active: boolean) => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  isLoading: false,
  error: null,
  conversationId: null,
  recovery: {},
  feedbackContext: {},
  registrationModeActive: false,
  action: undefined,
  send: async (text) => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch('/api/orchestrate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: text, conversationId: get().conversationId }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      set({
        messages: [...get().messages, {
          id: crypto.randomUUID(),
          author: "user",
          content: text,
          timestamp: Date.now()
        }, {
          id: crypto.randomUUID(),
          author: "agent",
          content: data.reply,
          timestamp: Date.now()
        }],
        isLoading: false,
        conversationId: data.conversation_id
      });

      return data;
    } catch (e: any) {
      set({
        isLoading: false,
        error: e.message,
        messages: [...get().messages, {
          id: crypto.randomUUID(),
          author: "user",
          content: text,
          timestamp: Date.now(),
          isError: true
        }]
      });
    }
  },
  load: async (conversationId) => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch(`/api/chat?conversationId=${conversationId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.messages) {
        set({
          messages: data.messages.map((m: any) => ({
            ...m,
            timestamp: new Date(m.timestamp).getTime()
          })),
          isLoading: false,
          conversationId: conversationId
        });
      } else {
        set({
          messages: [],
          isLoading: false,
          conversationId: conversationId
        });
      }


    } catch (e: any) {
      set({ isLoading: false, error: e.message });
    }
  },
  startNew: () => {
    set({ messages: [], conversationId: null, recovery: {} });
  },
  addMessage: (message) => {
    set({ messages: [...get().messages, message] });
  },
  markDataCollected: (messageId) => {
    set(state => ({
      messages: state.messages.map(message =>
        message.id === messageId ? { ...message, dataCollected: true } : message
      )
    }));
  },
  setRecovery: (recovery) => {
    set({ recovery });
  },
  setFeedbackContext: (context) => {
    set({ feedbackContext: context });
  },
  setAction: (action) => {
    set({ action });
  },
  setRegistrationModeActive: (active) => {
    set({ registrationModeActive: active });
  }
}));
