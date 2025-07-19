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
  toolChain?: string[];
  sourceTools?: string[];
  pendingToolSwitch?: {
    from: string;
    to: string;
    reason: string;
  };
  confirmationAttempts?: number;
}

const MAX_HISTORY = 15;
const MAX_CONFIRMATION_ATTEMPTS = 3;

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

// Tool-specific confirmation messages
const toolConfirmationMessages = {
  'register_client': "Do you want me to help you register a client? I'll collect their business information like name, email, and EIN to get them set up in the system.",
  'create_connection': "Should I help you create a connection? I'll guide you through connecting to external services like banks or financial institutions.",
  'build_dashboard': "Do you want me to build a dashboard for you? I'll help you create data visualizations and reports based on your requirements.",
  'ai-chat': "I'm here to help with general questions and conversations. What would you like to discuss?"
};

// BULLETPROOF CONFIRMATION CHECK - uses dedicated confirmation prompt
async function checkConfirmationWithDeepSeek(
  apiKey: string, 
  conversationHistory: Array<{ role: string; content: string }>, 
  toolName: string,
  latestMessage: string
): Promise<{ isConfirmed: boolean; reply: string }> {
  console.log(`[🧠 CONFIRMATION CHECK] Starting confirmation check for tool: ${toolName}`);
  console.log(`[🧠 CONFIRMATION CHECK] Latest message: "${latestMessage}"`);
  
  // Enhanced fallback detection with better patterns
  const strongConfirmationWords = ['yes', 'yeah', 'yep', 'sure', 'okay', 'ok', 'proceed', 'go ahead', 'do it', 'confirm', 'let\'s do it', 'sounds good'];
  const normalizedMessage = latestMessage.toLowerCase().trim();
  
  const hasStrongConfirmation = strongConfirmationWords.some(word => 
    normalizedMessage.includes(word)
  );
  
  console.log(`[🧠 CONFIRMATION CHECK] Strong confirmation detected via fallback: ${hasStrongConfirmation}`);
  
  // Strong confirmation fallback - if user says yes, proceed
  if (hasStrongConfirmation) {
    console.log('[🧠 CONFIRMATION CHECK] Strong confirmation via fallback logic');
    return { 
      isConfirmed: true, 
      reply: `Great! I'll help you with ${toolName.replace('_', ' ')}. Let me get started.` 
    };
  }
  
  // DEDICATED CONFIRMATION PROMPT (not tool selection!)
  const confirmationInstruction = `You are the confirmation handler for an AI system. 

The user previously selected the tool "${toolName}".

Based on the conversation history, is the user confirming they want to proceed with this specific tool?

Look for confirmation words like: yes, okay, sure, go ahead, proceed, do it.

Conversation History:
${conversationHistory.slice(-5).map(m => `${m.role}: ${m.content}`).join('\n')}

User's latest message: "${latestMessage}"

Respond with ONLY "YES" if they want to proceed with ${toolName}, or "NO" if they don't want to proceed.

Do not provide explanations, just YES or NO.`;

  console.log(`[🧠 CONFIRMATION PROMPT SENT TO DEEPSEEK]\n${confirmationInstruction}`);

  try {
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        temperature: 0,
        max_tokens: 10,
        messages: [
          { role: 'system', content: confirmationInstruction },
          { role: 'user', content: latestMessage }
        ]
      })
    });

    if (!response.ok) {
      throw new Error(`DeepSeek API error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content.trim().toUpperCase();
    
    console.log(`[🧠 DEEPSEEK CONFIRMATION RESPONSE] "${aiResponse}"`);
    
    const isConfirmed = aiResponse.startsWith('YES') || aiResponse === 'YES';
    const reply = isConfirmed 
      ? `Perfect! I'll help you with ${toolName.replace('_', ' ')}. Let me get started.`
      : toolConfirmationMessages[toolName as keyof typeof toolConfirmationMessages] || 'Could you please confirm if you want to proceed?';
    
    console.log(`[🧠 CONFIRMATION CHECK] AI confirmation result: ${isConfirmed ? 'CONFIRMED' : 'NOT_CONFIRMED'}`);
    return { isConfirmed, reply };
  } catch (error) {
    console.error('[🧠 CONFIRMATION CHECK] Error in AI confirmation check:', error);
    
    // Enhanced fallback logic with better pattern matching
    const fallbackConfirmation = hasStrongConfirmation || 
      /^(yes|yeah|yep|sure|okay|ok)\b/i.test(latestMessage) ||
      /what.*need|how.*start|tell me|let's do|sounds good/i.test(latestMessage);
    
    console.log(`[🧠 CONFIRMATION CHECK] Fallback confirmation result: ${fallbackConfirmation}`);
    return { 
      isConfirmed: fallbackConfirmation, 
      reply: fallbackConfirmation ? 'I understand you want to proceed.' : 'Could you please confirm if you want to proceed?' 
    };
  }
}

// TOOL EXTRACTION - only for tool selection phase
export function extractToolFromResponse(text: string): { tool?: string; reply?: string } {
  console.log('[🧠 TOOL EXTRACTION] Extracting tool from DeepSeek response:', text);
  
  const trimmedText = text.trim();
  
  // Define user-friendly messages for each tool
  const toolMessages = {
    'register_client': toolConfirmationMessages.register_client,
    'create_connection': toolConfirmationMessages.create_connection,
    'build_dashboard': toolConfirmationMessages.build_dashboard,
    'ai-chat': toolConfirmationMessages['ai-chat']
  };
  
  // Check if response is just a tool name
  const exactToolMatches = {
    'register_client': /^register[_\s]?client$/i,
    'create_connection': /^create[_\s]?connection$/i,
    'build_dashboard': /^build[_\s]?dashboard$/i,
    'ai-chat': /^ai[_\s]?chat$/i
  };
  
  // First check for exact tool name matches
  for (const [toolName, pattern] of Object.entries(exactToolMatches)) {
    if (pattern.test(trimmedText)) {
      console.log(`[🧠 TOOL EXTRACTION] Found tool: ${toolName} via exact match`);
      return { 
        tool: toolName, 
        reply: toolMessages[toolName as keyof typeof toolMessages]
      };
    }
  }
  
  // Look for tool keywords in the response
  const toolPatterns = {
    'register_client': /(?:register[_\s]client|client[_\s]registration|register.*client)/i,
    'create_connection': /(?:create[_\s]connection|connection|connect|linking)/i,
    'build_dashboard': /(?:build[_\s]dashboard|dashboard|report|analytics)/i,
    'ai-chat': /(?:ai[_\s]chat|general|conversation|chat|question)/i
  };
  
  // Check for tool patterns and extract meaningful content
  for (const [toolName, pattern] of Object.entries(toolPatterns)) {
    if (pattern.test(text)) {
      console.log(`[🧠 TOOL EXTRACTION] Found tool: ${toolName} via pattern matching`);
      
      // Try to extract meaningful content after tool mention
      let extractedReply = text.replace(pattern, '').trim();
      
      // Clean up common prefixes/suffixes
      extractedReply = extractedReply
        .replace(/^[\s\-\(\)]*/, '')
        .replace(/[\s\-\(\)]*$/, '')
        .replace(/^(Note:|Parameters:|Proceeding with|Tool:)/i, '')
        .trim();
      
      // If we got meaningful content, use it; otherwise use confirmation message
      const reply = extractedReply && extractedReply.length > 10 
        ? extractedReply 
        : toolMessages[toolName as keyof typeof toolMessages];
      
      return { 
        tool: toolName, 
        reply: reply
      };
    }
  }
  
  // Look for tool names directly mentioned in text (fallback)
  const lowerText = text.toLowerCase();
  if (lowerText.includes('register') && (lowerText.includes('client') || lowerText.includes('company'))) {
    const reply = text.length > 20 ? text : toolMessages.register_client;
    return { tool: 'register_client', reply };
  }
  if (lowerText.includes('connection') || lowerText.includes('connect')) {
    const reply = text.length > 20 ? text : toolMessages.create_connection;
    return { tool: 'create_connection', reply };
  }
  if (lowerText.includes('dashboard') || lowerText.includes('report')) {
    const reply = text.length > 20 ? text : toolMessages.build_dashboard;
    return { tool: 'build_dashboard', reply };
  }
  
  console.log('[🧠 TOOL EXTRACTION] No specific tool identified, defaulting to ai-chat');
  const reply = trimmedText.toLowerCase() === 'ai-chat' 
    ? toolMessages['ai-chat'] 
    : text;
  return { tool: 'ai-chat', reply };
}

async function loadConversationHistory(supabase: SupabaseClient, conversationId: string): Promise<Array<{ role: string; content: string }>> {
  console.log('Loading conversation history from database for:', conversationId);
  
  try {
    const { data, error } = await supabase
      .from('ai_messages')
      .select('role, content, created_at')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .limit(MAX_HISTORY);
    
    if (error) {
      console.error('Error loading conversation history:', error);
      return [];
    }
    
    const history = (data || []).map(msg => ({
      role: msg.role === 'user' ? 'user' : 'assistant',
      content: msg.content
    }));
    
    console.log('Loaded conversation history:', history.length, 'messages');
    return history;
  } catch (error) {
    console.error('Failed to load conversation history:', error);
    return [];
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

// Debug endpoint for state inspection
async function handleDebugRequest(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const conversationId = url.searchParams.get('conversation_id');
  
  if (!conversationId) {
    return new Response(JSON.stringify({ 
      error: 'Missing conversation_id parameter',
      available_conversations: Array.from(conversationStates.keys())
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
  
  const state = conversationStates.get(conversationId);
  if (!state) {
    return new Response(JSON.stringify({ 
      error: 'No state found for conversation',
      conversation_id: conversationId,
      available_conversations: Array.from(conversationStates.keys())
    }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
  
  return new Response(JSON.stringify({
    conversation_id: conversationId,
    state: state,
    total_conversations: conversationStates.size
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Handle debug requests
  if (req.method === 'GET' && req.url.includes('/debug')) {
    return handleDebugRequest(req);
  }

  try {
    console.log('[🧠 ORCHESTRATOR] Function called');
    console.log('[🧠 ORCHESTRATOR] Request method:', req.method);
    
    // Validate environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    
    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('[🧠 ORCHESTRATOR] Missing required environment variables:', { 
        hasUrl: !!supabaseUrl, 
        hasAnonKey: !!supabaseAnonKey 
      });
      throw new Error('Missing required environment variables');
    }

    // Get request body with better error handling
    let requestData;
    try {
      requestData = await req.json();
      console.log('[🧠 ORCHESTRATOR] Request data:', { 
        hasMessage: !!requestData?.message, 
        hasConversationId: !!requestData?.conversation_id,
        messageLength: requestData?.message?.length || 0,
        hasSourceTool: !!requestData?.source_tool
      });
    } catch (jsonError) {
      console.error('[🧠 ORCHESTRATOR] JSON parse error:', jsonError);
      return new Response(JSON.stringify({ 
        error: 'Invalid JSON in request body',
        details: jsonError.message
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!requestData) {
      console.error('[🧠 ORCHESTRATOR] Request data is null or undefined');
      return new Response(JSON.stringify({ error: 'No request data received' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { message, conversation_id, source_tool } = requestData;

    if (!conversation_id) {
      console.error('[🧠 ORCHESTRATOR] Missing conversation_id in request');
      return new Response(JSON.stringify({ error: 'conversation_id required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!message) {
      console.error('[🧠 ORCHESTRATOR] Missing message in request');
      return new Response(JSON.stringify({ error: 'message required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('[🧠 ORCHESTRATOR] Missing Authorization header');
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('[🧠 ORCHESTRATOR] Creating authenticated Supabase client');
    
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
    console.log('[🧠 ORCHESTRATOR] Verifying user authentication');

    // Get user from JWT token
    const { data: userData, error: userError } = await supabase.auth.getUser(jwt);
    
    if (userError || !userData.user) {
      console.error('[🧠 ORCHESTRATOR] User authentication error:', userError);
      return new Response(JSON.stringify({ 
        error: 'Invalid authorization token', 
        details: userError?.message 
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userId = userData.user.id;
    console.log('[🧠 ORCHESTRATOR] User authenticated successfully:', userId);

    // Ensure conversation exists and save user message
    await ensureConversation(supabase, conversation_id, userId);
    await saveMessage(supabase, conversation_id, 'user', message);

    // Load conversation history from database
    const dbHistory = await loadConversationHistory(supabase, conversation_id);
    
    // Get or initialize conversation state and merge with database history
    let state = conversationStates.get(conversation_id) || { 
      messages: [], 
      toolChain: [], 
      sourceTools: [],
      confirmationAttempts: 0
    };
    
    // If we have database history and it's longer than our in-memory state, use database history
    if (dbHistory.length > state.messages.length) {
      console.log('[🧠 ORCHESTRATOR] Using database history as primary source');
      state.messages = dbHistory;
    } else if (dbHistory.length > 0) {
      // Merge database history with in-memory state, avoiding duplicates
      const mergedMessages = [...dbHistory];
      state.messages.forEach(msg => {
        if (!dbHistory.some(dbMsg => dbMsg.content === msg.content && dbMsg.role === msg.role)) {
          mergedMessages.push(msg);
        }
      });
      state.messages = mergedMessages.slice(-MAX_HISTORY);
    }
    
    // FIXED: Smart tool switching logic - only reset if actually switching to different tool
    if (source_tool && source_tool !== state.tool) {
      console.log(`[🔁 TOOL SWITCH] from ${state.tool} → ${source_tool}`);
      state.tool = source_tool;
      state.confirmed = false;
      state.confirmationAttempts = 0;
      
      if (!state.sourceTools) state.sourceTools = [];
      if (!state.sourceTools.includes(source_tool)) {
        state.sourceTools.push(source_tool);
      }
    }
    
    // Add current message to state
    appendMessage(state, { role: 'user', content: message });
    
    // ENHANCED DEBUG LOGGING FOR STATE - BEFORE CONDITIONAL LOGIC
    console.log(`[🧠 DEBUG STATE] conversation_id: ${conversation_id}`);
    console.log(`[🧠 STATE] tool: ${state.tool}`);
    console.log(`[🧠 STATE] confirmed: ${state.confirmed}`);
    console.log(`[🧠 STATE] confirmationAttempts: ${state.confirmationAttempts || 0}`);
    console.log(`[🧠 STATE] messages count: ${state.messages.length}`);
    console.log(`[🧠 STATE] toolChain: ${JSON.stringify(state.toolChain)}`);
    console.log(`[🧠 STATE] sourceTools: ${JSON.stringify(state.sourceTools)}`);

    let reply = '';
    let intent = state.tool || '';
    let type: 'conversational' | 'actionable' = 'conversational';
    let params: Record<string, any> = {};
    let apiLogs: any = {};
    let currentTool = 'ai-orchestrator';

    // BULLETPROOF CONDITIONAL LOGIC WITH EXTENSIVE LOGGING
    if (!state.tool) {
      // PATH 1: TOOL SELECTION PHASE
      console.log('[🧠 ORCHESTRATOR] Entering PATH 1: Tool Selection Phase');
      
      const toolSelectionInstruction =
        'You are helping an AI orchestrator decide which tool to use based on the user\'s conversation. ' +
        'Look at the ENTIRE conversation history to understand context and extract information. ' +
        'Available tools:\n' +
        '- register_client: Register a new client (needs name, email, ein)\n' +
        '- create_connection: Create a connection for a client (needs clientId, connectionType, credentials)\n' +
        '- build_dashboard: Build a dashboard for a client (needs clientId, metrics, timeframe)\n' +
        '- ai-chat: Handle general conversations and questions that don\'t fit other tools\n' +
        'CRITICAL RULES:\n' +
        '1. If user wants to "create a new client", "register a client", or provides client details (name, email, EIN), use "register_client"\n' +
        '2. If user mentions connecting to external services, use "create_connection"\n' +
        '3. If user wants to build reports or dashboards, use "build_dashboard"\n' +
        '4. For general questions or unclear intent, use "ai-chat"\n' +
        'RESPONSE FORMAT: Respond with ONLY the tool name (e.g., "register_client", "ai-chat") OR provide a user-friendly message if clarification is needed. ' +
        'DO NOT include both tool name and message together. The tool name will be processed separately from the user message.';

      try {
        const apiKey = await decryptDeepSeekKey(supabase, userId);
        console.log('[🧠 ORCHESTRATOR] Successfully retrieved DeepSeek API key for tool selection');
        
        const requestStart = Date.now();
        
        const fullMessages = [
          { role: 'system', content: toolSelectionInstruction },
          ...state.messages
        ];
        
        console.log('[🧠 ORCHESTRATOR] Sending tool selection request to DeepSeek');
        const dsResponse = await askDeepSeek(apiKey, fullMessages);
        
        const requestEnd = Date.now();
        apiLogs = {
          request: {
            timestamp: new Date(requestStart).toISOString(),
            model: 'deepseek-chat',
            operation: 'tool_selection',
            messages: fullMessages,
            temperature: 0,  
            max_tokens: 256
          },
          response: {
            timestamp: new Date(requestEnd).toISOString(),
            content: dsResponse,
            execution_time_ms: requestEnd - requestStart
          }
        };

        console.log('[🧠 ORCHESTRATOR] Tool selection response received:', dsResponse);
        
        const extracted = extractToolFromResponse(dsResponse);
        if (extracted.tool) {
          console.log(`[🧠 ORCHESTRATOR] Tool extracted: ${extracted.tool}`);
          state.tool = extracted.tool;
          intent = state.tool;
          reply = extracted.reply || '';
          state.confirmed = false;
          state.confirmationAttempts = 0;
          
          // Track tool chain
          if (!state.toolChain) state.toolChain = [];
          if (state.tool && !state.toolChain.includes(state.tool)) {
            state.toolChain.push(state.tool);
          }
          
          console.log(`[🧠 ORCHESTRATOR] Tool selected: ${intent} | Tool chain: ${JSON.stringify(state.toolChain)}`);
        } else {
          // Default to ai-chat if no tool was identified
          state.tool = 'ai-chat';
          intent = 'ai-chat';
          reply = dsResponse;
          console.log('[🧠 ORCHESTRATOR] No specific tool identified, defaulting to ai-chat');
        }
        
        // Save state after tool selection
        conversationStates.set(conversation_id, state);
        console.log('[🧠 ORCHESTRATOR] State saved after tool selection');
        
      } catch (deepseekError) {
        console.error('[🧠 ORCHESTRATOR] DeepSeek tool selection failed:', deepseekError);
        apiLogs = {
          error: {
            timestamp: new Date().toISOString(),
            message: deepseekError.message,
            type: 'deepseek_tool_selection_error'
          }
        };
        throw deepseekError;
      }
    } else if (!state.confirmed) {
      // PATH 2: CONFIRMATION PHASE
      console.log('[🧠 ORCHESTRATOR] Entering PATH 2: Confirmation Phase');
      console.log(`[🧠 ORCHESTRATOR] Tool to confirm: ${state.tool}`);
      
      // Increment confirmation attempts
      if (!state.confirmationAttempts) state.confirmationAttempts = 0;
      state.confirmationAttempts++;
      console.log(`[🧠 ORCHESTRATOR] Confirmation attempt ${state.confirmationAttempts} for tool: ${state.tool}`);
      
      // BULLETPROOF: Auto-confirm after MAX_CONFIRMATION_ATTEMPTS
      if (state.confirmationAttempts >= MAX_CONFIRMATION_ATTEMPTS) {
        console.log('[🧠 ORCHESTRATOR] Max confirmation attempts reached - auto-proceeding');
        type = 'actionable';
        state.confirmed = true;
        params = { conversation_id: conversation_id };
        reply = `Got it — proceeding with ${state.tool.replace('_', ' ')}.`;
        conversationStates.delete(conversation_id);
        
        await saveMessage(supabase, conversation_id, 'assistant', reply, {
          auto_confirmed: true,
          confirmation_attempts: state.confirmationAttempts
        });
        
        const response = { 
          intent: state.tool, 
          params, 
          type, 
          reply, 
          tool_chain: state.toolChain || [],
          source_tool: source_tool || null,
          current_tool: currentTool,
          debug_info: {
            function_called: 'ai-orchestrator',
            tool_selected: state.tool,
            tool_confirmed: true,
            conversation_state: false,
            conversation_length: state.messages.length,
            parameters_handled_by_tool: true,
            auto_confirmed: true,
            confirmation_attempts: state.confirmationAttempts
          }
        };
        console.log('[🧠 ORCHESTRATOR] Sending response with auto-confirmation');
        return new Response(
          JSON.stringify(response),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      try {
        const apiKey = await decryptDeepSeekKey(supabase, userId);
        console.log('[🧠 ORCHESTRATOR] Successfully retrieved DeepSeek API key for confirmation');
        
        const requestStart = Date.now();
        
        console.log('[🧠 ORCHESTRATOR] Calling checkConfirmationWithDeepSeek');
        const confirmationResult = await checkConfirmationWithDeepSeek(
          apiKey,
          state.messages,
          state.tool,
          message
        );
        
        const requestEnd = Date.now();
        apiLogs = {
          request: {
            timestamp: new Date(requestStart).toISOString(),
            model: 'deepseek-chat',
            operation: 'confirmation_check',
            tool: state.tool,
            message_length: message.length,
            confirmation_attempts: state.confirmationAttempts
          },
          response: {
            timestamp: new Date(requestEnd).toISOString(),
            is_confirmed: confirmationResult.isConfirmed,
            reply: confirmationResult.reply,
            execution_time_ms: requestEnd - requestStart
          }
        };

        reply = confirmationResult.reply;
        intent = state.tool || '';
        
        if (confirmationResult.isConfirmed) {
          console.log('✅ [🧠 ORCHESTRATOR] TOOL CONFIRMED! Launching tool:', state.tool);
          type = 'actionable';
          state.confirmed = true;
          
          // Pass conversation_id to the tool
          params = {
            conversation_id: conversation_id
          };
          
          // For ai-chat, prepare parameters with conversation context
          if (state.tool === 'ai-chat') {
            params = {
              message: message,
              conversation_id: conversation_id,
              source_tool: source_tool || null,
              tool_chain: state.toolChain || []
            };
          }
          
          // Clear the conversation state since we're launching the tool
          conversationStates.delete(conversation_id);
          console.log('[🧠 ORCHESTRATOR] Tool confirmed and launching, cleared conversation state');
        } else {
          // Keep asking for confirmation
          conversationStates.set(conversation_id, state);
          console.log(`[🧠 ORCHESTRATOR] Tool not confirmed, continuing conversation for confirmation attempt: ${state.confirmationAttempts}`);
        }
      } catch (deepseekError) {
        console.error('[🧠 ORCHESTRATOR] DeepSeek confirmation check failed:', deepseekError);
        apiLogs = {
          error: {
            timestamp: new Date().toISOString(),
            message: deepseekError.message,
            type: 'deepseek_confirmation_error'
          }
        };
        
        // Enhanced fallback to simple confirmation logic
        const strongConfirmationWords = ['yes', 'yeah', 'yep', 'sure', 'okay', 'ok', 'proceed', 'go ahead', 'let\'s do it', 'sounds good'];
        const simpleConfirmation = strongConfirmationWords.some(word => 
          message.toLowerCase().includes(word)
        ) || /what.*need|how.*start|tell me/i.test(message);
        
        if (simpleConfirmation) {
          console.log('✅ [🧠 ORCHESTRATOR] FALLBACK CONFIRMATION! Launching tool:', state.tool);
          type = 'actionable';
          state.confirmed = true;
          params = { conversation_id: conversation_id };
          reply = 'I understand you want to proceed. Let me help you with that.';
          conversationStates.delete(conversation_id);
          console.log('[🧠 ORCHESTRATOR] Tool confirmed via fallback logic');
        } else {
          reply = 'Could you please confirm if you want to proceed with this action?';
          conversationStates.set(conversation_id, state);
          console.log('[🧠 ORCHESTRATOR] Tool not confirmed via fallback, asking for clarification');
        }
      }
    } else {
      // PATH 3: TOOL ALREADY CONFIRMED (should not happen, but safety check)
      console.log('[🧠 ORCHESTRATOR] PATH 3: Tool already confirmed - this should not happen');
      type = 'actionable';
      params = { conversation_id: conversation_id };
      reply = `Continuing with ${state.tool?.replace('_', ' ')}`;
      conversationStates.delete(conversation_id);
    }

    // Save assistant message with API logs
    await saveMessage(supabase, conversation_id, 'assistant', reply, apiLogs);

    const response = { 
      intent, 
      params, 
      type, 
      reply, 
      tool_chain: state.toolChain || [],
      source_tool: source_tool || null,
      current_tool: currentTool,
      debug_info: {
        function_called: 'ai-orchestrator',
        tool_selected: intent || 'none',
        tool_confirmed: state.confirmed || false,
        conversation_state: !!conversationStates.get(conversation_id),
        conversation_length: state.messages.length,
        parameters_handled_by_tool: type === 'actionable' && intent !== 'ai-chat',
        ai_confirmation_used: !state.confirmed && state.tool ? true : false,
        confirmation_attempts: state.confirmationAttempts || 0
      }
    };
    
    console.log('[🧠 ORCHESTRATOR] Sending response:', { 
      intent, 
      type, 
      replyLength: reply.length, 
      hasParams: Object.keys(params).length > 0, 
      toolChain: state.toolChain, 
      currentTool,
      toolConfirmed: state.confirmed,
      confirmationAttempts: state.confirmationAttempts
    });

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    console.error('[🧠 ORCHESTRATOR] Error:', err);
    console.error('[🧠 ORCHESTRATOR] Error stack:', err.stack);
    return new Response(JSON.stringify({ 
      error: err.message || 'Invalid request',
      stack: err.stack,
      current_tool: 'ai-orchestrator',
      debug_info: {
        function_called: 'ai-orchestrator',
        error_type: 'orchestrator_error'
      }
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
