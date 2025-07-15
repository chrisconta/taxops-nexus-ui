import { useState, useEffect } from "react";
import { LineChart as RechartsLineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Skeleton } from "@/components/ui/skeleton";
import { LineChart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Widget } from "@/pages/Analytics";

interface LineChartWidgetProps {
  widget: Widget;
}

export const LineChartWidget = ({ widget }: LineChartWidgetProps) => {
  console.log("LineChartWidget received columns ➞", widget.columns);
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (widget.dataSource && widget.chartConfig?.xAxis && widget.chartConfig?.yAxis) {
      loadData();
    }
  }, [widget.dataSource, widget.chartConfig]);

  const loadData = async () => {
    if (!widget.dataSource || !widget.chartConfig?.xAxis || !widget.chartConfig?.yAxis) return;

    setLoading(true);
    setError(null);

    try {
      const { xAxis, yAxis, aggregation = 'count' } = widget.chartConfig;
      
      let query = supabase
        .from(widget.dataSource as any)
        .select(`${xAxis}, ${yAxis}`)
        .order(xAxis, { ascending: true });

      const { data: result, error } = await query.limit(1000);

      if (error) throw error;

      // Process data for line chart
      const processedData = processLineData(result || [], xAxis, yAxis, aggregation);
      console.log("Sample row keys ➞", Object.keys((result || [])[0] || {}));
      setData(processedData);
    } catch (err: any) {
      console.error('Error loading line chart data:', err);
      setError(err.message || 'Failed to load chart data');
    } finally {
      setLoading(false);
    }
  };

  const processLineData = (rawData: any[], xAxis: string, yAxis: string, aggregation: string) => {
    const grouped = rawData.reduce((acc, item) => {
      let key = item[xAxis];
      
      // Format dates for better display
      if (xAxis.includes('_at') || xAxis.includes('date')) {
        try {
          key = new Date(key).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        } catch {
          // Keep original value if date parsing fails
        }
      }
      
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(item[yAxis]);
      return acc;
    }, {});

    return Object.entries(grouped).map(([key, values]: [string, any[]]) => {
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

      return {
        name: key,
        value: Number(value.toFixed(2))
      };
    });
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

  if (!widget.dataSource) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <div className="text-center">
          <LineChart className="w-8 h-8 mx-auto mb-2" />
          <p className="text-sm">Select a data source to display chart</p>
        </div>
      </div>
    );
  }

  if (!widget.chartConfig?.xAxis || !widget.chartConfig?.yAxis) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <div className="text-center">
          <LineChart className="w-8 h-8 mx-auto mb-2" />
          <p className="text-sm">Configure X and Y axes to display chart</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="space-y-2 w-full">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-4 w-3/4" />
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
    <div className="h-full">
      <ResponsiveContainer width="100%" height="100%">
        <RechartsLineChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis 
            dataKey="name" 
            stroke="hsl(var(--muted-foreground))"
            fontSize={12}
          />
          <YAxis 
            stroke="hsl(var(--muted-foreground))"
            fontSize={12}
            tickFormatter={formatValue}
          />
          <Tooltip 
            contentStyle={{
              backgroundColor: 'hsl(var(--background))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px',
              color: 'hsl(var(--foreground))'
            }}
            formatter={(value: number) => [formatValue(value), widget.chartConfig?.aggregation || 'count']}
          />
          <Line 
            type="monotone" 
            dataKey="value" 
            stroke="hsl(var(--primary))" 
            strokeWidth={2}
            dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2, r: 4 }}
            activeDot={{ r: 6, stroke: 'hsl(var(--primary))', strokeWidth: 2 }}
          />
        </RechartsLineChart>
      </ResponsiveContainer>
    </div>
  );
};
