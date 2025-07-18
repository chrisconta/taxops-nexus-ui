import React from "react";
import { Save, Download, Upload, Play, Pause, AlertCircle, CheckCircle, Clock, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { exportReport, importReport } from '@/lib/reportExport';
import { useToast } from '@/hooks/use-toast';

interface ReportStatusBarProps {
  isRunning: boolean;
  progress?: number;
  status: 'ready' | 'running' | 'error' | 'success';
  lastSaved?: Date | null;
  componentsCount: number;
  onSave: () => void;
  onExport: () => void;
  onImport: () => void;
  onRunReport: () => void;
}

export const ReportStatusBar: React.FC<ReportStatusBarProps> = ({
  isRunning,
  progress = 0,
  status,
  lastSaved,
  componentsCount,
  onSave,
  onExport,
  onImport,
  onRunReport,
}) => {
  const { toast } = useToast();
  const getStatusIcon = () => {
    switch (status) {
      case 'running':
        return <Clock className="h-4 w-4 text-blue-500 animate-pulse" />;
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <FileText className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'running':
        return 'Executing report...';
      case 'success':
        return 'Report executed successfully';
      case 'error':
        return 'Error executing report';
      default:
        return 'Ready to build your report';
    }
  };

  const getStatusBadgeVariant = () => {
    switch (status) {
      case 'running':
        return 'default';
      case 'success':
        return 'default';
      case 'error':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  return (
    <div className="h-14 bg-glass-bg/95 backdrop-blur-xl border-t border-glass-border flex items-center justify-between px-6">
      {/* Left Section - Status */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          {getStatusIcon()}
          <span className="text-sm text-foreground font-medium">
            {getStatusText()}
          </span>
        </div>

        {/* Progress Bar (only when running) */}
        {isRunning && (
          <div className="flex items-center gap-2">
            <Progress value={progress} className="w-32 h-2" />
            <span className="text-xs text-muted-foreground">
              {Math.round(progress)}%
            </span>
          </div>
        )}

        <Separator orientation="vertical" className="h-6 bg-glass-border" />

        {/* Component Count */}
        <Badge variant={getStatusBadgeVariant()} className="text-xs">
          {componentsCount} {componentsCount === 1 ? 'Component' : 'Components'}
        </Badge>
      </div>

      {/* Center Section - Quick Actions */}
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={onRunReport}
          disabled={isRunning}
          className="h-8 px-3 text-xs"
        >
          {isRunning ? (
            <>
              <Pause className="h-3 w-3 mr-1" />
              Running
            </>
          ) : (
            <>
              <Play className="h-3 w-3 mr-1" />
              Run Report
            </>
          )}
        </Button>

        <Separator orientation="vertical" className="h-6 bg-glass-border" />

        <Button
          variant="ghost"
          size="sm"
          onClick={onSave}
          className="h-8 px-3 text-xs"
        >
          <Save className="h-3 w-3 mr-1" />
          Save
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.json';
            input.onchange = (e) => {
              const file = (e.target as HTMLInputElement).files?.[0];
              if (file) {
                importReport(file)
                  .then(() => toast({ title: 'Report imported successfully' }))
                  .catch(() => toast({ title: 'Import failed', variant: 'destructive' }));
              }
            };
            input.click();
          }}
          className="h-8 px-3 text-xs"
        >
          <Upload className="h-3 w-3 mr-1" />
          Import
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            const canvasElement = document.querySelector('[data-report-canvas]') as HTMLElement;
            if (canvasElement) {
              exportReport(canvasElement, { componentsCount, lastSaved }, { format: 'pdf' })
                .then(() => toast({ title: 'Report exported successfully' }))
                .catch(() => toast({ title: 'Export failed', variant: 'destructive' }));
            }
          }}
          disabled={componentsCount === 0}
          className="h-8 px-3 text-xs"
        >
          <Download className="h-3 w-3 mr-1" />
          Export
        </Button>
      </div>

      {/* Right Section - Last Saved */}
      <div className="flex items-center gap-4">
        <div className="text-xs text-muted-foreground">
          {lastSaved ? (
            <span>
              Last saved: {lastSaved.toLocaleTimeString([], { 
                hour: '2-digit', 
                minute: '2-digit' 
              })}
            </span>
          ) : (
            <span>Not saved</span>
          )}
        </div>

        {/* Auto-save indicator */}
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-xs text-muted-foreground">Auto-save</span>
        </div>
      </div>
    </div>
  );
};