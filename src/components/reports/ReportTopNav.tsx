
import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { 
  Play, 
  Undo, 
  Redo, 
  Table, 
  BarChart3, 
  Filter,
  ArrowLeft
} from "lucide-react";

interface ReportTopNavProps {
  reportTitle: string;
  onTitleChange: (title: string) => void;
  activeView: 'table' | 'chart';
  onViewChange: (view: 'table' | 'chart') => void;
  onRunReport: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onShowFilters: () => void;
  onBack?: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

export const ReportTopNav = ({
  reportTitle,
  onTitleChange,
  activeView,
  onViewChange,
  onRunReport,
  onUndo,
  onRedo,
  onShowFilters,
  onBack,
  canUndo,
  canRedo,
}: ReportTopNavProps) => {
  return (
    <div className="h-16 border-b border-border bg-background flex items-center px-4 gap-4">
      {/* Back Button */}
      {onBack && (
        <>
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
          <Separator orientation="vertical" className="h-6" />
        </>
      )}

      {/* Report Title */}
      <div className="flex-1 max-w-md">
        <Input
          value={reportTitle}
          onChange={(e) => onTitleChange(e.target.value)}
          className="border-0 bg-transparent text-lg font-semibold focus:bg-muted/50"
          placeholder="Report Title"
        />
      </div>

      <Separator orientation="vertical" className="h-6" />

      {/* View Toggle */}
      <div className="flex items-center gap-2">
        <Button
          variant={activeView === 'table' ? 'default' : 'outline'}
          size="sm"
          onClick={() => onViewChange('table')}
          className="gap-2"
        >
          <Table className="w-4 h-4" />
          Table
        </Button>
        <Button
          variant={activeView === 'chart' ? 'default' : 'outline'}
          size="sm"
          onClick={() => onViewChange('chart')}
          className="gap-2"
        >
          <BarChart3 className="w-4 h-4" />
          Chart
        </Button>
      </div>

      <Separator orientation="vertical" className="h-6" />

      {/* Action Buttons */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onUndo}
          disabled={!canUndo}
        >
          <Undo className="w-4 h-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onRedo}
          disabled={!canRedo}
        >
          <Redo className="w-4 h-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onShowFilters}
          className="gap-2"
        >
          <Filter className="w-4 h-4" />
          Filters
        </Button>
        <Button
          onClick={onRunReport}
          size="sm"
          className="gap-2"
        >
          <Play className="w-4 h-4" />
          Run Report
        </Button>
      </div>
    </div>
  );
};
