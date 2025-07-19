
import { Wrench, Calendar, Clock } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { WorkflowState } from "@/hooks/useWorkflowBuilder";
import { ToolCard } from "./ToolCard";

interface ToolListModalProps {
  tools: (WorkflowState & { id: string; created_at: string; updated_at: string })[];
  isOpen: boolean;
  onClose: () => void;
  onSelectTool: (tool: WorkflowState & { id: string }) => void;
  onDeleteTool: () => void;
  onCreateNew: () => void;
}

export const ToolListModal = ({ 
  tools, 
  isOpen, 
  onClose, 
  onSelectTool, 
  onDeleteTool,
  onCreateNew
}: ToolListModalProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl bg-card border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wrench className="w-5 h-5" />
            Your Tools
          </DialogTitle>
          <DialogDescription>
            Select a tool to edit or create a new one
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">
              {tools.length} tool{tools.length !== 1 ? 's' : ''}
            </span>
            <Button onClick={() => { onCreateNew(); onClose(); }}>
              Create New Tool
            </Button>
          </div>

          {tools.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Wrench className="w-8 h-8 text-primary/50" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">No Tools Yet</h3>
              <p className="text-muted-foreground mb-4">
                Create your first tool to get started with workflow automation
              </p>
              <Button onClick={() => { onCreateNew(); onClose(); }}>
                Create Your First Tool
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-96 overflow-auto">
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
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
