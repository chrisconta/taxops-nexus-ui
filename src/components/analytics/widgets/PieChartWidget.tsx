import { useState, useEffect } from "react";
import { PieChart as RechartsPieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { PieChart, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Widget } from "@/pages/Analytics";

interface PieChartWidgetProps {
  widget: Widget;
}

const COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--secondary))',
  'hsl(var(--accent))',
  'hsl(var(--muted))',
  '#8884d8',
  '#82ca9d',
  '#ffc658',
  '#ff7300',
  '#00ff00',
  '#ff00ff'
];

export const PieChartWidget = ({ widget }: PieChartWidgetProps) => {
  console.log("PieChartWidget props ➞", {
    dataSource: widget.dataSource,
    xAxis: widget.chartConfig?.xAxis,
    yAxis: widget.chartConfig?.yAxis,
    aggregation: widget.chartConfig?.aggregation,
    script: widget.script
  });
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedSlice, setSelectedSlice] = useState<string | null>(null);

  useEffect(() => {
    if (widget.dataSource && widget.chartConfig?.xAxis) {
      loadData();
    }
  }, [widget.dataSource, widget.chartConfig, selectedSlice]);

  const loadData = async () => {
    if (!widget.dataSource || !widget.chartConfig?.xAxis) return;

    setLoading(true);
    setError(null);

    try {
      const { xAxis, yAxis, aggregation = 'count' } = widget.chartConfig;
      
      let selectColumns = xAxis;
      if (yAxis && aggregation !== 'count') {
        selectColumns += `, ${yAxis}`;
      }
      
      // join without spaces so Supabase returns the columns
      let query = supabase
        .from(widget.dataSource as any)
        .select(selectColumns.split(',').map(c => c.trim()).join(','));

      // Apply filter if a slice is selected
      if (selectedSlice) {
        query = query.eq(xAxis, selectedSlice);
      }

      const { data: result, error } = await query.limit(1000);
      console.log("PieChartWidget supabase rows ➞", Array.isArray(result) ? result.length : result);
      console.log("PieChartWidget sample row keys ➞", Object.keys((result || [])[0] || {}));

      if (error) throw error;

      // Process data for pie chart
      const processedData = processPieData(result || [], xAxis, yAxis, aggregation);
      console.log("PieChartWidget processedData length ➞", processedData.length);
      setData(processedData);
    } catch (err: any) {
      console.error('Error loading pie chart data:', err);
      setError(err.message || 'Failed to load chart data');
    } finally {
      setLoading(false);
    }
  };

  const processPieData = (rawData: any[], xAxis: string, yAxis?: string, aggregation: string = 'count') => {
    if (!rawData || rawData.length === 0) return [];

    const grouped = rawData.reduce((acc, item) => {
      const key = item[xAxis] || 'Unknown';
      if (!acc[key]) {
        acc[key] = [];
      }
      if (yAxis) {
        acc[key].push(item[yAxis]);
      } else {
        acc[key].push(1);
      }
      return acc;
    }, {});

    const result = Object.entries(grouped).map(([key, values]: [string, any[]]) => {
      let value;
      switch (aggregation) {
        case 'sum':
          value = values.reduce((sum, val) => sum + (Number(val) || 0), 0);
          break;
        case 'avg':
          value = values.reduce((sum, val) => sum + (Number(val) || 0), 0) / values.length;
          break;
        case 'min':
          value = Math.min(...values.map(v => Number(v) || 0));
          break;
        case 'max':
          value = Math.max(...values.map(v => Number(v) || 0));
          break;
        case 'count':
        default:
          value = values.length;
          break;
      }

      // For pie charts, use absolute values to ensure proper rendering
      // Pie charts represent parts of a whole and work best with positive values
      return {
        name: key,
        value: Math.abs(Number(value.toFixed(2))),
        originalValue: Number(value.toFixed(2)) // Keep original for tooltip/display
      };
    });

    // Filter out zero values and sort by value in descending order
    const filteredData = result
      .filter(item => item.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);

    return filteredData;
  };

  const formatValue = (value: number) => {
    if (widget.chartConfig?.yAxis?.includes('amount')) {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
      }).format(value / 100);
    }
    return value.toLocaleString();
  };

  const handleSliceClick = (entry: any) => {
    if (selectedSlice === entry.name) {
      // If clicking on the same slice, clear the filter
      setSelectedSlice(null);
    } else {
      // Filter to show only this slice's data
      setSelectedSlice(entry.name);
    }
  };

  const clearFilter = () => {
    setSelectedSlice(null);
  };

  const renderCustomLabel = (entry: any) => {
    const percent = ((entry.value / data.reduce((sum, item) => sum + item.value, 0)) * 100).toFixed(1);
    return (
      <text fill="white" fontSize="12" fontWeight="500">
        {`${percent}%`}
      </text>
    );
  };

  if (!widget.dataSource) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <div className="text-center">
          <PieChart className="w-8 h-8 mx-auto mb-2" />
          <p className="text-sm">Select a data source to display chart</p>
        </div>
      </div>
    );
  }

  if (!widget.chartConfig?.xAxis) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <div className="text-center">
          <PieChart className="w-8 h-8 mx-auto mb-2" />
          <p className="text-sm">Configure category field to display chart</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="space-y-2 w-full">
          <Skeleton className="h-32 w-32 rounded-full mx-auto" />
          <Skeleton className="h-4 w-3/4 mx-auto" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full text-destructive">
        <div className="text-center">
          <p className="text-sm">Error: {error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      {selectedSlice && (
        <div className="mb-2 flex items-center justify-between bg-muted/50 p-2 rounded-md">
          <span className="text-sm text-muted-foreground">
            Filtered by: <span className="font-medium text-foreground">{selectedSlice}</span>
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilter}
            className="h-6 w-6 p-0"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}
      <div className="w-full h-64">{/* give this a fixed height so ResponsiveContainer can fill it */}
        <ResponsiveContainer width="100%" height="100%">
          <RechartsPieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={renderCustomLabel}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
              onClick={handleSliceClick}
              style={{ cursor: 'pointer' }}
            >
              {data.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={COLORS[index % COLORS.length]}
                  style={{ cursor: 'pointer' }}
                />
              ))}
            </Pie>
            <Tooltip 
              contentStyle={{
                backgroundColor: 'hsl(var(--background))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                color: 'hsl(var(--foreground))'
              }}
              formatter={(value: number, name: string, props: any) => {
                // Show original value in tooltip if it was negative
                const displayValue = props.payload?.originalValue || value;
                return [formatValue(displayValue), widget.chartConfig?.aggregation || 'count'];
              }}
            />
            <Legend 
              wrapperStyle={{
                color: 'hsl(var(--foreground))',
                fontSize: '12px'
              }}
            />
          </RechartsPieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};