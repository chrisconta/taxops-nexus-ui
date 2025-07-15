import { BarChart3, LineChart, PieChart, Table as TableIcon } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { Widget } from "@/pages/Analytics";

interface ElementPaletteProps {
  onAddWidget: (widget: Widget) => void;
}

const elementTypes = [
  {
    type: 'table' as const,
    name: 'Data Table',
    description: 'Display data in rows and columns',
    icon: TableIcon,
  },
  {
    type: 'bar-chart' as const,
    name: 'Bar Chart',
    description: 'Compare values across categories',
    icon: BarChart3,
  },
  {
    type: 'line-chart' as const,
    name: 'Line Chart',
    description: 'Show trends over time',
    icon: LineChart,
  },
  {
    type: 'pie-chart' as const,
    name: 'Pie Chart',
    description: 'Show proportions of a whole',
    icon: PieChart,
  },
];

export const ElementPalette = ({ onAddWidget }: ElementPaletteProps) => {
  const handleAddWidget = (type: Widget['type']) => {
    const newWidget: Widget = {
      id: `widget-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      name: `New ${elementTypes.find(t => t.type === type)?.name || 'Widget'}`,
      position: { x: 50, y: 50 },
      size: { width: 400, height: 300 },
      filters: [],
      transformations: [],
    };

    onAddWidget(newWidget);
  };

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-glass-border">
        <h3 className="font-semibold text-white mb-1">Components</h3>
        <p className="text-sm text-taxops-gray-light">
          Drag or click to add widgets
        </p>
      </div>

      <div className="flex-1 p-4 space-y-3 overflow-auto">
        {elementTypes.map((element) => {
          const Icon = element.icon;
          return (
            <Card 
              key={element.type}
              className="bg-glass-bg/30 border-glass-border hover:border-primary/30 transition-all duration-300 cursor-pointer group"
              onClick={() => handleAddWidget(element.type)}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-primary/20 to-primary/10 rounded-lg flex items-center justify-center group-hover:from-primary/30 group-hover:to-primary/20 transition-all">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-white text-sm mb-1 group-hover:text-primary transition-colors">
                      {element.name}
                    </h4>
                    <p className="text-xs text-taxops-gray-light">
                      {element.description}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="p-4 border-t border-glass-border">
        <div className="text-xs text-taxops-gray-light space-y-1">
          <p>💡 Click to add widgets to canvas</p>
          <p>⚙️ Select widgets to configure</p>
        </div>
      </div>
    </div>
  );
};