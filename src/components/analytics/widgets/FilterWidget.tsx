import React, { useState, useEffect } from 'react';
import { Filter, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import type { Widget } from '@/pages/Analytics';

interface FilterWidgetProps {
  widget: Widget;
  onFilterChange: (column: string, value: string) => void;
  globalFilter?: { column: string; value: string } | null;
}

export const FilterWidget = ({ widget, onFilterChange, globalFilter }: FilterWidgetProps) => {
  const [showSearch, setShowSearch] = useState(false);
  const [selectedColumn, setSelectedColumn] = useState<string>('');
  const [filterValue, setFilterValue] = useState<string>('');
  const [searchValue, setSearchValue] = useState<string>('');
  const [availableColumns, setAvailableColumns] = useState<string[]>([]);
  const [columnData, setColumnData] = useState<string[]>([]);
  const [filteredData, setFilteredData] = useState<string[]>([]);

  useEffect(() => {
    if (widget.dataSource && widget.columns && widget.columns.length > 0) {
      setAvailableColumns(widget.columns);
      if (!selectedColumn && widget.columns.length > 0) {
        setSelectedColumn(widget.columns[0]);
      }
    }
  }, [widget.dataSource, widget.columns]);

  useEffect(() => {
    const loadColumnData = async () => {
      if (!widget.dataSource || !selectedColumn) return;
      
      try {
        const { data, error } = await supabase.rpc('execute_dynamic_sql', {
          query: `SELECT DISTINCT "${selectedColumn}" FROM public.${widget.dataSource} WHERE "${selectedColumn}" IS NOT NULL ORDER BY "${selectedColumn}"`
        });
        
        if (error) throw error;
        
        const uniqueValues = Array.isArray(data) ? data.map((row: any) => String(row[selectedColumn])) : [];
        setColumnData(uniqueValues);
        setFilteredData(uniqueValues);
      } catch (error) {
        console.error('Error loading column data:', error);
        setColumnData([]);
        setFilteredData([]);
      }
    };

    loadColumnData();
  }, [widget.dataSource, selectedColumn]);

  useEffect(() => {
    if (!searchValue.trim()) {
      setFilteredData(columnData);
    } else {
      const filtered = columnData.filter(value => 
        value.toLowerCase().includes(searchValue.toLowerCase())
      );
      setFilteredData(filtered);
    }
  }, [searchValue, columnData]);

  useEffect(() => {
    const handleToggleSearch = (event: CustomEvent) => {
      if (event.detail.widgetId === widget.id) {
        setShowSearch(prev => !prev);
      }
    };

    window.addEventListener('toggleFilterSearch', handleToggleSearch as EventListener);
    return () => window.removeEventListener('toggleFilterSearch', handleToggleSearch as EventListener);
  }, [widget.id]);

  const handleColumnSelect = (column: string) => {
    setSelectedColumn(column);
    setFilterValue('');
    setSearchValue('');
  };

  const handleApplyFilter = (value: string) => {
    if (selectedColumn && value.trim()) {
      onFilterChange(selectedColumn, value.trim());
    }
  };

  const handleClearFilter = () => {
    setSelectedColumn('');
    setFilterValue('');
    setSearchValue('');
    onFilterChange('', '');
    setShowSearch(false);
  };

  if (!widget.dataSource || !widget.columns || widget.columns.length === 0) {
    return (
      <Card className="bg-glass-bg/30 border-glass-border h-full">
        <CardContent className="p-4 h-full flex flex-col items-center justify-center">
          <Filter className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-center text-sm text-muted-foreground mb-2">
            Configure filter widget
          </p>
          <p className="text-center text-xs text-muted-foreground">
            Select a data source and columns first
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-glass-bg/30 border-glass-border h-full">
      <CardContent className="p-4 h-full flex flex-col">
        {!selectedColumn ? (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">
                Select Column
              </label>
              <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto">
                {availableColumns.map((column) => (
                  <Badge
                    key={column}
                    variant="outline"
                    className="cursor-pointer hover:bg-primary/10 text-xs"
                    onClick={() => handleColumnSelect(column)}
                  >
                    {column}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col">
            {showSearch && (
              <div className="mb-4">
                <Input
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  placeholder={`Enter value for ${selectedColumn}`}
                  className="w-full"
                />
              </div>
            )}
            
            <div className="mb-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-foreground">{selectedColumn}</span>
                {globalFilter && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClearFilter}
                    className="h-6 w-6 p-0"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                )}
              </div>
              <div className="h-px bg-border mt-2"></div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-1">
              {filteredData.map((value, index) => (
                <div
                  key={index}
                  className="p-2 text-sm text-foreground hover:bg-muted/50 cursor-pointer rounded"
                  onClick={() => handleApplyFilter(value)}
                >
                  {value}
                </div>
              ))}
              {filteredData.length === 0 && columnData.length > 0 && (
                <div className="text-center text-sm text-muted-foreground py-4">
                  No matching values found
                </div>
              )}
              {columnData.length === 0 && (
                <div className="text-center text-sm text-muted-foreground py-4">
                  No data available
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};