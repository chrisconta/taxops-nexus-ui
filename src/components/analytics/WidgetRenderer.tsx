import { X, Settings, BarChart3, LineChart, PieChart, Table as TableIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "./widgets/DataTable";
import { BarChart } from "./widgets/BarChart";
import { LineChartWidget } from "./widgets/LineChartWidget";
import { PieChartWidget } from "./widgets/PieChartWidget";
import type { Widget } from "@/pages/Analytics";

interface WidgetRendererProps {
  widget: Widget;
  onDelete: () => void;
  isSelected: boolean;
}

const widgetIcons = {
  'table': TableIcon,
  'bar-chart': BarChart3,
  'line-chart': LineChart,
  'pie-chart': PieChart,
};

export const WidgetRenderer = ({ widget, onDelete, isSelected }: WidgetRendererProps) => {
  const Icon = widgetIcons[widget.type];

  const renderWidget = () => {
    switch (widget.type) {
      case 'table':
        return <DataTable widget={widget} />;
      case 'bar-chart':
        return <BarChart widget={widget} />;
      case 'line-chart':
        return <LineChartWidget widget={widget} />;
      case 'pie-chart':
        return <PieChartWidget widget={widget} />;
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
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-4 py-2">
        <CardTitle className="text-sm font-medium text-white flex items-center gap-2">
          <Icon className="w-4 h-4 text-primary" />
          {widget.name}
        </CardTitle>
        {isSelected && (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 text-taxops-gray-light hover:text-white"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
            >
              <X className="w-3 h-3" />
            </Button>
          </div>
        )}
      </CardHeader>
      <CardContent className="flex-1 p-4 pt-0">
        <div className="h-full">
          {renderWidget()}
        </div>
      </CardContent>
    </Card>
  );
};