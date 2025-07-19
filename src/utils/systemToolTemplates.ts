
import type { SystemTool } from "@/hooks/useSystemTools";
import type { WorkflowState, WorkflowNode } from "@/hooks/useWorkflowBuilder";
import { NodeConfiguration } from "@/components/workflow/NodeConfigModal";

export const createWorkflowFromSystemTool = (systemTool: SystemTool): WorkflowState => {
  const nodeConfig: NodeConfiguration = {
    label: getToolDisplayName(systemTool.name),
    instructions: getToolInstructions(systemTool.name),
    aiModel: {
      model: 'deepseek-chat',
      temperature: 0.7,
      maxTokens: 512,
    },
    tools: [systemTool.name],
    parameters: {
      inputs: extractInputParameters(systemTool.input_schema),
      outputs: extractOutputParameters(systemTool.output_schema),
    },
  };

  const startNode: WorkflowNode = {
    id: 'start-node',
    type: 'input',
    position: { x: 100, y: 100 },
    data: {
      label: 'Start',
      type: 'start'
    },
  };

  const actionNode: WorkflowNode = {
    id: 'action-node',
    type: 'action',
    position: { x: 300, y: 100 },
    data: {
      label: getToolDisplayName(systemTool.name),
      action: systemTool.name,
    },
    config: nodeConfig,
  };

  const endNode: WorkflowNode = {
    id: 'end-node',
    type: 'output',
    position: { x: 500, y: 100 },
    data: {
      label: 'End',
      type: 'end'
    },
  };

  return {
    name: `${getToolDisplayName(systemTool.name)} Workflow`,
    description: `Automated workflow for ${systemTool.description}`,
    nodes: [startNode, actionNode, endNode],
    connections: [
      {
        id: 'conn-1',
        sourceId: 'start-node',
        targetId: 'action-node',
      },
      {
        id: 'conn-2',
        sourceId: 'action-node',
        targetId: 'end-node',
      },
    ],
    status: 'draft' as const,
    metadata: {
      systemTool: systemTool.name,
      category: systemTool.category,
    },
  };
};

const getToolDisplayName = (toolName: string): string => {
  switch (toolName) {
    case 'register_client':
      return 'Register Client';
    case 'create_connection':
      return 'Create Connection';
    case 'build_dashboard':
      return 'Build Dashboard';
    default:
      return toolName;
  }
};

const getToolInstructions = (toolName: string): string => {
  switch (toolName) {
    case 'register_client':
      return 'Register a new client with their business information including name, email, and EIN.';
    case 'create_connection':
      return 'Establish a connection between a client and an external service or data source.';
    case 'build_dashboard':
      return 'Create a custom dashboard with specified metrics and timeframe for data visualization.';
    default:
      return `Execute the ${toolName} system tool with the provided parameters.`;
  }
};

const extractInputParameters = (inputSchema: any): { name: string; type: string; required: boolean }[] => {
  if (!inputSchema || !inputSchema.properties) return [];
  
  const required = inputSchema.required || [];
  return Object.keys(inputSchema.properties).map(key => ({
    name: key,
    type: inputSchema.properties[key].type || 'string',
    required: required.includes(key),
  }));
};

const extractOutputParameters = (outputSchema: any): { name: string; type: string }[] => {
  if (!outputSchema || !outputSchema.properties) return [];
  
  return Object.keys(outputSchema.properties).map(key => ({
    name: key,
    type: outputSchema.properties[key].type || 'string',
  }));
};
