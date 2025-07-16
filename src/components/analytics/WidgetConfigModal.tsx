import { useState, useEffect } from "react";
import { X, Database, Plus, Trash2, Code, Settings, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import type { Widget } from "@/pages/Analytics";

// Monaco Editor
import Editor from "@monaco-editor/react";

interface WidgetConfigModalProps {
  visible: boolean;
  widget: Widget | null;
  onClose: () => void;
  onSave: (widget: Widget) => void;
}

const availableTables = [
  { name: 'transactions', label: 'Transactions' },
  { name: 'clients', label: 'Clients' },
];


const aggregations = [
  { value: 'count', label: 'Count' },
  { value: 'sum', label: 'Sum' },
  { value: 'avg', label: 'Average' },
  { value: 'min', label: 'Minimum' },
  { value: 'max', label: 'Maximum' },
];

const transformationFunctions = [
  { value: 'sum', label: 'Sum' },
  { value: 'average', label: 'Average' },
  { value: 'count', label: 'Count' },
];

// Generate script from transformations
const generateScriptFromTransformations = (widget: Widget): string => {
  const lines: string[] = [];
  
  lines.push('// Auto-generated script from transformations');
  lines.push('// Edit this script to add custom data processing logic');
  lines.push('');
  lines.push('function processData(data) {');
  lines.push('  // Process data without filters');
  lines.push('  let filteredData = data;');
  lines.push('');
  lines.push('  // Apply transformations');
  
  if (widget.transformations && widget.transformations.length > 0) {
    lines.push('  let transformedData = filteredData.map(row => {');
    lines.push('    let newRow = { ...row };');
    
    widget.transformations.forEach((transformation: any) => {
      if (transformation.name && transformation.function && transformation.column) {
        const transformationCode = generateTransformationCode(transformation);
        lines.push(`    ${transformationCode}`);
      }
    });
    
    lines.push('    return newRow;');
    lines.push('  });');
  } else {
    lines.push('  let transformedData = filteredData;');
  }
  
  lines.push('');
  lines.push('  // Apply aggregations if needed');
  lines.push('  if (widget.chartConfig && widget.chartConfig.aggregation) {');
  lines.push('    transformedData = applyAggregation(transformedData, widget.chartConfig);');
  lines.push('  }');
  lines.push('');
  lines.push('  return transformedData;');
  lines.push('}');
  lines.push('');
  
  // Add helper functions
  lines.push('function applyAggregation(data, config) {');
  lines.push('  // Group by X-axis if specified');
  lines.push('  if (config.xAxis && config.yAxis) {');
  lines.push('    const grouped = data.reduce((acc, row) => {');
  lines.push('      const key = row[config.xAxis];');
  lines.push('      if (!acc[key]) acc[key] = [];');
  lines.push('      acc[key].push(row);');
  lines.push('      return acc;');
  lines.push('    }, {});');
  lines.push('');
  lines.push('    return Object.entries(grouped).map(([key, values]) => {');
  lines.push('      const aggregated = {};');
  lines.push('      aggregated[config.xAxis] = key;');
  lines.push('      ');
  lines.push('      switch (config.aggregation) {');
  lines.push('        case "sum":');
  lines.push('          aggregated[config.yAxis] = values.reduce((sum, row) => sum + (row[config.yAxis] || 0), 0);');
  lines.push('          break;');
  lines.push('        case "avg":');
  lines.push('          aggregated[config.yAxis] = values.reduce((sum, row) => sum + (row[config.yAxis] || 0), 0) / values.length;');
  lines.push('          break;');
  lines.push('        case "count":');
  lines.push('          aggregated[config.yAxis] = values.length;');
  lines.push('          break;');
  lines.push('        case "min":');
  lines.push('          aggregated[config.yAxis] = Math.min(...values.map(row => row[config.yAxis] || 0));');
  lines.push('          break;');
  lines.push('        case "max":');
  lines.push('          aggregated[config.yAxis] = Math.max(...values.map(row => row[config.yAxis] || 0));');
  lines.push('          break;');
  lines.push('        default:');
  lines.push('          aggregated[config.yAxis] = values.length;');
  lines.push('      }');
  lines.push('      return aggregated;');
  lines.push('    });');
  lines.push('  }');
  lines.push('  return data;');
  lines.push('}');
  
  return lines.join('\n');
};


const generateTransformationCode = (transformation: any): string => {
  const { name, function: func, column } = transformation;
  
  switch (func) {
    case 'sum':
      return `newRow['${name}'] = row['${column}'] || 0; // Individual row value for sum aggregation`;
    case 'average':
      return `newRow['${name}'] = row['${column}'] || 0; // Individual row value for average aggregation`;
    case 'count':
      return `newRow['${name}'] = 1; // Count each row as 1`;
    default:
      return `newRow['${name}'] = row['${column}'];`;
  }
};

export const WidgetConfigModal = ({ visible, widget, onClose, onSave }: WidgetConfigModalProps) => {
  const [currentWidget, setCurrentWidget] = useState<Widget | null>(null);
  const [tableColumns, setTableColumns] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [scriptContent, setScriptContent] = useState("");
  const [dataPreview, setDataPreview] = useState<any[]>([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [selectedDataSource, setSelectedDataSource] = useState<string>("");

  useEffect(() => {
    if (widget) {
      setCurrentWidget({ ...widget });
      setScriptContent(widget.script || "");
      if (widget.dataSource) {
        loadTableColumns(widget.dataSource);
      }
    }
  }, [widget]);

  // Auto-generate script when transformations change
  useEffect(() => {
    if (currentWidget && currentWidget.transformations && currentWidget.transformations.length > 0) {
      console.log('Generating script for transformations:', currentWidget.transformations);
      const generatedScript = generateScriptFromTransformations(currentWidget);
      console.log('Generated script:', generatedScript);
      setScriptContent(generatedScript);
    } else if (currentWidget && (!currentWidget.transformations || currentWidget.transformations.length === 0)) {
      // If no transformations, provide a basic template
      const basicScript = `// Basic data processing script
function processData(data) {
  // Your custom data processing logic here
  return data;
}

// Example: Filter data
// return data.filter(row => row.status === 'active');

// Example: Transform data
// return data.map(row => ({
//   ...row,
//   formatted_amount: (row.amount_cents / 100).toFixed(2)
// }));`;
      setScriptContent(basicScript);
    }
  }, [currentWidget?.transformations, currentWidget?.columns]);

  const loadTableColumns = async (tableName: string) => {
    setLoading(true);
    try {
      const { data: sampleData, error: sampleError } = await supabase
        .from(tableName as any)
        .select('*')
        .limit(1);

      if (!sampleError && sampleData && sampleData.length > 0) {
        setTableColumns(Object.keys(sampleData[0]));
      } else {
        const columnMap: Record<string, string[]> = {
          transactions: ['id', 'amount_cents', 'counterparty', 'effective_at', 'posted_at', 'note', 'status', 'transaction_type'],
          clients: ['id', 'name', 'email', 'rfc', 'sat_status', 'last_sync_at', 'last_sync_successful'],
          sync_requests: ['id', 'status', 'sync_type', 'frequency', 'start_date', 'end_date', 'created_at'],
          reports: ['id', 'title', 'report_type', 'status', 'created_at', 'updated_at'],
        };
        setTableColumns(columnMap[tableName] || []);
      }
    } catch (error) {
      console.error('Error loading columns:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load data preview for the Data tab
  const loadDataPreview = async (tableName: string) => {
    if (!tableName) return;
    
    setDataLoading(true);
    try {
      const { data, error } = await supabase
        .from(tableName as any)
        .select('*')
        .limit(20); // Show first 20 rows

      if (error) throw error;
      setDataPreview(data || []);
    } catch (error) {
      console.error('Error loading data preview:', error);
      setDataPreview([]);
    } finally {
      setDataLoading(false);
    }
  };

  // Helper function to detect numeric columns
  const getNumericColumns = () => {
    const numericColumnNames = ['amount_cents', 'id', 'records_processed', 'execution_time_ms'];
    return tableColumns.filter(column => 
      numericColumnNames.includes(column) || 
      column.includes('_cents') || 
      column.includes('_ms') || 
      column.includes('_id') ||
      column.includes('amount') ||
      column.includes('count')
    );
  };

  // Helper function to check if a column is numeric
  const isNumericColumn = (column: string) => {
    return getNumericColumns().includes(column);
  };

  const updateWidget = (updates: Partial<Widget>) => {
    if (!currentWidget) return;
    const updatedWidget = { ...currentWidget, ...updates };
    setCurrentWidget(updatedWidget);
  };


  const addTransformation = () => {
    if (!currentWidget) return;
    const newTransformation = {
      name: '',
      function: '',
      column: '',
      expression: '' // Keep for backward compatibility
    };

    updateWidget({
      transformations: [...(currentWidget.transformations || []), newTransformation]
    });
  };

  const updateTransformation = (index: number, field: string, value: string) => {
    if (!currentWidget) return;
    const updatedTransformations = [...(currentWidget.transformations || [])];
    updatedTransformations[index] = { ...updatedTransformations[index], [field]: value };
    updateWidget({ transformations: updatedTransformations });
  };

  const removeTransformation = (index: number) => {
    if (!currentWidget) return;
    const updatedTransformations = currentWidget.transformations?.filter((_, i) => i !== index) || [];
    updateWidget({ transformations: updatedTransformations });
  };

  const toggleColumn = (column: string) => {
    if (!currentWidget) return;
    const currentColumns = currentWidget.columns || [];
    const updatedColumns = currentColumns.includes(column)
      ? currentColumns.filter(c => c !== column)
      : [...currentColumns, column];
    
    updateWidget({ columns: updatedColumns });
  };

  const handleSave = () => {
    if (!currentWidget) return;
    
    const updatedWidget = {
      ...currentWidget,
      script: scriptContent
    };
    
    onSave(updatedWidget);
  };

  const handleClose = () => {
    setCurrentWidget(null);
    setScriptContent("");
    onClose();
  };

  if (!visible || !currentWidget) return null;

  return (
    <Dialog open={visible} onOpenChange={handleClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] bg-card border-border">{/* Made modal bigger */}
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Configure Widget: {currentWidget.name}
          </DialogTitle>
          <DialogDescription>
            Configure your widget settings, data sources, transformations, and custom scripts.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="configuration" className="flex-1 overflow-hidden">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="configuration" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Configuration
            </TabsTrigger>
            <TabsTrigger value="script" className="flex items-center gap-2">
              <Code className="w-4 h-4" />
              Script
            </TabsTrigger>
            <TabsTrigger value="data" className="flex items-center gap-2">
              <Database className="w-4 h-4" />
              Data
            </TabsTrigger>
          </TabsList>

          <TabsContent value="configuration" className="mt-4 overflow-auto max-h-[60vh]">
            <div className="space-y-6">
              {/* Basic Settings */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="widget-name">Widget Name</Label>
                  <Input
                    id="widget-name"
                    value={currentWidget.name}
                    onChange={(e) => updateWidget({ name: e.target.value })}
                    className="bg-background border-border"
                  />
                </div>

                {/* Data Source Selection */}
                <div>
                  <Label>Data Source</Label>
                  <Select
                    value={currentWidget.dataSource || ''}
                    onValueChange={(value) => {
                      updateWidget({ dataSource: value, columns: [] });
                      loadTableColumns(value);
                    }}
                  >
                    <SelectTrigger className="bg-background border-border">
                      <SelectValue placeholder="Select a table">
                        <div className="flex items-center gap-2">
                          <Database className="w-4 h-4" />
                          {availableTables.find(t => t.name === currentWidget.dataSource)?.label || 'Select a table'}
                        </div>
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {availableTables.map((table) => (
                        <SelectItem key={table.name} value={table.name}>
                          <div className="flex items-center gap-2">
                            <Database className="w-4 h-4" />
                            {table.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Column Selection - Hide for bar chart and line chart */}
              {currentWidget.dataSource && tableColumns.length > 0 && !['bar-chart', 'line-chart'].includes(currentWidget.type) && (
                <Card className="bg-glass-bg/30 border-glass-border">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm text-white">Columns</CardTitle>
                    <CardDescription className="text-xs">
                      Select columns to display in your widget
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {tableColumns.map((column) => (
                      <div key={column} className="flex items-center space-x-2">
                        <Checkbox
                          id={column}
                          checked={currentWidget.columns?.includes(column) || false}
                          onCheckedChange={() => toggleColumn(column)}
                        />
                        <Label htmlFor={column} className="text-sm text-white cursor-pointer">
                          {column}
                        </Label>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* Chart-specific Configuration */}
              {['bar-chart', 'line-chart', 'pie-chart'].includes(currentWidget.type) && tableColumns.length > 0 && (
                <Card className="bg-glass-bg/30 border-glass-border">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm text-white">Chart Configuration</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label>X-Axis</Label>
                      <Select
                        value={currentWidget.chartConfig?.xAxis || ''}
                        onValueChange={(value) => updateWidget({ 
                          chartConfig: { ...currentWidget.chartConfig, xAxis: value }
                        })}
                      >
                        <SelectTrigger className="bg-background border-border">
                          <SelectValue placeholder="Select X-axis column" />
                        </SelectTrigger>
                        <SelectContent>
                          {tableColumns.map((column) => (
                            <SelectItem key={column} value={column}>
                              {column}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>Y-Axis</Label>
                      <Select
                        value={currentWidget.chartConfig?.yAxis || ''}
                        onValueChange={(value) => updateWidget({ 
                          chartConfig: { ...currentWidget.chartConfig, yAxis: value }
                        })}
                      >
                        <SelectTrigger className="bg-background border-border">
                          <SelectValue placeholder="Select Y-axis column" />
                        </SelectTrigger>
                        <SelectContent>
                          {tableColumns.map((column) => (
                            <SelectItem key={column} value={column}>
                              {column}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>Aggregation</Label>
                      <Select
                        value={currentWidget.chartConfig?.aggregation || 'count'}
                        onValueChange={(value) => updateWidget({ 
                          chartConfig: { ...currentWidget.chartConfig, aggregation: value }
                        })}
                      >
                        <SelectTrigger className="bg-background border-border">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {aggregations.map((agg) => (
                            <SelectItem key={agg.value} value={agg.value}>
                              {agg.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>
              )}


              {/* Transformations - Hide for bar chart and line chart */}
              {!['bar-chart', 'line-chart'].includes(currentWidget.type) && (
                <Card className="bg-glass-bg/30 border-glass-border">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-sm text-white">Transformations</CardTitle>
                        <CardDescription className="text-xs">
                          Create calculated columns
                        </CardDescription>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={addTransformation}
                        className="border-primary/30 text-primary hover:bg-primary/10"
                      >
                        <Plus className="w-3 h-3 mr-1" />
                        Add
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {currentWidget.transformations?.map((transformation, index) => {
                      const selectedColumn = (transformation as any).column || '';
                      const selectedFunction = (transformation as any).function || '';
                      const needsNumericColumn = ['sum', 'average'].includes(selectedFunction);
                      const isValidColumn = !needsNumericColumn || isNumericColumn(selectedColumn);
                      
                      return (
                        <div key={index} className="space-y-3">
                          <div className="flex items-center gap-2">
                            <Input
                              value={transformation.name}
                              onChange={(e) => updateTransformation(index, 'name', e.target.value)}
                              placeholder="Column name"
                              className="bg-background border-border flex-1"
                            />
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeTransformation(index)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <Select
                              value={selectedFunction}
                              onValueChange={(value) => updateTransformation(index, 'function', value)}
                            >
                              <SelectTrigger className="bg-background border-border flex-1">
                                <SelectValue placeholder="Select function" />
                              </SelectTrigger>
                              <SelectContent className="bg-background border-border z-50">
                                {transformationFunctions.map((func) => (
                                  <SelectItem key={func.value} value={func.value}>
                                    {func.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            
                            <Select
                              value={selectedColumn}
                              onValueChange={(value) => updateTransformation(index, 'column', value)}
                            >
                              <SelectTrigger className="bg-background border-border flex-1">
                                <SelectValue placeholder="Select column" />
                              </SelectTrigger>
                              <SelectContent className="bg-background border-border z-50">
                                {tableColumns.map((column) => (
                                  <SelectItem key={column} value={column}>
                                    {column}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          
                          {needsNumericColumn && selectedColumn && !isValidColumn && (
                            <div className="flex items-center gap-2 p-2 bg-destructive/10 border border-destructive/20 rounded-md">
                              <AlertTriangle className="w-4 h-4 text-destructive" />
                              <span className="text-xs text-destructive">
                                Only numeric columns can be used with {selectedFunction} function
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    }) || (
                      <p className="text-xs text-taxops-gray-light">No transformations applied</p>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="script" className="mt-4 h-[60vh]">
            <div className="h-full flex flex-col">
              <div className="mb-4">
                <Label className="text-sm font-medium">Custom Script</Label>
                <p className="text-xs text-muted-foreground mt-1">
                  Write custom logic for your widget data processing
                </p>
              </div>
              <div className="flex-1 border border-border rounded-md overflow-hidden">
                <Editor
                  height="100%"
                  defaultLanguage="javascript"
                  value={scriptContent}
                  onChange={(value) => setScriptContent(value || "")}
                  theme="vs-dark"
                  options={{
                    minimap: { enabled: false },
                    fontSize: 14,
                    lineNumbers: "on",
                    wordWrap: "on",
                    scrollBeyondLastLine: false,
                    automaticLayout: true,
                  }}
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="data" className="mt-4 overflow-auto max-h-[60vh]">
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium">Data Preview</Label>
                <p className="text-xs text-muted-foreground mt-1">
                  View the actual data from your database tables
                </p>
              </div>

              {/* Data Source Selection for Preview */}
              <div>
                <Label>Select Data Source</Label>
                <Select
                  value={selectedDataSource}
                  onValueChange={(value) => {
                    setSelectedDataSource(value);
                    loadDataPreview(value);
                  }}
                >
                  <SelectTrigger className="bg-background border-border">
                    <SelectValue placeholder="Choose a table to preview">
                      <div className="flex items-center gap-2">
                        <Database className="w-4 h-4" />
                        {availableTables.find(t => t.name === selectedDataSource)?.label || 'Choose a table to preview'}
                      </div>
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {availableTables.map((table) => (
                      <SelectItem key={table.name} value={table.name}>
                        <div className="flex items-center gap-2">
                          <Database className="w-4 h-4" />
                          {table.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Data Preview Table */}
              {selectedDataSource && (
                <Card className="bg-glass-bg/30 border-glass-border">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm text-white">
                      {availableTables.find(t => t.name === selectedDataSource)?.label} Data Preview
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Showing first 20 rows from the {selectedDataSource} table
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {dataLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <div className="text-sm text-muted-foreground">Loading data...</div>
                      </div>
                    ) : dataPreview.length === 0 ? (
                      <div className="flex items-center justify-center py-8">
                        <div className="text-sm text-muted-foreground">No data found</div>
                      </div>
                    ) : (
                      <div className="border rounded-md">
                        <ScrollArea className="h-96 w-full">
                          <div className="min-w-max">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  {Object.keys(dataPreview[0] || {}).map((column) => (
                                    <TableHead key={column} className="text-foreground whitespace-nowrap min-w-[120px]">
                                      {column.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                    </TableHead>
                                  ))}
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {dataPreview.map((row, index) => (
                                  <TableRow key={index}>
                                    {Object.entries(row).map(([column, value]) => (
                                       <TableCell key={column} className="whitespace-nowrap min-w-[120px]">
                                         {value === null || value === undefined ? (
                                           <span className="text-muted-foreground">—</span>
                                         ) : column.includes('amount') && typeof value === 'number' ? (
                                           new Intl.NumberFormat('en-US', {
                                             style: 'currency',
                                             currency: 'USD'
                                           }).format(value / 100)
                                         ) : column.includes('_at') || column.includes('date') ? (
                                           (() => {
                                             try {
                                               return new Date(value as string).toLocaleDateString('en-US', {
                                                 month: 'short',
                                                 day: 'numeric',
                                                 year: 'numeric'
                                               });
                                             } catch {
                                               return String(value);
                                             }
                                           })()
                                         ) : typeof value === 'boolean' ? (
                                           <Badge variant={value ? "default" : "secondary"}>
                                             {value ? 'Yes' : 'No'}
                                           </Badge>
                                         ) : (
                                           String(value)
                                         )}
                                       </TableCell>
                                    ))}
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                          <ScrollBar orientation="horizontal" />
                        </ScrollArea>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};