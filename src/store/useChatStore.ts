import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase, SUPABASE_URL } from '@/integrations/supabase/client';

export interface Message {
  id: string;
  author: "user" | "agent";
  content: string | { text: string; downloadButton?: { label: string; url: string; filename: string } };
  timestamp: number;
  typing?: boolean;
  toolCall?: { name: string; params: Record<string, any> };
  requiresData?: boolean;
  dataCollected?: boolean;
  missingParams?: string[];
  validationErrors?: {
    missing: Array<{ field: string; reason: string; hint: string }>;
    invalid: Array<{ field: string; reason: string; hint: string }>;
  };
  actionType?: string;
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
  currentConvId?: string;
  messages: Message[];
  isLoading: boolean;
  recovery: RecoveryState;
  feedbackContext: FeedbackContext;
  currentAction?: 'read'|'validate'|'edit'|'execute'|'error';
  currentTarget?: string;
  registrationModeActive: boolean;
  addMessage: (message: Message) => void;
  clearMessages: () => void;
  send: (text: string) => Promise<{ intent: string; params: Record<string, any>; type: string; reply: string } | null>;
  load: (convId: string) => Promise<void>;
  startNew: () => void;
  updateLastMessage: (content: string) => void;
  removeTyping: () => void;
  markDataCollected: (messageId: string) => void;
  setRecovery: (recovery: RecoveryState) => void;
  setFeedbackContext: (ctx: FeedbackContext) => void;
  setAction: (action?: ChatState['currentAction'], target?: string) => void;
  clearAction: () => void;
  shouldShowBanner: () => boolean;
  setRegistrationModeActive: (active: boolean) => void;
}

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      messages: [],
      isLoading: false,
      recovery: {},
      feedbackContext: {},
      currentAction: undefined,
      currentTarget: undefined,
      registrationModeActive: false,
      
      addMessage: (message: Message) => {
        set(state => ({ messages: [...state.messages, message] }));
      },
      
      clearMessages: () => set({ messages: [] }),
      
      startNew: () => {
        set({ currentConvId: undefined, messages: [] });
      },
      
      updateLastMessage: (content: string) => {
        set(state => {
          const messages = [...state.messages];
          const lastMsg = messages[messages.length - 1];
          if (lastMsg && lastMsg.author === 'agent') {
            // Handle string content updates
            if (typeof lastMsg.content === 'string') {
              lastMsg.content += content;
            } else {
              // If it's structured content, append to the text part
              lastMsg.content.text += content;
            }
          }
          return { messages };
        });
      },
      
      removeTyping: () => {
        set(state => ({
          messages: state.messages.filter(m => !m.typing)
        }));
      },
      
      markDataCollected: (messageId: string) => {
        set(state => ({
          messages: state.messages.map(m => 
            m.id === messageId ? { ...m, dataCollected: true } : m
          )
        }));
      },

      setRecovery: (recovery: RecoveryState) => {
        set({ recovery });
      },

      setFeedbackContext: (feedbackContext: FeedbackContext) => {
        set({ feedbackContext });
      },
      
      setAction: (action, target) => {
        set({ currentAction: action, currentTarget: target });
      },
      
      clearAction: () => {
        set({ currentAction: undefined, currentTarget: undefined });
      },
      
      shouldShowBanner: () => {
        const state = get();
        return !state.registrationModeActive && !state.isLoading;
      },
      
      setRegistrationModeActive: (active: boolean) => {
        set({ registrationModeActive: active });
      },
      
      
      async send(text: string) {
        const state = get();
        const currentMessages = state.messages;

        // Ensure we have a conversation id for orchestrator state tracking
        let convId = state.currentConvId;
        if (!convId) {
          convId = crypto.randomUUID();
          set({ currentConvId: convId });
        }

        const userMsgId = crypto.randomUUID();
        const userMessage: Message = {
          id: userMsgId,
          author: 'user',
          content: text,
          timestamp: Date.now()
        };

        const typingId = crypto.randomUUID();
        const typingMessage: Message = {
          id: typingId,
          author: 'agent',
          content: '',
          timestamp: Date.now(),
          typing: true
        };

        set({
          messages: [...currentMessages, userMessage, typingMessage],
          isLoading: true
        });

        try {
          console.log('Getting user session for AI orchestrator call');
          const { data: { session }, error: sessionError } = await supabase.auth.getSession();
          
          if (sessionError) {
            console.error('Session error:', sessionError);
            throw new Error(`Session error: ${sessionError.message}`);
          }
          
          if (!session) {
            console.error('No active session found');
            throw new Error('Not authenticated - please log in');
          }

          console.log('Session found, calling ai-orchestrator function');
          const { data, error } = await supabase.functions.invoke('ai-orchestrator', {
            body: { message: text, conversation_id: convId },
            headers: { 
              Authorization: `Bearer ${session.access_token}`,
              'Content-Type': 'application/json'
            }
          });

          if (error) {
            console.error('Function invocation error:', error);
            throw new Error(`Function error: ${error.message}`);
          }
          
          if (!data) {
            console.error('No data returned from function');
            throw new Error('No response from AI service');
          }

          console.log('AI orchestrator response:', data);
          const result = data as { intent: string; params: Record<string, any>; type: string; reply: string };

          get().removeTyping();
          get().addMessage({
            id: crypto.randomUUID(),
            author: 'agent',
            content: result.reply,
            timestamp: Date.now()
          });
          set({ isLoading: false });
          return result;
        } catch (error) {
          console.error('Chat error:', error);
          get().removeTyping();
          
          // Provide more specific error messages
          let errorMessage = 'Sorry, I encountered an error. Please try again.';
          if (error instanceof Error) {
            if (error.message.includes('Not authenticated')) {
              errorMessage = 'Please log in to continue the conversation.';
            } else if (error.message.includes('DeepSeek API key')) {
              errorMessage = 'AI service configuration error. Please check your settings.';
            } else if (error.message.includes('Function error')) {
              errorMessage = `Service error: ${error.message}`;
            }
          }
          
          get().addMessage({
            id: crypto.randomUUID(),
            author: 'agent',
            content: errorMessage,
            timestamp: Date.now()
          });
          set({ isLoading: false });
          throw error;
        }
      },

      async load(convId: string) {
        set({ isLoading: true });
        
        try {
          const { data, error } = await supabase
            .from('ai_messages')
            .select('*')
            .eq('conversation_id', convId)
            .order('created_at');

          if (error) throw error;

          const messages = data.map(m => ({
            id: m.id,
            author: m.role === 'user' ? 'user' as const : 'agent' as const,
            content: m.content,
            timestamp: new Date(m.created_at).getTime()
          }));

          set({ 
            currentConvId: convId, 
            messages,
            isLoading: false 
          });
        } catch (error) {
          console.error('Failed to load messages:', error);
          set({ isLoading: false });
          throw error;
        }
      }
    }),
    { 
      name: "taxops-chat-storage",
      partialize: (state) => ({ messages: state.messages })
    }
  )
);
