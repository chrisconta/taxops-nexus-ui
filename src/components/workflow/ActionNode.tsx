import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Settings, Trash2, Play } from 'lucide-react';

interface ActionNodeData {
  label: string;
  action?: string;
  isExecuting?: boolean;
  onDelete?: (nodeId: string) => void;
  onSettings?: (nodeId: string) => void;
}

interface ActionNodeProps {
  id: string;
  data: ActionNodeData;
}

export const ActionNode: React.FC<ActionNodeProps> = memo(({ id, data }) => {
  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    data.onDelete?.(id);
  };

  const handleSettings = (e: React.MouseEvent) => {
    e.stopPropagation();
    data.onSettings?.(id);
  };

  return (
    <Card className={`w-48 bg-blue-500 border-blue-600 text-white transition-all duration-200 ${
      data.isExecuting ? 'ring-2 ring-blue-300 ring-opacity-50' : ''
    }`}>
      <Handle 
        type="target" 
        position={Position.Top} 
        className="!w-3 !h-3 !bg-border hover:!bg-primary transition-colors"
      />
      
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">
            {data.label}
          </CardTitle>
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="ghost"
              onClick={handleSettings}
              className="h-6 w-6 p-0"
            >
              <Settings className="h-3 w-3" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleDelete}
              className="h-6 w-6 p-0"
            >
              <Trash2 className="h-3 w-3 text-destructive" />
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="text-xs text-muted-foreground">
          Type: action
        </div>
        {data.action && (
          <div className="text-xs text-muted-foreground mt-1">
            Action: {data.action}
          </div>
        )}
        {data.isExecuting && (
          <div className="flex items-center gap-1 mt-2 text-xs text-primary">
            <Play className="h-3 w-3" />
            Executing...
          </div>
        )}
      </CardContent>
      
      <Handle 
        type="source" 
        position={Position.Bottom} 
        className="!w-3 !h-3 !bg-border hover:!bg-primary transition-colors"
      />
    </Card>
  );
});

ActionNode.displayName = 'ActionNode';