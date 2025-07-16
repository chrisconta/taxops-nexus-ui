import { useState, useEffect } from "react";
import { BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart3 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Widget } from "@/pages/Analytics";

interface BarChartProps {
  widget: Widget;
}

export const BarChart = ({ widget }: BarChartProps) => {
  console.log("BarChart props ➞", {
    dataSource: widget.dataSource,
    xAxis: widget.chartConfig?.xAxis,
    yAxis: widget.chartConfig?.yAxis,
    aggregation: widget.chartConfig?.aggregation,
    script: widget.script
  });
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
      
      // join without spaces so Supabase returns the columns
      let query = supabase
        .from(widget.dataSource as any)
        .select([xAxis, yAxis].join(','));

      const { data: result, error } = await query.limit(1000);
      console.log("BarChart supabase rows ➞", Array.isArray(result) ? result.length : result);

      if (error) throw error;

      // Process data for chart
      const processedData = processChartData(result || [], xAxis, yAxis, aggregation);
      console.log("BarChart sample row keys ➞", Object.keys((result || [])[0] || {}));
      setData(processedData);
    } catch (err: any) {
      console.error('Error loading chart data:', err);
      setError(err.message || 'Failed to load chart data');
    } finally {
      setLoading(false);
    }
  };

  const processChartData = (rawData: any[], xAxis: string, yAxis: string, aggregation: string) => {
    const grouped = rawData.reduce((acc, item) => {
      const key = item[xAxis];
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
    }).sort((a, b) => b.value - a.value);
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
          <BarChart3 className="w-8 h-8 mx-auto mb-2" />
          <p className="text-sm">Select a data source to display chart</p>
        </div>
      </div>
    );
  }

  if (!widget.chartConfig?.xAxis || !widget.chartConfig?.yAxis) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <div className="text-center">
          <BarChart3 className="w-8 h-8 mx-auto mb-2" />
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
        <RechartsBarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
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
          <Bar 
            dataKey="value" 
            fill="hsl(var(--primary))"
            radius={[4, 4, 0, 0]}
          />
        </RechartsBarChart>
      </ResponsiveContainer>
    </div>
  );
};