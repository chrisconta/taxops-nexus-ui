import { X, Settings, BarChart3, LineChart, PieChart, Table as TableIcon, Code, RefreshCw, Minimize2, Filter, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "./widgets/DataTable";
import { BarChart } from "./widgets/BarChart";
import { LineChartWidget } from "./widgets/LineChartWidget";
import { PieChartWidget } from "./widgets/PieChartWidget";
import { FilterWidget } from "./widgets/FilterWidget";
import type { Widget } from "@/pages/Analytics";

interface WidgetRendererProps {
  widget: Widget;
  onDelete: () => void;
  onSelect: () => void;
  onEdit: () => void;
  onUpdate: () => void;
  onMinimize: () => void;
  isSelected: boolean;
  globalFilter?: { column: string; value: string } | null;
  onFilterChange?: (column: string, value: string) => void;
}

const widgetIcons = {
  'table': TableIcon,
  'bar-chart': BarChart3,
  'line-chart': LineChart,
  'pie-chart': PieChart,
  'filter': Filter,
};

export const WidgetRenderer = ({ widget, onDelete, onSelect, onEdit, onUpdate, onMinimize, isSelected, globalFilter, onFilterChange }: WidgetRendererProps) => {
  const Icon = widgetIcons[widget.type];

  const renderWidget = () => {
    switch (widget.type) {
      case 'table':
        return <DataTable widget={widget} globalFilter={globalFilter} />;
      case 'bar-chart':
        return <BarChart widget={widget} globalFilter={globalFilter} />;
      case 'line-chart':
        return <LineChartWidget widget={widget} globalFilter={globalFilter} />;
      case 'pie-chart':
        return <PieChartWidget widget={widget} globalFilter={globalFilter} />;
      case 'filter':
        return <FilterWidget widget={widget} onFilterChange={onFilterChange || (() => {})} globalFilter={globalFilter} />;
      default:
        return (
          <div className="flex items-center justify-center h-full text-taxops-gray-light">
            <div className="text-center">
              <Icon className="w-8 h-8 mx-auto mb-2" />
              <p className="text-sm">Configure this widget</p>
            </div>
          </div>
        );
    }
  };

  return (
    <Card className="h-full bg-glass-bg/80 backdrop-blur-sm border-0 shadow-glass">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-4 foldable:px-3 foldable-portrait:px-2 py-2 foldable:py-1">
        <CardTitle className="text-sm foldable:text-xs font-medium text-white flex items-center gap-2 foldable:gap-1">
          <Icon className="w-4 h-4 foldable:w-3 foldable:h-3 text-primary" />
          <span className="truncate">{widget.name}</span>
        </CardTitle>
        <div className="flex items-center gap-1 foldable-portrait:gap-0">
          {widget.type === 'filter' && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 foldable:h-5 foldable:w-5 foldable-portrait:h-4 foldable-portrait:w-4 p-0 text-taxops-gray-light hover:text-white"
              onClick={(e) => {
                e.stopPropagation();
                // Toggle search mode for filter widget
                if (onFilterChange) {
                  const event = new CustomEvent('toggleFilterSearch', { detail: { widgetId: widget.id } });
                  window.dispatchEvent(event);
                }
              }}
              title="Toggle search"
            >
              <Search className="w-3 h-3 foldable:w-2 foldable:h-2" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 foldable:h-5 foldable:w-5 foldable-portrait:h-4 foldable-portrait:w-4 p-0 text-taxops-gray-light hover:text-white"
            onClick={(e) => {
              e.stopPropagation();
              onUpdate();
            }}
            title="Update data"
          >
            <RefreshCw className="w-3 h-3 foldable:w-2 foldable:h-2" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 foldable:h-5 foldable:w-5 foldable-portrait:h-4 foldable-portrait:w-4 p-0 text-taxops-gray-light hover:text-white foldable-portrait:hidden"
            onClick={(e) => {
              e.stopPropagation();
              onMinimize();
            }}
            title="Minimize widget"
          >
            <Minimize2 className="w-3 h-3 foldable:w-2 foldable:h-2" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 foldable:h-5 foldable:w-5 foldable-portrait:h-4 foldable-portrait:w-4 p-0 text-taxops-gray-light hover:text-white"
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            title="Edit widget"
          >
            <Settings className="w-3 h-3 foldable:w-2 foldable:h-2" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 foldable:h-5 foldable:w-5 foldable-portrait:h-4 foldable-portrait:w-4 p-0 text-taxops-gray-light hover:text-white foldable-portrait:hidden"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            title="Delete widget"
          >
            <X className="w-3 h-3 foldable:w-2 foldable:h-2" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex-1 p-4 foldable:p-3 foldable-portrait:p-2 pt-0 h-0">
        <div className="h-full">
          {renderWidget()}
        </div>
      </CardContent>
    </Card>
  );
};