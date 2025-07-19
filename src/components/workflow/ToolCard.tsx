
import { Calendar, Clock, Trash2, Play, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { WorkflowState } from "@/hooks/useWorkflowBuilder";

interface ToolCardProps {
  tool: WorkflowState & { id: string; created_at: string; updated_at: string };
  onSelect: (tool: WorkflowState & { id: string }) => void;
  onDelete: () => void;
}

export const ToolCard = ({ tool, onSelect, onDelete }: ToolCardProps) => {
  const { toast } = useToast();

  const handleDeleteTool = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    try {
      const { error } = await supabase
        .from('tool_workflows')
        .delete()
        .eq('id', tool.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Tool deleted successfully",
      });

      onDelete();
    } catch (error) {
      console.error('Error deleting tool:', error);
      toast({
        title: "Error",
        description: "Failed to delete tool",
        variant: "destructive",
      });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const nodeCount = tool.nodes?.length || 0;
  const connectionCount = tool.connections?.length || 0;

  return (
    <Card 
      className="cursor-pointer hover:border-primary/50 transition-all duration-300 group"
      onClick={() => onSelect(tool)}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-base group-hover:text-primary transition-colors">
              {tool.name}
            </CardTitle>
            <CardDescription className="text-sm">
              {nodeCount} node{nodeCount !== 1 ? 's' : ''}, {connectionCount} connection{connectionCount !== 1 ? 's' : ''}
            </CardDescription>
          </div>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-primary"
              onClick={(e) => {
                e.stopPropagation();
                // TODO: Implement duplicate functionality
                toast({
                  title: "Coming Soon",
                  description: "Tool duplication will be available soon",
                });
              }}
            >
              <Copy className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-destructive"
              onClick={handleDeleteTool}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {tool.description && (
            <p className="text-sm text-muted-foreground line-clamp-2">
              {tool.description}
            </p>
          )}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Calendar className="w-3 h-3" />
            Created {formatDate(tool.created_at)}
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="w-3 h-3" />
            Modified {formatDate(tool.updated_at)}
          </div>
        </div>
        
        {/* Visual preview of nodes */}
        <div className="mt-3 pt-3 border-t border-border/50">
          <div className="grid grid-cols-4 gap-1">
            {Array.from({ length: Math.min(8, nodeCount) }).map((_, i) => (
              <div 
                key={i}
                className="h-4 bg-gradient-to-br from-primary/10 to-primary/5 rounded border border-primary/20"
              />
            ))}
            {nodeCount > 8 && (
              <div className="h-4 bg-muted rounded flex items-center justify-center">
                <span className="text-xs text-muted-foreground">+{nodeCount - 8}</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
