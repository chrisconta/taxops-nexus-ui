
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
  lastAssistantMessage?: string;
  repeatedResponseCount?: number;
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

// Load persisted conversation state from the database
async function loadStateFromDB(
  supabase: SupabaseClient,
  conversationId: string
): Promise<Record<string, any>> {
  try {
    const { data, error } = await supabase
      .from('ai_conversation_states')
      .select('state')
      .eq('conversation_id', conversationId)
      .single();

    if (error) {
      console.error('Error loading conversation state from DB:', error);
      return {};
    }

    return data?.state || {};
  } catch (err) {
    console.error('Failed to load conversation state from DB:', err);
    return {};
  }
}

// Persist conversation state to the database
async function saveStateToDB(
  supabase: SupabaseClient,
  conversationId: string,
  state: Record<string, any>
) {
  try {
    const { error } = await supabase
      .from('ai_conversation_states')
      .upsert({ conversation_id: conversationId, state });
    if (error) {
      console.error('Error saving conversation state to DB:', error);
    }
  } catch (err) {
    console.error('Failed to save conversation state to DB:', err);
  }
}

// Enhanced state management utility
function saveState(conversationId: string, state: ConversationState) {
  conversationStates.set(conversationId, state);
  console.log(`[💾 STATE SAVED] ConversationId: ${conversationId} | Tool: ${state.tool} | Confirmed: ${state.confirmed} | Attempts: ${state.confirmationAttempts || 0} | Messages: ${state.messages.length}`);
}

// Generate unique request IDs for correlation
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Tool-specific confirmation messages
const toolConfirmationMessages = {
  'register_client': "Do you want me to help you register a client? I'll collect their business information like name, email, and EIN to get them set up in the system.",
  'create_connection': "Should I help you create a connection? I'll guide you through connecting to external services like banks or financial institutions.",
  'build_dashboard': "Do you want me to build a dashboard for you? I'll help you create data visualizations and reports based on your requirements.",
  'ai-chat': "I'm here to help with general questions and conversations. What would you like to discuss?"
};

// Helper function to normalize tool names for comparison
const normalizeToolName = (tool?: string | null) =>
  tool?.trim().toLowerCase().replace(/[-\s]+/g, '_') || '';

// Enhanced confirmation with simple pattern matching before DeepSeek
function checkSimpleConfirmation(message: string): { isConfirmed: boolean; isRejection: boolean } {
  const normalizedMessage = message.toLowerCase().trim();
  
  // Strong confirmation patterns
  const confirmationPatterns = [
    /^(yes|yeah|yep|yup|sure|okay|ok|alright|correct|right|absolutely|definitely|proceed|go ahead|do it|let's do it|sounds good)$/i,
    /^(yes[.,!]?|yeah[.,!]?|sure[.,!]?|ok[.,!]?)$/i,
    /^i want to/i,
    /please (do|proceed|go ahead)/i,
    /let[''']?s (do|proceed|start)/i
  ];
  
  // Strong rejection patterns
  const rejectionPatterns = [
    /^(no|nope|nah|not|never|don't|stop|cancel|abort|quit|exit)$/i,
    /^(no[.,!]?|nope[.,!]?|not really[.,!]?)$/i,
    /don[''']?t want/i,
    /not interested/i,
    /cancel/i
  ];
  
  const isConfirmed = confirmationPatterns.some(pattern => pattern.test(normalizedMessage));
  const isRejection = rejectionPatterns.some(pattern => pattern.test(normalizedMessage));
  
  console.log(`[🔍 SIMPLE CONFIRMATION] Message: "${message}" | Confirmed: ${isConfirmed} | Rejected: ${isRejection}`);
  
  return { isConfirmed, isRejection };
}

// Enhanced semantic loop detection
function detectRepeatedResponse(state: ConversationState, newResponse: string): boolean {
  if (!state.lastAssistantMessage) {
    return false;
  }
  
  // Check if the new response is very similar to the last one
  const isSimilar = state.lastAssistantMessage === newResponse;
  
  if (isSimilar) {
    state.repeatedResponseCount = (state.repeatedResponseCount || 0) + 1;
    console.log(`[🔁 LOOP DETECTION] Repeated response detected. Count: ${state.repeatedResponseCount} | Response: "${newResponse.substring(0, 100)}..."`);
    return state.repeatedResponseCount >= 2; // Trigger after 2 repetitions
  } else {
    state.repeatedResponseCount = 0;
  }
  
  return false;
}

// ENHANCED CONFIRMATION CHECK with comprehensive logging
async function checkConfirmationWithDeepSeek(
  apiKey: string, 
  conversationHistory: Array<{ role: string; content: string }>, 
  toolName: string,
  latestMessage: string
): Promise<{ isConfirmed: boolean; reply: string }> {
  const requestId = generateRequestId();
  console.log(`[🧠 DEEPSEEK-CONFIRMATION] Starting confirmation check | RequestId: ${requestId} | Tool: ${toolName}`);
  console.log(`[🧠 DEEPSEEK-CONFIRMATION] Latest message: "${latestMessage}"`);
  
  // Try simple confirmation first
  const simpleCheck = checkSimpleConfirmation(latestMessage);
  if (simpleCheck.isConfirmed) {
    console.log(`[🧠 DEEPSEEK-CONFIRMATION] ${requestId} | Strong confirmation via simple patterns - skipping AI call`);
    return { 
      isConfirmed: true, 
      reply: `Great! I'll help you with ${toolName.replace('_', ' ')}. Let me get started.` 
    };
  }
  
  if (simpleCheck.isRejection) {
    console.log(`[🧠 DEEPSEEK-CONFIRMATION] ${requestId} | Clear rejection via simple patterns - skipping AI call`);
    return { 
      isConfirmed: false, 
      reply: 'Understood. Is there something else I can help you with?' 
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

  console.log(`[🧠 DEEPSEEK-REQ] ${requestId} | CONFIRMATION CHECK`);
  console.log(`[🧠 DEEPSEEK-REQ] ${requestId} | Tool: ${toolName}`);
  console.log(`[🧠 DEEPSEEK-REQ] ${requestId} | System Instruction:\n${confirmationInstruction}`);
  console.log(`[🧠 DEEPSEEK-REQ] ${requestId} | User Message: "${latestMessage}"`);

  const requestPayload = {
    model: 'deepseek-chat',
    temperature: 0,
    max_tokens: 10,
    messages: [
      { role: 'system', content: confirmationInstruction },
      { role: 'user', content: latestMessage }
    ]
  };

  console.log(`[🧠 DEEPSEEK-REQ] ${requestId} | Full Request Payload:`, JSON.stringify(requestPayload, null, 2));

  try {
    const requestStart = Date.now();
    
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestPayload)
    });

    const requestDuration = Date.now() - requestStart;

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[🧠 DEEPSEEK-ERROR] ${requestId} | HTTP ${response.status} | Duration: ${requestDuration}ms | Error: ${errorText}`);
      throw new Error(`DeepSeek API error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content.trim().toUpperCase();
    
    console.log(`[🧠 DEEPSEEK-RESP] ${requestId} | Duration: ${requestDuration}ms`);
    console.log(`[🧠 DEEPSEEK-RESP] ${requestId} | Full Response:`, JSON.stringify(data, null, 2));
    console.log(`[🧠 DEEPSEEK-RESP] ${requestId} | AI Decision: "${aiResponse}"`);
    console.log(`[🧠 DEEPSEEK-RESP] ${requestId} | Token Usage:`, data.usage || 'Not provided');
    
    const isConfirmed = aiResponse.startsWith('YES') || aiResponse === 'YES';
    const reply = isConfirmed 
      ? `Perfect! I'll help you with ${toolName.replace('_', ' ')}. Let me get started.`
      : toolConfirmationMessages[toolName as keyof typeof toolConfirmationMessages] || 'Could you please confirm if you want to proceed?';
    
    console.log(`[🧠 DEEPSEEK-EXTRACT] ${requestId} | Final confirmation result: ${isConfirmed ? 'CONFIRMED' : 'NOT_CONFIRMED'}`);
    console.log(`[🧠 DEEPSEEK-EXTRACT] ${requestId} | Reply to user: "${reply}"`);
    
    return { isConfirmed, reply };
  } catch (error) {
    console.error(`[🧠 DEEPSEEK-ERROR] ${requestId} | Exception:`, error);
    
    // Enhanced fallback logic with better pattern matching
    const fallbackConfirmation = simpleCheck.isConfirmed || 
      /^(yes|yeah|yep|sure|okay|ok)\b/i.test(latestMessage) ||
      /what.*need|how.*start|tell me|let's do|sounds good/i.test(latestMessage);
    
    console.log(`[🧠 DEEPSEEK-FALLBACK] ${requestId} | Fallback confirmation result: ${fallbackConfirmation}`);
    return { 
      isConfirmed: fallbackConfirmation, 
      reply: fallbackConfirmation ? 'I understand you want to proceed.' : 'Could you please confirm if you want to proceed?' 
    };
  }
}

// ENHANCED TOOL EXTRACTION with comprehensive logging
export function extractToolFromResponse(text: string): { tool?: string; reply?: string } {
  const requestId = generateRequestId();
  console.log(`[🧠 TOOL-EXTRACTION] ${requestId} | Extracting tool from response`);
  console.log(`[🧠 TOOL-EXTRACTION] ${requestId} | Input text: "${text}"`);
  
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
      console.log(`[🧠 TOOL-EXTRACTION] ${requestId} | Found tool: ${toolName} via exact match`);
      console.log(`[🧠 TOOL-EXTRACTION] ${requestId} | Reply: "${toolMessages[toolName as keyof typeof toolMessages]}"`);
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
      console.log(`[🧠 TOOL-EXTRACTION] ${requestId} | Found tool: ${toolName} via pattern matching`);
      
      // Try to extract meaningful content after tool mention
      let extractedReply = text.replace(pattern, '').trim();
      
      // Clean up common prefixes/suffixes
      extractedReply = extractedReply
        .replace(/^[\s-()]+/, '')
        .replace(/[\s-()]+$/, '')
        .replace(/^(Note:|Parameters:|Proceeding with|Tool:)/i, '')
        .trim();
      
      // If we got meaningful content, use it; otherwise use confirmation message
      const reply = extractedReply && extractedReply.length > 10 
        ? extractedReply 
        : toolMessages[toolName as keyof typeof toolMessages];
      
      console.log(`[🧠 TOOL-EXTRACTION] ${requestId} | Extracted reply: "${reply}"`);
      
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
    console.log(`[🧠 TOOL-EXTRACTION] ${requestId} | Found register_client via fallback`);
    return { tool: 'register_client', reply };
  }
  if (lowerText.includes('connection') || lowerText.includes('connect')) {
    const reply = text.length > 20 ? text : toolMessages.create_connection;
    console.log(`[🧠 TOOL-EXTRACTION] ${requestId} | Found create_connection via fallback`);
    return { tool: 'create_connection', reply };
  }
  if (lowerText.includes('dashboard') || lowerText.includes('report')) {
    const reply = text.length > 20 ? text : toolMessages.build_dashboard;
    console.log(`[🧠 TOOL-EXTRACTION] ${requestId} | Found build_dashboard via fallback`);
    return { tool: 'build_dashboard', reply };
  }
  
  console.log(`[🧠 TOOL-EXTRACTION] ${requestId} | No specific tool identified, defaulting to ai-chat`);
  const reply = normalizeToolName(trimmedText) === 'ai_chat'
    ? toolMessages['ai-chat']
    : text;
  console.log(`[🧠 TOOL-EXTRACTION] ${requestId} | Default reply: "${reply}"`);
  return { tool: 'ai-chat', reply };
}

// Detect potential tool switch in a user message when a tool is already selected
export function detectToolSwitch(message: string, currentTool?: string): string | undefined {
  const { tool } = extractToolFromResponse(message);
  const normalizedDetected = normalizeToolName(tool);
  if (
    normalizedDetected === 'ai_chat' &&
    !/\b(chat|switch|cancel|exit)\b/i.test(message)
  ) {
    return undefined;
  }
  const normalizedCurrent = normalizeToolName(currentTool);

  if (tool && normalizedDetected && normalizedDetected !== normalizedCurrent) {
    console.log(`[🔍 DETECT TOOL SWITCH] Detected request to switch from ${currentTool} to ${tool}`);
    return tool;
  }
  return undefined;
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

// ENHANCED askDeepSeek with comprehensive logging
async function askDeepSeek(apiKey: string, messages: Array<{ role: string; content: string }>, operation = 'general') {
  const requestId = generateRequestId();
  console.log(`[🧠 DEEPSEEK-REQ] ${requestId} | Starting ${operation.toUpperCase()} request`);
  console.log(`[🧠 DEEPSEEK-REQ] ${requestId} | Message count: ${messages.length}`);
  
  // Log conversation context
  console.log(`[🧠 DEEPSEEK-REQ] ${requestId} | Conversation Context:`);
  messages.forEach((msg, index) => {
    const preview = msg.content.length > 100 ? msg.content.substring(0, 100) + '...' : msg.content;
    console.log(`[🧠 DEEPSEEK-REQ] ${requestId} | Message ${index + 1} (${msg.role}): "${preview}"`);
  });
  
  const requestPayload = {
    model: 'deepseek-chat',
    temperature: 0,
    max_tokens: 256,
    messages,
  };
  
  console.log(`[🧠 DEEPSEEK-REQ] ${requestId} | Full Request Payload:`, JSON.stringify(requestPayload, null, 2));
  
  const requestStart = Date.now();
  
  try {
    const res = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestPayload)
    });
    
    const requestDuration = Date.now() - requestStart;
    
    if (!res.ok) {
      const text = await res.text();
      console.error(`[🧠 DEEPSEEK-ERROR] ${requestId} | HTTP ${res.status} | Duration: ${requestDuration}ms | Error: ${text}`);
      throw new Error(`DeepSeek API error: ${res.status} ${text}`);
    }
    
    const data = await res.json();
    const responseContent = data.choices[0].message.content.trim();
    
    console.log(`[🧠 DEEPSEEK-RESP] ${requestId} | Duration: ${requestDuration}ms`);
    console.log(`[🧠 DEEPSEEK-RESP] ${requestId} | Full Response:`, JSON.stringify(data, null, 2));
    console.log(`[🧠 DEEPSEEK-RESP] ${requestId} | Response Content: "${responseContent}"`);
    console.log(`[🧠 DEEPSEEK-RESP] ${requestId} | Token Usage:`, data.usage || 'Not provided');
    console.log(`[🧠 DEEPSEEK-RESP] ${requestId} | Model: ${data.model || 'Not specified'}`);
    
    return responseContent;
  } catch (error) {
    const requestDuration = Date.now() - requestStart;
    console.error(`[🧠 DEEPSEEK-ERROR] ${requestId} | Duration: ${requestDuration}ms | Exception:`, error);
    console.error(`[🧠 DEEPSEEK-ERROR] ${requestId} | Failed request payload:`, JSON.stringify(requestPayload, null, 2));
    throw error;
  }
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

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
  let dbState: any = null;

  if (supabaseUrl && supabaseAnonKey) {
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const { data } = await supabase
      .from('ai_conversation_states')
      .select('state')
      .eq('conversation_id', conversationId)
      .single();
    dbState = data?.state || null;
  }

  return new Response(JSON.stringify({
    conversation_id: conversationId,
    memory_state: state || null,
    db_state: dbState,
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

    const requestId = generateRequestId();
    console.log(`[🧠 ORCHESTRATOR] Request ID: ${requestId}`);

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

    // Load persisted state from database
    const persistedState = await loadStateFromDB(supabase, conversation_id);

    // Get or initialize conversation state and merge with persisted state
    let state = {
      messages: [],
      toolChain: [],
      sourceTools: [],
      confirmationAttempts: 0,
      ...persistedState,
      ...(conversationStates.get(conversation_id) || {})
    } as ConversationState;

    // Store back into in-memory map and ensure DB has the latest copy
    saveState(conversation_id, state);
    await saveStateToDB(supabase, conversation_id, state);
    
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
    
    // FIXED tool switching logic with proper normalization and logging
    console.log(`[🔧 TOOL SWITCH DEBUG] Raw source_tool: "${source_tool}"`);
    console.log(`[🔧 TOOL SWITCH DEBUG] Current state.tool: "${state.tool}"`);
    console.log(`[🔧 TOOL SWITCH DEBUG] Normalized source_tool: "${normalizeToolName(source_tool)}"`);
    console.log(`[🔧 TOOL SWITCH DEBUG] Normalized state.tool: "${normalizeToolName(state.tool)}"`);
    
    const normalizedSourceTool = normalizeToolName(source_tool);
    const normalizedStateTool = normalizeToolName(state.tool);
    
    // CORE FIX - Only reset tool if different tool AND not confirmed
    if (normalizedSourceTool && normalizedSourceTool !== normalizedStateTool && !state.confirmed) {
      console.log(`[🔁 TOOL SWITCH] from ${state.tool} → ${source_tool} (normalized comparison passed, not confirmed)`);
      state.tool = source_tool; // Keep original casing for consistency
      state.confirmed = false;
      state.confirmationAttempts = 0;
      
      if (!state.sourceTools) state.sourceTools = [];
      if (!state.sourceTools.includes(source_tool)) {
        state.sourceTools.push(source_tool);
      }
      saveState(conversation_id, state);
      await saveStateToDB(supabase, conversation_id, state);
    } else if (normalizedSourceTool && normalizedSourceTool === normalizedStateTool) {
      console.log(`[🔧 TOOL SWITCH DEBUG] No tool switch needed - same tool (${normalizedSourceTool})`);
    } else if (!normalizedSourceTool) {
      console.log(`[🔧 TOOL SWITCH DEBUG] No source_tool provided, keeping current state`);
    } else if (state.confirmed) {
      console.log(`[🔧 TOOL SWITCH DEBUG] Tool already confirmed, not switching`);
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
    console.log(`[🧠 STATE] lastAssistantMessage length: ${state.lastAssistantMessage?.length || 0}`);

    let reply = '';
    let intent = state.tool || '';
    let type: 'conversational' | 'actionable' = 'conversational';
    let params: Record<string, any> = {};
    let apiLogs: any = {};
    let currentTool = 'ai-orchestrator';

    // Check for pending tool switch confirmation
    if (state.pendingToolSwitch) {
      console.log(`[🔄 PENDING TOOL SWITCH] Request ${requestId} awaiting confirmation for`, JSON.stringify(state.pendingToolSwitch));
      let { isConfirmed, isRejection } = checkSimpleConfirmation(message);
      let confirmationReply = '';

      if (!isConfirmed && !isRejection) {
        try {
          const apiKey = await decryptDeepSeekKey(supabase, userId);
          console.log(`[🔄 CONFIRMATION REQUEST] Request ${requestId} for ${state.pendingToolSwitch.to}`);
          const result = await checkConfirmationWithDeepSeek(
            apiKey,
            state.messages,
            state.pendingToolSwitch.to,
            message
          );
          isConfirmed = result.isConfirmed;
          confirmationReply = result.reply;
        } catch (err) {
          console.error('[🔄 PENDING TOOL SWITCH] DeepSeek confirmation failed', err);
        }
      }

      if (isConfirmed) {
        console.log(`[🔄 SWITCH CONFIRMED] Request ${requestId} switching to ${state.pendingToolSwitch.to}`);
        state.tool = state.pendingToolSwitch.to;
        state.pendingToolSwitch = undefined;
        state.confirmed = false;
        state.confirmationAttempts = 0;
        saveState(conversation_id, state);
        await saveStateToDB(supabase, conversation_id, state);
        reply = `Switching to ${state.tool.replace('_', ' ')}.`;
      } else if (isRejection) {
        console.log(`[🔄 SWITCH REJECTED] Request ${requestId}`);
        state.pendingToolSwitch = undefined;
        saveState(conversation_id, state);
        await saveStateToDB(supabase, conversation_id, state);
        reply = `Okay, continuing with ${state.tool?.replace('_', ' ')}.`;
      } else {
        console.log(`[🔄 SWITCH CONFIRMATION NEEDED] Request ${requestId}`);
        reply = confirmationReply || 'Would you like to switch tools?';
        saveState(conversation_id, state);
        await saveStateToDB(supabase, conversation_id, state);
      }

      await saveMessage(supabase, conversation_id, 'assistant', reply, apiLogs);
      const response = {
        intent: state.tool || '',
        params: {},
        type: 'conversational',
        reply,
        tool_chain: state.toolChain || [],
        source_tool: source_tool || null,
        current_tool: currentTool,
        debug_info: {
          function_called: 'ai-orchestrator',
          pending_tool_switch: true,
          tool_selected: state.tool,
          tool_confirmed: state.confirmed || false,
        }
      };

      return new Response(
        JSON.stringify(response),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Detect new tool mention when a tool is already selected
    if (state.tool && !state.pendingToolSwitch) {
      const detectedTool = detectToolSwitch(message, state.tool);
      if (detectedTool) {
        console.log(`[🔄 SWITCH DETECTED] Request ${requestId} from ${state.tool} to ${detectedTool}`);
        state.pendingToolSwitch = {
          from: state.tool,
          to: detectedTool,
          reason: message
        };
        reply = `It sounds like you might want to switch from ${state.tool.replace('_', ' ')} to ${detectedTool.replace('_', ' ')}. Shall I switch tools?`;
        state.lastAssistantMessage = reply;
        state.repeatedResponseCount = 0;
        saveState(conversation_id, state);
        await saveStateToDB(supabase, conversation_id, state);

        await saveMessage(supabase, conversation_id, 'assistant', reply, apiLogs);
        const response = {
          intent: state.tool,
          params: {},
          type: 'conversational',
          reply,
          tool_chain: state.toolChain || [],
          source_tool: source_tool || null,
          current_tool: currentTool,
          debug_info: {
            function_called: 'ai-orchestrator',
            pending_tool_switch: state.pendingToolSwitch,
            tool_selected: state.tool,
            tool_confirmed: state.confirmed || false,
          }
        };

        return new Response(
          JSON.stringify(response),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

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
        const dsResponse = await askDeepSeek(apiKey, fullMessages, 'tool_selection');
        
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

          // Reset loop detection tracking with new confirmation message
          state.lastAssistantMessage = reply;
          state.repeatedResponseCount = 0;
          
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

          // Reset loop detection tracking with confirmation message
          state.lastAssistantMessage = reply;
          state.repeatedResponseCount = 0;
        }
        
        // Save state after tool selection
        saveState(conversation_id, state);
        await saveStateToDB(supabase, conversation_id, state);
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
      
      // Check for loop detection FIRST
      const isLoopDetected = detectRepeatedResponse(state, toolConfirmationMessages[state.tool as keyof typeof toolConfirmationMessages] || '');
      
      // Increment confirmation attempts
      if (!state.confirmationAttempts) state.confirmationAttempts = 0;
      state.confirmationAttempts++;
      console.log(`[🧠 ORCHESTRATOR] Confirmation attempt ${state.confirmationAttempts} for tool: ${state.tool}`);

      // Persist updated attempts immediately for accurate loop tracking
      saveState(conversation_id, state);
      await saveStateToDB(supabase, conversation_id, state);
      
      // Auto-confirm if loop detected OR max attempts reached
      if (isLoopDetected || state.confirmationAttempts >= MAX_CONFIRMATION_ATTEMPTS) {
        console.log(`[🧠 ORCHESTRATOR] ${isLoopDetected ? 'Loop detected' : 'Max confirmation attempts reached'} - auto-proceeding`);
        type = 'actionable';
        state.confirmed = true;
        params = { conversation_id: conversation_id };
        reply = `Got it — proceeding with ${state.tool.replace('_', ' ')}.`;
        state.lastAssistantMessage = reply;
        state.repeatedResponseCount = 0;
        
        // PHASE 3: Keep state until tool execution is successful
        saveState(conversation_id, state);
        await saveStateToDB(supabase, conversation_id, state);
        console.log('[🧠 ORCHESTRATOR] Keeping conversation state until tool execution success');
        
        await saveMessage(supabase, conversation_id, 'assistant', reply, {
          auto_confirmed: true,
          confirmation_attempts: state.confirmationAttempts,
          loop_detected: isLoopDetected
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
            conversation_state: true, // Keep state until successful execution
            conversation_length: state.messages.length,
            parameters_handled_by_tool: true,
            auto_confirmed: true,
            confirmation_attempts: state.confirmationAttempts,
            loop_detected: isLoopDetected
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

        console.log(`[🔄 CONFIRMATION REQUEST] Request ${requestId} for ${state.tool}`);
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

          // update loop tracking with final confirmation message
          state.lastAssistantMessage = confirmationResult.reply;
          state.repeatedResponseCount = 0;
          
          // Pass conversation_id to the tool
          params = {
            conversation_id: conversation_id
          };
          
          // For ai-chat, prepare parameters with conversation context
          if (normalizeToolName(state.tool) === 'ai_chat') {
            params = {
              message: message,
              conversation_id: conversation_id,
              source_tool: source_tool || null,
              tool_chain: state.toolChain || []
            };
          }
          
          // PHASE 3: Keep the conversation state until successful tool execution
          saveState(conversation_id, state);
          await saveStateToDB(supabase, conversation_id, state);
          console.log('[🧠 ORCHESTRATOR] Tool confirmed and launching, keeping conversation state until success');
        } else {
          // Keep asking for confirmation
          state.lastAssistantMessage = reply; // Store for loop detection
          saveState(conversation_id, state);
          await saveStateToDB(supabase, conversation_id, state);
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
        const simpleCheck = checkSimpleConfirmation(message);
        
        if (simpleCheck.isConfirmed) {
          console.log('✅ [🧠 ORCHESTRATOR] FALLBACK CONFIRMATION! Launching tool:', state.tool);
          type = 'actionable';
          state.confirmed = true;
          params = { conversation_id: conversation_id };
          reply = 'I understand you want to proceed. Let me help you with that.';
          state.lastAssistantMessage = reply;
          state.repeatedResponseCount = 0;
          saveState(conversation_id, state);
          await saveStateToDB(supabase, conversation_id, state);
          console.log('[🧠 ORCHESTRATOR] Tool confirmed via fallback logic, keeping state until success');
        } else {
          reply = 'Could you please confirm if you want to proceed with this action?';
          state.lastAssistantMessage = reply;
          saveState(conversation_id, state);
          await saveStateToDB(supabase, conversation_id, state);
          console.log('[🧠 ORCHESTRATOR] Tool not confirmed via fallback, asking for clarification');
        }
      }
    } else {
      // PATH 3: TOOL ALREADY CONFIRMED (should not happen, but safety check)
      console.log('[🧠 ORCHESTRATOR] PATH 3: Tool already confirmed - this should not happen');
      type = 'actionable';
      params = { conversation_id: conversation_id };
      reply = `Continuing with ${state.tool?.replace('_', ' ')}`;
      // Keep state until tool execution is successful
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
        parameters_handled_by_tool: type === 'actionable' && normalizeToolName(intent) !== 'ai_chat',
        ai_confirmation_used: !state.confirmed && state.tool ? true : false,
        confirmation_attempts: state.confirmationAttempts || 0,
        source_tool_debug: {
          raw: source_tool,
          normalized: normalizeToolName(source_tool),
          current_tool_normalized: normalizeToolName(state.tool),
          comparison_result: normalizeToolName(source_tool) === normalizeToolName(state.tool)
        }
      }
    };
    
    // If we have an actionable response, dispatch to the tool-dispatcher
    if (type === 'actionable' && intent) {
      console.log('[🧠 ORCHESTRATOR] Dispatching to tool via tool-dispatcher');

      const dispatchToolName = intent.replace(/_/g, '-');
      console.log('[🧠 ORCHESTRATOR] Dispatch tool name:', dispatchToolName);

      try {
        const { data: toolResult, error: toolError } = await supabase.functions.invoke('tool-dispatcher', {
          body: {
            tool_name: dispatchToolName,
            conversation_id: conversation_id,
            user_message: message,
            user_id: userId
          },
          headers: { Authorization: authHeader }
        });

        if (toolError) {
          console.error('[🧠 ORCHESTRATOR] Tool dispatcher error:', toolError);
          throw new Error(toolError.message || 'Unknown tool dispatcher error');
        }

        if (toolResult) {
          console.log('[🧠 ORCHESTRATOR] Tool execution succeeded:', toolResult);
          return new Response(JSON.stringify(toolResult), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        console.error('[🧠 ORCHESTRATOR] Tool dispatcher returned no result');
        throw new Error('No result from tool dispatcher');
      } catch (dispatchError) {
        console.error(`[🧠 ORCHESTRATOR] Tool dispatch failed for request ${requestId}:`, dispatchError);
        return new Response(JSON.stringify({
          error: 'Tool execution failed',
          context: { intent, dispatched: true }
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    console.log('[🧠 ORCHESTRATOR] Sending response:', { 
      intent, 
      type, 
      replyLength: reply.length, 
      hasParams: Object.keys(params).length > 0, 
      toolChain: state.toolChain, 
      currentTool,
      toolConfirmed: state.confirmed,
      confirmationAttempts: state.confirmationAttempts,
      conversationStateKept: !!conversationStates.get(conversation_id)
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
