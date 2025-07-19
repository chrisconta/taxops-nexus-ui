
import { Wrench, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { WorkflowState } from "@/hooks/useWorkflowBuilder";
import { ToolCard } from "./ToolCard";

interface ToolListProps {
  tools: (WorkflowState & { id: string; created_at: string; updated_at: string })[];
  onSelectTool: (tool: WorkflowState & { id: string }) => void;
  onDeleteTool: () => void;
  onCreateNew: () => void;
}

export const ToolList = ({ tools, onSelectTool, onDeleteTool, onCreateNew }: ToolListProps) => {
  if (tools.length === 0) {
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
          <Button onClick={onCreateNew} size="lg" className="gap-2">
            <Plus className="w-5 h-5" />
            Create New Tool
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Your Tools</h2>
        <p className="text-muted-foreground">
          {tools.length} tool{tools.length !== 1 ? 's' : ''} available
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {tools.map((tool) => (
          <ToolCard
            key={tool.id}
            tool={tool}
            onSelect={onSelectTool}
            onDelete={onDeleteTool}
          />
        ))}
      </div>
    </div>
  );
};
