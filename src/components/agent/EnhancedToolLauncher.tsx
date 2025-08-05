
import React, { useState } from "react";
import { ChevronDown, Wrench, User, Database, BarChart3, Settings, Cpu, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { useAllTools } from "@/hooks/useAllTools";
import { executeTool } from "@/api/agent";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface EnhancedToolLauncherProps {
  onToolInitiate: (toolType: 'system' | 'workflow', toolData: any) => void;
  disabled?: boolean;
}

const getToolIcon = (toolName: string) => {
  switch (toolName) {
    case 'register_client':
      return User;
    case 'create_connection':
      return Database;
    case 'build_dashboard':
      return BarChart3;
    default:
      return Settings;
  }
};

export const EnhancedToolLauncher: React.FC<EnhancedToolLauncherProps> = ({ 
  onToolInitiate, 
  disabled = false 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const { systemTools, workflowTools, isLoading } = useAllTools();

  const handleToolSelect = (toolType: 'system' | 'workflow', toolData: any) => {
    onToolInitiate(toolType, toolData);
    setIsOpen(false);
  };

  const handleTaxReportDownload = async () => {
    try {
      setIsOpen(false);
      toast.success("Preparing tax report download...");
      
      // Fetch the latest tax report directly from the database
      const { data: reports, error } = await supabase
        .from('tax_reports')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) throw error;

      if (!reports || reports.length === 0) {
        toast.error("No tax reports found");
        return;
      }

      const report = reports[0];

      // Download the file directly from storage
      const { data: fileData, error: downloadError } = await supabase.storage
        .from('tax-reports')
        .download(report.storage_path);

      if (downloadError) throw downloadError;

      // Create download link
      const url = URL.createObjectURL(fileData);
      const a = document.createElement('a');
      a.href = url;
      a.download = report.original_filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success(`Tax report "${report.original_filename}" downloaded successfully!`);
    } catch (error: any) {
      console.error('Tax report download error:', error);
      toast.error(`Failed to download tax report: ${error.message}`);
    }
  };

  const totalTools = systemTools.length + workflowTools.length;

  return (
    <div className="mb-4">
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            disabled={disabled || isLoading}
            className="w-full justify-between bg-glass-bg/20 border-glass-border text-white hover:bg-glass-bg/30"
          >
            <div className="flex items-center gap-2">
              <Wrench className="w-4 h-4" />
              <span>Launch Tool</span>
              {totalTools > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {totalTools}
                </Badge>
              )}
            </div>
            <ChevronDown className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent 
          className="w-full max-w-[600px] max-h-[400px] overflow-y-auto bg-background border-border z-50" 
          align="start" 
          sideOffset={4}
        >
          {isLoading ? (
            <div className="p-4 text-center text-muted-foreground">
              Loading tools...
            </div>
          ) : (
            <>
              {/* System Tools Section */}
              {systemTools.length > 0 && (
                <>
                  <DropdownMenuLabel className="flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-primary" />
                    System Tools
                  </DropdownMenuLabel>
                  {systemTools.map(tool => {
                    const Icon = getToolIcon(tool.name);
                    return (
                      <DropdownMenuItem
                        key={tool.id}
                        onClick={() => handleToolSelect('system', tool)}
                        className="cursor-pointer hover:bg-accent p-3"
                      >
                        <div className="flex items-start gap-3 w-full">
                          <Icon className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="font-medium truncate">{tool.name}</div>
                            <div className="text-sm text-muted-foreground line-clamp-2">
                              {tool.description}
                            </div>
                            {tool.category && (
                              <Badge variant="outline" className="text-xs mt-1">
                                {tool.category}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </DropdownMenuItem>
                    );
                  })}
                </>
              )}

              {/* Tax Report Download Section */}
              {systemTools.length > 0 && <DropdownMenuSeparator />}
              
              <DropdownMenuLabel className="flex items-center gap-2">
                <Download className="w-4 h-4 text-primary" />
                Reports
              </DropdownMenuLabel>
              
              <DropdownMenuItem
                onClick={handleTaxReportDownload}
                className="cursor-pointer hover:bg-accent p-3"
              >
                <div className="flex items-start gap-3 w-full">
                  <Download className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium">Download Tax Report</div>
                    <div className="text-sm text-muted-foreground">
                      Download available tax workpaper reports
                    </div>
                    <Badge variant="outline" className="text-xs mt-1">
                      Tax Documents
                    </Badge>
                  </div>
                </div>
              </DropdownMenuItem>

              {/* Separator if workflow tools exist */}
              {workflowTools.length > 0 && <DropdownMenuSeparator />}

              {/* Custom Workflow Tools Section */}
              {workflowTools.length > 0 && (
                <>
                  <DropdownMenuLabel className="flex items-center gap-2">
                    <Wrench className="w-4 h-4 text-primary" />
                    Custom Workflows
                  </DropdownMenuLabel>
                  {workflowTools.map(tool => (
                    <DropdownMenuItem
                      key={tool.id}
                      onClick={() => handleToolSelect('workflow', tool)}
                      className="cursor-pointer hover:bg-accent p-3"
                    >
                      <div className="flex items-start gap-3 w-full">
                        <Wrench className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{tool.name}</div>
                          <div className="text-sm text-muted-foreground line-clamp-2">
                            {tool.description || 'Custom workflow tool'}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">
                              {tool.nodes?.length || 0} nodes
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {tool.status}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </DropdownMenuItem>
                  ))}
                </>
              )}

              {/* Empty state */}
              {totalTools === 0 && !isLoading && (
                <div className="p-4 text-center text-muted-foreground">
                  No tools available
                </div>
              )}
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};
