import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase, SUPABASE_URL } from '@/integrations/supabase/client';
import chatLogger from '@/hooks/useChatLogger';

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
        
        // Log message with chat logger
        chatLogger.logMessage(
          message.author, 
          typeof message.content === 'string' ? message.content : message.content.text,
          message.id
        );
      },
      
      clearMessages: () => set({ messages: [] }),
      
      startNew: () => {
        const state = get();
        if (state.currentConvId) {
          chatLogger.endSession('completed');
        }
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
        if (action) {
          chatLogger.logProcess(action, 'started', `Action ${action} started on ${target || 'unknown target'}`);
        }
      },
      
      clearAction: () => {
        const state = get();
        if (state.currentAction) {
          chatLogger.logProcess(state.currentAction, 'completed', `Action ${state.currentAction} completed`);
        }
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
          
          // Start new chat logger session
          chatLogger.startSession(convId, `Chat Session - ${new Date().toLocaleString()}`);
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

        // Log user message
        chatLogger.logMessage('user', text, userMsgId);

        try {
          console.log('Getting user session for AI orchestrator call');
          const { data: { session }, error: sessionError } = await supabase.auth.getSession();
          
          if (sessionError) {
            console.error('Session error:', sessionError);
            chatLogger.logError(new Error(`Session error: ${sessionError.message}`), 'Authentication');
            throw new Error(`Session error: ${sessionError.message}`);
          }
          
          if (!session) {
            console.error('No active session found');
            chatLogger.logError(new Error('Not authenticated - please log in'), 'Authentication');
            throw new Error('Not authenticated - please log in');
          }

          console.log('Session found, preparing request for ai-orchestrator function');
          
          // Prepare request body - let Supabase client handle serialization
          const requestBody = { 
            message: text, 
            conversation_id: convId 
          };
          
          console.log('Request body prepared:', { 
            hasMessage: !!requestBody.message, 
            hasConversationId: !!requestBody.conversation_id,
            messageLength: requestBody.message.length 
          });

          console.log('Calling ai-orchestrator function');
          chatLogger.logEdgeFunction('ai-orchestrator', 'started', requestBody);
          
          const { data, error } = await supabase.functions.invoke('ai-orchestrator', {
            body: requestBody
          });

          if (error) {
            console.error('Function invocation error:', error);
            console.error('Error details:', {
              message: error.message,
              context: error.context,
              details: error.details
            });
            chatLogger.logEdgeFunction('ai-orchestrator', 'failed', requestBody, null, error);
            throw new Error(`Function error: ${error.message}`);
          }
          
          if (!data) {
            console.error('No data returned from function');
            chatLogger.logEdgeFunction('ai-orchestrator', 'failed', requestBody, null, 'No response data');
            throw new Error('No response from AI service');
          }

          console.log('AI orchestrator response received:', data);
          chatLogger.logEdgeFunction('ai-orchestrator', 'completed', requestBody, data);
          const result = data as { intent: string; params: Record<string, any>; type: string; reply: string };

          // Handle actionable general_chat by calling ai-chat function
          if (result.type === 'actionable' && result.intent === 'general_chat') {
            console.log('Handling general_chat action, calling ai-chat function');
            chatLogger.logProcess('general_chat', 'started', 'Calling ai-chat function for general conversation');
            
            try {
              const chatRequestBody = {
                message: text,
                conversation_id: convId
              };
              
              chatLogger.logEdgeFunction('ai-chat', 'started', chatRequestBody);
              
              const { data: chatData, error: chatError } = await supabase.functions.invoke('ai-chat', {
                body: chatRequestBody
              });

              if (chatError) {
                console.error('AI Chat function error:', chatError);
                chatLogger.logEdgeFunction('ai-chat', 'failed', chatRequestBody, null, chatError);
                throw new Error(`Chat error: ${chatError.message}`);
              }

              if (!chatData) {
                chatLogger.logEdgeFunction('ai-chat', 'failed', chatRequestBody, null, 'No response data');
                throw new Error('No response from chat service');
              }

              console.log('AI chat response received:', chatData);
              chatLogger.logEdgeFunction('ai-chat', 'completed', chatRequestBody, chatData);
              chatLogger.logProcess('general_chat', 'completed', 'General chat response received successfully');
              
              get().removeTyping();
              const agentMessage = {
                id: crypto.randomUUID(),
                author: 'agent' as const,
                content: chatData.assistant || 'No response received',
                timestamp: Date.now()
              };
              get().addMessage(agentMessage);
              
            } catch (chatError) {
              console.error('Error calling ai-chat:', chatError);
              chatLogger.logError(chatError instanceof Error ? chatError : new Error(String(chatError)), 'AI Chat Function');
              chatLogger.logProcess('general_chat', 'failed', 'Failed to get chat response');
              
              get().removeTyping();
              get().addMessage({
                id: crypto.randomUUID(),
                author: 'agent',
                content: 'Sorry, I encountered an error processing your request. Please try again.',
                timestamp: Date.now()
              });
            }
          } else {
            // Handle normal orchestrator responses
            get().removeTyping();
            const agentMessage = {
              id: crypto.randomUUID(),
              author: 'agent' as const,
              content: result.reply,
              timestamp: Date.now()
            };
            get().addMessage(agentMessage);
          }
          
          set({ isLoading: false });
          return result;
        } catch (error) {
          console.error('Chat error:', error);
          chatLogger.logError(error instanceof Error ? error : new Error(String(error)), 'Chat Send Function');
          
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
            } else if (error.message.includes('JSON')) {
              errorMessage = 'Request formatting error. Please try again.';
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
        chatLogger.logProcess('load_conversation', 'started', `Loading conversation: ${convId}`);
        
        try {
          const { data, error } = await supabase
            .from('ai_messages')
            .select('*')
            .eq('conversation_id', convId)
            .order('created_at');

          if (error) {
            chatLogger.logError(error, 'Load Conversation');
            throw error;
          }

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
          
          chatLogger.logProcess('load_conversation', 'completed', `Loaded ${messages.length} messages`);
          chatLogger.startSession(convId, `Loaded Session - ${new Date().toLocaleString()}`);
        } catch (error) {
          console.error('Failed to load messages:', error);
          chatLogger.logError(error instanceof Error ? error : new Error(String(error)), 'Load Conversation');
          chatLogger.logProcess('load_conversation', 'failed', 'Failed to load conversation messages');
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
