import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ConversationState {
  tool?: string;
  confirmed?: boolean;
}

const conversationStates = new Map<string, ConversationState>();

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
  const keyBytes = Uint8Array.from(atob(data.enc_key), c => c.charCodeAt(0));
  const iv = Uint8Array.from(atob(data.iv), c => c.charCodeAt(0));
  const ciphertext = Uint8Array.from(atob(data.ciphertext), c => c.charCodeAt(0));
  const cryptoKey = await crypto.subtle.importKey('raw', keyBytes, { name: 'AES-GCM' }, false, ['decrypt']);
  const decryptedBytes = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, cryptoKey, ciphertext);
  return new TextDecoder().decode(decryptedBytes);
}

async function askDeepSeek(apiKey: string, messages: Array<{ role: string; content: string }>) {
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
    throw new Error(`DeepSeek API error: ${res.status} ${text}`);
  }
  const data = await res.json();
  return data.choices[0].message.content.trim();
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, conversation_id } = await req.json();

    if (!conversation_id) {
      return new Response(JSON.stringify({ error: 'conversation_id required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) {
      return new Response(JSON.stringify({ error: 'Invalid authorization token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const userId = userData.user.id;

    const apiKey = await decryptDeepSeekKey(supabase, userId);

    const state = conversationStates.get(conversation_id) || {};

    let reply = '';
    let intent = state.tool || '';
    let type: 'conversational' | 'actionable' = 'conversational';

    if (!state.tool) {
      const instruction =
        'You are helping an AI orchestrator decide which tool to use based on the user\'s request. ' +
        'Available tools: register_client - Register a new client (needs name, email, ein); ' +
        'create_connection - Create a connection for a client (needs clientId, connectionType, credentials); ' +
        'build_dashboard - Build a dashboard for a client (needs clientId, metrics, timeframe). ' +
        'Respond in JSON as {"tool": "<tool>", "reply": "<message>"}.';

      const dsResponse = await askDeepSeek(apiKey, [
        { role: 'system', content: instruction },
        { role: 'user', content: message }
      ]);

      try {
        const parsed = JSON.parse(dsResponse);
        state.tool = parsed.tool;
        intent = state.tool || '';
        reply = parsed.reply || '';
        state.confirmed = false;
        conversationStates.set(conversation_id, state);
      } catch (_) {
        reply = dsResponse;
      }
    } else if (!state.confirmed) {
      const instruction =
        `You are helping an AI orchestrator with the tool "${state.tool}" already selected. ` +
        'Determine if the user\'s message confirms they want to proceed with this tool. ' +
        'Respond in JSON as {"confirmed": true|false, "reply": "<message>"}.';

      const dsResponse = await askDeepSeek(apiKey, [
        { role: 'system', content: instruction },
        { role: 'user', content: message }
      ]);

      try {
        const parsed = JSON.parse(dsResponse);
        reply = parsed.reply || '';
        intent = state.tool || '';
        if (parsed.confirmed === true) {
          type = 'actionable';
          state.confirmed = true;
          conversationStates.delete(conversation_id);
        } else {
          conversationStates.set(conversation_id, state);
        }
      } catch (_) {
        reply = dsResponse;
        intent = state.tool || '';
      }
    }

    return new Response(
      JSON.stringify({ intent, params: {}, type, reply }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || 'Invalid request' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
