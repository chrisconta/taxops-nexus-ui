
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Context analysis function using DeepSeek
async function analyzeUserIntent(message: string, apiKey: string, conversationHistory: any[] = []) {
  console.log('Analyzing user intent for potential tool switching');
  
  const instruction = 
    'You are analyzing if the user wants to switch from general chat to a specific tool. ' +
    'Available tools: register_client, create_connection, build_dashboard. ' +
    'Respond in JSON as {"needs_tool_switch": true|false, "suggested_tool": "<tool_name>", "reasoning": "<explanation>"}. ' +
    'Only suggest tool switch if the user clearly wants to perform a specific business task.';

  const messages = [
    { role: 'system', content: instruction },
    ...conversationHistory.slice(-3), // Last 3 messages for context
    { role: 'user', content: message }
  ];

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
        max_tokens: 256,
        messages
      })
    });

    if (!response.ok) {
      console.error('DeepSeek API error in intent analysis:', response.status);
      return null;
    }

    const data = await response.json();
    const content = data.choices[0].message.content.trim();
    
    try {
      const cleaned = content.replace(/```json/gi, "```").replace(/```/g, "");
      const match = cleaned.match(/\{[\s\S]*?\}/);
      return match ? JSON.parse(match[0]) : null;
    } catch {
      return null;
    }
  } catch (error) {
    console.error('Error in intent analysis:', error);
    return null;
  }
}

// Function to call ai-orchestrator for tool switching
async function callOrchestrator(message: string, conversationId: string, authHeader: string) {
  console.log('Calling ai-orchestrator for tool switching');
  
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const response = await fetch(`${supabaseUrl}/functions/v1/ai-orchestrator`, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
        'apikey': Deno.env.get('SUPABASE_ANON_KEY') || ''
      },
      body: JSON.stringify({
        message,
        conversation_id: conversationId,
        source_tool: 'ai-chat'
      })
    });

    if (!response.ok) {
      console.error('Orchestrator call failed:', response.status);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('Error calling orchestrator:', error);
    return null;
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    // Get user from JWT token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error(`Authentication failed: ${authError?.message || 'No user found'}`);
    }

    const { message, conversation_id, source_tool, tool_chain } = await req.json();

    if (!message || message.length > 2000) {
      throw new Error('Invalid message: must be between 1-2000 characters');
    }

    console.log('AI Chat request for user:', user.id, 'Conversation:', conversation_id, 'Source tool:', source_tool);

    // 1) Fetch DeepSeek key
    const { data: keyData, error: keyError } = await supabaseClient
      .from('ai_credentials')
      .select('enc_key, iv, ciphertext')
      .eq('provider', 'deepseek')
      .eq('user_id', user.id)
      .single();

    if (keyError || !keyData) {
      throw new Error('DeepSeek API key not configured');
    }

    // Decrypt the API key
    const keyBytes = Uint8Array.from(atob(keyData.enc_key), c => c.charCodeAt(0));
    const iv = Uint8Array.from(atob(keyData.iv), c => c.charCodeAt(0));
    const ciphertext = Uint8Array.from(atob(keyData.ciphertext), c => c.charCodeAt(0));

    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyBytes,
      { name: 'AES-GCM' },
      false,
      ['decrypt']
    );

    const decryptedBytes = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      cryptoKey,
      ciphertext
    );

    const apiKey = new TextDecoder().decode(decryptedBytes);

    // 2) Upsert conversation header if new
    let convId = conversation_id;
    if (!convId) {
      const { data: conv, error: convError } = await supabaseClient
        .from('ai_conversations')
        .insert({ 
          user_id: user.id, 
          title: message.slice(0, 60) 
        })
        .select('id')
        .single();
      
      if (convError) {
        throw new Error(`Failed to create conversation: ${convError.message}`);
      }
      convId = conv.id;
    }

    // 3) Get recent conversation history for context
    const { data: recentMessages } = await supabaseClient
      .from('ai_messages')
      .select('role, content')
      .eq('conversation_id', convId)
      .order('created_at', { ascending: false })
      .limit(6);

    const conversationHistory = (recentMessages || []).reverse().map(m => ({
      role: m.role,
      content: m.content
    }));

    // 4) Analyze user intent for potential tool switching (only if not already from a tool)
    let shouldSwitchTool = false;
    let toolSwitchResponse = null;

    if (!source_tool) {
      const intentAnalysis = await analyzeUserIntent(message, apiKey, conversationHistory);
      
      if (intentAnalysis?.needs_tool_switch) {
        console.log('Intent analysis suggests tool switch:', intentAnalysis.suggested_tool);
        
        // Call orchestrator for tool switching
        toolSwitchResponse = await callOrchestrator(message, convId, authHeader);
        
        if (toolSwitchResponse && toolSwitchResponse.intent !== 'general_chat') {
          shouldSwitchTool = true;
          console.log('Tool switch successful, orchestrator response:', toolSwitchResponse);
        }
      }
    }

    // 5) Store user message
    const { error: userMsgError } = await supabaseClient
      .from('ai_messages')
      .insert({ 
        conversation_id: convId, 
        role: 'user', 
        content: message 
      });

    if (userMsgError) {
      throw new Error(`Failed to store user message: ${userMsgError.message}`);
    }

    // 6) If tool switch is happening, return orchestrator response
    if (shouldSwitchTool && toolSwitchResponse) {
      // Store the orchestrator's response as assistant message
      const { error: assistantMsgError } = await supabaseClient
        .from('ai_messages')
        .insert({ 
          conversation_id: convId, 
          role: 'assistant', 
          content: toolSwitchResponse.reply,
          api_logs: {
            tool_switch: true,
            target_tool: toolSwitchResponse.intent,
            source_tool: 'ai-chat'
          }
        });

      if (assistantMsgError) {
        console.error('Failed to store tool switch message:', assistantMsgError);
      }

      return new Response(JSON.stringify({ 
        conversation_id: convId, 
        assistant: toolSwitchResponse.reply,
        user: message,
        tool_switch: {
          target_tool: toolSwitchResponse.intent,
          type: toolSwitchResponse.type
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 7) Regular chat flow - Call DeepSeek for general conversation
    const systemPrompt = source_tool 
      ? `You are a helpful AI assistant. The user came from the ${source_tool} tool, so they may be asking follow-up questions or switching context. ${tool_chain ? `Recent tools used: ${tool_chain.join(', ')}.` : ''}`
      : 'You are a helpful AI assistant.';

    const requestBody = {
      model: 'deepseek-chat',
      temperature: 0.7,
      max_tokens: 512,
      messages: [
        { role: 'system', content: systemPrompt },
        ...conversationHistory,
        { role: 'user', content: message }
      ]
    };

    const dsRes = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!dsRes.ok) {
      const errorText = await dsRes.text();
      throw new Error(`DeepSeek API error: ${dsRes.status} ${errorText}`);
    }

    const dsData = await dsRes.json();
    const assistant = dsData.choices[0].message.content.trim();

    // Prepare API logs
    const apiLogs = {
      request: {
        url: 'https://api.deepseek.com/v1/chat/completions',
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey.slice(0, 10)}...`,
          'Content-Type': 'application/json'
        },
        body: requestBody
      },
      response: {
        status: dsRes.status,
        statusText: dsRes.statusText,
        data: dsData
      },
      timestamp: new Date().toISOString(),
      source_tool: source_tool || null,
      tool_chain: tool_chain || []
    };

    // 8) Store assistant reply
    const { error: assistantMsgError } = await supabaseClient
      .from('ai_messages')
      .insert({ 
        conversation_id: convId, 
        role: 'assistant', 
        content: assistant,
        api_logs: apiLogs
      });

    if (assistantMsgError) {
      throw new Error(`Failed to store assistant message: ${assistantMsgError.message}`);
    }

    // 9) Update conversation timestamp
    await supabaseClient
      .from('ai_conversations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', convId);

    return new Response(JSON.stringify({ 
      conversation_id: convId, 
      assistant,
      user: message
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in ai-chat function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
