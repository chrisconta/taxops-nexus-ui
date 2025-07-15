import { useState, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Database } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Widget } from "@/pages/Analytics";

interface DataTableProps {
  widget: Widget;
}

export const DataTable = ({ widget }: DataTableProps) => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (widget.dataSource && widget.columns && widget.columns.length > 0) {
      loadData();
    }
  }, [widget.dataSource, widget.columns, widget.filters, widget.transformations]);

  const loadData = async () => {
    if (!widget.dataSource || !widget.columns || widget.columns.length === 0) return;

    setLoading(true);
    setError(null);

    try {
      let query = supabase
        .from(widget.dataSource as any)
        .select(widget.columns.join(', '));

      // Apply filters
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

      const { data: result, error } = await query;

      if (error) throw error;

      // Apply transformations
      const transformedData = applyTransformations(result || []);
      setData(transformedData);
    } catch (err: any) {
      console.error('Error loading data:', err);
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const applyTransformations = (data: any[]) => {
    if (!widget.transformations || widget.transformations.length === 0) {
      return data;
    }

    return data.map(row => {
      const transformedRow = { ...row };
      
      widget.transformations?.forEach(transformation => {
        const func = (transformation as any).function;
        const column = (transformation as any).column;
        const name = transformation.name;
        
        if (func && column && name) {
          const values = data.map(r => r[column]).filter(v => v !== null && v !== undefined);
          
          switch (func) {
            case 'sum':
              transformedRow[name] = values.reduce((sum, val) => sum + (Number(val) || 0), 0);
              break;
            case 'average':
              transformedRow[name] = values.length > 0 ? 
                values.reduce((sum, val) => sum + (Number(val) || 0), 0) / values.length : 0;
              break;
            case 'count':
              transformedRow[name] = values.length;
              break;
            default:
              // Fallback to expression evaluation if available
              if (transformation.expression) {
                try {
                  transformedRow[name] = eval(transformation.expression.replace(/\w+/g, (match) => {
                    return `row.${match}`;
                  }));
                } catch (e) {
                  transformedRow[name] = 'Error';
                }
              }
          }
        }
      });
      
      return transformedRow;
    });
  };

  const getAllColumns = () => {
    const baseColumns = widget.columns || [];
    const transformationColumns = widget.transformations?.map(t => t.name) || [];
    return [...baseColumns, ...transformationColumns];
  };

  const formatCellValue = (value: any, columnName: string) => {
    if (value === null || value === undefined) {
      return <span className="text-muted-foreground">—</span>;
    }

    // Format monetary values
    if (columnName.includes('amount') && typeof value === 'number') {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
      }).format(value / 100);
    }

    // Format dates
    if (columnName.includes('_at') || columnName.includes('date')) {
      try {
        return new Date(value).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric'
        });
      } catch {
        return value;
      }
    }

    // Format boolean values
    if (typeof value === 'boolean') {
      return (
        <Badge variant={value ? "default" : "secondary"}>
          {value ? 'Yes' : 'No'}
        </Badge>
      );
    }

    // Format status values
    if (columnName === 'status') {
      const statusColors: Record<string, string> = {
        'completed': 'default',
        'pending': 'secondary',
        'failed': 'destructive',
        'connected': 'default',
        'not-connected': 'secondary',
        'error': 'destructive'
      };

      return (
        <Badge variant={statusColors[value] as any || "secondary"}>
          {value}
        </Badge>
      );
    }

    return String(value);
  };

  if (!widget.dataSource) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <div className="text-center">
          <Database className="w-8 h-8 mx-auto mb-2" />
          <p className="text-sm">Select a data source to display table</p>
        </div>
      </div>
    );
  }

  if (!widget.columns || widget.columns.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <div className="text-center">
          <Table className="w-8 h-8 mx-auto mb-2" />
          <p className="text-sm">Select columns to display</p>
        </div>
      </div>
    );
  }

  if (loading) {
    const allColumns = getAllColumns();
    return (
      <div className="space-y-3">
        <div className="flex gap-4">
          {allColumns.map((_, i) => (
            <Skeleton key={i} className="h-4 flex-1" />
          ))}
        </div>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex gap-4">
            {allColumns.map((_, j) => (
              <Skeleton key={j} className="h-4 flex-1" />
            ))}
          </div>
        ))}
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
    <ScrollArea className="h-full w-full">
      <div className="min-w-full">
        <Table>
          <TableHeader>
            <TableRow>
              {getAllColumns().map((column) => (
                <TableHead key={column} className="text-foreground whitespace-nowrap">
                  {column.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 ? (
              <TableRow>
                <TableCell 
                  colSpan={getAllColumns().length} 
                  className="text-center text-muted-foreground py-8"
                >
                  No data available
                </TableCell>
              </TableRow>
            ) : (
              data.map((row, index) => (
                <TableRow key={index}>
                  {getAllColumns().map((column) => (
                    <TableCell key={column} className="whitespace-nowrap">
                      {formatCellValue(row[column], column)}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </ScrollArea>
  );
};