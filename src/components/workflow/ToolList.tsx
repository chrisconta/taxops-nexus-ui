
import { useState } from "react";
import { Wrench, Plus, Cpu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import type { WorkflowState } from "@/hooks/useWorkflowBuilder";
import type { SystemTool } from "@/hooks/useSystemTools";
import { ToolCard } from "./ToolCard";
import { SystemToolCard } from "./SystemToolCard";
import { ToolNamingModal } from "./ToolNamingModal";

interface ToolListProps {
  tools: (WorkflowState & { id: string; created_at: string; updated_at: string })[];
  systemTools: SystemTool[];
  isLoadingSystemTools: boolean;
  onSelectTool: (tool: WorkflowState & { id: string }) => void;
  onSelectSystemTool: (tool: SystemTool) => void;
  onDeleteTool: () => void;
  onCreateNew: (name: string, description?: string) => void;
  onRenameTool?: (tool: WorkflowState & { id: string }, newName: string, newDescription?: string) => void;
}

export const ToolList = ({ 
  tools, 
  systemTools, 
  isLoadingSystemTools,
  onSelectTool, 
  onSelectSystemTool,
  onDeleteTool, 
  onCreateNew,
  onRenameTool
}: ToolListProps) => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [selectedTool, setSelectedTool] = useState<WorkflowState & { id: string; created_at: string; updated_at: string } | null>(null);
  
  const hasUserTools = (tools || []).length > 0;
  const hasSystemTools = (systemTools || []).length > 0;
  const hasAnyTools = hasUserTools || hasSystemTools;

  if (!hasAnyTools && !isLoadingSystemTools) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center max-w-md">
          <div className="w-24 h-24 bg-gradient-to-br from-primary/10 to-primary/5 rounded-3xl flex items-center justify-center mx-auto mb-6">
            <Wrench className="w-12 h-12 text-primary/50" />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-3">Create Your First Tool</h2>
          <p className="text-muted-foreground mb-6">
            Build powerful workflow automation tools by connecting AI capabilities, 
            integrations, and custom logic into reusable workflows.
          </p>
          <Button onClick={() => setShowCreateModal(true)} size="lg" className="gap-2">
            <Plus className="w-5 h-5" />
            Create New Tool
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* System Tools Section */}
      {(hasSystemTools || isLoadingSystemTools) && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Cpu className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-bold text-foreground">System Tools</h2>
            <span className="text-sm text-muted-foreground">
              ({isLoadingSystemTools ? '...' : (systemTools || []).length} available)
            </span>
          </div>
          
          {isLoadingSystemTools ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-32 bg-muted animate-pulse rounded-lg" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {(systemTools || []).map((tool) => (
                <SystemToolCard
                  key={tool.id}
                  tool={tool}
                  onSelect={onSelectSystemTool}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Separator if both sections exist */}
      {hasSystemTools && hasUserTools && <Separator />}

      {/* User Tools Section */}
      {hasUserTools && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Wrench className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-bold text-foreground">My Workflows</h2>
            <span className="text-sm text-muted-foreground">
              ({(tools || []).length} tool{(tools || []).length !== 1 ? 's' : ''})
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {(tools || []).map((tool) => (
              <ToolCard
                key={tool.id}
                tool={tool}
                onSelect={onSelectTool}
                onDelete={onDeleteTool}
                onRename={onRenameTool ? (tool) => {
                  setSelectedTool(tool as WorkflowState & { id: string; created_at: string; updated_at: string });
                  setShowRenameModal(true);
                } : undefined}
              />
            ))}
          </div>
        </div>
      )}

      <ToolNamingModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onConfirm={(name, description) => onCreateNew(name, description)}
        title="Create New Tool"
        description="Give your new tool a descriptive name and optional description."
      />

      {selectedTool && onRenameTool && (
        <ToolNamingModal
          isOpen={showRenameModal}
          onClose={() => {
            setShowRenameModal(false);
            setSelectedTool(null);
          }}
          onConfirm={(name, description) => {
            if (selectedTool) {
              onRenameTool(selectedTool, name, description);
              setSelectedTool(null);
            }
          }}
          initialName={selectedTool.name}
          initialDescription={selectedTool.description}
          title="Rename Tool"
          description="Update the name and description for this tool."
        />
      )}
    </div>
  );
};
