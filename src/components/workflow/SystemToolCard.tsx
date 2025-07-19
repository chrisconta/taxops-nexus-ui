import { Users, Link, BarChart } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { SystemTool } from "@/hooks/useSystemTools";
interface SystemToolCardProps {
  tool: SystemTool;
  onSelect: (tool: SystemTool) => void;
}
const getToolIcon = (toolName: string) => {
  switch (toolName) {
    case 'register_client':
      return Users;
    case 'create_connection':
      return Link;
    case 'build_dashboard':
      return BarChart;
    default:
      return Users;
  }
};
const getToolDisplayName = (toolName: string) => {
  switch (toolName) {
    case 'register_client':
      return 'Register Client';
    case 'create_connection':
      return 'Create Connection';
    case 'build_dashboard':
      return 'Build Dashboard';
    default:
      return toolName;
  }
};
export const SystemToolCard = ({
  tool,
  onSelect
}: SystemToolCardProps) => {
  const Icon = getToolIcon(tool.name);
  const displayName = getToolDisplayName(tool.name);
  return <Card className="cursor-pointer hover:border-primary/50 transition-all duration-300 group relative overflow-hidden" onClick={() => onSelect(tool)}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3 flex-1">
            <div className="w-10 h-10 bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg flex items-center justify-center">
              <Icon className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-base group-hover:text-primary transition-colors">
                {displayName}
              </CardTitle>
              <CardDescription className="text-sm">
                System Tool
              </CardDescription>
            </div>
          </div>
          
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground line-clamp-2">
            {tool.description}
          </p>
          
          {tool.capabilities && tool.capabilities.length > 0 && <div className="flex flex-wrap gap-1 overflow-hidden">
              {tool.capabilities.slice(0, 3).map((capability, index) => <Badge key={index} variant="outline" className="text-xs px-1 py-0 shrink-0">
                  {capability}
                </Badge>)}
              {tool.capabilities.length > 3 && <Badge variant="outline" className="text-xs px-1 py-0 shrink-0">
                  +{tool.capabilities.length - 3}
                </Badge>}
            </div>}
        </div>
      </CardContent>
    </Card>;
};