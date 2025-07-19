import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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
    console.log('Workflow planner function called');
    
    const { message, currentWorkflow } = await req.json();
    const startTime = Date.now();
    
    console.log('Processing workflow planning request:', {
      messageLength: message?.length || 0,
      nodeCount: currentWorkflow?.nodes?.length || 0,
      connectionCount: currentWorkflow?.connections?.length || 0
    });

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get system modules for context
    console.log('Fetching system modules for context');
    const { data: systemModules, error: modulesError } = await supabase
      .from('system_modules')
      .select('*')
      .eq('enabled', true);

    if (modulesError) {
      console.error('Error fetching system modules:', modulesError);
      throw modulesError;
    }

    console.log('Retrieved system modules:', {
      moduleCount: systemModules?.length || 0,
      categories: [...new Set(systemModules?.map(m => m.category) || [])]
    });

    // Prepare context for AI
    const systemContext = systemModules?.map(module => ({
      name: module.name,
      category: module.category,
      description: module.description,
      capabilities: module.capabilities
    })) || [];

    const prompt = `
You are a workflow planning assistant. Help the user create automated workflows using available system modules.

Available System Modules:
${systemContext.map(mod => `- ${mod.name} (${mod.category}): ${mod.description}`).join('\n')}

Current Workflow State:
- Nodes: ${currentWorkflow?.nodes?.length || 0}
- Connections: ${currentWorkflow?.connections?.length || 0}

User Request: ${message}

Respond with a helpful explanation and suggest workflow improvements. If you can identify specific nodes or connections to add, structure your response to be actionable.

Keep your response concise and focused on practical next steps.
    `;

    console.log('Making request to DeepSeek API', {
      promptLength: prompt.length
    });

    // Mock AI response for now (replace with actual DeepSeek integration)
    const mockResponse = `I understand you want to ${message.toLowerCase()}. 

Based on the available system modules, I can help you create a workflow that:
1. Uses the ${systemContext[0]?.name || 'available modules'} for ${systemContext[0]?.category || 'processing'}
2. Connects multiple steps for automation
3. Provides error handling and logging

Would you like me to add some initial nodes to get started?`;

    const duration = Date.now() - startTime;
    
    console.log('Workflow planning completed', {
      responseLength: mockResponse.length,
      processingTime: duration
    });

    // For now, return a simple response without workflow modifications
    const response = {
      response: mockResponse,
      confidence: 0.85,
      suggestedNodes: [],
      processingTime: duration
    };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in workflow-planner function:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Failed to process workflow planning request',
        details: error.message 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});