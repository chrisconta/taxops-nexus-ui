import React, { useState } from "react";
import { WorkflowChatPanel } from "@/components/workflow/WorkflowChatPanel";
import { WorkflowCanvas } from "@/components/workflow/WorkflowCanvas";
import { WorkflowDebugPanel } from "@/components/workflow/WorkflowDebugPanel";
import { useWorkflowBuilder } from "@/hooks/useWorkflowBuilder";
import { WorkflowLogger } from "@/lib/workflowLogger";
import { Button } from "@/components/ui/button";
import { Play, Save, Share, Bug } from "lucide-react";

const ToolBuilder = () => {
  const [showDebugPanel, setShowDebugPanel] = useState(false);
  const logger = WorkflowLogger.getInstance();
  
  const {
    workflowState,
    updateWorkflow,
    executeWorkflow,
    saveWorkflow,
    isExecuting,
    logs
  } = useWorkflowBuilder();

  React.useEffect(() => {
    logger.info('ui', 'ToolBuilder mounted', { workflowId: workflowState.id });
    
    return () => {
      logger.info('ui', 'ToolBuilder unmounted');
    };
  }, []);

  const handleExecute = async () => {
    logger.info('ui', 'Execute workflow triggered', { 
      nodeCount: workflowState.nodes.length,
      connectionCount: workflowState.connections.length 
    });
    
    try {
      await executeWorkflow();
    } catch (error) {
      logger.error('ui', 'Workflow execution failed', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  };

  const handleSave = async () => {
    logger.info('ui', 'Save workflow triggered', { workflowName: workflowState.name });
    
    try {
      await saveWorkflow();
      logger.info('ui', 'Workflow saved successfully');
    } catch (error) {
      logger.error('ui', 'Workflow save failed', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col">
      {/* Top Navigation */}
      <div className="h-16 border-b bg-background flex items-center justify-between px-6">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-semibold">Tool Builder</h1>
          <span className="text-sm text-muted-foreground">
            {workflowState.name || 'Untitled Workflow'}
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setShowDebugPanel(!showDebugPanel)}
          >
            <Bug className="h-4 w-4 mr-2" />
            Debug
          </Button>
          <Button variant="outline" size="sm" onClick={handleSave}>
            <Save className="h-4 w-4 mr-2" />
            Save
          </Button>
          <Button variant="outline" size="sm">
            <Share className="h-4 w-4 mr-2" />
            Share
          </Button>
          <Button 
            onClick={handleExecute} 
            disabled={isExecuting}
            size="sm"
          >
            <Play className="h-4 w-4 mr-2" />
            {isExecuting ? 'Running...' : 'Execute'}
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex">
        {/* Chat Panel */}
        <div className="w-80 border-r bg-background">
          <WorkflowChatPanel 
            onWorkflowUpdate={updateWorkflow}
            workflowState={workflowState}
          />
        </div>

        {/* Canvas */}
        <div className="flex-1">
          <WorkflowCanvas 
            workflowState={workflowState}
            onWorkflowUpdate={updateWorkflow}
            isExecuting={isExecuting}
          />
        </div>

        {/* Debug Panel */}
        {showDebugPanel && (
          <div className="w-96 border-l bg-background">
            <WorkflowDebugPanel 
              logs={logs}
              executionId={workflowState.currentExecutionId}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default ToolBuilder;