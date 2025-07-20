
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
        content: `You are a parameter extraction assistant for client registration. 
Extract the following information from the conversation:
- name: Client business name
- email: Client email address  
- ein: Client EIN/Tax ID (format: XX-XXXXXXX)

Return ONLY a JSON object with these fields. If information is missing, use null.
Example: {"name": "Acme Corp", "email": "contact@acme.com", "ein": "12-3456789"}`
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
    
    const { name, email, ein } = extractedParams;
    
    // Check if we have all required parameters
    if (!name || !email || !ein) {
      const missingFields = [];
      if (!name) missingFields.push('business name');
      if (!email) missingFields.push('email address');
      if (!ein) missingFields.push('EIN/Tax ID');
      
      const reply = `I need some additional information to register your client. Please provide the ${missingFields.join(', ')}.`;
      
      await saveMessage(supabase, conversation_id, 'assistant', reply);
      
      return new Response(JSON.stringify({
        success: false,
        needs_more_info: true,
        missing_fields: missingFields,
        reply
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    // Create the client
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .insert({
        name,
        email,
        taxid: ein,
        user_id: userId
      })
      .select()
      .single();
    
    if (clientError) {
      const reply = 'I encountered an error while registering the client. Please try again.';
      await saveMessage(supabase, conversation_id, 'assistant', reply);
      
      return new Response(JSON.stringify({
        success: false,
        error: 'Failed to create client',
        reply
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    const reply = `Great! I've successfully registered ${name} as a new client. Their client ID is ${client.id}. You can now set up connections and build dashboards for this client.`;
    await saveMessage(supabase, conversation_id, 'assistant', reply);
    
    return new Response(JSON.stringify({
      success: true,
      client_id: client.id,
      client_name: name,
      reply
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('Error in register-client tool:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message || 'Internal server error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
