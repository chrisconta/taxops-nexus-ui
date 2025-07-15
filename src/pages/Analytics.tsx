import { useState, useEffect, useRef } from "react";
import { Plus, Download, Save, Trash2, BarChart3, LineChart, PieChart, Table as TableIcon, MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { DashboardCanvas } from "@/components/analytics/DashboardCanvas";
import { DashboardList } from "@/components/analytics/DashboardList";
import { WidgetConfigModal } from "@/components/analytics/WidgetConfigModal";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export interface Widget {
  id: string;
  type: 'table' | 'bar-chart' | 'line-chart' | 'pie-chart';
  name: string;
  dataSource?: string;
  columns?: string[];
  filters?: Array<{
    column: string;
    operator: string;
    value: string;
  }>;
  transformations?: Array<{
    name: string;
    expression: string;
    function?: string;
    column?: string;
  }>;
  chartConfig?: {
    xAxis?: string;
    yAxis?: string;
    aggregation?: string;
  };
  script?: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
  isMinimized?: boolean;
  previousPosition?: { x: number; y: number };
  previousSize?: { width: number; height: number };
}

export interface Dashboard {
  id?: string;
  name: string;
  config: {
    widgets: Widget[];
  };
}

const Analytics = () => {
  const [dashboards, setDashboards] = useState<Dashboard[]>([]);
  const [currentDashboard, setCurrentDashboard] = useState<Dashboard | null>(null);
  const [selectedWidget, setSelectedWidget] = useState<Widget | null>(null);
  const [showNewDashboard, setShowNewDashboard] = useState(false);
  const [dashboardName, setDashboardName] = useState("");
  const [showDashboards, setShowDashboards] = useState(false);
  const [configModalState, setConfigModalState] = useState<{
    visible: boolean;
    widget: Widget | null;
  }>({ visible: false, widget: null });
  const [isSaving, setIsSaving] = useState(false);
  const [minimizedWidgets, setMinimizedWidgets] = useState<Widget[]>([]);
  const { toast } = useToast();

  // Auto-save timer reference
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadDashboards();
  }, []);

  // Auto-save functionality
  const autoSaveDashboard = async () => {
    if (!currentDashboard) return;

    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const dashboardData = {
        name: currentDashboard.name,
        config: currentDashboard.config as any,
        user_id: user.id
      };

      if (currentDashboard.id) {
        const { error } = await supabase
          .from('dashboards')
          .update(dashboardData)
          .eq('id', currentDashboard.id);

        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('dashboards')
          .insert(dashboardData)
          .select()
          .single();

        if (error) throw error;
        setCurrentDashboard({ ...currentDashboard, id: data.id });
      }

      await loadDashboards();
    } catch (error) {
      console.error('Error auto-saving dashboard:', error);
      toast({
        title: "Auto-save Error",
        description: "Failed to auto-save dashboard changes",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Watch for dashboard changes and auto-save
  useEffect(() => {
    if (!currentDashboard) return;

    // Clear previous timeout
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    // Set new timeout for auto-save (2 seconds after last change)
    autoSaveTimeoutRef.current = setTimeout(() => {
      autoSaveDashboard();
    }, 2000);

    // Cleanup timeout on unmount
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [currentDashboard]);

  const loadDashboards = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('dashboards')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (error) throw error;

      const formattedDashboards = data.map(d => ({
        id: d.id,
        name: d.name,
        config: (d.config as any) || { widgets: [] }
      }));

      setDashboards(formattedDashboards);
    } catch (error) {
      console.error('Error loading dashboards:', error);
      toast({
        title: "Error",
        description: "Failed to load dashboards",
        variant: "destructive",
      });
    }
  };

  const saveDashboard = async () => {
    if (!currentDashboard) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const dashboardData = {
        name: currentDashboard.name,
        config: currentDashboard.config as any,
        user_id: user.id
      };

      if (currentDashboard.id) {
        const { error } = await supabase
          .from('dashboards')
          .update(dashboardData)
          .eq('id', currentDashboard.id);

        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('dashboards')
          .insert(dashboardData)
          .select()
          .single();

        if (error) throw error;
        setCurrentDashboard({ ...currentDashboard, id: data.id });
      }

      await loadDashboards();
      toast({
        title: "Success",
        description: "Dashboard saved successfully",
      });
    } catch (error) {
      console.error('Error saving dashboard:', error);
      toast({
        title: "Error",
        description: "Failed to save dashboard",
        variant: "destructive",
      });
    }
  };

  const createNewDashboard = () => {
    if (!dashboardName.trim()) return;

    const newDashboard: Dashboard = {
      name: dashboardName,
      config: { widgets: [] }
    };

    setCurrentDashboard(newDashboard);
    setDashboardName("");
    setShowNewDashboard(false);
    setShowDashboards(false);
  };

  const loadDashboard = (dashboard: Dashboard) => {
    setCurrentDashboard(dashboard);
    setSelectedWidget(null);
    setShowDashboards(false);
  };

  const updateWidget = (updatedWidget: Widget) => {
    if (!currentDashboard) return;

    const updatedWidgets = currentDashboard.config.widgets.map(w => 
      w.id === updatedWidget.id ? updatedWidget : w
    );

    setCurrentDashboard({
      ...currentDashboard,
      config: { widgets: updatedWidgets }
    });

    // Update selected widget if it's the one being edited
    if (selectedWidget?.id === updatedWidget.id) {
      setSelectedWidget(updatedWidget);
    }
  };

  const addWidget = (widget: Widget) => {
    if (!currentDashboard) return;

    const updatedWidgets = [...currentDashboard.config.widgets, widget];
    setCurrentDashboard({
      ...currentDashboard,
      config: { widgets: updatedWidgets }
    });
  };

  const deleteWidget = (widgetId: string) => {
    if (!currentDashboard) return;

    const updatedWidgets = currentDashboard.config.widgets.filter(w => w.id !== widgetId);
    setCurrentDashboard({
      ...currentDashboard,
      config: { widgets: updatedWidgets }
    });

    if (selectedWidget?.id === widgetId) {
      setSelectedWidget(null);
    }
  };

  const handleConfigModal = (widget: Widget) => {
    setConfigModalState({ visible: true, widget });
  };

  const handleSaveWidget = (updatedWidget: Widget) => {
    updateWidget(updatedWidget);
    setConfigModalState({ visible: false, widget: null });
  };

  const handleCloseConfigModal = () => {
    setConfigModalState({ visible: false, widget: null });
  };

  const handleUpdateWidget = async (widget: Widget) => {
    if (!widget.dataSource) {
      toast({
        title: "Error",
        description: "Widget needs to be configured with a data source",
        variant: "destructive",
      });
      return;
    }

    try {
      // Use Supabase query builder instead of raw SQL for better reliability
      let query = supabase
        .from(widget.dataSource as any)
        .select('*'); // Select all columns to get fresh data

      // Apply filters if they exist
      if (widget.filters) {
        widget.filters.forEach(filter => {
          if (filter.column && filter.operator && filter.value) {
            switch (filter.operator) {
              case '=':
                query = query.eq(filter.column, filter.value);
                break;
              case '!=':
                query = query.neq(filter.column, filter.value);
                break;
              case '>':
                query = query.gt(filter.column, filter.value);
                break;
              case '<':
                query = query.lt(filter.column, filter.value);
                break;
              case '>=':
                query = query.gte(filter.column, filter.value);
                break;
              case '<=':
                query = query.lte(filter.column, filter.value);
                break;
              case 'LIKE':
                query = query.ilike(filter.column, `%${filter.value}%`);
                break;
              case 'NOT LIKE':
                query = query.not('column', 'ilike', `%${filter.value}%`);
                break;
            }
          }
        });
      }

      // Add limit for performance
      query = query.limit(1000);

      const { data, error } = await query;

      if (error) throw error;

      toast({
        title: "Success",
        description: `Widget "${widget.name}" updated successfully`,
      });
      
      // Force re-render by updating the widget (this will trigger useEffect in widget components)
      updateWidget({ ...widget });
    } catch (error) {
      console.error('Error updating widget:', error);
      toast({
        title: "Update Failed",
        description: error instanceof Error ? error.message : "Failed to update widget data",
        variant: "destructive",
      });
    }
  };

  const handleMinimizeWidget = (widget: Widget) => {
    if (!currentDashboard) return;

    // Store current position and size
    const minimizedWidget = {
      ...widget,
      isMinimized: true,
      previousPosition: { ...widget.position },
      previousSize: { ...widget.size }
    };

    // Remove from dashboard widgets
    const updatedWidgets = currentDashboard.config.widgets.filter(w => w.id !== widget.id);
    setCurrentDashboard({
      ...currentDashboard,
      config: { widgets: updatedWidgets }
    });

    // Add to minimized widgets
    setMinimizedWidgets(prev => [...prev, minimizedWidget]);

    if (selectedWidget?.id === widget.id) {
      setSelectedWidget(null);
    }
  };

  const handleRestoreWidget = (widget: Widget) => {
    if (!currentDashboard) return;

    // Restore to previous position and size
    const restoredWidget = {
      ...widget,
      isMinimized: false,
      position: widget.previousPosition || { x: 100, y: 100 },
      size: widget.previousSize || { width: 400, height: 300 }
    };

    // Remove previous position data
    delete restoredWidget.previousPosition;
    delete restoredWidget.previousSize;

    // Add back to dashboard widgets
    const updatedWidgets = [...currentDashboard.config.widgets, restoredWidget];
    setCurrentDashboard({
      ...currentDashboard,
      config: { widgets: updatedWidgets }
    });

    // Remove from minimized widgets
    setMinimizedWidgets(prev => prev.filter(w => w.id !== widget.id));
  };

  // Element types for palette
  const elementTypes = [
    {
      type: 'table' as const,
      name: 'Data Table',
      description: 'Display data in rows and columns',
      icon: TableIcon,
    },
    {
      type: 'bar-chart' as const,
      name: 'Bar Chart',
      description: 'Compare values across categories',
      icon: BarChart3,
    },
    {
      type: 'line-chart' as const,
      name: 'Line Chart',
      description: 'Show trends over time',
      icon: LineChart,
    },
    {
      type: 'pie-chart' as const,
      name: 'Pie Chart',
      description: 'Show proportions of a whole',
      icon: PieChart,
    },
  ];

  const handleAddWidget = (type: Widget['type']) => {
    const newWidget: Widget = {
      id: `widget-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      name: `New ${elementTypes.find(t => t.type === type)?.name || 'Widget'}`,
      position: { x: 50, y: 50 },
      size: { width: 400, height: 300 },
      filters: [],
      transformations: [],
    };

    addWidget(newWidget);
    // Automatically open configuration modal for new widgets
    setConfigModalState({ visible: true, widget: newWidget });
  };

  return (
    <TooltipProvider>
      <div className="h-full flex flex-col">
        {/* Toolbar */}
        <div className="border-b border-glass-border bg-glass-bg/30 backdrop-blur-sm p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-xl font-bold text-white flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-br from-primary to-primary/70 rounded-lg flex items-center justify-center">
                  <BarChart3 className="w-4 h-4 text-white" />
                </div>
                {currentDashboard ? currentDashboard.name : 'Analytics Dashboard'}
              </h1>
            </div>

            <div className="flex items-center gap-4">
              {/* Components Palette */}
              {currentDashboard && (
                <div className="flex items-center gap-2 border-r border-glass-border pr-4">
                  {elementTypes.map((element) => {
                    const Icon = element.icon;
                    return (
                      <Tooltip key={element.type}>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleAddWidget(element.type)}
                            className="w-10 h-10 p-0 hover:bg-primary/10"
                          >
                            <Icon className="w-5 h-5 text-primary" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="font-medium">{element.name}</p>
                          <p className="text-xs text-muted-foreground">{element.description}</p>
                        </TooltipContent>
                      </Tooltip>
                    );
                  })}
                </div>
              )}

              {/* Actions Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem onClick={() => setShowNewDashboard(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    New Dashboard
                  </DropdownMenuItem>
                  {currentDashboard && (
                    <>
                      <DropdownMenuItem onClick={saveDashboard} disabled={isSaving}>
                        <Save className="w-4 h-4 mr-2" />
                        {isSaving ? "Saving..." : "Save"}
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Download className="w-4 h-4 mr-2" />
                        Export as PDF
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Download className="w-4 h-4 mr-2" />
                        Export as PNG
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Download className="w-4 h-4 mr-2" />
                        Export Data as CSV
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setShowDashboards(true)}>
                    <TableIcon className="w-4 h-4 mr-2" />
                    Dashboards
                  </DropdownMenuItem>
                  {dashboards.length > 0 && (
                    <>
                      <DropdownMenuSeparator />
                      {dashboards.slice(0, 5).map((dashboard) => (
                        <DropdownMenuItem 
                          key={dashboard.id} 
                          onClick={() => loadDashboard(dashboard)}
                        >
                          {dashboard.name}
                        </DropdownMenuItem>
                      ))}
                      {dashboards.length > 5 && (
                        <DropdownMenuItem onClick={() => setShowDashboards(true)}>
                          View all dashboards...
                        </DropdownMenuItem>
                      )}
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        {/* Main Content */}
        {currentDashboard ? (
          <div className="flex-1 bg-background/50">
            <DashboardCanvas
              dashboard={currentDashboard}
              selectedWidget={selectedWidget}
              onSelectWidget={handleConfigModal}
              onUpdateWidget={updateWidget}
              onDeleteWidget={deleteWidget}
              onEditWidget={handleConfigModal}
              onRefreshWidget={handleUpdateWidget}
              onMinimizeWidget={handleMinimizeWidget}
              isFrozen={configModalState.visible}
            />
            
            {/* Minimized Widgets Area */}
            {minimizedWidgets.length > 0 && (
              <div className="absolute bottom-4 left-80 right-4 bg-glass-bg/90 backdrop-blur-sm border border-glass-border rounded-lg p-3 z-10">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm text-muted-foreground mr-2">Minimized:</span>
                  {minimizedWidgets.map((widget) => {
                    const Icon = elementTypes.find(t => t.type === widget.type)?.icon || TableIcon;
                    return (
                      <Button
                        key={widget.id}
                        variant="outline"
                        size="sm"
                        onClick={() => handleRestoreWidget(widget)}
                        className="h-8 bg-background/80 hover:bg-primary/10 border-border"
                      >
                        <Icon className="w-3 h-3 mr-1" />
                        {widget.name}
                      </Button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <Card className="w-96 bg-card border-border">
              <CardHeader className="text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-primary to-primary/70 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <BarChart3 className="w-8 h-8 text-white" />
                </div>
                <CardTitle>Welcome to Analytics</CardTitle>
                <CardDescription>
                  Create interactive dashboards with drag-and-drop widgets
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button 
                  onClick={() => setShowNewDashboard(true)}
                  className="w-full bg-primary hover:bg-primary/90"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Your First Dashboard
                </Button>
                {dashboards.length > 0 && (
                  <Button 
                    variant="outline"
                    onClick={() => setShowDashboards(true)}
                    className="w-full"
                  >
                    <TableIcon className="w-4 h-4 mr-2" />
                    View Existing Dashboards
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* New Dashboard Dialog */}
        <Dialog open={showNewDashboard} onOpenChange={setShowNewDashboard}>
          <DialogContent className="bg-card border-border">
            <DialogHeader>
              <DialogTitle>Create New Dashboard</DialogTitle>
              <DialogDescription>
                Enter a name for your new dashboard
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="dashboard-name">Dashboard Name</Label>
                <Input
                  id="dashboard-name"
                  value={dashboardName}
                  onChange={(e) => setDashboardName(e.target.value)}
                  placeholder="My Analytics Dashboard"
                  className="bg-background border-border"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowNewDashboard(false)}>
                  Cancel
                </Button>
                <Button onClick={createNewDashboard} disabled={!dashboardName.trim()}>
                  Create
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Dashboard List Dialog */}
        <DashboardList
          dashboards={dashboards}
          isOpen={showDashboards}
          onClose={() => setShowDashboards(false)}
          onSelectDashboard={loadDashboard}
          onDeleteDashboard={loadDashboards}
        />

        {/* Widget Configuration Modal */}
        <WidgetConfigModal
          visible={configModalState.visible}
          widget={configModalState.widget}
          onClose={handleCloseConfigModal}
          onSave={handleSaveWidget}
        />
      </div>
    </TooltipProvider>
  );
};

export default Analytics;