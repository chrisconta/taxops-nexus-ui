
import React, { useState } from "react";
import { WorkflowChatPanel } from "@/components/workflow/WorkflowChatPanel";
import { WorkflowCanvas } from "@/components/workflow/WorkflowCanvas";
import { WorkflowDebugPanel } from "@/components/workflow/WorkflowDebugPanel";
import { ToolList } from "@/components/workflow/ToolList";
import { ToolListModal } from "@/components/workflow/ToolListModal";
import { useWorkflowBuilder } from "@/hooks/useWorkflowBuilder";
import { useToolWorkflows } from "@/hooks/useToolWorkflows";
import { WorkflowLogger } from "@/lib/workflowLogger";
import { Button } from "@/components/ui/button";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Play, Save, Share, Bug, ArrowLeft, Wrench, MoreVertical, Plus, Search } from "lucide-react";

const ToolBuilder = () => {
  const [showDebugPanel, setShowDebugPanel] = useState(false);
  const [showToolListModal, setShowToolListModal] = useState(false);
  const [currentTool, setCurrentTool] = useState<string | null>(null);
  const logger = WorkflowLogger.getInstance();
  
  const { tools, isLoading, refreshTools } = useToolWorkflows();
  
  const {
    workflowState,
    updateWorkflow,
    updateNodeConfig,
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
      refreshTools(); // Refresh the tools list
    } catch (error) {
      logger.error('ui', 'Workflow save failed', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  };

  const handleCreateNewTool = () => {
    // Reset workflow state for new tool
    updateWorkflow({
      id: undefined,
      name: 'New Tool',
      description: '',
      nodes: [],
      connections: [],
      status: 'draft',
      metadata: {}
    });
    setCurrentTool('new');
  };

  const handleSelectTool = (tool: any) => {
    // Load the selected tool into the workflow builder
    updateWorkflow({
      id: tool.id,
      name: tool.name,
      description: tool.description,
      nodes: tool.nodes,
      connections: tool.connections,
      status: tool.status,
      metadata: tool.metadata
    });
    setCurrentTool(tool.id);
  };

  const handleBackToTools = () => {
    setCurrentTool(null);
    refreshTools();
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className="h-[calc(100vh-8rem)] flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading tools...</p>
        </div>
      </div>
    );
  }

  // Show tool list if no current tool is selected
  if (!currentTool) {
    return (
      <>
        <div className="h-[calc(100vh-8rem)] flex flex-col">
          {/* Top Navigation */}
          <div className="h-16 border-b bg-background flex items-center justify-between px-6">
            <div className="flex items-center gap-4">
              <Wrench className="w-6 h-6 text-primary" />
              <h1 className="text-xl font-semibold">Tool Builder</h1>
            </div>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setShowToolListModal(true)}>
                  <Search className="h-4 w-4 mr-2" />
                  Browse Tools
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleCreateNewTool}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create New Tool
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Main Content */}
          <div className="flex-1 p-6 overflow-auto">
            <ToolList
              tools={tools}
              onSelectTool={handleSelectTool}
              onDeleteTool={refreshTools}
              onCreateNew={handleCreateNewTool}
            />
          </div>
        </div>

        <ToolListModal
          tools={tools}
          isOpen={showToolListModal}
          onClose={() => setShowToolListModal(false)}
          onSelectTool={handleSelectTool}
          onDeleteTool={refreshTools}
          onCreateNew={handleCreateNewTool}
        />
      </>
    );
  }

  // Show workflow builder when a tool is selected
  return (
    <>
      <div className="h-[calc(100vh-8rem)] flex flex-col">
        {/* Top Navigation */}
        <div className="h-16 border-b bg-background flex items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBackToTools}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Tools
            </Button>
            <div className="h-6 w-px bg-border" />
            <h1 className="text-xl font-semibold">Tool Builder</h1>
            <span className="text-sm text-muted-foreground">
              {workflowState.name || 'Untitled Tool'}
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setShowToolListModal(true)}
              className="h-8 w-8 p-0"
            >
              <Wrench className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setShowDebugPanel(!showDebugPanel)}
              className="h-8 w-8 p-0"
            >
              <Bug className="h-4 w-4" />
            </Button>
            <Button 
              onClick={handleExecute} 
              disabled={isExecuting}
              size="sm"
              className="h-8 w-8 p-0"
            >
              <Play className="h-4 w-4" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleSave}>
                  <Save className="h-4 w-4 mr-2" />
                  Save
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Share className="h-4 w-4 mr-2" />
                  Share
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
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
              onUpdateNodeConfig={updateNodeConfig}
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

      <ToolListModal
        tools={tools}
        isOpen={showToolListModal}
        onClose={() => setShowToolListModal(false)}
        onSelectTool={handleSelectTool}
        onDeleteTool={refreshTools}
        onCreateNew={handleCreateNewTool}
      />
    </>
  );
};

export default ToolBuilder;
