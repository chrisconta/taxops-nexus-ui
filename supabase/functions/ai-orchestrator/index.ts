
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
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

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error(`Authentication failed: ${authError?.message || 'No user found'}`);
    }

    const { message, conversation_id } = await req.json();

    if (!message || message.length > 4000) {
      throw new Error('Invalid message: must be between 1-4000 characters');
    }

    // Get DeepSeek API key
    const { data: keyData, error: keyError } = await supabaseClient
      .from('ai_credentials')
      .select('enc_key, iv, ciphertext')
      .eq('provider', 'deepseek')
      .eq('user_id', user.id)
      .single();

    if (keyError || !keyData) {
      throw new Error('DeepSeek API key not configured');
    }

    // Decrypt API key
    const keyBytes = Uint8Array.from(atob(keyData.enc_key), c => c.charCodeAt(0));
    const iv = Uint8Array.from(atob(keyData.iv), c => c.charCodeAt(0));
    const ciphertext = Uint8Array.from(atob(keyData.ciphertext), c => c.charCodeAt(0));

    const cryptoKey = await crypto.subtle.importKey(
      'raw', keyBytes, { name: 'AES-GCM' }, false, ['decrypt']
    );

    const decryptedBytes = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv }, cryptoKey, ciphertext
    );

    const apiKey = new TextDecoder().decode(decryptedBytes);

    // Get or create conversation
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
      
      if (convError) throw new Error(`Failed to create conversation: ${convError.message}`);
      convId = conv.id;
    }

    // Get user settings for report rules
    const { data: settings } = await supabaseClient
      .from('user_settings')
      .select('reports_config')
      .eq('user_id', user.id)
      .single();

    // Extract rules for all report types or just general rules
    const config = settings?.reports_config as { rules?: Record<string, string>, markdown?: string } | null;
    const reportRules = config?.rules || {};
    const generalRules = config?.markdown || '';
    
    // Determine which specific rules to use based on the message content
    let specificRules = '';
    const reportTypes = ['form-1065', 'form-1120', 'form-1040', 'profit-loss', 'balance-sheet', 'cash-flow'];
    
    for (const reportType of reportTypes) {
      if (message.toLowerCase().includes(reportType.replace('-', ' ')) || 
          message.toLowerCase().includes(reportType)) {
        specificRules = reportRules[reportType] || '';
        break;
      }
    }
    
    // Combine general rules with specific rules if available
    const combinedRules = [generalRules, specificRules].filter(Boolean).join('\n\n');

    // Get recent conversation history
    const { data: recentMessages } = await supabaseClient
      .from('ai_messages')
      .select('role, content')
      .eq('conversation_id', convId)
      .order('created_at', { ascending: true })
      .limit(20);

    // Store user message
    await supabaseClient
      .from('ai_messages')
      .insert({ 
        conversation_id: convId, 
        role: 'user', 
        content: message 
      });

    // Construct messages for DeepSeek
    const systemMsg = { role: 'system', content: 'You are TaxOps AI assistant.' };
    const ruleMsg = { role: 'system', content: `Report Rules:\n${combinedRules}` };
    const history = (recentMessages || []).map(m => ({ 
      role: m.role, 
      content: m.content 
    }));
    const messages = [systemMsg, ruleMsg, ...history, { role: 'user', content: message }];

    // Call DeepSeek with streaming
    const dsRes = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        temperature: 0.7,
        max_tokens: 2048,
        stream: true,
        messages
      })
    });

    if (!dsRes.ok) {
      const errorText = await dsRes.text();
      throw new Error(`DeepSeek API error: ${dsRes.status} ${errorText}`);
    }

    // Set up SSE response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        let assistantReply = '';
        
        try {
          const reader = dsRes.body?.getReader();
          if (!reader) throw new Error('No response body');

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = new TextDecoder().decode(value);
            const lines = chunk.split('\n').filter(line => line.trim() !== '');

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6);
                if (data === '[DONE]') continue;

                try {
                  const parsed = JSON.parse(data);
                  const content = parsed.choices?.[0]?.delta?.content;
                  if (content) {
                    assistantReply += content;
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content })}\n\n`));
                  }
                } catch (e) {
                  // Skip invalid JSON
                }
              }
            }
          }

          // Check for SQL generation pattern
          const sqlMatch = assistantReply.match(/```json\s*\n\s*\{\s*"sql":\s*"([^"]+)",\s*"filename":\s*"([^"]+)"\s*\}\s*\n\s*```/);
          
          if (sqlMatch) {
            try {
              const [, sql, filename] = sqlMatch;
              
              // Execute SQL
              const { data: sqlResult, error: sqlError } = await supabaseClient.rpc('execute_dynamic_sql', { 
                query: sql 
              });

              if (sqlError) throw sqlError;

              // Convert to CSV
              const csvData = convertToCSV(sqlResult || []);
              
              // Upload to storage
              const filePath = `${user.id}/${convId}/${filename}`;
              const { data: uploadData, error: uploadError } = await supabaseClient.storage
                .from('reports')
                .upload(filePath, new Blob([csvData], { type: 'text/csv' }), {
                  upsert: true
                });

              if (uploadError) throw uploadError;

              // Get public URL
              const { data: urlData } = supabaseClient.storage
                .from('reports')
                .getPublicUrl(filePath);

              const downloadLink = `\n\n[Download report](${urlData.publicUrl})`;
              assistantReply += downloadLink;
              
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: downloadLink })}\n\n`));
            } catch (error) {
              console.error('SQL execution error:', error);
              const errorMsg = `\n\nError generating report: ${error.message}`;
              assistantReply += errorMsg;
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: errorMsg })}\n\n`));
            }
          }

          // Store assistant reply
          await supabaseClient
            .from('ai_messages')
            .insert({ 
              conversation_id: convId, 
              role: 'assistant', 
              content: assistantReply 
            });

          // Update conversation timestamp
          await supabaseClient
            .from('ai_conversations')
            .update({ updated_at: new Date().toISOString() })
            .eq('id', convId);

          controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
          controller.close();

        } catch (error) {
          console.error('Stream error:', error);
          controller.error(error);
        }
      }
    });

    return new Response(stream, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    console.error('Error in ai-orchestrator function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function convertToCSV(data: any[]): string {
  if (!data || data.length === 0) return '';
  
  const headers = Object.keys(data[0]);
  const rows = data.map(row => 
    headers.map(header => {
      const value = row[header];
      if (value === null || value === undefined) return '';
      if (typeof value === 'string' && value.includes(',')) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return String(value);
    }).join(',')
  );
  
  return [headers.join(','), ...rows].join('\n');
}
