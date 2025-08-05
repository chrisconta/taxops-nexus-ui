
import type { SystemTool } from "@/hooks/useSystemTools";
import type { WorkflowState } from "@/hooks/useWorkflowBuilder";

export interface ToolConversationStarter {
  initialMessage: string;
  followUpQuestions: string[];
  requiredParameters: Array<{
    name: string;
    type: string;
    description: string;
    required: boolean;
  }>;
}

export const getSystemToolConversation = (tool: SystemTool): ToolConversationStarter => {
  switch (tool.name) {
    case 'register_client':
      return {
        initialMessage: `I'll help you register a new client in the system. This tool will create a client record with their business information including name, email, and EIN (Employer Identification Number).

Let's start with the basic information:`,
        followUpQuestions: [
          "What's the client's business name?",
          "What's their email address?",
          "What's their EIN (Employer Identification Number)?"
        ],
        requiredParameters: [
          { name: 'name', type: 'string', description: 'Client business name', required: true },
          { name: 'email', type: 'string', description: 'Client email address', required: true },
          { name: 'ein', type: 'string', description: 'Employer Identification Number', required: true }
        ]
      };

    case 'create_connection':
      return {
        initialMessage: `I'll help you create a connection between a client and an external service or data source. This will establish a secure link for data synchronization.

Let's set up the connection:`,
        followUpQuestions: [
          "Which client should I create the connection for? (provide client ID)",
          "What type of connection are you creating? (e.g., bank, accounting software)",
          "Please provide the connection credentials"
        ],
        requiredParameters: [
          { name: 'clientId', type: 'string', description: 'Client identifier', required: true },
          { name: 'connectionType', type: 'string', description: 'Type of connection', required: true },
          { name: 'credentials', type: 'object', description: 'Connection credentials', required: true }
        ]
      };

    case 'build_dashboard':
      return {
        initialMessage: `I'll help you create a custom analytics dashboard with specific metrics and timeframes for data visualization.

Let's configure your dashboard:`,
        followUpQuestions: [
          "Which client should this dashboard be for? (provide client ID)",
          "What metrics would you like to include? (e.g., revenue, expenses, profit)",
          "What timeframe should the dashboard cover? (provide start and end dates)"
        ],
        requiredParameters: [
          { name: 'clientId', type: 'string', description: 'Client identifier', required: true },
          { name: 'metrics', type: 'array', description: 'List of metrics to display', required: true },
          { name: 'timeframe', type: 'object', description: 'Date range for the dashboard', required: true }
        ]
      };

    case 'download_tax_report':
      return {
        initialMessage: `I'll help you download tax reports that have been uploaded to your account. You can search by report ID, tax year, or filename.

Let me find your tax report:`,
        followUpQuestions: [
          "Which tax report would you like to download?",
          "Do you have a specific tax year in mind? (e.g., 2023)",
          "Do you remember part of the filename?"
        ],
        requiredParameters: [
          { name: 'reportId', type: 'string', description: 'Specific tax report ID', required: false },
          { name: 'taxYear', type: 'string', description: 'Tax year (e.g., 2023)', required: false },
          { name: 'fileName', type: 'string', description: 'Part of the filename to search for', required: false }
        ]
      };

    default:
      return {
        initialMessage: `I'll help you execute the ${tool.name} tool. ${tool.description}

Let me gather the required information:`,
        followUpQuestions: ["Please provide the necessary parameters for this tool."],
        requiredParameters: extractParametersFromSchema(tool.input_schema)
      };
  }
};

export const getWorkflowToolConversation = (tool: WorkflowState & { id: string }): ToolConversationStarter => {
  const nodeCount = tool.nodes?.length || 0;
  const hasSystemTool = tool.metadata?.systemTool;
  
  return {
    initialMessage: `I'll help you execute the "${tool.name}" workflow. ${tool.description || 'This is a custom workflow tool.'}

This workflow contains ${nodeCount} step${nodeCount !== 1 ? 's' : ''} ${hasSystemTool ? `and is based on the ${hasSystemTool} system tool` : ''}.

Let's start the workflow execution:`,
    followUpQuestions: [
      "Do you want to proceed with executing this workflow?",
      "Are there any specific parameters you'd like to provide?"
    ],
    requiredParameters: extractWorkflowParameters(tool)
  };
};

const extractParametersFromSchema = (schema: any): Array<{
  name: string;
  type: string;
  description: string;
  required: boolean;
}> => {
  if (!schema || !schema.properties) return [];
  
  const required = schema.required || [];
  return Object.keys(schema.properties).map(key => ({
    name: key,
    type: schema.properties[key].type || 'string',
    description: schema.properties[key].description || `${key} parameter`,
    required: required.includes(key)
  }));
};

const extractWorkflowParameters = (workflow: WorkflowState): Array<{
  name: string;
  type: string;
  description: string;
  required: boolean;
}> => {
  // Extract parameters from workflow nodes that have input configurations
  const parameters: Array<{
    name: string;
    type: string;
    description: string;
    required: boolean;
  }> = [];

  workflow.nodes?.forEach(node => {
    if (node.config?.parameters?.inputs) {
      node.config.parameters.inputs.forEach(input => {
        parameters.push({
          name: input.name,
          type: input.type,
          description: `Input for ${node.data.label || node.type}`,
          required: input.required
        });
      });
    }
  });

  return parameters;
};
