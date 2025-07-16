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
      name: { type: "string", minLength: 1 },
      email: { type: "string", format: "email" },
      companyId: { type: "string", pattern: "^[a-f0-9\\-]{36}$" },
    },
    required: ["name", "email", "companyId"],
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

// Tool execution functions
async function registerClient(params: any, supabase: any, userId: string) {
  console.log('Running register_client with params:', params);
  
  // Create client in database
  const { data, error } = await supabase
    .from('clients')
    .insert({
      name: params.name,
      email: params.email,
      taxid: params.companyId, // Map companyId to taxid field
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
    message: `Client "${params.name}" registered successfully`
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
    const { toolName, params } = await req.json();

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

    // Validate params
    const startTime = Date.now();
    const valid = validateToolParams(toolName as ToolName, params);
    
    if (!valid) {
      await logToolInvocation(supabase, userId, toolName, params, false, 'Validation failed');
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
      const result = await executeToolRunner(toolName as ToolName, params, supabase, userId);
      const executionTime = Date.now() - startTime;
      
      await logToolInvocation(supabase, userId, toolName, params, true, null, result, executionTime);
      
      return new Response(
        JSON.stringify({ success: true, result }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    } catch (error: any) {
      const executionTime = Date.now() - startTime;
      console.error(`Error running ${toolName}:`, error);
      
      await logToolInvocation(supabase, userId, toolName, params, false, error.message, null, executionTime);
      
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