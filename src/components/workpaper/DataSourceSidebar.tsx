
import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { ChevronRight, ChevronDown, Database, Table, BarChart3, PieChart, TrendingUp, DollarSign, Users, Calendar, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

interface DataSource {
  id: string;
  name: string;
  description: string;
  type: 'table' | 'view' | 'query' | 'api';
  category: string;
  icon: React.ReactNode;
  columns: string[];
  lastUpdated: string;
}

interface DataSourceCategory {
  id: string;
  name: string;
  icon: React.ReactNode;
  sources: DataSource[];
  defaultOpen?: boolean;
}

const DATA_SOURCES: DataSourceCategory[] = [
  {
    id: 'financial',
    name: 'Financial Data',
    icon: <DollarSign className="h-4 w-4" />,
    defaultOpen: true,
    sources: [
      {
        id: 'invoices',
        name: 'Invoice Data',
        description: 'Customer invoices and billing information',
        type: 'table',
        category: 'financial',
        icon: <FileText className="h-4 w-4" />,
        columns: ['invoice_id', 'customer_id', 'amount', 'date', 'status', 'due_date'],
        lastUpdated: '2024-01-15T10:30:00Z',
      },
      {
        id: 'payments',
        name: 'Payment Records',
        description: 'Payment transactions and history',
        type: 'table',
        category: 'financial',
        icon: <TrendingUp className="h-4 w-4" />,
        columns: ['payment_id', 'invoice_id', 'amount', 'date', 'method', 'status'],
        lastUpdated: '2024-01-15T09:15:00Z',
      },
      {
        id: 'expenses',
        name: 'Expense Tracking',
        description: 'Business expenses and categorization',
        type: 'table',
        category: 'financial',
        icon: <BarChart3 className="h-4 w-4" />,
        columns: ['expense_id', 'category', 'amount', 'date', 'description', 'vendor'],
        lastUpdated: '2024-01-14T16:45:00Z',
      },
    ],
  },
  {
    id: 'operations',
    name: 'Operations',
    icon: <Database className="h-4 w-4" />,
    sources: [
      {
        id: 'employees',
        name: 'Employee Data',
        description: 'Staff information and HR records',
        type: 'table',
        category: 'operations',
        icon: <Users className="h-4 w-4" />,
        columns: ['employee_id', 'name', 'department', 'position', 'salary', 'hire_date'],
        lastUpdated: '2024-01-12T14:20:00Z',
      },
      {
        id: 'projects',
        name: 'Project Timeline',
        description: 'Project milestones and deliverables',
        type: 'view',
        category: 'operations',
        icon: <Calendar className="h-4 w-4" />,
        columns: ['project_id', 'name', 'start_date', 'end_date', 'status', 'budget'],
        lastUpdated: '2024-01-13T11:00:00Z',
      },
    ],
  },
  {
    id: 'analytics',
    name: 'Analytics & Reports',
    icon: <PieChart className="h-4 w-4" />,
    sources: [
      {
        id: 'sales_summary',
        name: 'Sales Summary',
        description: 'Aggregated sales performance metrics',
        type: 'query',
        category: 'analytics',
        icon: <TrendingUp className="h-4 w-4" />,
        columns: ['period', 'total_sales', 'total_orders', 'avg_order_value', 'growth_rate'],
        lastUpdated: '2024-01-15T12:00:00Z',
      },
    ],
  },
];

interface DataSourceSidebarProps {
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  className?: string;
}

export const DataSourceSidebar: React.FC<DataSourceSidebarProps> = ({
  isCollapsed = false,
  onToggleCollapse,
  className,
}) => {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(DATA_SOURCES.filter(cat => cat.defaultOpen).map(cat => cat.id))
  );

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId);
      } else {
        newSet.add(categoryId);
      }
      return newSet;
    });
  };

  const handleDragStart = (dataSource: DataSource) => (e: React.DragEvent) => {
    e.dataTransfer.setData('application/json', JSON.stringify({
      type: 'data-source',
      source: dataSource,
    }));
    e.dataTransfer.effectAllowed = 'copy';
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'table': return <Table className="h-3 w-3" />;
      case 'view': return <BarChart3 className="h-3 w-3" />;
      case 'query': return <PieChart className="h-3 w-3" />;
      case 'api': return <Database className="h-3 w-3" />;
      default: return <Table className="h-3 w-3" />;
    }
  };

  const renderDataSource = (dataSource: DataSource) => (
    <div
      key={dataSource.id}
      className={cn(
        "p-3 bg-card rounded-lg border border-border cursor-grab",
        "hover:bg-accent/50 transition-colors",
        "active:cursor-grabbing"
      )}
      draggable
      onDragStart={handleDragStart(dataSource)}
    >
      <div className="flex items-start gap-2">
        <div className="flex-shrink-0 mt-0.5">
          {dataSource.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="text-sm font-medium truncate">{dataSource.name}</h4>
            <Badge variant="outline" className="text-xs">
              {getTypeIcon(dataSource.type)}
              {dataSource.type}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
            {dataSource.description}
          </p>
          <div className="flex flex-wrap gap-1 mb-2">
            {dataSource.columns.slice(0, 3).map(column => (
              <Badge key={column} variant="secondary" className="text-xs">
                {column}
              </Badge>
            ))}
            {dataSource.columns.length > 3 && (
              <Badge variant="secondary" className="text-xs">
                +{dataSource.columns.length - 3} more
              </Badge>
            )}
          </div>
          <div className="text-xs text-muted-foreground">
            Updated: {new Date(dataSource.lastUpdated).toLocaleDateString()}
          </div>
        </div>
      </div>
    </div>
  );

  const renderCategory = (category: DataSourceCategory) => {
    const isExpanded = expandedCategories.has(category.id);
    
    return (
      <div key={category.id} className="mb-4">
        <Button
          variant="ghost"
          className="w-full justify-start p-2 h-auto"
          onClick={() => toggleCategory(category.id)}
        >
          <div className="flex items-center gap-2">
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
            {category.icon}
            <span className="text-sm font-medium">{category.name}</span>
          </div>
        </Button>
        
        {isExpanded && (
          <div className="mt-2 space-y-2">
            {category.sources.map(renderDataSource)}
          </div>
        )}
      </div>
    );
  };

  if (isCollapsed) {
    return (
      <div className={cn("w-12 bg-muted/50 border-l border-border", className)}>
        <div className="p-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleCollapse}
            className="w-full h-8 p-0"
          >
            <Database className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("w-80 bg-muted/50 border-l border-border", className)}>
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Data Sources</h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleCollapse}
            className="h-8 w-8 p-0"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="mb-4 p-3 bg-primary/10 rounded-lg border border-primary/20">
          <div className="flex items-center gap-2 mb-2">
            <Database className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">Drag & Drop</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Drag data sources onto cells to bind them to your workpaper
          </p>
        </div>
        
        <ScrollArea className="h-[calc(100vh-200px)]">
          <div className="space-y-2">
            {DATA_SOURCES.map(renderCategory)}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
};
