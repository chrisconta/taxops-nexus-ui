import React, { useState } from "react";
import { ChevronDown, Wrench, User, Database, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

interface ToolLauncherProps {
  onInvoke: (toolName: string, params: Record<string, any>) => void;
  availableTools: string[];
  disabled?: boolean;
}

const toolConfig = {
  register_client: {
    label: "Register Client",
    icon: User,
    description: "Register a new client in the system",
    params: {}
  },
  create_connection: {
    label: "Create Connection",
    icon: Database,
    description: "Set up a new data connection",
    params: {}
  },
  build_dashboard: {
    label: "Build Dashboard",
    icon: BarChart3,
    description: "Create a new analytics dashboard",
    params: {}
  }
};

export const ToolLauncher: React.FC<ToolLauncherProps> = ({ 
  onInvoke, 
  availableTools, 
  disabled = false 
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleToolInvoke = (toolName: string) => {
    const config = toolConfig[toolName as keyof typeof toolConfig];
    if (config) {
      onInvoke(toolName, config.params);
    }
    setIsOpen(false);
  };

  return (
    <div className="mb-4">
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            disabled={disabled}
            className="w-full justify-between bg-glass-bg/20 border-glass-border text-white hover:bg-glass-bg/30"
          >
            <div className="flex items-center gap-2">
              <Wrench className="w-4 h-4" />
              <span>Launch Tool</span>
            </div>
            <ChevronDown className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-full bg-background border-border">
          {availableTools.map(toolName => {
            const config = toolConfig[toolName as keyof typeof toolConfig];
            if (!config) return null;
            
            const Icon = config.icon;
            return (
              <DropdownMenuItem
                key={toolName}
                onClick={() => handleToolInvoke(toolName)}
                className="cursor-pointer hover:bg-accent p-3"
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-4 h-4 text-primary" />
                  <div>
                    <div className="font-medium">{config.label}</div>
                    <div className="text-sm text-muted-foreground">{config.description}</div>
                  </div>
                </div>
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};