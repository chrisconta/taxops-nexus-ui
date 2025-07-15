import { Trash2, BarChart3, Calendar, Clock } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { Dashboard } from "@/pages/Analytics";

interface DashboardListProps {
  dashboards: Dashboard[];
  isOpen: boolean;
  onClose: () => void;
  onSelectDashboard: (dashboard: Dashboard) => void;
  onDeleteDashboard: () => void;
}

export const DashboardList = ({ 
  dashboards, 
  isOpen, 
  onClose, 
  onSelectDashboard, 
  onDeleteDashboard 
}: DashboardListProps) => {
  const { toast } = useToast();

  const handleDeleteDashboard = async (dashboardId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    try {
      const { error } = await supabase
        .from('dashboards')
        .delete()
        .eq('id', dashboardId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Dashboard deleted successfully",
      });

      onDeleteDashboard();
    } catch (error) {
      console.error('Error deleting dashboard:', error);
      toast({
        title: "Error",
        description: "Failed to delete dashboard",
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl bg-card border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Your Dashboards
          </DialogTitle>
          <DialogDescription>
            Select a dashboard to open or create a new one
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {dashboards.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <BarChart3 className="w-8 h-8 text-primary/50" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">No Dashboards Yet</h3>
              <p className="text-muted-foreground">
                Create your first dashboard to get started with analytics
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-96 overflow-auto">
              {dashboards.map((dashboard) => {
                const widgetCount = dashboard.config.widgets?.length || 0;
                
                return (
                  <Card 
                    key={dashboard.id}
                    className="cursor-pointer hover:border-primary/50 transition-all duration-300 group"
                    onClick={() => {
                      onSelectDashboard(dashboard);
                      onClose();
                    }}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-base group-hover:text-primary transition-colors">
                            {dashboard.name}
                          </CardTitle>
                          <CardDescription className="text-sm">
                            {widgetCount} widget{widgetCount !== 1 ? 's' : ''}
                          </CardDescription>
                        </div>
                        {dashboard.id && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                            onClick={(e) => handleDeleteDashboard(dashboard.id!, e)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Calendar className="w-3 h-3" />
                          Created {formatDate(new Date().toISOString())}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          Last modified {formatDate(new Date().toISOString())}
                        </div>
                      </div>
                      
                      {/* Widget preview */}
                      <div className="mt-3 pt-3 border-t border-border/50">
                        <div className="grid grid-cols-3 gap-1">
                          {Array.from({ length: Math.min(6, widgetCount) }).map((_, i) => (
                            <div 
                              key={i}
                              className="h-6 bg-gradient-to-br from-primary/10 to-primary/5 rounded border border-primary/20"
                            />
                          ))}
                          {widgetCount > 6 && (
                            <div className="h-6 bg-muted rounded flex items-center justify-center">
                              <span className="text-xs text-muted-foreground">+{widgetCount - 6}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};