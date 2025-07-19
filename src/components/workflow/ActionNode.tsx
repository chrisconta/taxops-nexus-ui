
import React, { memo, useState } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Settings, Trash2, Play, Cpu } from 'lucide-react';
import { NodeConfigModal, NodeConfiguration } from './NodeConfigModal';

interface ActionNodeData {
  label: string;
  action?: string;
  isExecuting?: boolean;
  onDelete?: (nodeId: string) => void;
  onUpdateConfig?: (nodeId: string, config: NodeConfiguration) => void;
  config?: NodeConfiguration;
}

interface ActionNodeProps {
  id: string;
  data: ActionNodeData;
}

export const ActionNode: React.FC<ActionNodeProps> = memo(({ id, data }) => {
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    data.onDelete?.(id);
  };

  const handleSettings = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsConfigModalOpen(true);
  };

  const handleConfigSave = (config: NodeConfiguration) => {
    data.onUpdateConfig?.(id, config);
  };

  const hasInstructions = data.config?.instructions && data.config.instructions.length > 0;
  const hasTools = data.config?.tools && data.config.tools.length > 0;

  return (
    <>
      <Card className={`w-48 transition-all duration-200 ${
        data.isExecuting ? 'ring-2 ring-primary ring-opacity-50' : ''
      }`}>
        <Handle 
          type="target" 
          position={Position.Top} 
          className="!w-3 !h-3 !bg-border hover:!bg-primary transition-colors"
        />
        
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">
              {data.config?.label || data.label}
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
        
        <CardContent className="pt-0 space-y-2">
          <div className="text-xs text-muted-foreground">
            Type: action
          </div>
          
          {hasInstructions && (
            <div className="flex items-center gap-1 text-xs text-blue-600">
              <Cpu className="h-3 w-3" />
              AI Configured
            </div>
          )}
          
          {hasTools && (
            <div className="flex flex-wrap gap-1">
              {data.config!.tools.slice(0, 2).map((tool) => (
                <Badge key={tool} variant="outline" className="text-xs px-1 py-0">
                  {tool}
                </Badge>
              ))}
              {data.config!.tools.length > 2 && (
                <Badge variant="outline" className="text-xs px-1 py-0">
                  +{data.config!.tools.length - 2}
                </Badge>
              )}
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

      <NodeConfigModal
        isOpen={isConfigModalOpen}
        onClose={() => setIsConfigModalOpen(false)}
        onSave={handleConfigSave}
        initialConfig={data.config}
        nodeId={id}
      />
    </>
  );
});

ActionNode.displayName = 'ActionNode';
