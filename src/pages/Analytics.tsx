import { useState, useEffect } from "react";
import { Plus, Download, Save, Trash2, BarChart3, LineChart, PieChart, Table as TableIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { DashboardCanvas } from "@/components/analytics/DashboardCanvas";
import { ElementPalette } from "@/components/analytics/ElementPalette";
import { ConfigurationPanel } from "@/components/analytics/ConfigurationPanel";
import { DashboardList } from "@/components/analytics/DashboardList";
import { ScriptEditorModal } from "@/components/analytics/ScriptEditorModal";
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
  }>;
  chartConfig?: {
    xAxis?: string;
    yAxis?: string;
    aggregation?: string;
  };
  script?: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
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
  const [scriptModalState, setScriptModalState] = useState<{
    visible: boolean;
    widget: Widget | null;
  }>({ visible: false, widget: null });
  const { toast } = useToast();

  useEffect(() => {
    loadDashboards();
  }, []);

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

  const handleEditScript = (widgetId: string) => {
    if (!currentDashboard) return;
    
    const widget = currentDashboard.config.widgets.find(w => w.id === widgetId);
    if (widget) {
      setScriptModalState({ visible: true, widget });
    }
  };

  const handleSaveScript = (widgetId: string, script: string) => {
    if (!currentDashboard) return;

    const updatedWidgets = currentDashboard.config.widgets.map(w => 
      w.id === widgetId ? { ...w, script } : w
    );

    setCurrentDashboard({
      ...currentDashboard,
      config: { widgets: updatedWidgets }
    });

    setScriptModalState({ visible: false, widget: null });
  };

  const handleCloseScriptModal = () => {
    setScriptModalState({ visible: false, widget: null });
  };

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <div className="border-b border-glass-border bg-glass-bg/30 backdrop-blur-sm p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-primary to-primary/70 rounded-lg flex items-center justify-center">
                <BarChart3 className="w-4 h-4 text-white" />
              </div>
              Analytics Dashboard
            </h1>
            {currentDashboard && (
              <span className="text-sm text-taxops-gray-light">
                {currentDashboard.name}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowDashboards(true)}
              className="text-taxops-gray-light hover:text-white"
            >
              <TableIcon className="w-4 h-4 mr-2" />
              Dashboards
            </Button>

            <Dialog open={showNewDashboard} onOpenChange={setShowNewDashboard}>
              <DialogTrigger asChild>
                <Button size="sm" className="bg-primary hover:bg-primary/90">
                  <Plus className="w-4 h-4 mr-2" />
                  New Dashboard
                </Button>
              </DialogTrigger>
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

            {currentDashboard && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={saveDashboard}
                  className="border-primary/30 text-primary hover:bg-primary/10"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Save
                </Button>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Download className="w-4 h-4 mr-2" />
                      Export
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem>Export as PDF</DropdownMenuItem>
                    <DropdownMenuItem>Export as PNG</DropdownMenuItem>
                    <DropdownMenuItem>Export Data as CSV</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      {currentDashboard ? (
        <div className="flex-1 flex">
          <ResizablePanelGroup direction="horizontal" className="flex-1">
            {/* Element Palette */}
            <ResizablePanel defaultSize={20} minSize={15} maxSize={30}>
              <div className="h-full border-r border-glass-border bg-glass-bg/20">
                <ElementPalette onAddWidget={addWidget} />
              </div>
            </ResizablePanel>

            <ResizableHandle withHandle />

            {/* Canvas */}
            <ResizablePanel defaultSize={selectedWidget ? 60 : 80}>
              <div className="h-full bg-background/50">
                <DashboardCanvas
                  dashboard={currentDashboard}
                  selectedWidget={selectedWidget}
                  onSelectWidget={setSelectedWidget}
                  onUpdateWidget={updateWidget}
                  onDeleteWidget={deleteWidget}
                  onEditScript={handleEditScript}
                  isFrozen={scriptModalState.visible}
                />
              </div>
            </ResizablePanel>

            {/* Configuration Panel */}
            {selectedWidget && (
              <>
                <ResizableHandle withHandle />
                <ResizablePanel defaultSize={20} minSize={15} maxSize={35}>
                  <div className="h-full border-l border-glass-border bg-glass-bg/20">
                    <ConfigurationPanel
                      widget={selectedWidget}
                      onUpdateWidget={updateWidget}
                      onClose={() => setSelectedWidget(null)}
                    />
                  </div>
                </ResizablePanel>
              </>
            )}
          </ResizablePanelGroup>
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

      {/* Dashboard List Dialog */}
      <DashboardList
        dashboards={dashboards}
        isOpen={showDashboards}
        onClose={() => setShowDashboards(false)}
        onSelectDashboard={loadDashboard}
        onDeleteDashboard={loadDashboards}
      />

      {/* Script Editor Modal */}
      <ScriptEditorModal
        visible={scriptModalState.visible}
        widget={scriptModalState.widget}
        onClose={handleCloseScriptModal}
        onSave={handleSaveScript}
      />
    </div>
  );
};

export default Analytics;