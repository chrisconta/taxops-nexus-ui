import { useRef, useEffect, useState } from "react";
import { GripVertical } from "lucide-react";
import { WidgetRenderer } from "./WidgetRenderer";
import type { Widget, Dashboard } from "@/pages/Analytics";

interface DashboardCanvasProps {
  dashboard: Dashboard;
  selectedWidget: Widget | null;
  onSelectWidget: (widget: Widget) => void;
  onUpdateWidget: (widget: Widget) => void;
  onDeleteWidget: (widgetId: string) => void;
  onEditWidget: (widget: Widget) => void;
  onRefreshWidget: (widget: Widget) => void;
  onMinimizeWidget: (widget: Widget) => void;
  isFrozen?: boolean;
  globalFilter?: { column: string; value: string } | null;
  onFilterChange?: (column: string, value: string) => void;
}

export const DashboardCanvas = ({ 
  dashboard, 
  selectedWidget, 
  onSelectWidget, 
  onUpdateWidget,
  onDeleteWidget,
  onEditWidget,
  onRefreshWidget,
  onMinimizeWidget,
  isFrozen = false,
  globalFilter,
  onFilterChange
}: DashboardCanvasProps) => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [draggedWidget, setDraggedWidget] = useState<Widget | null>(null);
  const [resizingWidget, setResizingWidget] = useState<Widget | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [resizeStartSize, setResizeStartSize] = useState({ width: 0, height: 0 });
  const [resizeStartPos, setResizeStartPos] = useState({ x: 0, y: 0 });

  const handleWidgetMouseDown = (widget: Widget, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const rect = e.currentTarget.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
    setDraggedWidget(widget);
    // Don't select widget on mouse down, only on drag
  };

  const handleResizeMouseDown = (widget: Widget, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    setResizeStartSize({
      width: widget.size.width,
      height: widget.size.height
    });
    setResizeStartPos({
      x: e.clientX,
      y: e.clientY
    });
    setResizingWidget(widget);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (resizingWidget && canvasRef.current) {
      const canvasRect = canvasRef.current.getBoundingClientRect();
      const deltaX = e.clientX - resizeStartPos.x;
      const deltaY = e.clientY - resizeStartPos.y;
      
      // Calculate new size with boundaries
      const maxWidth = canvasRect.width - resizingWidget.position.x;
      const maxHeight = canvasRect.height - resizingWidget.position.y;
      
      const newSize = {
        width: Math.max(200, Math.min(maxWidth, resizeStartSize.width + deltaX)),
        height: Math.max(150, Math.min(maxHeight, resizeStartSize.height + deltaY))
      };

      const updatedWidget = {
        ...resizingWidget,
        size: newSize
      };

      onUpdateWidget(updatedWidget);
      setResizingWidget(updatedWidget);
    } else if (draggedWidget && canvasRef.current) {
      const canvasRect = canvasRef.current.getBoundingClientRect();
      
      // Constrain position within canvas boundaries
      const newPosition = {
        x: Math.max(0, Math.min(canvasRect.width - draggedWidget.size.width, e.clientX - canvasRect.left - dragOffset.x)),
        y: Math.max(0, Math.min(canvasRect.height - draggedWidget.size.height, e.clientY - canvasRect.top - dragOffset.y))
      };

      const updatedWidget = {
        ...draggedWidget,
        position: newPosition
      };

      onUpdateWidget(updatedWidget);
      setDraggedWidget(updatedWidget);
    }
  };

  const handleMouseUp = () => {
    setDraggedWidget(null);
    setResizingWidget(null);
  };

  const handleCanvasClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      // Don't deselect when clicking on canvas
    }
  };

  useEffect(() => {
    if (draggedWidget || resizingWidget) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [draggedWidget, resizingWidget, dragOffset, resizeStartSize, resizeStartPos]);

  return (
    <div 
      ref={canvasRef}
      data-dashboard-canvas
      className={`h-[1200px] foldable:h-[1000px] w-full relative bg-gradient-to-br from-background/50 to-background/30 transition-all duration-200 ${
        isFrozen ? 'pointer-events-none opacity-60' : ''
      }`}
      onClick={handleCanvasClick}
    >
      {/* Grid background */}
      <div 
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
          `,
          backgroundSize: '20px 20px'
        }}
      />

      {/* Widgets */}
      {dashboard.config.widgets.map((widget) => (
        <div
          key={widget.id}
          className={`absolute border-2 transition-all duration-200 rounded-lg overflow-hidden ${
            selectedWidget?.id === widget.id
              ? 'border-primary shadow-glow'
              : 'border-glass-border hover:border-glass-border/60'
          }`}
          style={{
            left: widget.position.x,
            top: widget.position.y,
            width: widget.size.width,
            height: widget.size.height,
            cursor: draggedWidget?.id === widget.id ? 'grabbing' : 'grab'
          }}
          onMouseDown={(e) => handleWidgetMouseDown(widget, e)}
        >
          <WidgetRenderer 
            widget={widget} 
            onDelete={() => onDeleteWidget(widget.id)}
            onSelect={() => onSelectWidget(widget)}
            onEdit={() => onEditWidget(widget)}
            onUpdate={() => onRefreshWidget(widget)}
            onMinimize={() => onMinimizeWidget(widget)}
            isSelected={selectedWidget?.id === widget.id}
            globalFilter={globalFilter}
            onFilterChange={onFilterChange}
          />
          
          {/* Resize handle */}
          <div
            className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize opacity-50 hover:opacity-100 transition-opacity"
            onMouseDown={(e) => handleResizeMouseDown(widget, e)}
          >
            <GripVertical className="w-3 h-3 text-white transform rotate-45" />
          </div>
        </div>
      ))}

      {/* Empty state */}
      {dashboard.config.widgets.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="w-24 h-24 bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-12 h-12 text-primary/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Start Building</h3>
            <p className="text-taxops-gray-light text-sm max-w-md">
              Add components from the palette on the left to start creating your dashboard
            </p>
          </div>
        </div>
      )}
    </div>
  );
};