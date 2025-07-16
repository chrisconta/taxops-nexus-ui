import { useState, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Database } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { applyCrossTableFilter } from "@/lib/crossTableFiltering";
import type { Widget } from "@/pages/Analytics";

interface DataTableProps {
  widget: Widget;
  globalFilter?: { column: string; value: string } | null;
}

export const DataTable = ({ widget, globalFilter }: DataTableProps) => {
  console.log("DataTable received columns ➞", widget.columns);
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log('DataTable useEffect triggered:', {
      dataSource: widget.dataSource,
      columns: widget.columns,
      columnsLength: widget.columns?.length,
      transformations: widget.transformations,
      hasDataSource: !!widget.dataSource,
      hasColumns: !!widget.columns,
      columnsIsArray: Array.isArray(widget.columns)
    });
    
    if (widget.dataSource && widget.columns && widget.columns.length > 0) {
      console.log('Starting loadData...');
      loadData();
    } else {
      console.log('Not loading data because:', {
        noDataSource: !widget.dataSource,
        noColumns: !widget.columns,
        emptyColumns: widget.columns?.length === 0
      });
    }
  }, [widget.dataSource, widget.columns, widget.transformations, widget.script, globalFilter]);

  const loadData = async () => {
    if (!widget.dataSource || !widget.columns || widget.columns.length === 0) return;

    setLoading(true);
    setError(null);

    try {
      // Get all columns needed for transformations
      const transformationColumns = widget.transformations?.map(t => (t as any).column).filter(Boolean) || [];
      const allColumns = [...widget.columns, ...transformationColumns];
      const uniqueColumns = [...new Set(allColumns)];
      
      let query = supabase
        .from(widget.dataSource as any)
        .select(uniqueColumns.join(','));

      // Apply cross-table filtering
      if (globalFilter) {
        try {
          query = await applyCrossTableFilter(query, widget.dataSource, {
            sourceTable: 'clients', // Default source for now
            column: globalFilter.column,
            value: globalFilter.value
          });
        } catch (filterError: any) {
          console.error('Cross-table filter error:', filterError);
          setError(filterError.message || 'Filter error');
          return;
        }
      }

      const { data: result, error } = await query;
      console.log("Supabase returned rows ➞", Array.isArray(result) ? result.length : result);

      if (error) throw error;

      // Apply transformations or execute custom script
      const transformedData = executeScript(result || []);
      console.log("Sample row keys ➞", Object.keys(transformedData[0] || {}));
      setData(transformedData);
    } catch (err: any) {
      console.error('Error loading data:', err);
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const executeScript = (data: any[]) => {
    // First, try to execute custom script if available
    if (widget.script && widget.script.trim()) {
      try {
        console.log('Executing custom script for widget:', widget.name);
        console.log('Raw data:', data);
        
        // Create a safe execution environment
        const scriptFunction = new Function('data', 'widget', `
          ${widget.script}
          
          // Call processData function if it exists
          if (typeof processData === 'function') {
            return processData(data);
          }
          
          // Otherwise return original data
          return data;
        `);
        
        const processedData = scriptFunction(data, widget);
        console.log('Processed data:', processedData);
        return processedData;
      } catch (scriptError) {
        console.error('Error executing custom script:', scriptError);
        setError(`Script execution error: ${scriptError.message}`);
        // Fall back to basic transformation if script fails
      }
    }
    
    // Fallback to basic transformations if no script or script fails
    return applyBasicTransformations(data);
  };

  const applyBasicTransformations = (data: any[]) => {
    console.log('applyBasicTransformations called with:', {
      dataLength: data.length,
      transformations: widget.transformations,
      transformationsLength: widget.transformations?.length
    });
    
    if (!widget.transformations || widget.transformations.length === 0) {
      console.log('No transformations to apply');
      return data;
    }

    return data.map(row => {
      const transformedRow = { ...row };
      
      widget.transformations?.forEach((transformation, index) => {
        const func = (transformation as any).function;
        const column = (transformation as any).column;
        const name = transformation.name;
        
        console.log(`Processing transformation ${index}:`, {
          func,
          column,
          name,
          transformation
        });
        
        if (func && column && name) {
          const values = data.map(r => r[column]).filter(v => v !== null && v !== undefined);
          console.log(`Values for column ${column}:`, values);
          
          switch (func) {
            case 'sum':
              const sum = values.reduce((sum, val) => sum + (Number(val) || 0), 0);
              transformedRow[name] = sum;
              console.log(`Sum calculation: ${sum} added to column ${name}`);
              break;
            case 'average':
              const average = values.length > 0 ? 
                values.reduce((sum, val) => sum + (Number(val) || 0), 0) / values.length : 0;
              transformedRow[name] = average;
              console.log(`Average calculation: ${average} added to column ${name}`);
              break;
            case 'count':
              const count = values.length;
              transformedRow[name] = count;
              console.log(`Count calculation: ${count} added to column ${name}`);
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
        } else {
          console.log(`Skipping transformation ${index} - missing required fields`);
        }
      });
      
      console.log('Final transformed row:', transformedRow);
      return transformedRow;
    });
  };

  const getAllColumns = () => {
    // Get original columns
    const originalColumns = (widget.columns || []).map(colKey => ({
      key: colKey,
      title: colKey.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
    }));
    
    // Get transformation columns
    const transformationColumns = (widget.transformations || []).map(t => ({
      key: t.name,
      title: t.name
    }));
    
    console.log('getAllColumns result:', { originalColumns, transformationColumns });
    
    return [...originalColumns, ...transformationColumns];
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
          <Database className="w-8 h-8 mx-auto mb-2" />
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

  const allColumns = getAllColumns();
  
  return (
    <div className="w-full h-full">
      <ScrollArea className="h-full">
        <Table>
          <TableHeader>
            <TableRow>
              {allColumns.map(column => (
                <TableHead key={column.key} className="text-foreground whitespace-nowrap">
                  {column.title}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={allColumns.length} className="text-center text-muted-foreground py-8">
                  No data available
                </TableCell>
              </TableRow>
            ) : (
              data.map((row, rowIndex) => (
                <TableRow key={rowIndex}>
                  {allColumns.map(column => (
                    <TableCell key={column.key} className="whitespace-nowrap">
                      {formatCellValue(row[column.key], column.key)}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        <ScrollBar orientation="vertical" />
      </ScrollArea>
    </div>
  );
};