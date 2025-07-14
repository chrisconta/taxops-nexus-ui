import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    const { message, conversation_id } = await req.json();

    if (!message || message.length > 2000) {
      throw new Error('Invalid message: must be between 1-2000 characters');
    }

    console.log('AI Chat request for user:', user.id, 'Conversation:', conversation_id);

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

    // 3) Store user message
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

    // 4) Call DeepSeek
    const requestBody = {
      model: 'deepseek-chat',
      temperature: 0.7,
      max_tokens: 512,
      messages: [
        { role: 'system', content: 'You are a helpful AI assistant.' },
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
      timestamp: new Date().toISOString()
    };

    // 5) Store assistant reply
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

    // 6) Update conversation timestamp
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