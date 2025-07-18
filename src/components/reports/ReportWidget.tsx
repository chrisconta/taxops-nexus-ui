import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart } from '@/components/analytics/widgets/BarChart';
import { DataTable } from '@/components/analytics/widgets/DataTable';
import { Table as TableIcon, BarChart3, LineChart, PieChart, Filter, X, Settings, Minus, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CanvasItem {
  id: string;
  type: 'table' | 'metric' | 'chart' | 'formula';
  position: { x: number; y: number };
  size: { width: number; height: number };
  data: any;
  name?: string;
  dataSource?: string;
  columns?: string[];
  chartConfig?: {
    xAxis?: string;
    yAxis?: string;
    aggregation?: string;
  };
  transformations?: any[];
  script?: string;
}

interface ReportWidgetProps {
  item: CanvasItem;
  isSelected: boolean;
  onUpdate: (updates: Partial<CanvasItem>) => void;
  onDelete: () => void;
}

const widgetIcons = {
  'table': TableIcon,
  'chart': BarChart3,
  'metric': BarChart3,
  'formula': LineChart,
};

// Mock widget for analytics compatibility
const createMockWidget = (item: CanvasItem) => ({
  id: item.id,
  name: item.name || item.data?.label || 'Component',
  type: item.type === 'chart' ? 'bar-chart' : item.type,
  dataSource: item.dataSource || 'clients',
  columns: item.columns || ['id', 'name', 'email'],
  chartConfig: item.chartConfig,
  transformations: item.transformations || [],
  script: item.script || '',
});

export const ReportWidget: React.FC<ReportWidgetProps> = ({
  item,
  isSelected,
  onUpdate,
  onDelete,
}) => {
  const Icon = widgetIcons[item.type] || BarChart3;
  const mockWidget = createMockWidget(item);

  const renderWidgetContent = () => {
    switch (item.type) {
      case 'table':
        return (
          <DataTable 
            widget={mockWidget as any}
            globalFilter={null}
          />
        );
      case 'chart':
        return (
          <BarChart 
            widget={mockWidget as any}
            globalFilter={null}
          />
        );
      case 'metric':
        return (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="text-3xl font-bold text-primary mb-2">
                {item.data?.value || '0'}
              </div>
              <div className="text-sm text-muted-foreground">
                {item.data?.label || 'Metric'}
              </div>
            </div>
          </div>
        );
      case 'formula':
        return (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="text-lg font-mono text-foreground mb-2">
                {item.data?.formula || 'SUM(A1:A10)'}
              </div>
              <div className="text-sm text-muted-foreground">
                Result: {item.data?.result || 'N/A'}
              </div>
            </div>
          </div>
        );
      default:
        return (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <div className="text-center">
              <Icon className="w-8 h-8 mx-auto mb-2" />
              <p className="text-sm">Configure this widget</p>
            </div>
          </div>
        );
    }
  };

  return (
    <Card className="h-full bg-background/95 backdrop-blur-sm border shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-4 py-2">
        <CardTitle className="text-sm font-medium text-foreground flex items-center gap-2">
          <Icon className="w-4 h-4 text-primary" />
          <span className="truncate">{item.name || item.data?.label || item.type}</span>
        </CardTitle>
        
        {isSelected && (
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="outline"
              className="h-6 w-6 p-0"
              onClick={(e) => {
                e.stopPropagation();
                onUpdate({ 
                  size: { 
                    width: Math.max(200, item.size.width - 50), 
                    height: Math.max(150, item.size.height - 50) 
                  } 
                });
              }}
            >
              <Minus className="h-3 w-3" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-6 w-6 p-0"
              onClick={(e) => {
                e.stopPropagation();
                onUpdate({ 
                  size: { 
                    width: item.size.width + 50, 
                    height: item.size.height + 50 
                  } 
                });
              }}
            >
              <Plus className="h-3 w-3" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-6 w-6 p-0"
              title="Configure widget"
            >
              <Settings className="h-3 w-3" />
            </Button>
            <Button
              size="sm"
              variant="destructive"
              className="h-6 w-6 p-0"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        )}
      </CardHeader>
      
      <CardContent className="flex-1 p-4 pt-0 h-0">
        <div className="h-full overflow-hidden">
          {renderWidgetContent()}
        </div>
      </CardContent>
      
      {/* Selection handles */}
      {isSelected && (
        <>
          <div className="absolute -top-1 -left-1 w-3 h-3 bg-primary rounded-full border-2 border-background"></div>
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-primary rounded-full border-2 border-background"></div>
          <div className="absolute -bottom-1 -left-1 w-3 h-3 bg-primary rounded-full border-2 border-background"></div>
          <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-primary rounded-full border-2 border-background"></div>
        </>
      )}
    </Card>
  );
};