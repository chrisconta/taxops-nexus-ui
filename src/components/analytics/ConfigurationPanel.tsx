import { useState, useEffect } from "react";
import { X, Database, Filter, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import type { Widget } from "@/pages/Analytics";

interface ConfigurationPanelProps {
  widget: Widget;
  onUpdateWidget: (widget: Widget) => void;
  onClose: () => void;
}

interface TableSchema {
  table_name: string;
  columns: Array<{
    column_name: string;
    data_type: string;
  }>;
}

const availableTables = [
  { name: 'transactions', label: 'Transactions' },
  { name: 'clients', label: 'Clients' },
  { name: 'sync_requests', label: 'Sync Requests' },
  { name: 'reports', label: 'Reports' },
];

const operators = [
  { value: '=', label: 'Equals' },
  { value: '!=', label: 'Not Equals' },
  { value: '>', label: 'Greater Than' },
  { value: '<', label: 'Less Than' },
  { value: '>=', label: 'Greater Or Equal' },
  { value: '<=', label: 'Less Or Equal' },
  { value: 'LIKE', label: 'Contains' },
  { value: 'NOT LIKE', label: 'Does Not Contain' },
  { value: 'IN', label: 'In List' },
  { value: 'NOT IN', label: 'Not In List' },
];

const aggregations = [
  { value: 'count', label: 'Count' },
  { value: 'sum', label: 'Sum' },
  { value: 'avg', label: 'Average' },
  { value: 'min', label: 'Minimum' },
  { value: 'max', label: 'Maximum' },
];

export const ConfigurationPanel = ({ widget, onUpdateWidget, onClose }: ConfigurationPanelProps) => {
  const [tableColumns, setTableColumns] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (widget.dataSource) {
      loadTableColumns(widget.dataSource);
    }
  }, [widget.dataSource]);

  const loadTableColumns = async (tableName: string) => {
    setLoading(true);
    try {
      // Try to get columns from a sample query
      const { data: sampleData, error: sampleError } = await supabase
        .from(tableName as any)
        .select('*')
        .limit(1);

      if (!sampleError && sampleData && sampleData.length > 0) {
        setTableColumns(Object.keys(sampleData[0]));
      } else {
        // Hardcoded fallback based on our schema
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

  const updateWidget = (updates: Partial<Widget>) => {
    onUpdateWidget({ ...widget, ...updates });
  };

  const addFilter = () => {
    const newFilter = {
      column: '',
      operator: '=',
      value: ''
    };

    updateWidget({
      filters: [...(widget.filters || []), newFilter]
    });
  };

  const updateFilter = (index: number, field: string, value: string) => {
    const updatedFilters = [...(widget.filters || [])];
    updatedFilters[index] = { ...updatedFilters[index], [field]: value };
    updateWidget({ filters: updatedFilters });
  };

  const removeFilter = (index: number) => {
    const updatedFilters = widget.filters?.filter((_, i) => i !== index) || [];
    updateWidget({ filters: updatedFilters });
  };

  const addTransformation = () => {
    const newTransformation = {
      name: '',
      expression: ''
    };

    updateWidget({
      transformations: [...(widget.transformations || []), newTransformation]
    });
  };

  const updateTransformation = (index: number, field: string, value: string) => {
    const updatedTransformations = [...(widget.transformations || [])];
    updatedTransformations[index] = { ...updatedTransformations[index], [field]: value };
    updateWidget({ transformations: updatedTransformations });
  };

  const removeTransformation = (index: number) => {
    const updatedTransformations = widget.transformations?.filter((_, i) => i !== index) || [];
    updateWidget({ transformations: updatedTransformations });
  };

  const toggleColumn = (column: string) => {
    const currentColumns = widget.columns || [];
    const updatedColumns = currentColumns.includes(column)
      ? currentColumns.filter(c => c !== column)
      : [...currentColumns, column];
    
    updateWidget({ columns: updatedColumns });
  };

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-glass-border flex items-center justify-between">
        <h3 className="font-semibold text-white">Widget Configuration</h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="text-taxops-gray-light hover:text-white"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-6">
        {/* Basic Settings */}
        <div className="space-y-4">
          <div>
            <Label htmlFor="widget-name">Widget Name</Label>
            <Input
              id="widget-name"
              value={widget.name}
              onChange={(e) => updateWidget({ name: e.target.value })}
              className="bg-background border-border"
            />
          </div>

          {/* Data Source Selection */}
          <div>
            <Label htmlFor="data-source">Data Source</Label>
            <Input
              id="data-source"
              value={widget.dataSource || ''}
              onChange={(e) => updateWidget({ dataSource: e.target.value, columns: [] })}
              placeholder="Enter table name"
              className="bg-background border-border"
            />
          </div>
        </div>

        {/* Column Selection */}
        {widget.dataSource && tableColumns.length > 0 && (
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
                    checked={widget.columns?.includes(column) || false}
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
        {['bar-chart', 'line-chart', 'pie-chart'].includes(widget.type) && tableColumns.length > 0 && (
          <Card className="bg-glass-bg/30 border-glass-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-white">Chart Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>X-Axis</Label>
                <Select
                  value={widget.chartConfig?.xAxis || ''}
                  onValueChange={(value) => updateWidget({ 
                    chartConfig: { ...widget.chartConfig, xAxis: value }
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
                  value={widget.chartConfig?.yAxis || ''}
                  onValueChange={(value) => updateWidget({ 
                    chartConfig: { ...widget.chartConfig, yAxis: value }
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
                  value={widget.chartConfig?.aggregation || 'count'}
                  onValueChange={(value) => updateWidget({ 
                    chartConfig: { ...widget.chartConfig, aggregation: value }
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

        {/* Filters */}
        <Card className="bg-glass-bg/30 border-glass-border">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm text-white">Filters</CardTitle>
                <CardDescription className="text-xs">
                  Add conditions to filter your data
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={addFilter}
                className="border-primary/30 text-primary hover:bg-primary/10"
              >
                <Plus className="w-3 h-3 mr-1" />
                Add
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {widget.filters?.map((filter, index) => (
              <div key={index} className="flex items-center gap-2">
                <Select
                  value={filter.column}
                  onValueChange={(value) => updateFilter(index, 'column', value)}
                >
                  <SelectTrigger className="bg-background border-border flex-1">
                    <SelectValue placeholder="Column" />
                  </SelectTrigger>
                  <SelectContent>
                    {tableColumns.map((column) => (
                      <SelectItem key={column} value={column}>
                        {column}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={filter.operator}
                  onValueChange={(value) => updateFilter(index, 'operator', value)}
                >
                  <SelectTrigger className="bg-background border-border w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {operators.map((op) => (
                      <SelectItem key={op.value} value={op.value}>
                        {op.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Input
                  value={filter.value}
                  onChange={(e) => updateFilter(index, 'value', e.target.value)}
                  placeholder="Value"
                  className="bg-background border-border flex-1"
                />

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeFilter(index)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            )) || (
              <p className="text-xs text-taxops-gray-light">No filters applied</p>
            )}
          </CardContent>
        </Card>

        {/* Transformations */}
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
            {widget.transformations?.map((transformation, index) => (
              <div key={index} className="space-y-2">
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
                <Input
                  value={transformation.expression}
                  onChange={(e) => updateTransformation(index, 'expression', e.target.value)}
                  placeholder="e.g., amount_cents / 100"
                  className="bg-background border-border"
                />
              </div>
            )) || (
              <p className="text-xs text-taxops-gray-light">No transformations applied</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};