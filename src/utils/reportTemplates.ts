
import { BarChart3, Table, PieChart, FileText, Wrench, Grid3X3 } from 'lucide-react';
import { ReportTemplate } from '@/hooks/useReports';

export const reportTemplates: ReportTemplate[] = [
  {
    id: 'workpaper',
    name: 'Workpaper',
    description: 'Create Excel-style workpapers with formulas, data binding, and multiple sheets',
    type: 'workpaper',
    icon: 'Grid3X3',
    content: {
      activeView: 'table',
      components: []
    }
  },
  {
    id: 'data-table',
    name: 'Data Table Report',
    description: 'Create comprehensive data tables with filtering and sorting capabilities',
    type: 'table',
    icon: 'Table',
    content: {
      activeView: 'table',
      components: [
        {
          id: 'table-1',
          type: 'table',
          position: { x: 50, y: 50 },
          size: { width: 700, height: 400 },
          data: {}
        }
      ]
    }
  },
  {
    id: 'chart-analysis',
    name: 'Chart Analysis Report',
    description: 'Visualize data with interactive charts and graphs',
    type: 'chart',
    icon: 'BarChart3',
    content: {
      activeView: 'chart',
      components: [
        {
          id: 'chart-1',
          type: 'chart',
          position: { x: 50, y: 50 },
          size: { width: 400, height: 300 },
          data: {}
        }
      ]
    }
  },
  {
    id: 'financial-summary',
    name: 'Financial Summary',
    description: 'Complete financial reporting with metrics and charts',
    type: 'financial',
    icon: 'PieChart',
    content: {
      activeView: 'table',
      components: [
        {
          id: 'metric-1',
          type: 'metric',
          position: { x: 50, y: 50 },
          size: { width: 200, height: 150 },
          data: {}
        },
        {
          id: 'chart-1',
          type: 'chart',
          position: { x: 300, y: 50 },
          size: { width: 400, height: 300 },
          data: {}
        }
      ]
    }
  },
  {
    id: 'custom-report',
    name: 'Custom Report',
    description: 'Start from scratch with a blank canvas',
    type: 'custom',
    icon: 'FileText',
    content: {
      activeView: 'table',
      components: []
    }
  }
];

export const getTemplateIcon = (iconName: string) => {
  const icons = {
    Table,
    BarChart3,
    PieChart,
    FileText,
    Wrench,
    Grid3X3
  };
  return icons[iconName as keyof typeof icons] || FileText;
};
