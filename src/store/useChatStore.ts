
import { create } from 'zustand';
import { supabase } from '@/integrations/supabase/client';

export interface Message {
  id: string;
  author: "user" | "agent";
  content: string | { text: string; data?: any; downloadButton?: { url: string; filename: string; label: string; } };
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
    missing: Array<{ field: string; reason: string; hint: string; }>;
    invalid: Array<{ field: string; reason: string; hint: string; }>;
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
  currentTool?: any;
  debugInfo?: any;
  toolChain?: any;
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
  currentAction?: string;
  currentTarget?: string;
  shouldShowBanner?: () => boolean;
  clearAction?: () => void;
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
  currentAction: undefined,
  currentTarget: undefined,
  shouldShowBanner: () => false,
  clearAction: () => set({ currentAction: undefined, currentTarget: undefined }),
  send: async (text) => {
    set({ isLoading: true, error: null });
    try {
      // Get current session for authentication
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('User not authenticated');
      }

      // Generate conversation ID if none exists
      let currentConversationId = get().conversationId;
      if (!currentConversationId) {
        currentConversationId = crypto.randomUUID();
      }

      // Call the ai-orchestrator edge function
      const { data, error } = await supabase.functions.invoke('ai-orchestrator', {
        body: { 
          message: text, 
          conversation_id: currentConversationId 
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        throw new Error(`Orchestrator error: ${error.message}`);
      }

      // Add user message
      const userMessage: Message = {
        id: crypto.randomUUID(),
        author: "user",
        content: text,
        timestamp: Date.now()
      };

      // Add agent response
      const agentMessage: Message = {
        id: crypto.randomUUID(),
        author: "agent",
        content: data.reply || 'I understand. How can I help you?',
        timestamp: Date.now(),
        debugInfo: data.debug_info,
        toolChain: data.tool_chain,
        currentTool: data.current_tool
      };

      set({
        messages: [...get().messages, userMessage, agentMessage],
        isLoading: false,
        conversationId: currentConversationId
      });

      return data;
    } catch (e: any) {
      console.error('Send message error:', e);
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
      // Get current session for authentication
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('User not authenticated');
      }

      // Call the get-conversation-messages edge function
      const { data, error } = await supabase.functions.invoke('get-conversation-messages', {
        body: { conversation_id: conversationId },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        throw new Error(`Load conversation error: ${error.message}`);
      }

      if (data.messages && Array.isArray(data.messages)) {
        const mappedMessages = data.messages.map((m: any) => ({
          id: m.id || crypto.randomUUID(),
          author: m.role === 'user' ? 'user' : 'agent',
          content: m.content,
          timestamp: new Date(m.created_at).getTime()
        }));

        set({
          messages: mappedMessages,
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
      console.error('Load conversation error:', e);
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
