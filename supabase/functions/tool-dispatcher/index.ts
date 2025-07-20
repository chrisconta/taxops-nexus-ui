import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseKey);

// Map of system tool names to their edge function names
const SYSTEM_TOOLS = {
  'register-client': 'tool-register-client',
  'create-connection': 'tool-create-connection', 
  'build-dashboard': 'tool-build-dashboard',
  'ai-chat': 'ai-chat'
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = crypto.randomUUID();

  try {
    const { tool_name, conversation_id, user_message, user_id } = await req.json();
    console.log('tool-dispatcher request ID:', requestId);

    console.log('Tool dispatcher called:', { tool_name, conversation_id, user_message, user_id });

    // Check if it's a system tool
    if (SYSTEM_TOOLS[tool_name]) {
      const edgeFunctionName = SYSTEM_TOOLS[tool_name];
      console.log(`Dispatching to system tool: ${edgeFunctionName}`);
      
      // Call the specific system tool edge function
      const { data, error } = await supabase.functions.invoke(edgeFunctionName, {
        body: {
          conversation_id,
          user_message,
          user_id
        }
      });

      if (error) {
        console.error(`Error calling ${edgeFunctionName}:`, error);
        return new Response(JSON.stringify({ 
          error: `Failed to execute ${tool_name}: ${error.message}` 
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if it's a user-defined tool
    const { data: userTool, error: toolError } = await supabase
      .from('user_tools')
      .select('*')
      .eq('name', tool_name)
      .eq('user_id', user_id)
      .eq('status', 'active')
      .single();

    if (toolError || !userTool) {
      console.error('User tool not found:', toolError);
      return new Response(JSON.stringify({ 
        error: `Tool '${tool_name}' not found or not active` 
      }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Dispatching to user tool: ${userTool.name} (${userTool.id})`);

    // Call the generic tool executor for user-defined tools
    const { data, error } = await supabase.functions.invoke('tool-executor', {
      body: {
        tool_id: userTool.id,
        conversation_id,
        user_message,
        user_id
      }
    });

    if (error) {
      console.error('Error calling tool-executor:', error);
      return new Response(JSON.stringify({ 
        error: `Failed to execute user tool: ${error.message}` 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in tool-dispatcher:', error, 'Request ID:', requestId);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});