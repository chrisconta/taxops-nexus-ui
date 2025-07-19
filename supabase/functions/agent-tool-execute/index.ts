import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.5';
import Ajv from 'https://esm.sh/ajv@8.12.0';
import addFormats from 'https://esm.sh/ajv-formats@2.1.1';

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Tool registry schemas
const toolRegistry = {
  register_client: {
    type: "object",
    properties: {
      name: { type: "string", minLength: 1, maxLength: 200 },
      email: { type: "string", format: "email", maxLength: 254 },
      ein: { type: "string", pattern: "^\\d{2}-?\\d{7}$" },
    },
    required: ["name", "email", "ein"],
    additionalProperties: false,
  },
  create_connection: {
    type: "object",
    properties: {
      clientId: { type: "string", pattern: "^[a-f0-9\\-]{36}$" },
      connectionType: { type: "string", enum: ["bank", "erp", "manual"] },
      credentials: {
        type: "object",
        patternProperties: {
          "^[a-zA-Z0-9_]+$": { type: "string" },
        },
        additionalProperties: false,
      },
    },
    required: ["clientId", "connectionType", "credentials"],
    additionalProperties: false,
  },
  build_dashboard: {
    type: "object",
    properties: {
      clientId: { type: "string", pattern: "^[a-f0-9\\-]{36}$" },
      metrics: {
        type: "array",
        items: { type: "string", enum: ["revenue", "expenses", "taxLiability"] },
        minItems: 1,
      },
      timeframe: {
        type: "object",
        properties: {
          start: { type: "string", format: "date" },
          end: { type: "string", format: "date" },
        },
        required: ["start", "end"],
        additionalProperties: false,
      },
    },
    required: ["clientId", "metrics", "timeframe"],
    additionalProperties: false,
  },
} as const;

type ToolName = keyof typeof toolRegistry;

// Initialize AJV validator
const ajv = new Ajv({ allErrors: true, strict: true });
addFormats(ajv);

function validateToolParams(toolName: ToolName, params: unknown): boolean {
  const schema = toolRegistry[toolName];
  const validate = ajv.compile(schema);
  const valid = validate(params);
  if (!valid) {
    console.error("Tool validation errors:", validate.errors);
  }
  return valid;
}

// Helper function to normalize EIN
function normalizeEIN(ein: string): string {
  const numbersOnly = ein.replace(/[-\s]/g, '');
  if (/^\d{9}$/.test(numbersOnly)) {
    return numbersOnly.replace(/^(\d{2})(\d{7})$/, '$1-$2');
  }
  return ein;
}

// Get DeepSeek API key
async function getDeepSeekKey(supabase: any, userId: string): Promise<string> {
  const { data: keyData, error: keyError } = await supabase
    .from('ai_credentials')
    .select('enc_key, iv, ciphertext')
    .eq('provider', 'deepseek')
    .eq('user_id', userId)
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

  return new TextDecoder().decode(decryptedBytes);
}

// Load conversation history from database
async function loadConversationHistory(supabase: any, conversationId: string): Promise<Array<{ role: string; content: string }>> {
  console.log('Loading conversation history for parameter extraction:', conversationId);
  
  try {
    const { data, error } = await supabase
      .from('ai_messages')
      .select('role, content, created_at')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .limit(20);
    
    if (error) {
      console.error('Error loading conversation history:', error);
      return [];
    }
    
    const history = (data || []).map(msg => ({
      role: msg.role === 'user' ? 'user' : 'assistant',
      content: msg.content
    }));
    
    console.log('Loaded conversation history for tools:', history.length, 'messages');
    return history;
  } catch (error) {
    console.error('Failed to load conversation history:', error);
    return [];
  }
}

// Tool-specific parameter extraction using DeepSeek
async function extractParametersWithDeepSeek(
  toolName: ToolName,
  conversationHistory: Array<{ role: string; content: string }>,
  apiKey: string
): Promise<{ params?: any; missing?: string[]; needsMoreInfo?: boolean; reply?: string }> {
  console.log(`Extracting parameters for ${toolName} using DeepSeek`);
  
  let instruction = '';
  let examples = '';
  
  switch (toolName) {
    case 'register_client':
      instruction = 
        'You are helping extract client registration parameters from a conversation. ' +
        'You need: name (string), email (valid email), ein (format: XX-XXXXXXX or XXXXXXXXX). ' +
        'Look through the ENTIRE conversation history to find this information. ' +
        'The user may have provided details in different messages.';
      
      examples = 
        'Examples:\n' +
        '- "Register ABC Corp, email is info@abc.com, EIN 12-3456789" → {"name": "ABC Corp", "email": "info@abc.com", "ein": "12-3456789"}\n' +
        '- "Company called TechStart, their email: hello@techstart.io, EIN is 987654321" → {"name": "TechStart", "email": "hello@techstart.io", "ein": "98-7654321"}\n' +
        '- "I want to register a new client" (no details) → Missing info needed';
      break;
      
    case 'create_connection':
      instruction = 
        'You are helping extract connection parameters from a conversation. ' +
        'You need: clientId (UUID), connectionType (bank/erp/manual), credentials (object with username/password/etc). ' +
        'Look through the conversation to find client references and connection details.';
      
      examples = 
        'Examples:\n' +
        '- "Connect to bank for client 123e4567-e89b-12d3-a456-426614174000, username: admin, password: secret" → {"clientId": "123e4567-e89b-12d3-a456-426614174000", "connectionType": "bank", "credentials": {"username": "admin", "password": "secret"}}\n' +
        '- "Set up ERP connection for ABC Corp" → Need clientId and credentials';
      break;
      
    case 'build_dashboard':
      instruction = 
        'You are helping extract dashboard parameters from a conversation. ' +
        'You need: clientId (UUID), metrics (array: revenue/expenses/taxLiability), timeframe (start/end dates). ' +
        'Look through the conversation for client and dashboard requirements.';
      
      examples = 
        'Examples:\n' +
        '- "Build dashboard for client 123e4567-e89b-12d3-a456-426614174000 showing revenue and expenses for 2024" → {"clientId": "123e4567-e89b-12d3-a456-426614174000", "metrics": ["revenue", "expenses"], "timeframe": {"start": "2024-01-01", "end": "2024-12-31"}}\n' +
        '- "Create a report for ABC Corp" → Need clientId, metrics, and timeframe';
      break;
  }
  
  const fullInstruction = `${instruction}\n\n${examples}\n\n` +
    'CRITICAL: Respond in JSON format only:\n' +
    '- If you have ALL required parameters: {"params": {...}, "ready": true}\n' +
    '- If missing info: {"missing": ["field1", "field2"], "needsMoreInfo": true, "reply": "What specific information do you need?"}\n' +
    'Always try to extract any available information, even if incomplete.';

  try {
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        temperature: 0.1,
        max_tokens: 512,
        messages: [
          { role: 'system', content: fullInstruction },
          ...conversationHistory
        ]
      })
    });

    if (!response.ok) {
      console.error('DeepSeek API error in parameter extraction:', response.status);
      throw new Error(`DeepSeek API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content.trim();
    
    console.log('DeepSeek parameter extraction response:', content);
    
    try {
      // Try to extract JSON from the response
      const cleaned = content.replace(/```json/gi, "```").replace(/```/g, "");
      const match = cleaned.match(/\{[\s\S]*?\}/);
      const parsed = match ? JSON.parse(match[0]) : JSON.parse(content);
      
      return parsed;
    } catch (parseError) {
      console.error('Failed to parse DeepSeek response:', parseError, 'Content:', content);
      return {
        needsMoreInfo: true,
        reply: `I need more information to proceed with ${toolName}. Please provide the required details.`,
        missing: ['all']
      };
    }
  } catch (error) {
    console.error('Error in parameter extraction:', error);
    throw error;
  }
}

// Context analysis function using DeepSeek
async function analyzePostExecutionContext(toolName: string, result: any, apiKey: string) {
  console.log('Analyzing post-execution context for potential follow-up actions');
  
  const instruction = 
    `You just executed the ${toolName} tool with result: ${JSON.stringify(result)}. ` +
    'Analyze if the user might want to do a follow-up action with another tool. ' +
    'Available tools: register_client, create_connection, build_dashboard, general_chat. ' +
    'Respond in JSON as {"suggest_followup": true|false, "suggested_tool": "<tool_name>", "followup_message": "<helpful message about next steps>"}. ' +
    'Only suggest follow-up if it\'s a logical next step.';

  try {
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        temperature: 0.1,
        max_tokens: 256,
        messages: [
          { role: 'system', content: instruction }
        ]
      })
    });

    if (!response.ok) {
      console.error('DeepSeek API error in post-execution analysis:', response.status);
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
    console.error('Error in post-execution analysis:', error);
    return null;
  }
}

// Tool execution functions
async function registerClient(params: any, supabase: any, userId: string) {
  console.log('Running register_client with params:', params);
  
  // Generate UUID server-side
  const clientId = crypto.randomUUID();
  
  // Normalize EIN format
  const normalizedEIN = normalizeEIN(params.ein);
  
  // Check for duplicate clients by EIN
  const { data: existingClient, error: checkError } = await supabase
    .from('clients')
    .select('id, name, email, taxid')
    .eq('taxid', normalizedEIN)
    .eq('user_id', userId)
    .maybeSingle();

  if (checkError) {
    console.error('Error checking for duplicate client:', checkError);
  }

  if (existingClient) {
    return {
      success: false,
      duplicate: {
        existingClientId: existingClient.id,
        name: existingClient.name,
        ein: existingClient.taxid,
        email: existingClient.email
      },
      message: `Client with EIN ${normalizedEIN} already exists`
    };
  }

  // Create client in database
  const { data, error } = await supabase
    .from('clients')
    .insert({
      id: clientId,
      name: params.name.trim(),
      email: params.email.toLowerCase().trim(),
      taxid: normalizedEIN,
      user_id: userId
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to register client: ${error.message}`);
  }

  return { 
    success: true, 
    clientId: data.id,
    message: `Client "${params.name}" registered successfully with EIN ${normalizedEIN}`
  };
}

async function createConnection(params: any, supabase: any) {
  console.log('Running create_connection with params:', params);
  
  // Save client credentials
  const { data, error } = await supabase.rpc('save_client_credentials', {
    p_client_id: params.clientId,
    p_connection_code: params.connectionType,
    p_credentials: params.credentials,
    p_connection_name: `${params.connectionType} connection`
  });

  if (error) {
    throw new Error(`Failed to create connection: ${error.message}`);
  }

  return {
    success: true,
    connectionId: data,
    message: `${params.connectionType} connection created successfully`
  };
}

async function buildDashboard(params: any, supabase: any, userId: string) {
  console.log('Running build_dashboard with params:', params);
  
  // Create dashboard configuration
  const dashboardConfig = {
    clientId: params.clientId,
    metrics: params.metrics,
    timeframe: params.timeframe,
    createdAt: new Date().toISOString()
  };

  const { data, error } = await supabase
    .from('dashboards')
    .insert({
      name: `Dashboard for ${params.clientId}`,
      config: dashboardConfig,
      user_id: userId
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to build dashboard: ${error.message}`);
  }

  return {
    success: true,
    dashboardId: data.id,
    message: `Dashboard created with ${params.metrics.length} metrics`
  };
}

async function executeToolRunner(toolName: ToolName, params: any, supabase: any, userId: string) {
  switch (toolName) {
    case "register_client":
      return await registerClient(params, supabase, userId);
    case "create_connection":
      return await createConnection(params, supabase);
    case "build_dashboard":
      return await buildDashboard(params, supabase, userId);
    default:
      throw new Error(`Unsupported tool: ${toolName}`);
  }
}

async function logToolInvocation(
  supabase: any,
  userId: string,
  toolName: string,
  params: unknown,
  success: boolean,
  errorMessage: string | null,
  result?: any,
  executionTimeMs?: number
) {
  try {
    await supabase
      .from('agent_tool_logs')
      .insert({
        user_id: userId,
        tool_name: toolName,
        parameters: params,
        success,
        error_message: errorMessage,
        result: result || null,
        execution_time_ms: executionTimeMs || null
      });
  } catch (error) {
    console.error('Failed to log tool invocation:', error);
  }
}

// Save message to conversation
async function saveMessage(
  supabase: any, 
  conversationId: string, 
  role: string, 
  content: string
) {
  console.log('Saving tool message to conversation:', conversationId);
  
  const { error } = await supabase
    .from('ai_messages')
    .insert({
      conversation_id: conversationId,
      role,
      content
    });
  
  if (error) {
    console.error('Error saving tool message:', error);
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { 
        status: 405, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }

  try {
    // Get auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Initialize Supabase client with user's JWT token
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader }
        }
      }
    );

    // Get user from JWT token
    const { data: userData, error: userError } = await supabase.auth.getUser();
    
    if (userError || !userData.user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authorization token' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const userId = userData.user.id;

    // Parse request body
    const { toolName, params, conversation_id } = await req.json();

    // Validate toolName
    if (!(toolName in toolRegistry)) {
      await logToolInvocation(supabase, userId, toolName, params, false, `Unknown tool: ${toolName}`);
      return new Response(
        JSON.stringify({ error: `Unknown tool: ${toolName}` }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const startTime = Date.now();

    // NEW: If no params provided, use DeepSeek to extract them from conversation
    let finalParams = params;
    if (!params || Object.keys(params).length === 0) {
      console.log('No parameters provided, extracting from conversation using DeepSeek');
      
      try {
        // Get DeepSeek API key and conversation history
        const apiKey = await getDeepSeekKey(supabase, userId);
        const conversationHistory = conversation_id ? 
          await loadConversationHistory(supabase, conversation_id) : [];
        
        // Extract parameters using tool-specific DeepSeek logic
        const extractionResult = await extractParametersWithDeepSeek(
          toolName as ToolName, 
          conversationHistory, 
          apiKey
        );
        
        // If we need more info, return request for more information
        if (extractionResult.needsMoreInfo) {
          // Save the assistant's request for more info to the conversation
          if (conversation_id && extractionResult.reply) {
            await saveMessage(supabase, conversation_id, 'assistant', extractionResult.reply);
          }
          
          return new Response(
            JSON.stringify({ 
              success: false,
              needsMoreInfo: true,
              missing: extractionResult.missing || [],
              reply: extractionResult.reply || `I need more information to ${toolName}. Please provide the required details.`,
              tool_executed: toolName
            }),
            { 
              status: 200, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          );
        }
        
        // Use extracted parameters
        if (extractionResult.params) {
          finalParams = extractionResult.params;
          console.log('Extracted parameters from conversation:', finalParams);
        }
        
      } catch (extractionError) {
        console.error('Error in parameter extraction:', extractionError);
        await logToolInvocation(supabase, userId, toolName, params, false, `Parameter extraction failed: ${extractionError.message}`);
        
        return new Response(
          JSON.stringify({ 
            error: 'Could not extract parameters from conversation',
            details: extractionError.message 
          }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }
    }

    // Validate params
    const valid = validateToolParams(toolName as ToolName, finalParams);
    
    if (!valid) {
      await logToolInvocation(supabase, userId, toolName, finalParams, false, 'Validation failed');
      return new Response(
        JSON.stringify({ error: 'Invalid tool parameters' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Execute tool
    try {
      const result = await executeToolRunner(toolName as ToolName, finalParams, supabase, userId);
      const executionTime = Date.now() - startTime;
      
      await logToolInvocation(supabase, userId, toolName, finalParams, true, null, result, executionTime);
      
      // Enhanced response with post-execution context analysis
      let enhancedResult = { 
        success: true, 
        result,
        tool_executed: toolName,
        execution_time_ms: executionTime
      };

      // Perform post-execution context analysis
      try {
        const apiKey = await getDeepSeekKey(supabase, userId);
        const contextAnalysis = await analyzePostExecutionContext(toolName, result, apiKey);
        
        if (contextAnalysis) {
          enhancedResult = {
            ...enhancedResult,
            context_analysis: contextAnalysis
          };
          console.log('Post-execution context analysis:', contextAnalysis);
        }
      } catch (contextError) {
        console.error('Error in post-execution context analysis:', contextError);
        // Don't fail the main response for context analysis errors
      }
      
      return new Response(
        JSON.stringify(enhancedResult),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    } catch (error: any) {
      const executionTime = Date.now() - startTime;
      console.error(`Error running ${toolName}:`, error);
      
      await logToolInvocation(supabase, userId, toolName, finalParams, false, error.message, null, executionTime);
      
      return new Response(
        JSON.stringify({ error: 'Tool execution failed', details: error.message }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

  } catch (error: any) {
    console.error('Request processing error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
