import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { ChevronDown, ChevronRight, Table, BarChart3, Calculator, FileText, Sparkles } from 'lucide-react';

interface PaletteItem {
  id: string;
  name: string;
  type: 'table' | 'metric' | 'chart' | 'formula';
  icon: React.ReactNode;
  description?: string;
  data?: any;
}

interface PaletteSection {
  id: string;
  title: string;
  icon: string;
  items: PaletteItem[];
  defaultOpen?: boolean;
}

interface ComponentPaletteProps {
  onItemDragStart?: (item: PaletteItem, e: React.DragEvent) => void;
}

const PALETTE_SECTIONS: PaletteSection[] = [
  {
    id: 'data-tables',
    title: 'Data Tables',
    icon: '📂',
    defaultOpen: true,
    items: [
      {
        id: 'facturacion-table',
        name: 'Facturación',
        type: 'table',
        icon: <Table className="w-4 h-4" />,
        description: 'Invoice data table',
        data: { source: 'invoices', columns: ['date', 'client', 'amount', 'status'] }
      },
      {
        id: 'pagos-table',
        name: 'Pagos',
        type: 'table',
        icon: <Table className="w-4 h-4" />,
        description: 'Payments data table',
        data: { source: 'payments', columns: ['date', 'invoice_id', 'amount', 'method'] }
      },
      {
        id: 'nomina-table',
        name: 'Nómina',
        type: 'table',
        icon: <Table className="w-4 h-4" />,
        description: 'Payroll data table',
        data: { source: 'payroll', columns: ['employee', 'period', 'gross', 'net'] }
      }
    ]
  },
  {
    id: 'kpis-metrics',
    title: 'KPIs / Metrics',
    icon: '📊',
    defaultOpen: true,
    items: [
      {
        id: 'total-iva',
        name: 'Total IVA',
        type: 'metric',
        icon: <BarChart3 className="w-4 h-4" />,
        description: 'Sum of all VAT amounts',
        data: { formula: 'SUM(invoices.iva)', format: 'currency' }
      },
      {
        id: 'nomina-net',
        name: 'Nómina Net',
        type: 'metric',
        icon: <BarChart3 className="w-4 h-4" />,
        description: 'Total net payroll',
        data: { formula: 'SUM(payroll.net)', format: 'currency' }
      },
      {
        id: 'retenciones',
        name: 'Retenciones',
        type: 'metric',
        icon: <BarChart3 className="w-4 h-4" />,
        description: 'Total tax withholdings',
        data: { formula: 'SUM(payroll.withholdings)', format: 'currency' }
      }
    ]
  },
  {
    id: 'formulas',
    title: 'Formulas',
    icon: '🔢',
    items: [
      {
        id: 'sum-formula',
        name: 'SUM',
        type: 'formula',
        icon: <Calculator className="w-4 h-4" />,
        description: 'Sum of selected values',
        data: { type: 'aggregate', function: 'SUM' }
      },
      {
        id: 'avg-formula',
        name: 'AVG',
        type: 'formula',
        icon: <Calculator className="w-4 h-4" />,
        description: 'Average of selected values',
        data: { type: 'aggregate', function: 'AVG' }
      },
      {
        id: 'if-formula',
        name: 'IF',
        type: 'formula',
        icon: <Calculator className="w-4 h-4" />,
        description: 'Conditional logic',
        data: { type: 'conditional', function: 'IF' }
      },
      {
        id: 'custom-formula',
        name: 'Custom Formula',
        type: 'formula',
        icon: <Calculator className="w-4 h-4" />,
        description: 'Build your own formula',
        data: { type: 'custom', editable: true }
      }
    ]
  },
  {
    id: 'ai-templates',
    title: 'AI Templates',
    icon: '✨',
    items: [
      {
        id: 'monthly-summary',
        name: 'Monthly Summary',
        type: 'table',
        icon: <Sparkles className="w-4 h-4" />,
        description: 'AI-generated monthly report',
        data: { template: 'monthly-summary', aiGenerated: true }
      },
      {
        id: 'cash-flow',
        name: 'Cash Flow Analysis',
        type: 'chart',
        icon: <Sparkles className="w-4 h-4" />,
        description: 'AI cash flow visualization',
        data: { template: 'cash-flow', aiGenerated: true }
      }
    ]
  }
];

export const ComponentPalette: React.FC<ComponentPaletteProps> = ({
  onItemDragStart
}) => {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(PALETTE_SECTIONS.filter(s => s.defaultOpen).map(s => s.id))
  );

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId);
      } else {
        newSet.add(sectionId);
      }
      return newSet;
    });
  };

  const handleDragStart = (item: PaletteItem) => (e: React.DragEvent) => {
    // Set drag data that the canvas expects
    e.dataTransfer.setData('component-type', item.type);
    e.dataTransfer.setData('component-name', item.name);
    e.dataTransfer.effectAllowed = 'copy';
    
    // Add visual feedback
    e.dataTransfer.setDragImage(e.currentTarget as HTMLElement, 50, 25);
    
    // Call callback if provided
    onItemDragStart?.(item, e);
  };

  const renderPaletteItem = (item: PaletteItem) => (
    <div
      key={item.id}
      className={cn(
        "flex items-center gap-3 p-3 rounded-lg cursor-grab",
        "bg-glass-bg/20 hover:bg-glass-bg/40 border border-glass-border/50",
        "transition-all duration-200 group"
      )}
      draggable
      onDragStart={handleDragStart(item)}
    >
      <div className="flex-shrink-0 text-primary group-hover:scale-110 transition-transform">
        {item.icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-white truncate">
          {item.name}
        </div>
        {item.description && (
          <div className="text-xs text-taxops-gray-light truncate mt-1">
            {item.description}
          </div>
        )}
      </div>
    </div>
  );

  const renderSection = (section: PaletteSection) => {
    const isExpanded = expandedSections.has(section.id);
    
    return (
      <div key={section.id} className="mb-4">
        <button
          onClick={() => toggleSection(section.id)}
          className={cn(
            "w-full flex items-center gap-2 p-3 rounded-lg",
            "bg-glass-bg/30 hover:bg-glass-bg/50 border border-glass-border",
            "transition-all duration-200 group"
          )}
        >
          <span className="text-lg">{section.icon}</span>
          <h3 className="flex-1 text-left font-medium text-white">
            {section.title}
          </h3>
          <div className="text-taxops-gray-light group-hover:text-white transition-colors">
            {isExpanded ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </div>
        </button>
        
        {isExpanded && (
          <div className="mt-2 space-y-2">
            {section.items.map(renderPaletteItem)}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="w-80 bg-glass-bg/50 backdrop-blur-xl border-r border-glass-border p-6 overflow-y-auto">
      <div className="flex items-center gap-2 mb-6">
        <FileText className="w-5 h-5 text-primary" />
        <h2 className="text-lg font-semibold text-white">Components</h2>
      </div>
      
      <div className="space-y-4">
        {PALETTE_SECTIONS.map(renderSection)}
      </div>
      
      <div className="mt-8 p-4 bg-glass-bg/20 rounded-lg border border-glass-border/50">
        <div className="text-xs text-taxops-gray-light text-center">
          <Sparkles className="w-4 h-4 inline-block mr-1" />
          Drag components to the canvas to start building your report
        </div>
      </div>
    </div>
  );
};