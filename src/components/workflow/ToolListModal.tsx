
import { Wrench, Cpu } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import type { WorkflowState } from "@/hooks/useWorkflowBuilder";
import type { SystemTool } from "@/hooks/useSystemTools";
import { ToolCard } from "./ToolCard";
import { SystemToolCard } from "./SystemToolCard";

interface ToolListModalProps {
  tools: (WorkflowState & { id: string; created_at: string; updated_at: string })[];
  systemTools: SystemTool[];
  isLoadingSystemTools: boolean;
  isOpen: boolean;
  onClose: () => void;
  onSelectTool: (tool: WorkflowState & { id: string }) => void;
  onSelectSystemTool: (tool: SystemTool) => void;
  onDeleteTool: () => void;
  onCreateNew: (name: string, description?: string) => void;
}

export const ToolListModal = ({ 
  tools, 
  systemTools,
  isLoadingSystemTools,
  isOpen, 
  onClose, 
  onSelectTool, 
  onSelectSystemTool,
  onDeleteTool,
  onCreateNew
}: ToolListModalProps) => {
  const hasUserTools = tools.length > 0;
  const hasSystemTools = systemTools.length > 0;
  const totalTools = tools.length + systemTools.length;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl bg-card border-border max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wrench className="w-5 h-5" />
            Browse Tools
          </DialogTitle>
          <DialogDescription>
            Select a tool to edit or create a new workflow
          </DialogDescription>
        </DialogHeader>

        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">
            {isLoadingSystemTools ? 'Loading...' : `${totalTools} tool${totalTools !== 1 ? 's' : ''} available`}
          </span>
          <Button onClick={() => { onCreateNew("New Tool"); onClose(); }}>
            Create New Tool
          </Button>
        </div>

        <div className="flex-1 overflow-auto space-y-6">
          {(totalTools === 0 && !isLoadingSystemTools) ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Wrench className="w-8 h-8 text-primary/50" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">No Tools Yet</h3>
              <p className="text-muted-foreground mb-4">
                Create your first tool to get started with workflow automation
              </p>
              <Button onClick={() => { onCreateNew("New Tool"); onClose(); }}>
                Create Your First Tool
              </Button>
            </div>
          ) : (
            <>
              {/* System Tools Section */}
              {(hasSystemTools || isLoadingSystemTools) && (
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <Cpu className="w-5 h-5 text-primary" />
                    <h3 className="text-lg font-semibold">System Tools</h3>
                    <span className="text-sm text-muted-foreground">
                      ({isLoadingSystemTools ? '...' : systemTools.length} available)
                    </span>
                  </div>
                  
                  {isLoadingSystemTools ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="h-32 bg-muted animate-pulse rounded-lg" />
                      ))}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {systemTools.map((tool) => (
                        <SystemToolCard
                          key={tool.id}
                          tool={tool}
                          onSelect={(selectedTool) => {
                            onSelectSystemTool(selectedTool);
                            onClose();
                          }}
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
                    <h3 className="text-lg font-semibold">My Workflows</h3>
                    <span className="text-sm text-muted-foreground">
                      ({tools.length} tool{tools.length !== 1 ? 's' : ''})
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {tools.map((tool) => (
                      <ToolCard
                        key={tool.id}
                        tool={tool}
                        onSelect={(selectedTool) => {
                          onSelectTool(selectedTool);
                          onClose();
                        }}
                        onDelete={onDeleteTool}
                      />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
