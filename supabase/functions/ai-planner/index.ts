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

// Simple schema validation function
function validatePlan(plan: any): boolean {
  if (!plan || typeof plan !== 'object') return false;
  if (!plan.intent || typeof plan.intent !== 'string' || plan.intent.length === 0) return false;
  if (!Array.isArray(plan.steps) || plan.steps.length === 0) return false;
  
  for (const step of plan.steps) {
    if (!step.stepId || typeof step.stepId !== 'string' || step.stepId.length === 0) return false;
    if (!step.toolName || !["register_client", "create_connection", "build_dashboard"].includes(step.toolName)) return false;
    if (!step.params || typeof step.params !== 'object') return false;
    if (!step.description || typeof step.description !== 'string' || step.description.length === 0) return false;
  }
  
  return true;
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

    // Build system prompt with available tools and their capabilities
    const systemPrompt = `You are an intelligent tax operations assistant. Your job is to analyze user requests and create structured plans using available tools.

AVAILABLE TOOLS:
1. register_client - Register a new client in the system
   - Required params: name (string), email (string), companyId (string - use as taxid)
   - Use when: User wants to add/register a new client

2. create_connection - Set up a data connection for a client  
   - Required params: clientId (string), connectionType (string), credentials (object)
   - Use when: User wants to connect data sources like banks, accounting systems

3. build_dashboard - Create analytics dashboard for a client
   - Required params: clientId (string), metrics (array), timeframe (object with start/end dates)
   - Use when: User wants to create reports, dashboards, or analytics

INSTRUCTIONS:
- Analyze the user's request and break it down into logical steps
- Each step should use exactly one tool
- Generate unique stepId values (use crypto.randomUUID() format like: "550e8400-e29b-41d4-a716-446655440000")
- Provide clear, descriptive explanations for each step
- Only use the exact tool names listed above
- Make reasonable assumptions for missing parameters (use placeholder values that make sense)

Your response MUST be valid JSON matching this exact schema. DO NOT include any explanation text, code blocks, or markdown formatting. Return ONLY the JSON object:
{
  "intent": "brief summary of what the user wants to accomplish",
  "steps": [
    {
      "stepId": "unique-uuid-string",
      "toolName": "exact_tool_name_from_list_above", 
      "params": { "key": "value" },
      "description": "human readable description of this step"
    }
  ]
}

Example response for "Register client ABC Corp":
{
  "intent": "Register new client ABC Corp",
  "steps": [
    {
      "stepId": "550e8400-e29b-41d4-a716-446655440000",
      "toolName": "register_client",
      "params": {
        "name": "ABC Corp",
        "email": "contact@abccorp.com",
        "companyId": "123e4567-e89b-12d3-a456-426614174000"
      },
      "description": "Register ABC Corp as a new client in the system"
    }
  ]
}

IMPORTANT: For the register_client tool, always generate a proper UUID for companyId (format: 550e8400-e29b-41d4-a716-446655440000), not a simple string like "ACME-CORP-001".

CONTEXT: ${chatHistory.length > 0 ? `Previous conversation:\n${chatHistory.map((msg: any) => `${msg.role}: ${msg.content}`).join('\n')}\n\n` : ''}Current request: ${userPrompt}

REMEMBER: Respond with ONLY valid JSON, no other text or formatting.`;

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

    // Clean up the response content in case it's wrapped in markdown
    let cleanContent = content.trim();
    
    // Remove potential markdown code blocks
    if (cleanContent.startsWith('```json')) {
      cleanContent = cleanContent.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (cleanContent.startsWith('```')) {
      cleanContent = cleanContent.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }
    
    // Remove any explanatory text before/after JSON
    const jsonMatch = cleanContent.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      cleanContent = jsonMatch[0];
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

    // Validate plan structure
    if (!validatePlan(plan)) {
      console.error('Plan validation failed:', plan);
      return new Response(
        JSON.stringify({ error: 'Generated plan does not match required schema' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Successfully generated and validated plan:', plan);

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