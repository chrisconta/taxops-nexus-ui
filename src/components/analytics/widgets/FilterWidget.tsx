import React, { useState, useEffect } from 'react';
import { Filter, Search, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import type { Widget } from '@/pages/Analytics';

interface FilterWidgetProps {
  widget: Widget;
  onFilterChange: (column: string, value: string) => void;
  globalFilter?: { column: string; value: string } | null;
}

export const FilterWidget = ({ widget, onFilterChange, globalFilter }: FilterWidgetProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedColumn, setSelectedColumn] = useState<string>('');
  const [filterValue, setFilterValue] = useState<string>('');
  const [availableColumns, setAvailableColumns] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (widget.dataSource && widget.columns && widget.columns.length > 0) {
      setAvailableColumns(widget.columns);
    }
  }, [widget.dataSource, widget.columns]);

  const handleColumnSelect = (column: string) => {
    setSelectedColumn(column);
    setFilterValue('');
  };

  const handleApplyFilter = () => {
    if (selectedColumn && filterValue.trim()) {
      onFilterChange(selectedColumn, filterValue.trim());
      setIsOpen(false);
    }
  };

  const handleClearFilter = () => {
    setSelectedColumn('');
    setFilterValue('');
    onFilterChange('', '');
    setIsOpen(false);
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
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-primary" />
            <span className="font-medium text-foreground">Filter</span>
          </div>
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Search className="w-4 h-4" />
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Configure Filter</DialogTitle>
              </DialogHeader>
              
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">
                    Select Column
                  </label>
                  <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                    {availableColumns.map((column) => (
                      <Badge
                        key={column}
                        variant={selectedColumn === column ? "default" : "outline"}
                        className="cursor-pointer hover:bg-primary/10"
                        onClick={() => handleColumnSelect(column)}
                      >
                        {column}
                      </Badge>
                    ))}
                  </div>
                </div>

                {selectedColumn && (
                  <div>
                    <label className="text-sm font-medium text-foreground mb-2 block">
                      Filter Value
                    </label>
                    <Input
                      value={filterValue}
                      onChange={(e) => setFilterValue(e.target.value)}
                      placeholder={`Enter value for ${selectedColumn}`}
                      className="w-full"
                    />
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <Button
                    onClick={handleApplyFilter}
                    disabled={!selectedColumn || !filterValue.trim()}
                    className="flex-1"
                  >
                    Apply Filter
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleClearFilter}
                    className="flex-1"
                  >
                    Clear
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {globalFilter ? (
          <div className="flex-1 flex flex-col justify-center">
            <div className="bg-primary/10 border border-primary/20 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-foreground">Active Filter</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearFilter}
                  className="h-6 w-6 p-0"
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
              <div className="space-y-1">
                <div className="text-xs text-muted-foreground">Column:</div>
                <Badge variant="secondary" className="text-xs">
                  {globalFilter.column}
                </Badge>
                <div className="text-xs text-muted-foreground mt-2">Value:</div>
                <div className="text-sm text-foreground font-mono bg-background/50 px-2 py-1 rounded">
                  {globalFilter.value}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <Filter className="w-12 h-12 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground mb-1">No filter applied</p>
            <p className="text-xs text-muted-foreground">
              Click the search button to set a filter
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};