import { create } from 'zustand';
import { supabase } from '@/integrations/supabase/client';

interface ChatMessage { 
  id: string; 
  role: 'user' | 'assistant'; 
  content: string;
  typing?: boolean;
}

interface ChatState {
  currentConvId?: string;
  messages: ChatMessage[];
  isLoading: boolean;
  send: (text: string) => Promise<void>;
  load: (convId: string) => Promise<void>;
  startNew: () => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  isLoading: false,
  
  startNew: () => {
    set({ currentConvId: undefined, messages: [] });
  },
  
  async send(text: string) {
    const currentMessages = get().messages;
    
    // Add user message optimistically
    const userMsgId = crypto.randomUUID();
    const userMessage: ChatMessage = { id: userMsgId, role: 'user', content: text };
    
    // Add typing indicator
    const typingId = crypto.randomUUID();
    const typingMessage: ChatMessage = { id: typingId, role: 'assistant', content: '…', typing: true };
    
    set({ 
      messages: [...currentMessages, userMessage, typingMessage],
      isLoading: true 
    });

    try {
      const { data, error } = await supabase.functions.invoke('ai-chat', {
        body: { 
          conversation_id: get().currentConvId, 
          message: text 
        }
      });

      if (error) throw error;

      // Remove typing indicator and add assistant response
      const finalMessages = get().messages
        .filter(m => m.id !== typingId)
        .concat({ 
          id: crypto.randomUUID(), 
          role: 'assistant', 
          content: data.assistant 
        });

      set({
        currentConvId: data.conversation_id,
        messages: finalMessages,
        isLoading: false
      });

    } catch (error) {
      console.error('Chat error:', error);
      
      // Remove typing indicator and show error
      const errorMessages = get().messages
        .filter(m => m.id !== typingId)
        .concat({ 
          id: crypto.randomUUID(), 
          role: 'assistant', 
          content: 'Sorry, I encountered an error. Please try again.' 
        });
      
      set({ messages: errorMessages, isLoading: false });
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
        role: m.role as 'user' | 'assistant',
        content: m.content
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
}));