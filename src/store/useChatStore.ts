import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '@/integrations/supabase/client';
import type { PlanStep } from '@/agent/planner/schema';

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
}

interface RecoveryState {
  pendingStep?: PlanStep;
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
  send: (text: string) => Promise<void>;
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
      
      
      async send(text: string) {
        const currentMessages = get().messages;
        
        // Add user message immediately
        const userMsgId = crypto.randomUUID();
        const userMessage: Message = { 
          id: userMsgId, 
          author: 'user', 
          content: text,
          timestamp: Date.now()
        };
        
        // Add typing indicator
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
          const { data: { session } } = await supabase.auth.getSession();
          if (!session) throw new Error('Not authenticated');

          // Use the function invoke method to call the edge function
          const response = await fetch('https://zitderdjvqtadtwgatmm.supabase.co/functions/v1/ai-orchestrator', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              conversation_id: get().currentConvId,
              message: text
            })
          });

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          // Handle streaming response
          const reader = response.body?.getReader();
          if (!reader) throw new Error('No response body');

          let hasStarted = false;

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = new TextDecoder().decode(value);
            const lines = chunk.split('\n').filter(line => line.trim() !== '');

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6);
                if (data === '[DONE]') {
                  set({ isLoading: false });
                  return;
                }

                try {
                  const parsed = JSON.parse(data);
                  if (parsed.type === 'missing_data') {
                    // Handle missing data request
                    if (!hasStarted) {
                      get().removeTyping();
                      get().addMessage({
                        id: crypto.randomUUID(),
                        author: 'agent',
                        content: parsed.message,
                        timestamp: Date.now(),
                        requiresData: true,
                        missingParams: parsed.missingParams || ['clientId', 'startDate', 'endDate']
                      });
                      hasStarted = true;
                    }
                  } else if (parsed.type === 'assistant_message') {
                    // Handle structured message with download button
                    if (!hasStarted) {
                      get().removeTyping();
                      get().addMessage({
                        id: crypto.randomUUID(),
                        author: 'agent',
                        content: parsed.content,
                        timestamp: Date.now()
                      });
                      hasStarted = true;
                    } else {
                      // For structured messages, replace the current message
                      const messages = get().messages;
                      const lastMsg = messages[messages.length - 1];
                      if (lastMsg && lastMsg.author === 'agent') {
                        lastMsg.content = parsed.content;
                      }
                    }
                  } else if (parsed.content) {
                    if (!hasStarted) {
                      // Remove typing indicator and add real assistant message
                      get().removeTyping();
                      get().addMessage({
                        id: crypto.randomUUID(),
                        author: 'agent',
                        content: parsed.content,
                        timestamp: Date.now()
                      });
                      hasStarted = true;
                    } else {
                      // Update existing message
                      get().updateLastMessage(parsed.content);
                    }
                  }
                } catch (e) {
                  console.error('Failed to parse SSE data:', e);
                }
              }
            }
          }

        } catch (error) {
          console.error('Chat error:', error);
          get().removeTyping();
          get().addMessage({
            id: crypto.randomUUID(),
            author: 'agent',
            content: 'Sorry, I encountered an error. Please try again.',
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