
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ConversationMessage {
  role: string;
  content: string;
}

async function loadConversationHistory(supabase: any, conversationId: string): Promise<ConversationMessage[]> {
  const { data, error } = await supabase
    .from('ai_messages')
    .select('role, content, created_at')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })
    .limit(15);
  
  if (error) {
    console.error('Error loading conversation history:', error);
    return [];
  }
  
  return (data || []).map(msg => ({
    role: msg.role === 'user' ? 'user' : 'assistant',
    content: msg.content
  }));
}

async function extractParameters(apiKey: string, conversationHistory: ConversationMessage[]) {
  const extractionPrompt = {
    model: 'deepseek-chat',
    temperature: 0,
    max_tokens: 256,
    messages: [
      {
        role: 'system',
        content: `You are a parameter extraction assistant for dashboard creation.
Extract the following information from the conversation:
- client_id: Client UUID (if mentioned)
- client_name: Client business name (to lookup client_id)  
- dashboard_name: Name for the dashboard
- metrics: Array of metrics to include (revenue, expenses, transactions, etc.)
- timeframe: Time period (last 30 days, this year, etc.)

Return ONLY a JSON object with these fields. If information is missing, use null.
Example: {"client_id": null, "client_name": "Acme Corp", "dashboard_name": "Financial Overview", "metrics": ["revenue", "expenses"], "timeframe": "last 30 days"}`
      },
      ...conversationHistory
    ]
  };

  const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(extractionPrompt)
  });

  if (!response.ok) {
    throw new Error(`DeepSeek API error: ${response.status}`);
  }

  const data = await response.json();
  const extractedText = data.choices[0].message.content.trim();
  
  try {
    return JSON.parse(extractedText);
  } catch {
    return {};
  }
}

async function decryptDeepSeekKey(supabase: any, userId: string) {
  const { data, error } = await supabase
    .from('ai_credentials')
    .select('enc_key, iv, ciphertext')
    .eq('provider', 'deepseek')
    .eq('user_id', userId)
    .single();
  
  if (error || !data) {
    throw new Error('DeepSeek API key not configured');
  }

  try {
    const keyBytes = Uint8Array.from(atob(data.enc_key), c => c.charCodeAt(0));
    const iv = Uint8Array.from(atob(data.iv), c => c.charCodeAt(0));
    const ciphertext = Uint8Array.from(atob(data.ciphertext), c => c.charCodeAt(0));
    
    const cryptoKey = await crypto.subtle.importKey('raw', keyBytes, { name: 'AES-GCM' }, false, ['decrypt']);
    const decryptedBytes = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, cryptoKey, ciphertext);
    
    return new TextDecoder().decode(decryptedBytes);
  } catch (decryptError) {
    throw new Error('Failed to decrypt DeepSeek API key');
  }
}

async function saveMessage(supabase: any, conversationId: string, role: string, content: string) {
  const { error } = await supabase
    .from('ai_messages')
    .insert({
      conversation_id: conversationId,
      role,
      content
    });
  
  if (error) {
    console.error('Error saving message:', error);
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { conversation_id } = await req.json();

    if (!conversation_id) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'conversation_id required' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Missing authorization header' 
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    
    const supabase = createClient(supabaseUrl!, supabaseAnonKey!, {
      global: { headers: { Authorization: authHeader } }
    });

    const jwt = authHeader.replace('Bearer ', '');
    const { data: userData, error: userError } = await supabase.auth.getUser(jwt);
    
    if (userError || !userData.user) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Invalid authorization token' 
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const userId = userData.user.id;
    
    // Load conversation history
    const conversationHistory = await loadConversationHistory(supabase, conversation_id);
    
    // Get DeepSeek API key and extract parameters
    const apiKey = await decryptDeepSeekKey(supabase, userId);
    const extractedParams = await extractParameters(apiKey, conversationHistory);
    
    let { client_id, client_name, dashboard_name, metrics, timeframe } = extractedParams;
    
    // If we have client_name but no client_id, look up the client
    if (!client_id && client_name) {
      const { data: clients } = await supabase
        .from('clients')
        .select('id, name')
        .eq('user_id', userId)
        .ilike('name', `%${client_name}%`)
        .limit(1);
      
      if (clients && clients.length > 0) {
        client_id = clients[0].id;
      }
    }
    
    // Set defaults if not provided
    if (!dashboard_name) dashboard_name = 'Financial Dashboard';
    if (!metrics) metrics = ['revenue', 'expenses', 'transactions'];
    if (!timeframe) timeframe = 'last 30 days';
    
    // Check if we have required parameters
    if (!client_id) {
      const reply = `I need to know which client this dashboard is for. Please specify the client name or ID.`;
      
      await saveMessage(supabase, conversation_id, 'assistant', reply);
      
      return new Response(JSON.stringify({
        success: false,
        needs_more_info: true,
        missing_fields: ['client selection'],
        reply
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    // Create dashboard configuration
    const dashboardConfig = {
      name: dashboard_name,
      client_id,
      metrics,
      timeframe,
      widgets: metrics.map((metric: string, index: number) => ({
        id: `widget_${index + 1}`,
        type: metric === 'transactions' ? 'table' : 'chart',
        title: metric.charAt(0).toUpperCase() + metric.slice(1),
        metric,
        position: { x: (index % 2) * 6, y: Math.floor(index / 2) * 4, w: 6, h: 4 }
      })),
      created_at: new Date().toISOString()
    };
    
    // Create the dashboard
    const { data: dashboard, error: dashboardError } = await supabase
      .from('dashboards')
      .insert({
        name: dashboard_name,
        user_id: userId,
        config: dashboardConfig
      })
      .select()
      .single();
    
    if (dashboardError) {
      const reply = 'I encountered an error while creating the dashboard. Please try again.';
      await saveMessage(supabase, conversation_id, 'assistant', reply);
      
      return new Response(JSON.stringify({
        success: false,
        error: 'Failed to create dashboard',
        reply
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    const reply = `Excellent! I've created the "${dashboard_name}" dashboard with ${metrics.length} widgets showing ${metrics.join(', ')} for the ${timeframe}. You can view and customize it from the Analytics page.`;
    await saveMessage(supabase, conversation_id, 'assistant', reply);
    
    return new Response(JSON.stringify({
      success: true,
      dashboard_id: dashboard.id,
      dashboard_name,
      reply
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('Error in build-dashboard tool:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message || 'Internal server error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
