import React, { useCallback } from 'react';
import { WorkflowState, WorkflowNode } from '@/hooks/useWorkflowBuilder';
import { WorkflowLogger } from '@/lib/workflowLogger';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Settings, Trash2, Play } from 'lucide-react';

interface WorkflowCanvasProps {
  workflowState: WorkflowState;
  onWorkflowUpdate: (updates: Partial<WorkflowState>) => void;
  isExecuting: boolean;
}

export const WorkflowCanvas: React.FC<WorkflowCanvasProps> = ({
  workflowState,
  onWorkflowUpdate,
  isExecuting
}) => {
  const logger = WorkflowLogger.getInstance();

  const handleNodeClick = useCallback((node: WorkflowNode) => {
    logger.logUiEvent('node_clicked', 'WorkflowCanvas', { 
      nodeId: node.id, 
      nodeType: node.type 
    });
  }, [logger]);

  const handleNodeDragStart = useCallback((node: WorkflowNode, e: React.DragEvent) => {
    logger.logUiEvent('node_drag_start', 'WorkflowCanvas', { 
      nodeId: node.id,
      position: node.position 
    });
    
    e.dataTransfer.setData('application/reactflow', JSON.stringify(node));
  }, [logger]);

  const handleNodeDragEnd = useCallback((node: WorkflowNode, newPosition: { x: number; y: number }) => {
    logger.logUiEvent('node_drag_end', 'WorkflowCanvas', { 
      nodeId: node.id,
      oldPosition: node.position,
      newPosition 
    });

    const updatedNodes = workflowState.nodes.map(n => 
      n.id === node.id ? { ...n, position: newPosition } : n
    );

    onWorkflowUpdate({ nodes: updatedNodes });
  }, [workflowState.nodes, onWorkflowUpdate, logger]);

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
          className="bg-background"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Node
        </Button>
      </div>

      {/* Canvas Content */}
      <div className="h-full p-8 overflow-auto">
        {workflowState.nodes.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center space-y-4">
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
        ) : (
          <div className="relative">
            {/* Render Nodes */}
            {workflowState.nodes.map((node) => (
              <Card
                key={node.id}
                className={`absolute w-48 cursor-move transition-all duration-200 ${
                  isExecuting ? 'ring-2 ring-primary ring-opacity-50' : ''
                }`}
                style={{
                  left: node.position.x,
                  top: node.position.y,
                }}
                draggable
                onDragStart={(e) => handleNodeDragStart(node, e)}
                onClick={() => handleNodeClick(node)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium">
                      {node.data.label || node.type}
                    </CardTitle>
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          logger.logUiEvent('node_settings_clicked', 'WorkflowCanvas', { nodeId: node.id });
                        }}
                      >
                        <Settings className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteNode(node.id);
                        }}
                      >
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="text-xs text-muted-foreground">
                    Type: {node.type}
                  </div>
                  {node.data.action && (
                    <div className="text-xs text-muted-foreground mt-1">
                      Action: {node.data.action}
                    </div>
                  )}
                  {isExecuting && (
                    <div className="flex items-center gap-1 mt-2 text-xs text-primary">
                      <Play className="h-3 w-3" />
                      Executing...
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}

            {/* Render Connections (simplified) */}
            <svg className="absolute inset-0 pointer-events-none">
              {workflowState.connections.map((connection) => {
                const sourceNode = workflowState.nodes.find(n => n.id === connection.sourceId);
                const targetNode = workflowState.nodes.find(n => n.id === connection.targetId);
                
                if (!sourceNode || !targetNode) return null;

                return (
                  <line
                    key={connection.id}
                    x1={sourceNode.position.x + 96} // Center of node
                    y1={sourceNode.position.y + 40}
                    x2={targetNode.position.x + 96}
                    y2={targetNode.position.y + 40}
                    stroke="hsl(var(--border))"
                    strokeWidth="2"
                    markerEnd="url(#arrowhead)"
                  />
                );
              })}
              
              {/* Arrow marker definition */}
              <defs>
                <marker
                  id="arrowhead"
                  markerWidth="10"
                  markerHeight="7"
                  refX="9"
                  refY="3.5"
                  orient="auto"
                >
                  <polygon
                    points="0 0, 10 3.5, 0 7"
                    fill="hsl(var(--border))"
                  />
                </marker>
              </defs>
            </svg>
          </div>
        )}
      </div>

      {/* Canvas Footer */}
      <div className="absolute bottom-4 right-4 bg-background border rounded-lg p-2 text-xs text-muted-foreground">
        Nodes: {workflowState.nodes.length} | Connections: {workflowState.connections.length}
      </div>
    </div>
  );
};