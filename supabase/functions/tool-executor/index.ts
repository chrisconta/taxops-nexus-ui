import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseKey);

interface ToolSchema {
  steps: Array<{
    id: string;
    type: 'input' | 'action' | 'validation';
    description: string;
    parameters?: any;
    validation?: any;
  }>;
  completion_message: string;
}

async function saveMessage(conversationId: string, role: string, content: string) {
  const { error } = await supabase
    .from('ai_messages')
    .insert({ conversation_id: conversationId, role, content });
  if (error) {
    console.error('Error saving AI message:', error);
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { tool_id, conversation_id, user_message, user_id } = await req.json();

    console.log('Tool executor called:', { tool_id, conversation_id, user_message, user_id });

    // Get tool configuration
    const { data: tool, error: toolError } = await supabase
      .from('user_tools')
      .select('*')
      .eq('id', tool_id)
      .eq('user_id', user_id)
      .single();

    if (toolError || !tool) {
      console.error('Tool not found:', toolError);
      return new Response(JSON.stringify({ error: 'Tool not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get or create tool conversation state
    let { data: toolConversation, error: conversationError } = await supabase
      .from('tool_conversations')
      .select('*')
      .eq('tool_id', tool_id)
      .eq('conversation_id', conversation_id)
      .single();

    if (conversationError || !toolConversation) {
      // Create new tool conversation state
      const { data: newConversation, error: createError } = await supabase
        .from('tool_conversations')
        .insert({
          tool_id,
          user_id,
          conversation_id,
          state: {},
          current_step: 0,
          execution_data: {}
        })
        .select()
        .single();

      if (createError) {
        console.error('Failed to create tool conversation:', createError);
        return new Response(JSON.stringify({ error: 'Failed to initialize tool conversation' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      toolConversation = newConversation;
    }

    if (user_message) {
      await saveMessage(conversation_id, 'user', user_message);
    }

    const schema: ToolSchema = tool.execution_schema;
    const currentStep = toolConversation.current_step;
    const steps = schema.steps || [];

    if (currentStep >= steps.length) {
      // Tool execution completed
      const completionResponse = {
        type: 'completion',
        message: schema.completion_message || 'Tool execution completed successfully!',
        data: toolConversation.execution_data
      };

      await saveMessage(conversation_id, 'assistant', completionResponse.message);

      return new Response(JSON.stringify(completionResponse), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const step = steps[currentStep];
    let response: any = {};
    let nextStep = currentStep;
    let updatedExecutionData = { ...toolConversation.execution_data };

    switch (step.type) {
      case 'input':
        if (user_message && user_message.trim()) {
          // Store user input
          updatedExecutionData[step.id] = user_message.trim();
          nextStep = currentStep + 1;
          
          // Check if we have next step
          if (nextStep < steps.length) {
            const nextStepInfo = steps[nextStep];
            response = {
              type: 'input_request',
              message: nextStepInfo.description,
              step: nextStepInfo
            };
          } else {
            response = {
              type: 'completion',
              message: schema.completion_message || 'Tool execution completed successfully!',
              data: updatedExecutionData
            };
          }
        } else {
          // Request input for current step
          response = {
            type: 'input_request',
            message: step.description,
            step: step
          };
        }
        break;

      case 'action':
        // Execute the action based on step configuration
        try {
          const actionResult = await executeAction(step, updatedExecutionData, supabase, user_id);
          updatedExecutionData[step.id] = actionResult;
          nextStep = currentStep + 1;

          if (nextStep < steps.length) {
            const nextStepInfo = steps[nextStep];
            response = {
              type: 'action_result',
              message: `${step.description} completed. ${nextStepInfo.description}`,
              step: nextStepInfo,
              result: actionResult
            };
          } else {
            response = {
              type: 'completion',
              message: schema.completion_message || 'Tool execution completed successfully!',
              data: updatedExecutionData
            };
          }
        } catch (error) {
          console.error('Action execution failed:', error);
          response = {
            type: 'error',
            message: `Failed to execute ${step.description}: ${error.message}`
          };
        }
        break;

      case 'validation':
        // Validate previous inputs
        const isValid = validateStep(step, updatedExecutionData);
        if (isValid.valid) {
          nextStep = currentStep + 1;
          if (nextStep < steps.length) {
            const nextStepInfo = steps[nextStep];
            response = {
              type: 'validation_success',
              message: `Validation passed. ${nextStepInfo.description}`,
              step: nextStepInfo
            };
          } else {
            response = {
              type: 'completion',
              message: schema.completion_message || 'Tool execution completed successfully!',
              data: updatedExecutionData
            };
          }
        } else {
          response = {
            type: 'validation_error',
            message: isValid.message || 'Validation failed. Please check your inputs.',
            errors: isValid.errors
          };
        }
        break;
    }

    // Update tool conversation state
    const { error: updateError } = await supabase
      .from('tool_conversations')
      .update({
        current_step: nextStep,
        execution_data: updatedExecutionData,
        state: { ...toolConversation.state, last_response: response }
      })
      .eq('id', toolConversation.id);

    if (updateError) {
      console.error('Failed to update tool conversation:', updateError);
    }

    // Add switch_tool option to allow jumping between tools
    response.options = {
      switch_tool: true,
      message: "Type 'switch' to return to the main orchestrator"
    };

    if (response.message) {
      await saveMessage(conversation_id, 'assistant', response.message);
    }

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in tool-executor:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function executeAction(step: any, executionData: any, supabase: any, userId: string) {
  // This is where we'd implement different action types
  // For now, we'll simulate actions based on step configuration
  
  const actionType = step.parameters?.action_type;
  
  switch (actionType) {
    case 'create_client':
      // Simulate client creation
      const clientData = {
        name: executionData.client_name || 'Unknown Client',
        email: executionData.client_email || 'unknown@example.com',
        taxid: executionData.client_taxid || '000000000',
        user_id: userId
      };
      
      const { data: client, error } = await supabase
        .from('clients')
        .insert(clientData)
        .select()
        .single();
        
      if (error) throw error;
      return { client_id: client.id, message: 'Client created successfully' };

    case 'create_connection':
      // Simulate connection creation
      return { 
        connection_id: 'conn_' + Date.now(), 
        message: 'Connection established successfully' 
      };

    case 'create_dashboard':
      // Simulate dashboard creation
      const dashboardData = {
        name: executionData.dashboard_name || 'New Dashboard',
        config: executionData.dashboard_config || {},
        user_id: userId
      };
      
      const { data: dashboard, error: dashError } = await supabase
        .from('dashboards')
        .insert(dashboardData)
        .select()
        .single();
        
      if (dashError) throw dashError;
      return { dashboard_id: dashboard.id, message: 'Dashboard created successfully' };

    default:
      return { message: 'Action completed', data: executionData };
  }
}

function validateStep(step: any, executionData: any) {
  const validation = step.validation;
  if (!validation) return { valid: true };

  const errors: string[] = [];

  // Check required fields
  if (validation.required) {
    for (const field of validation.required) {
      if (!executionData[field]) {
        errors.push(`${field} is required`);
      }
    }
  }

  // Check email format
  if (validation.email_fields) {
    for (const field of validation.email_fields) {
      const value = executionData[field];
      if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        errors.push(`${field} must be a valid email address`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    message: errors.length > 0 ? errors.join(', ') : undefined
  };
}