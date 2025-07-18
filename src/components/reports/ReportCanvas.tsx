import React, { useState, useRef, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { ReportWidget } from './ReportWidget';
import { Button } from '@/components/ui/button';
import { X, Plus, Minus } from 'lucide-react';

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

interface ReportCanvasProps {
  isRunning?: boolean;
  items?: CanvasItem[];
  onItemAdd?: (item: CanvasItem) => void;
  onItemUpdate?: (id: string, updates: Partial<CanvasItem>) => void;
  onItemDelete?: (id: string) => void;
  onItemSelect?: (item: CanvasItem | null) => void;
}

const GRID_SIZE = 24;

export const ReportCanvas: React.FC<ReportCanvasProps> = ({
  isRunning = false,
  items = [],
  onItemAdd,
  onItemUpdate,
  onItemDelete,
  onItemSelect,
}) => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [draggedItem, setDraggedItem] = useState<CanvasItem | null>(null);
  const [dragPosition, setDragPosition] = useState<{ x: number; y: number } | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const snapToGrid = useCallback((x: number, y: number) => {
    return {
      x: Math.round(x / GRID_SIZE) * GRID_SIZE,
      y: Math.round(y / GRID_SIZE) * GRID_SIZE,
    };
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    if (!canvasRef.current) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const snappedPosition = snapToGrid(x, y);
    
    // Get component type from drag data
    const componentType = e.dataTransfer.getData('component-type');
    const componentName = e.dataTransfer.getData('component-name');
    
    if (componentType) {
      const newItem: CanvasItem = {
        id: `${componentType}-${Date.now()}`,
        type: componentType as 'table' | 'metric' | 'chart' | 'formula',
        position: snappedPosition,
        size: { width: 200, height: 120 },
        data: { label: componentName || componentType },
      };
      
      onItemAdd?.(newItem);
    }
    
    setDraggedItem(null);
    setDragPosition(null);
  }, [snapToGrid, onItemAdd]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
    
    if (!canvasRef.current) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const snappedPosition = snapToGrid(x, y);
    
    setDragPosition(snappedPosition);
  }, [snapToGrid]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    if (!canvasRef.current?.contains(e.relatedTarget as Node)) {
      setIsDragOver(false);
      setDragPosition(null);
    }
  }, []);

  const handleItemClick = useCallback((itemId: string) => {
    const newSelectedItem = itemId === selectedItem ? null : itemId;
    setSelectedItem(newSelectedItem);
    
    const selectedComponent = newSelectedItem ? items.find(item => item.id === newSelectedItem) || null : null;
    onItemSelect?.(selectedComponent);
  }, [selectedItem, items, onItemSelect]);

  const renderGridDots = () => {
    const dots = [];
    const canvasWidth = 1200;
    const canvasHeight = 800;
    
    for (let x = 0; x < canvasWidth; x += GRID_SIZE * 2) {
      for (let y = 0; y < canvasHeight; y += GRID_SIZE * 2) {
        dots.push(
          <div
            key={`${x}-${y}`}
            className={cn(
              "absolute w-1 h-1 rounded-full transition-colors",
              isDragOver ? "bg-primary/30" : "bg-white/10"
            )}
            style={{ left: x, top: y }}
          />
        );
      }
    }
    
    return dots;
  };

  const renderPlaceholder = () => (
    <div className="absolute inset-0 flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-2xl">📊</span>
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">
          {isRunning ? 'Running Report...' : 'Start Building'}
        </h2>
        <p className="text-taxops-gray-light max-w-md">
          {isRunning 
            ? 'Please wait while we execute your report.'
            : 'Drag components from the left panel to start creating your report.'
          }
        </p>
        {isRunning && (
          <div className="mt-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          </div>
        )}
      </div>
    </div>
  );

  const renderCanvasItem = (item: CanvasItem) => {
    const isSelected = selectedItem === item.id;
    
    return (
      <div
        key={item.id}
        className={cn(
          "absolute transition-all duration-200 cursor-pointer",
          isSelected ? "z-10" : "z-0"
        )}
        style={{
          left: item.position.x,
          top: item.position.y,
          width: item.size.width,
          height: item.size.height,
        }}
        onClick={(e) => {
          e.stopPropagation();
          handleItemClick(item.id);
        }}
      >
        {isRunning ? (
          <ReportWidget 
            item={item}
            isSelected={isSelected}
            onUpdate={(updates) => onItemUpdate?.(item.id, updates)}
            onDelete={() => onItemDelete?.(item.id)}
          />
        ) : (
          <div className="h-full bg-card/50 border-2 border-dashed border-border/50 rounded-lg p-4 cursor-pointer hover:border-border transition-colors">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-foreground">
                {item.name || item.data?.label || item.type}
              </span>
              {isSelected && (
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-6 w-6 p-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      onItemUpdate?.(item.id, { 
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
                      onItemUpdate?.(item.id, { 
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
                    variant="destructive"
                    className="h-6 w-6 p-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      onItemDelete?.(item.id);
                    }}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>
            
            <div className="text-center text-muted-foreground">
              <div className="text-xs">{item.type}</div>
              <div className="text-xs opacity-75">
                {item.size.width} × {item.size.height}
              </div>
            </div>
            
            {isSelected && (
              <>
                {/* Selection handles */}
                <div className="absolute -top-1 -left-1 w-3 h-3 bg-primary rounded-full border-2 border-background"></div>
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-primary rounded-full border-2 border-background"></div>
                <div className="absolute -bottom-1 -left-1 w-3 h-3 bg-primary rounded-full border-2 border-background"></div>
                <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-primary rounded-full border-2 border-background"></div>
              </>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderDragPreview = () => {
    if (!dragPosition || !isDragOver) return null;
    
    return (
      <div
        className="absolute border-2 border-dashed border-primary bg-primary/10 rounded-lg p-4 pointer-events-none z-50 animate-pulse"
        style={{
          left: dragPosition.x,
          top: dragPosition.y,
          width: 200,
          height: 120,
        }}
      >
        <div className="text-primary text-sm font-medium">
          Drop here
        </div>
      </div>
    );
  };

  return (
    <div
      ref={canvasRef}
      data-report-canvas
      className={cn(
        "flex-1 relative overflow-hidden transition-colors",
        isDragOver ? "bg-primary/5" : "bg-transparent"
      )}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onClick={() => {
        setSelectedItem(null);
        onItemSelect?.(null);
      }}
    >
      {/* Grid background */}
      <div className="absolute inset-0 opacity-30">
        {renderGridDots()}
      </div>
      
      {/* Canvas items */}
      {items.map(renderCanvasItem)}
      
      {/* Drag preview */}
      {renderDragPreview()}
      
      {/* Placeholder when no items */}
      {items.length === 0 && renderPlaceholder()}
      
      {/* Drop zone indicator */}
      <div 
        className={cn(
          "absolute inset-4 border-2 border-dashed rounded-lg pointer-events-none transition-all duration-200",
          isDragOver ? "border-primary/50 bg-primary/5 opacity-100" : "border-white/10 opacity-0"
        )} 
      />
    </div>
  );
};