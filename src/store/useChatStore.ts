
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
  addMessage: (message: ChatMessage) => void;
  updateLastMessage: (content: string) => void;
  removeTyping: () => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  isLoading: false,
  
  startNew: () => {
    set({ currentConvId: undefined, messages: [] });
  },
  
  addMessage: (message: ChatMessage) => {
    set(state => ({ messages: [...state.messages, message] }));
  },
  
  updateLastMessage: (content: string) => {
    set(state => {
      const messages = [...state.messages];
      const lastMsg = messages[messages.length - 1];
      if (lastMsg && lastMsg.role === 'assistant') {
        lastMsg.content += content;
      }
      return { messages };
    });
  },
  
  removeTyping: () => {
    set(state => ({
      messages: state.messages.filter(m => !m.typing)
    }));
  },
  
  async send(text: string) {
    const currentMessages = get().messages;
    
    // Add user message immediately
    const userMsgId = crypto.randomUUID();
    const userMessage: ChatMessage = { id: userMsgId, role: 'user', content: text };
    
    // Add typing indicator
    const typingId = crypto.randomUUID();
    const typingMessage: ChatMessage = { id: typingId, role: 'assistant', content: '', typing: true };
    
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
              if (parsed.content) {
                if (!hasStarted) {
                  // Remove typing indicator and add real assistant message
                  get().removeTyping();
                  get().addMessage({
                    id: crypto.randomUUID(),
                    role: 'assistant',
                    content: parsed.content
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
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.'
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
