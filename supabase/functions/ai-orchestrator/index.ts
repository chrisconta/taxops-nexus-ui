// @ts-nocheck
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ConversationState {
  tool?: string;
  confirmed?: boolean;
  messages: Array<{ role: string; content: string }>;
  toolChain?: string[]; // Track tool switching history
  sourceTools?: string[]; // Track which tools called this orchestrator
}

const MAX_HISTORY = 10;

export function appendMessage(
  state: ConversationState,
  message: { role: string; content: string },
  limit = MAX_HISTORY
) {
  state.messages.push(message);
  if (state.messages.length > limit) {
    state.messages = state.messages.slice(-limit);
  }
}

const conversationStates = new Map<string, ConversationState>();

export function extractJson<T = unknown>(text: string): T | null {
  try {
    const cleaned = text
      .replace(/```json/gi, "```")
      .replace(/```/g, "");
    const match = cleaned.match(/\{[\s\S]*?\}/);
    return match ? (JSON.parse(match[0]) as T) : null;
  } catch {
    return null;
  }
}

async function decryptDeepSeekKey(supabase: SupabaseClient, userId: string) {
  console.log(`Attempting to fetch DeepSeek key for user: ${userId}`);
  
  const { data, error } = await supabase
    .from('ai_credentials')
    .select('enc_key, iv, ciphertext')
    .eq('provider', 'deepseek')
    .eq('user_id', userId)
    .single();
  
  if (error) {
    console.error('Error fetching DeepSeek credentials:', error);
    throw new Error(`DeepSeek API key fetch error: ${error.message}`);
  }
  
  if (!data) {
    console.error('No DeepSeek credentials found for user');
    throw new Error('DeepSeek API key not configured');
  }

  try {
    const keyBytes = Uint8Array.from(atob(data.enc_key), c => c.charCodeAt(0));
    const iv = Uint8Array.from(atob(data.iv), c => c.charCodeAt(0));
    const ciphertext = Uint8Array.from(atob(data.ciphertext), c => c.charCodeAt(0));
    
    const cryptoKey = await crypto.subtle.importKey('raw', keyBytes, { name: 'AES-GCM' }, false, ['decrypt']);
    const decryptedBytes = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, cryptoKey, ciphertext);
    
    console.log('Successfully decrypted DeepSeek API key');
    return new TextDecoder().decode(decryptedBytes);
  } catch (decryptError) {
    console.error('Error decrypting DeepSeek key:', decryptError);
    throw new Error('Failed to decrypt DeepSeek API key');
  }
}

async function askDeepSeek(apiKey: string, messages: Array<{ role: string; content: string }>) {
  console.log('Making request to DeepSeek API with', messages.length, 'messages');
  
  const body = {
    model: 'deepseek-chat',
    temperature: 0,
    max_tokens: 256,
    messages,
  };
  
  const res = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });
  
  if (!res.ok) {
    const text = await res.text();
    console.error('DeepSeek API error:', res.status, text);
    throw new Error(`DeepSeek API error: ${res.status} ${text}`);
  }
  
  const data = await res.json();
  console.log('DeepSeek API response received successfully');
  return data.choices[0].message.content.trim();
}

async function ensureConversation(supabase: SupabaseClient, conversationId: string, userId: string) {
  console.log('Ensuring conversation exists:', conversationId);
  
  // Check if conversation exists
  const { data: existing } = await supabase
    .from('ai_conversations')
    .select('id')
    .eq('id', conversationId)
    .single();
  
  if (!existing) {
    console.log('Creating new conversation:', conversationId);
    const { error } = await supabase
      .from('ai_conversations')
      .insert({
        id: conversationId,
        user_id: userId,
        title: 'AI Chat Session'
      });
    
    if (error) {
      console.error('Error creating conversation:', error);
    }
  }
}

async function saveMessage(
  supabase: SupabaseClient, 
  conversationId: string, 
  role: string, 
  content: string,
  apiLogs?: any
) {
  console.log('Saving message to conversation:', conversationId);
  
  const { error } = await supabase
    .from('ai_messages')
    .insert({
      conversation_id: conversationId,
      role,
      content,
      api_logs: apiLogs || {}
    });
  
  if (error) {
    console.error('Error saving message:', error);
  } else {
    console.log('Message saved successfully');
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('AI Orchestrator function called');
    console.log('Request method:', req.method);
    console.log('Request headers:', Object.fromEntries(req.headers.entries()));
    
    // Validate environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    
    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('Missing required environment variables:', { 
        hasUrl: !!supabaseUrl, 
        hasAnonKey: !!supabaseAnonKey 
      });
      throw new Error('Missing required environment variables');
    }

    // Get request body with better error handling
    let requestData;
    try {
      requestData = await req.json();
      console.log('Successfully parsed request body:', { 
        hasMessage: !!requestData?.message, 
        hasConversationId: !!requestData?.conversation_id,
        messageLength: requestData?.message?.length || 0,
        hasSourceTool: !!requestData?.source_tool,
        fullBody: requestData
      });
    } catch (jsonError) {
      console.error('JSON parse error:', jsonError);
      console.error('Unable to parse request body as JSON');
      return new Response(JSON.stringify({ 
        error: 'Invalid JSON in request body',
        details: jsonError.message
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!requestData) {
      console.error('Request data is null or undefined');
      return new Response(JSON.stringify({ error: 'No request data received' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { message, conversation_id, source_tool } = requestData;

    if (!conversation_id) {
      console.error('Missing conversation_id in request');
      return new Response(JSON.stringify({ error: 'conversation_id required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!message) {
      console.error('Missing message in request');
      return new Response(JSON.stringify({ error: 'message required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('Missing Authorization header');
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Authorization header present, creating authenticated Supabase client');
    
    // Create authenticated Supabase client with JWT token
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    });

    // Extract JWT token from Authorization header
    const jwt = authHeader.replace('Bearer ', '');
    console.log('Extracted JWT token, verifying user authentication');

    // Get user from JWT token
    const { data: userData, error: userError } = await supabase.auth.getUser(jwt);
    
    if (userError) {
      console.error('User authentication error:', userError);
      return new Response(JSON.stringify({ 
        error: 'Invalid authorization token', 
        details: userError.message 
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!userData.user) {
      console.error('No user found in JWT token');
      return new Response(JSON.stringify({ error: 'No user found in token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userId = userData.user.id;
    console.log('User authenticated successfully:', userId);

    // Ensure conversation exists and save user message
    await ensureConversation(supabase, conversation_id, userId);
    await saveMessage(supabase, conversation_id, 'user', message);

    // Get or initialize conversation state
    const state = conversationStates.get(conversation_id) || { messages: [], toolChain: [], sourceTools: [] };
    
    // Track tool switching if this came from another tool
    if (source_tool) {
      console.log('Request from tool:', source_tool);
      if (!state.sourceTools) state.sourceTools = [];
      if (!state.sourceTools.includes(source_tool)) {
        state.sourceTools.push(source_tool);
      }
      // Reset tool selection to allow fresh routing from tool-to-tool calls
      state.tool = undefined;
      state.confirmed = false;
    }
    
    appendMessage(state, { role: 'user', content: message });
    console.log('Conversation state updated, total messages:', state.messages.length);

    let reply = '';
    let intent = state.tool || '';
    let type: 'conversational' | 'actionable' = 'conversational';
    let params: Record<string, any> = {};
    let apiLogs: any = {};

    if (!state.tool) {
      console.log('No tool selected, determining intent');
      
      // Enhanced instruction for tool-to-tool communication awareness
      const toolContext = source_tool ? ` (Note: This request came from the ${source_tool} tool, so the user may be switching context)` : '';
      const instruction =
        'You are helping an AI orchestrator decide which tool to use based on the user\'s request. ' +
        'Available tools: register_client - Register a new client (needs name, email, ein); ' +
        'create_connection - Create a connection for a client (needs clientId, connectionType, credentials); ' +
        'build_dashboard - Build a dashboard for a client (needs clientId, metrics, timeframe); ' +
        'general_chat - Handle general conversations and questions that don\'t fit other tools. ' +
        toolContext +
        'Respond in JSON as {"tool": "<tool>", "reply": "<message>"}.';

      try {
        // Get DeepSeek API key for tool selection with authenticated client
        console.log('Fetching DeepSeek API key with authenticated client');
        const apiKey = await decryptDeepSeekKey(supabase, userId);
        console.log('Successfully retrieved DeepSeek API key');
        
        const requestStart = Date.now();
        const requestBody = {
          model: 'deepseek-chat',
          temperature: 0,
          max_tokens: 256,
          messages: [
            { role: 'system', content: instruction },
            ...state.messages
          ]
        };
        
        const dsResponse = await askDeepSeek(apiKey, [
          { role: 'system', content: instruction },
          ...state.messages
        ]);
        
        const requestEnd = Date.now();
        apiLogs = {
          request: {
            timestamp: new Date(requestStart).toISOString(),
            model: 'deepseek-chat',
            messages: requestBody.messages,
            temperature: 0,
            max_tokens: 256
          },
          response: {
            timestamp: new Date(requestEnd).toISOString(),
            content: dsResponse,
            execution_time_ms: requestEnd - requestStart
          }
        };

        const parsed = extractJson<{ tool?: string; reply?: string }>(dsResponse);
        if (parsed) {
          state.tool = parsed.tool;
          intent = state.tool || '';
          reply = parsed.reply || '';
          state.confirmed = false;
          
          // Track tool chain
          if (!state.toolChain) state.toolChain = [];
          if (state.tool && !state.toolChain.includes(state.tool)) {
            state.toolChain.push(state.tool);
          }
          
          conversationStates.set(conversation_id, state);
          console.log('Tool selected:', intent, '| Tool chain:', state.toolChain);
        } else {
          reply = dsResponse;
          conversationStates.set(conversation_id, state);
          console.log('No tool selected, providing conversational response');
        }
      } catch (deepseekError) {
        console.error('DeepSeek API call failed:', deepseekError);
        apiLogs = {
          error: {
            timestamp: new Date().toISOString(),
            message: deepseekError.message,
            type: 'deepseek_api_error'
          }
        };
        throw deepseekError;
      }
    } else if (!state.confirmed) {
      console.log('Tool selected but not confirmed, checking confirmation');
      
      const instruction =
        `You are helping an AI orchestrator with the tool "${state.tool}" already selected. ` +
        'Determine if the user\'s message confirms they want to proceed with this tool. ' +
        'Respond in JSON as {"confirmed": true|false, "reply": "<message>"}.';

      try {
        // Get DeepSeek API key for confirmation check with authenticated client
        const apiKey = await decryptDeepSeekKey(supabase, userId);
        
        const requestStart = Date.now();
        const requestBody = {
          model: 'deepseek-chat',
          temperature: 0,
          max_tokens: 256,
          messages: [
            { role: 'system', content: instruction },
            ...state.messages
          ]
        };
        
        const dsResponse = await askDeepSeek(apiKey, [
          { role: 'system', content: instruction },
          ...state.messages
        ]);
        
        const requestEnd = Date.now();
        apiLogs = {
          request: {
            timestamp: new Date(requestStart).toISOString(),
            model: 'deepseek-chat',
            messages: requestBody.messages,
            temperature: 0,
            max_tokens: 256
          },
          response: {
            timestamp: new Date(requestEnd).toISOString(),
            content: dsResponse,
            execution_time_ms: requestEnd - requestStart
          }
        };

        const parsed = extractJson<{ confirmed?: boolean; reply?: string }>(dsResponse);
        if (parsed) {
          reply = parsed.reply || '';
          intent = state.tool || '';
          if (parsed.confirmed === true) {
            type = 'actionable';
            state.confirmed = true;
            
            // For general_chat, prepare parameters with conversation context
            if (state.tool === 'general_chat') {
              params = {
                message: message,
                conversation_id: conversation_id,
                source_tool: source_tool || null,
                tool_chain: state.toolChain || []
              };
            }
            
            conversationStates.delete(conversation_id);
            console.log('Tool confirmed, ready for action');
          } else {
            conversationStates.set(conversation_id, state);
            console.log('Tool not confirmed, continuing conversation');
          }
        } else {
          reply = dsResponse;
          intent = state.tool || '';
          conversationStates.set(conversation_id, state);
        }
      } catch (deepseekError) {
        console.error('DeepSeek API call failed:', deepseekError);
        apiLogs = {
          error: {
            timestamp: new Date().toISOString(),
            message: deepseekError.message,
            type: 'deepseek_api_error'
          }
        };
        throw deepseekError;
      }
    }

    // Save assistant message with API logs
    await saveMessage(supabase, conversation_id, 'assistant', reply, apiLogs);

    const response = { 
      intent, 
      params, 
      type, 
      reply, 
      tool_chain: state.toolChain || [],
      source_tool: source_tool || null 
    };
    console.log('Sending response:', { intent, type, replyLength: reply.length, hasParams: Object.keys(params).length > 0, toolChain: state.toolChain });

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    console.error('AI Orchestrator error:', err);
    console.error('Error stack:', err.stack);
    return new Response(JSON.stringify({ 
      error: err.message || 'Invalid request',
      stack: err.stack 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
