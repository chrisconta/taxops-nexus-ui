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
  pendingToolSwitch?: {
    from: string;
    to: string;
    reason: string;
  };
}

const MAX_HISTORY = 15; // Increased to preserve more context

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

// Standardized AI confirmation function
async function checkConfirmationWithAI(
  apiKey: string, 
  conversationHistory: Array<{ role: string; content: string }>, 
  toolName: string,
  latestMessage: string
): Promise<{ isConfirmed: boolean; reply: string }> {
  console.log(`Checking confirmation with AI for tool: ${toolName}`);
  
  const toolContext = toolConfirmationMessages[toolName as keyof typeof toolConfirmationMessages] || '';
  
  const instruction = `You are helping determine if a user wants to proceed with the "${toolName}" tool. 
  
The tool context: ${toolContext}

Review the conversation history and the user's latest message to determine:
1. If they want to proceed with this tool (look for affirmative responses, specific details, or continued engagement)
2. If they seem to want to switch to a different tool
3. If they need more information

User confirmations can be:
- Explicit: "yes", "proceed", "do it", "go ahead"
- Implicit: providing specific information relevant to the tool
- Contextual: continuing the conversation in a way that indicates they want to proceed

RESPONSE FORMAT:
- If they want to proceed: Start with "CONFIRMED" then provide a helpful response
- If they want to switch tools or do something else: Start with "NOT_CONFIRMED" then explain what you think they want
- If unclear: Start with "NOT_CONFIRMED" then ask for clarification

Be natural and conversational in your response after the CONFIRMED/NOT_CONFIRMED indicator.`;

  try {
    const fullMessages = [
      { role: 'system', content: instruction },
      ...conversationHistory,
      { role: 'user', content: `Latest message: "${latestMessage}"` }
    ];

    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        temperature: 0,
        max_tokens: 256,
        messages: fullMessages
      })
    });

    if (!response.ok) {
      throw new Error(`DeepSeek API error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content.trim();
    
    console.log('AI confirmation response:', aiResponse);
    
    const isConfirmed = aiResponse.toLowerCase().startsWith('confirmed');
    const reply = aiResponse.replace(/^(CONFIRMED|NOT_CONFIRMED)\s*/i, '').trim();
    
    return { isConfirmed, reply };
  } catch (error) {
    console.error('Error in AI confirmation check:', error);
    // Fallback to simple keyword detection
    const simpleConfirmation = ['yes', 'proceed', 'do it', 'go ahead', 'confirm'].some(word => 
      latestMessage.toLowerCase().includes(word)
    );
    return { 
      isConfirmed: simpleConfirmation, 
      reply: simpleConfirmation ? 'I understand you want to proceed.' : 'Could you please confirm if you want to proceed?' 
    };
  }
}

// Simplified tool extraction with proper user-friendly message generation
export function extractToolFromResponse(text: string): { tool?: string; reply?: string } {
  console.log('Extracting tool from DeepSeek response:', text);
  
  const trimmedText = text.trim();
  
  // Define user-friendly messages for each tool
  const toolMessages = {
    'register_client': toolConfirmationMessages.register_client,
    'create_connection': toolConfirmationMessages.create_connection,
    'build_dashboard': toolConfirmationMessages.build_dashboard,
    'ai-chat': toolConfirmationMessages['ai-chat']
  };
  
  // Check if response is just a tool name (common DeepSeek response)
  const exactToolMatches = {
    'register_client': /^register[_\s]?client$/i,
    'create_connection': /^create[_\s]?connection$/i,
    'build_dashboard': /^build[_\s]?dashboard$/i,
    'ai-chat': /^ai[_\s]?chat$/i
  };
  
  // First check for exact tool name matches
  for (const [toolName, pattern] of Object.entries(exactToolMatches)) {
    if (pattern.test(trimmedText)) {
      console.log(`Found tool: ${toolName} via exact match`);
      return { 
        tool: toolName, 
        reply: toolMessages[toolName as keyof typeof toolMessages]
      };
    }
  }
  
  // Look for tool keywords in the response with better message extraction
  const toolPatterns = {
    'register_client': /(?:register[_\s]client|client[_\s]registration|register.*client)/i,
    'create_connection': /(?:create[_\s]connection|connection|connect|linking)/i,
    'build_dashboard': /(?:build[_\s]dashboard|dashboard|report|analytics)/i,
    'ai-chat': /(?:ai[_\s]chat|general|conversation|chat|question)/i
  };
  
  // Check for tool patterns and extract meaningful content
  for (const [toolName, pattern] of Object.entries(toolPatterns)) {
    if (pattern.test(text)) {
      console.log(`Found tool: ${toolName} via pattern matching`);
      
      // Try to extract meaningful content after tool mention
      let extractedReply = text.replace(pattern, '').trim();
      
      // Clean up common prefixes/suffixes
      extractedReply = extractedReply
        .replace(/^[\s\-\(\)]*/, '') // Remove leading spaces, dashes, parentheses
        .replace(/[\s\-\(\)]*$/, '') // Remove trailing spaces, dashes, parentheses
        .replace(/^(Note:|Parameters:|Proceeding with|Tool:)/i, '') // Remove common prefixes
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
  
  // Try to extract any structured response if present
  try {
    const jsonMatch = text.match(/\{[\s\S]*?\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      if (parsed.tool) {
        console.log(`Found tool via JSON: ${parsed.tool}`);
        const reply = parsed.reply && parsed.reply.length > 10 
          ? parsed.reply 
          : toolMessages[parsed.tool as keyof typeof toolMessages] || text;
        return { tool: parsed.tool, reply };
      }
    }
  } catch (e) {
    // JSON parsing failed, continue with pattern matching
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
  
  console.log('No specific tool identified, defaulting to ai-chat');
  // For ai-chat, if response is just "ai-chat", provide a better default
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

    // Load conversation history from database
    const dbHistory = await loadConversationHistory(supabase, conversation_id);
    
    // Get or initialize conversation state and merge with database history
    let state = conversationStates.get(conversation_id) || { messages: [], toolChain: [], sourceTools: [] };
    
    // If we have database history and it's longer than our in-memory state, use database history
    if (dbHistory.length > state.messages.length) {
      console.log('Using database history as primary source');
      state.messages = dbHistory;
    } else if (dbHistory.length > 0) {
      // Merge database history with in-memory state, avoiding duplicates
      const mergedMessages = [...dbHistory];
      // Add any new messages from state that aren't in database yet
      state.messages.forEach(msg => {
        if (!dbHistory.some(dbMsg => dbMsg.content === msg.content && dbMsg.role === msg.role)) {
          mergedMessages.push(msg);
        }
      });
      state.messages = mergedMessages.slice(-MAX_HISTORY);
    }
    
    // Track tool switching if this came from another tool
    if (source_tool) {
      console.log('Request from tool:', source_tool);
      if (!state.sourceTools) state.sourceTools = [];
      if (!state.sourceTools.includes(source_tool)) {
        state.sourceTools.push(source_tool);
      }
      // Only reset tool selection if explicitly switching tools, not just providing data
      state.tool = undefined;
      state.confirmed = false;
    }
    
    // Add current message to state
    appendMessage(state, { role: 'user', content: message });
    console.log('Conversation state updated, total messages:', state.messages.length);

    let reply = '';
    let intent = state.tool || '';
    let type: 'conversational' | 'actionable' = 'conversational';
    let params: Record<string, any> = {};
    let apiLogs: any = {};
    let currentTool = 'ai-orchestrator'; // Track which function is handling this

    // Check if user is providing information for current tool context
    if (state.tool && !state.confirmed) {
      // User already has a tool selected, check if they're providing information or want to switch
      console.log('Tool already selected but not confirmed:', state.tool, '- checking if user is providing information');
      
      // Simple heuristic: if the current message doesn't contain tool switching keywords, 
      // treat it as information for the current tool
      const toolSwitchingKeywords = ['register', 'create', 'build', 'dashboard', 'connection', 'help me', 'i want to', 'let me'];
      const messageContainsToolSwitch = toolSwitchingKeywords.some(keyword => 
        message.toLowerCase().includes(keyword) && !message.toLowerCase().includes('name') && !message.toLowerCase().includes('email')
      );
      
      if (!messageContainsToolSwitch) {
        // User is likely providing information for current tool, proceed to confirmation check
        console.log('User appears to be providing information for current tool:', state.tool);
      } else {
        // User might want to switch tools, clear current selection
        console.log('User appears to want to switch tools, clearing current selection');
        state.tool = undefined;
        state.confirmed = false;
      }
    }

    if (!state.tool) {
      console.log('No tool selected, determining intent with full conversation history');
      
      // Enhanced instruction with conversation context awareness - SIMPLIFIED PROMPT
      const toolContext = source_tool ? ` (Note: This request came from the ${source_tool} tool, so the user may be switching context)` : '';
      const instruction =
        'You are helping an AI orchestrator decide which tool to use based on the user\'s conversation. ' +
        'Look at the ENTIRE conversation history to understand context and extract information. ' +
        'Available tools:\n' +
        '- register_client: Register a new client (needs name, email, ein)\n' +
        '- create_connection: Create a connection for a client (needs clientId, connectionType, credentials)\n' +
        '- build_dashboard: Build a dashboard for a client (needs clientId, metrics, timeframe)\n' +
        '- ai-chat: Handle general conversations and questions that don\'t fit other tools\n' +
        toolContext +
        'CRITICAL RULES:\n' +
        '1. If user wants to "create a new client", "register a client", or provides client details (name, email, EIN), use "register_client"\n' +
        '2. If user mentions connecting to external services, use "create_connection"\n' +
        '3. If user wants to build reports or dashboards, use "build_dashboard"\n' +
        '4. For general questions or unclear intent, use "ai-chat"\n' +
        'RESPONSE FORMAT: Respond with ONLY the tool name (e.g., "register_client", "ai-chat") OR provide a user-friendly message if clarification is needed. ' +
        'DO NOT include both tool name and message together. The tool name will be processed separately from the user message.';

      try {
        // Get DeepSeek API key for tool selection with authenticated client
        console.log('Fetching DeepSeek API key with authenticated client');
        const apiKey = await decryptDeepSeekKey(supabase, userId);
        console.log('Successfully retrieved DeepSeek API key');
        
        const requestStart = Date.now();
        
        // Include full conversation history in the API call
        const fullMessages = [
          { role: 'system', content: instruction },
          ...state.messages
        ];
        
        const requestBody = {
          model: 'deepseek-chat',
          temperature: 0,
          max_tokens: 256,
          messages: fullMessages
        };
        
        const dsResponse = await askDeepSeek(apiKey, fullMessages);
        
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

        // Use the new simplified tool extraction
        const extracted = extractToolFromResponse(dsResponse);
        if (extracted.tool) {
          state.tool = extracted.tool;
          intent = state.tool;
          reply = extracted.reply || '';
          state.confirmed = false;
          
          // Track tool chain
          if (!state.toolChain) state.toolChain = [];
          if (state.tool && !state.toolChain.includes(state.tool)) {
            state.toolChain.push(state.tool);
          }
          
          conversationStates.set(conversation_id, state);
          console.log('Tool selected:', intent, '| Tool chain:', state.toolChain);
        } else {
          // Default to ai-chat if no tool was identified
          state.tool = 'ai-chat';
          intent = 'ai-chat';
          reply = dsResponse;
          conversationStates.set(conversation_id, state);
          console.log('No specific tool identified, defaulting to ai-chat');
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
      console.log('Tool selected but not confirmed, using AI-powered confirmation check');
      
      try {
        // Get DeepSeek API key for confirmation check with authenticated client
        const apiKey = await decryptDeepSeekKey(supabase, userId);
        
        const requestStart = Date.now();
        
        // Use the new AI-powered confirmation function
        const confirmationResult = await checkConfirmationWithAI(
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
            message_length: message.length
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
          type = 'actionable';
          state.confirmed = true;
          
          // SIMPLIFIED: Just pass conversation_id to the tool, let tool extract parameters
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
          
          conversationStates.delete(conversation_id);
          console.log('Tool confirmed via AI, parameters will be extracted by the tool itself');
        } else {
          conversationStates.set(conversation_id, state);
          console.log('Tool not confirmed via AI, continuing conversation');
        }
      } catch (deepseekError) {
        console.error('DeepSeek API call failed:', deepseekError);
        apiLogs = {
          error: {
            timestamp: new Date().toISOString(),
            message: deepseekError.message,
            type: 'deepseek_confirmation_error'
          }
        };
        
        // Fallback to simple confirmation logic
        const simpleConfirmation = ['yes', 'proceed', 'do it', 'go ahead', 'confirm'].some(word => 
          message.toLowerCase().includes(word)
        );
        
        if (simpleConfirmation) {
          type = 'actionable';
          state.confirmed = true;
          params = { conversation_id: conversation_id };
          reply = 'I understand you want to proceed. Let me help you with that.';
          conversationStates.delete(conversation_id);
        } else {
          reply = 'Could you please confirm if you want to proceed with this action?';
          conversationStates.set(conversation_id, state);
        }
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
      source_tool: source_tool || null,
      current_tool: currentTool,
      debug_info: {
        function_called: 'ai-orchestrator',
        tool_selected: intent || 'none',
        tool_confirmed: state.confirmed || false,
        conversation_state: !!conversationStates.get(conversation_id),
        conversation_length: state.messages.length,
        parameters_handled_by_tool: type === 'actionable' && intent !== 'ai-chat',
        ai_confirmation_used: !state.confirmed && state.tool ? true : false
      }
    };
    console.log('Sending response:', { intent, type, replyLength: reply.length, hasParams: Object.keys(params).length > 0, toolChain: state.toolChain, currentTool });

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    console.error('AI Orchestrator error:', err);
    console.error('Error stack:', err.stack);
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
