import React, { useCallback, useMemo, useEffect } from 'react';
import { 
  ReactFlow, 
  Node, 
  Edge, 
  addEdge, 
  useNodesState, 
  useEdgesState, 
  Connection,
  Controls,
  Background,
  MiniMap
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { WorkflowState, WorkflowNode } from '@/hooks/useWorkflowBuilder';
import { WorkflowLogger } from '@/lib/workflowLogger';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { ActionNode } from './ActionNode';
import { NodeConfiguration } from './NodeConfigModal';

interface WorkflowCanvasProps {
  workflowState: WorkflowState;
  onWorkflowUpdate: (updates: Partial<WorkflowState>) => void;
  onUpdateNodeConfig: (nodeId: string, config: NodeConfiguration) => void;
  isExecuting: boolean;
}

const nodeTypes = {
  action: ActionNode,
};

export const WorkflowCanvas: React.FC<WorkflowCanvasProps> = ({
  workflowState,
  onWorkflowUpdate,
  onUpdateNodeConfig,
  isExecuting
}) => {
  const logger = WorkflowLogger.getInstance();

  const handleDeleteNode = useCallback((nodeId: string) => {
    logger.logUiEvent('node_deleted', 'WorkflowCanvas', { nodeId });

    const updatedNodes = workflowState.nodes.filter(n => n.id !== nodeId);
    const updatedConnections = workflowState.connections.filter(
      c => c.sourceId !== nodeId && c.targetId !== nodeId
    );

    onWorkflowUpdate({ 
      nodes: updatedNodes, 
      connections: updatedConnections 
    });
  }, [workflowState.nodes, workflowState.connections, onWorkflowUpdate, logger]);

  // Convert workflow nodes to React Flow nodes
  const reactFlowNodes = useMemo((): Node[] => {
    return workflowState.nodes.map((node) => ({
      id: node.id,
      type: 'action',
      position: node.position,
      data: {
        label: node.data.label || node.type,
        action: node.data.action,
        isExecuting: isExecuting,
        config: node.config,
        onDelete: handleDeleteNode,
        onUpdateConfig: onUpdateNodeConfig,
      }
    }));
  }, [workflowState.nodes, isExecuting, handleDeleteNode, onUpdateNodeConfig]);

  // Convert workflow connections to React Flow edges
  const reactFlowEdges = useMemo((): Edge[] => {
    return workflowState.connections.map((connection) => ({
      id: connection.id,
      source: connection.sourceId,
      target: connection.targetId,
      type: 'smoothstep',
      animated: isExecuting,
      style: { stroke: 'hsl(var(--border))' }
    }));
  }, [workflowState.connections, isExecuting]);

  const [nodes, setNodes, onNodesChange] = useNodesState(reactFlowNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(reactFlowEdges);

  // Sync React Flow nodes and edges with initial data
  useEffect(() => {
    setNodes(reactFlowNodes);
  }, [reactFlowNodes, setNodes]);

  useEffect(() => {
    setEdges(reactFlowEdges);
  }, [reactFlowEdges, setEdges]);

  // Handle node position changes
  const handleNodeDragStop = useCallback(() => {
    const updatedNodes: WorkflowNode[] = nodes.map(node => ({
      id: node.id,
      type: 'action' as const,
      position: node.position,
      data: {
        label: node.data.label,
        action: node.data.action
      }
    }));
    
    onWorkflowUpdate({ nodes: updatedNodes });
  }, [nodes, onWorkflowUpdate]);

  // Handle new connections
  const onConnect = useCallback((connection: Connection) => {
    if (!connection.source || !connection.target) return;
    
    const newConnection = {
      id: `edge-${Date.now()}`,
      sourceId: connection.source,
      targetId: connection.target
    };

    logger.logUiEvent('connection_created', 'WorkflowCanvas', newConnection);

    const updatedConnections = [...workflowState.connections, newConnection];
    onWorkflowUpdate({ connections: updatedConnections });
    
    setEdges((eds) => addEdge(connection, eds));
  }, [workflowState.connections, onWorkflowUpdate, logger, setEdges]);

  const addSampleNode = useCallback(() => {
    const newNode: WorkflowNode = {
      id: `node-${Date.now()}`,
      type: 'action',
      position: { 
        x: Math.random() * 400 + 100, 
        y: Math.random() * 300 + 100 
      },
      data: {
        label: `Action ${workflowState.nodes.length + 1}`,
        action: 'sample_action'
      }
    };

    logger.logUiEvent('node_added', 'WorkflowCanvas', { 
      nodeId: newNode.id,
      nodeType: newNode.type 
    });

    onWorkflowUpdate({ 
      nodes: [...workflowState.nodes, newNode] 
    });
  }, [workflowState.nodes, onWorkflowUpdate, logger]);

  return (
    <div className="h-full relative bg-background">
      {/* Canvas Header */}
      <div className="absolute top-4 left-4 z-10">
        <Button 
          onClick={addSampleNode}
          size="sm"
          variant="outline"
          className="bg-background shadow-md"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Node
        </Button>
      </div>

      {/* React Flow Canvas */}
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeDragStop={handleNodeDragStop}
        nodeTypes={nodeTypes}
        fitView
        className="bg-background"
        minZoom={0.2}
        maxZoom={2}
        defaultViewport={{ x: 0, y: 0, zoom: 1 }}
      >
        <Background 
          color="hsl(var(--border))" 
          gap={16} 
          size={1}
        />
        <Controls 
          className="bg-background border border-border shadow-md [&>button]:bg-blue-500 [&>button]:hover:bg-blue-600 [&>button]:text-white [&>button]:border-blue-500"
        />
        <MiniMap 
          className="bg-background border border-border shadow-md"
          nodeColor="hsl(var(--primary))"
          nodeStrokeColor="hsl(var(--border))"
          maskColor="hsl(var(--muted) / 0.3)"
        />
      </ReactFlow>

      {/* Empty State */}
      {workflowState.nodes.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center space-y-4 pointer-events-auto">
            <div className="w-24 h-24 mx-auto bg-muted rounded-full flex items-center justify-center">
              <Plus className="h-12 w-12 text-muted-foreground" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">No nodes yet</h3>
              <p className="text-muted-foreground">
                Start by describing your workflow in the chat, or add a node manually.
              </p>
            </div>
            <Button onClick={addSampleNode}>
              <Plus className="h-4 w-4 mr-2" />
              Add First Node
            </Button>
          </div>
        </div>
      )}

      {/* Canvas Footer */}
      <div className="absolute bottom-4 right-4 bg-background border rounded-lg p-2 text-xs text-muted-foreground shadow-md">
        Nodes: {workflowState.nodes.length} | Connections: {workflowState.connections.length}
      </div>
    </div>
  );
};
