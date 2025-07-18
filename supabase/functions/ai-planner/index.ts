import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.5';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Plan schema for validation
const planSchema = {
  type: "object",
  properties: {
    intent: { type: "string", minLength: 1 },
    steps: {
      type: "array",
      items: {
        type: "object",
        properties: {
          stepId: { type: "string", minLength: 1 },
          toolName: { type: "string", enum: ["register_client", "create_connection", "build_dashboard"] },
          params: { type: "object", additionalProperties: true },
          description: { type: "string", minLength: 1 },
        },
        required: ["stepId", "toolName", "params", "description"],
        additionalProperties: false,
      },
      minItems: 1,
    },
  },
  required: ["intent", "steps"],
  additionalProperties: false,
};

// Enhanced response validation function
function validateResponse(response: any): boolean {
  if (!response || typeof response !== 'object') return false;
  
  // Check if it's a validation response
  if (response.missing || response.invalid) {
    // Validation response format
    if (response.missing && !Array.isArray(response.missing)) return false;
    if (response.invalid && !Array.isArray(response.invalid)) return false;
    
    // Validate missing fields structure
    if (response.missing) {
      for (const item of response.missing) {
        if (!item.field || !item.reason) return false;
      }
    }
    
    // Validate invalid fields structure
    if (response.invalid) {
      for (const item of response.invalid) {
        if (!item.field || !item.reason) return false;
      }
    }
    
    return true;
  }
  
  // Check if it's a plan response
  if (response.intent && response.steps) {
    if (typeof response.intent !== 'string' || response.intent.length === 0) return false;
    if (!Array.isArray(response.steps) || response.steps.length === 0) return false;
    
    for (const step of response.steps) {
      if (!step.stepId || typeof step.stepId !== 'string' || step.stepId.length === 0) return false;
      if (!step.toolName || !["register_client", "create_connection", "build_dashboard"].includes(step.toolName)) return false;
      if (!step.params || typeof step.params !== 'object') return false;
      if (!step.description || typeof step.description !== 'string' || step.description.length === 0) return false;
    }
    
    return true;
  }
  
  return false;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization header required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client with user's JWT token
    const supabase = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } }
    });

    // Verify authentication
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authentication' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch DeepSeek credentials
    const { data: credentials, error: credError } = await supabase
      .from('ai_credentials')
      .select('enc_key, iv, ciphertext')
      .eq('provider', 'deepseek')
      .single();

    if (credError || !credentials) {
      return new Response(
        JSON.stringify({ error: 'DeepSeek API key not configured. Please add it in Settings.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Decrypt the API key
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

    const deepseekApiKey = new TextDecoder().decode(decrypted);

    const { userPrompt, chatHistory = [] } = await req.json();
    
    if (!userPrompt || typeof userPrompt !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Missing or invalid userPrompt' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build system prompt with parameter inspection and validation logic
    const systemPrompt = `You are an intelligent tax operations assistant with parameter inspection capabilities. 

For register_client requests, you MUST first inspect the available parameters and validate them before generating any plans.

PARAMETER INSPECTION RULES:
1. Check for required client registration parameters: name, email, ein
2. Validate format and content of each parameter
3. Return validation response if any issues found
4. Only generate plans when all parameters are valid

RESPONSE FORMATS:

1. For missing/invalid parameters, return ONLY this JSON structure:
{
  "missing": [
    {"field": "name", "reason": "Company name is required", "hint": "Enter the full legal name of the company"}
  ],
  "invalid": [
    {"field": "ein", "reason": "Invalid EIN format", "hint": "Enter the 9-digit EIN in format 12-3456789"}
  ]
}

2. For valid parameters, return a plan with this structure:
{
  "intent": "Register [company name] as a new client",
  "steps": [
    {
      "stepId": "550e8400-e29b-41d4-a716-446655440000",
      "toolName": "register_client",
      "params": {
        "name": "[company name]",
        "email": "[email address]",
        "ein": "[formatted EIN]"
      },
      "description": "Register [company name] as a new client in the system"
    }
  ]
}

VALIDATION RULES:
- name: Required, must contain letters, max 200 chars
- email: Required, valid email format, max 254 chars  
- ein: Required, 9 digits, format XX-XXXXXXX or XXXXXXXXX

AVAILABLE TOOLS:
1. register_client - Register a new client in the system
   - Required params: name (string), email (string), ein (string)

2. create_connection - Set up a data connection for a client
   - Required params: clientId (string), connectionType (string), credentials (object)

3. build_dashboard - Create analytics dashboard for a client
   - Required params: clientId (string), metrics (array), timeframe (object)

CONTEXT: ${chatHistory.length > 0 ? `Previous conversation:\n${chatHistory.map((msg: any) => `${msg.role}: ${msg.content}`).join('\n')}\n\n` : ''}Current request: ${userPrompt}

OUTPUT ONLY JSON - NO ADDITIONAL TEXT.`;

    console.log('Calling DeepSeek with system prompt length:', systemPrompt.length);

    // Call DeepSeek API
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${deepseekApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.1, // Lower temperature for more consistent structured output
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('DeepSeek API error:', response.status, errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to generate plan' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) {
      console.error('No content from DeepSeek response:', data);
      return new Response(
        JSON.stringify({ error: 'No content generated' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('DeepSeek response:', content);

    // Advanced JSON cleaning to strip any explanatory text
    let cleanContent = content.trim();
    
    // If it doesn't start with "{", drop everything before the first "{"
    if (!cleanContent.startsWith('{')) {
      const jsonStartIndex = cleanContent.indexOf('{');
      if (jsonStartIndex >= 0) {
        cleanContent = cleanContent.slice(jsonStartIndex);
      }
    }
    
    // Remove potential markdown code blocks
    if (cleanContent.startsWith('```json')) {
      cleanContent = cleanContent.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (cleanContent.startsWith('```')) {
      cleanContent = cleanContent.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }
    
    // Extract the JSON object (from first { to last })
    const firstBrace = cleanContent.indexOf('{');
    const lastBrace = cleanContent.lastIndexOf('}');
    if (firstBrace >= 0 && lastBrace > firstBrace) {
      cleanContent = cleanContent.slice(firstBrace, lastBrace + 1);
    }

    console.log('Cleaned content for parsing:', cleanContent);

    // Parse and validate the plan
    let plan;
    try {
      plan = JSON.parse(cleanContent);
    } catch (parseError) {
      console.error('Failed to parse JSON from DeepSeek:', parseError, 'Original content:', content, 'Cleaned content:', cleanContent);
      return new Response(
        JSON.stringify({ error: `LLM returned invalid JSON: ${parseError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate response structure (either validation or plan)
    if (!validateResponse(plan)) {
      console.error('Response validation failed:', plan);
      return new Response(
        JSON.stringify({ error: 'Generated response does not match required schema' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Successfully generated and validated response:', plan);

    return new Response(JSON.stringify(plan), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in ai-planner function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});