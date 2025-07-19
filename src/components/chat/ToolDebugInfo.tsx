
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";
import { useState } from "react";

interface ToolDebugInfoProps {
  currentTool?: string;
  debugInfo?: any;
  toolChain?: string[];
}

export function ToolDebugInfo({ currentTool, debugInfo, toolChain }: ToolDebugInfoProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (!currentTool && !debugInfo && !toolChain?.length) {
    return null;
  }

  return (
    <div className="mt-2 p-2 bg-muted/50 rounded-md text-xs">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
          <ChevronDown className={`h-3 w-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          Debug Info
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-2 mt-2">
          {currentTool && (
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Current Tool:</span>
              <Badge variant="outline" className="text-xs">
                {currentTool}
              </Badge>
            </div>
          )}
          
          {toolChain && toolChain.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Tool Chain:</span>
              <div className="flex gap-1">
                {toolChain.map((tool, index) => (
                  <Badge key={index} variant="secondary" className="text-xs">
                    {tool}
                  </Badge>
                ))}
              </div>
            </div>
          )}
          
          {debugInfo && (
            <div className="space-y-1">
              <span className="text-muted-foreground">Debug Details:</span>
              <pre className="text-xs bg-background p-2 rounded border overflow-x-auto">
                {JSON.stringify(debugInfo, null, 2)}
              </pre>
            </div>
          )}
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
