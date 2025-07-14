import { supabase } from "@/integrations/supabase/client";

export async function deepseekChat(userMessage: string): Promise<string> {
  try {
    // 1. Fetch encrypted key from database
    const { data: credentials, error } = await supabase
      .from('ai_credentials')
      .select('enc_key, iv, ciphertext')
      .eq('provider', 'deepseek')
      .single();

    if (error || !credentials) {
      throw new Error('DeepSeek API key not configured. Please add it in Settings.');
    }

    // 2. Decrypt the API key
    const keyBuffer = Uint8Array.from(atob(credentials.enc_key), c => c.charCodeAt(0));
    const iv = Uint8Array.from(atob(credentials.iv), c => c.charCodeAt(0));
    const ciphertext = Uint8Array.from(atob(credentials.ciphertext), c => c.charCodeAt(0));

    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyBuffer,
      { name: 'AES-GCM', length: 256 },
      false,
      ['decrypt']
    );

    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      cryptoKey,
      ciphertext
    );

    const apiKey = new TextDecoder().decode(decrypted);

    // 3. Call DeepSeek API
    const body = {
      model: 'deepseek-chat',
      temperature: 0,
      max_tokens: 512,
      messages: [
        { 
          role: 'system', 
          content: `You are an assistant that helps users query financial transaction data. 
          Generate PostgreSQL queries for the transactions table with these columns:
          - id (uuid)
          - client_id (uuid) 
          - mercury_transaction_id (text)
          - posted_at (timestamptz, nullable)
          - effective_at (timestamptz)
          - amount_cents (bigint)
          - counterparty (text)
          - note (text)
          - status (text)
          - transaction_type (text)
          - connection_code (text)
          - sync_request_id (uuid)
          
          Always include RLS filtering with: WHERE EXISTS (SELECT 1 FROM sync_requests sr WHERE sr.id = transactions.sync_request_id AND sr.user_id = auth.uid())
          
          Format your response as:
          \`\`\`sql
          [SQL QUERY HERE]
          \`\`\`
          
          [Natural language explanation of what the query does]` 
        },
        { role: 'user', content: userMessage }
      ]
    };

    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`DeepSeek API error: ${response.status} ${errorText}`);
    }

    const result = await response.json();
    return result.choices[0].message.content.trim();

  } catch (error) {
    console.error('DeepSeek chat error:', error);
    throw error;
  }
}