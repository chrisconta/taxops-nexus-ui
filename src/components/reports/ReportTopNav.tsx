
import React, { useState } from 'react';
import { ArrowLeft, Play, Undo, Redo, Filter, MoreHorizontal, Save, Download, Copy, Trash2, Edit3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useNavigate } from 'react-router-dom';

interface ReportTopNavProps {
  reportTitle: string;
  onTitleChange: (title: string) => void;
  activeView: 'table' | 'chart';
  onViewChange: (view: 'table' | 'chart') => void;
  onRunReport: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onShowFilters: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

export const ReportTopNav: React.FC<ReportTopNavProps> = ({
  reportTitle,
  onTitleChange,
  activeView,
  onViewChange,
  onRunReport,
  onUndo,
  onRedo,
  onShowFilters,
  canUndo,
  canRedo,
}) => {
  const navigate = useNavigate();
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [tempTitle, setTempTitle] = useState(reportTitle);

  const handleTitleEdit = () => {
    setIsEditingTitle(true);
    setTempTitle(reportTitle);
  };

  const handleTitleSave = () => {
    onTitleChange(tempTitle);
    setIsEditingTitle(false);
  };

  const handleTitleCancel = () => {
    setTempTitle(reportTitle);
    setIsEditingTitle(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleTitleSave();
    } else if (e.key === 'Escape') {
      handleTitleCancel();
    }
  };

  return (
    <div className="h-16 bg-glass-bg/95 backdrop-blur-xl border-b border-glass-border flex items-center justify-between px-6">
      {/* Left Section - Back button and Title */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/analytics')}
          className="text-taxops-gray-light hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        <div className="flex items-center gap-2">
          {isEditingTitle ? (
            <input
              type="text"
              value={tempTitle}
              onChange={(e) => setTempTitle(e.target.value)}
              onBlur={handleTitleSave}
              onKeyDown={handleKeyPress}
              className="text-lg font-semibold bg-transparent border-b border-primary text-white outline-none min-w-48"
              autoFocus
            />
          ) : (
            <div className="flex items-center gap-2 group">
              <h1 className="text-lg font-semibold text-white">{reportTitle}</h1>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleTitleEdit}
                className="opacity-0 group-hover:opacity-100 transition-opacity p-1"
              >
                <Edit3 className="w-3 h-3" />
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Right Section - Controls */}
      <div className="flex items-center gap-3">
        {/* Undo/Redo */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={onUndo}
            disabled={!canUndo}
            className="text-taxops-gray-light hover:text-white disabled:opacity-30"
          >
            <Undo className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onRedo}
            disabled={!canRedo}
            className="text-taxops-gray-light hover:text-white disabled:opacity-30"
          >
            <Redo className="w-4 h-4" />
          </Button>
        </div>

        {/* View Toggle */}
        <div className="flex items-center gap-1 bg-glass-bg/30 rounded-lg p-1">
          <Button
            variant={activeView === 'table' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => onViewChange('table')}
            className={`text-sm ${
              activeView === 'table'
                ? 'bg-primary/20 text-primary border border-primary/30'
                : 'text-taxops-gray-light hover:text-white'
            }`}
          >
            Table View
          </Button>
          <Button
            variant={activeView === 'chart' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => onViewChange('chart')}
            className={`text-sm ${
              activeView === 'chart'
                ? 'bg-primary/20 text-primary border border-primary/30'
                : 'text-taxops-gray-light hover:text-white'
            }`}
          >
            Chart View
          </Button>
        </div>

        {/* Filter Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={onShowFilters}
          className="text-taxops-gray-light border-glass-border hover:bg-glass-bg/50 hover:text-white"
        >
          <Filter className="w-4 h-4 mr-2" />
          Filters
        </Button>

        {/* Run Report Button */}
        <Button
          onClick={onRunReport}
          className="bg-primary text-white hover:bg-primary/90"
        >
          <Play className="w-4 h-4 mr-2" />
          Run Report
        </Button>

        {/* More Actions Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="text-taxops-gray-light border-glass-border hover:bg-glass-bg/50 hover:text-white"
            >
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="bg-glass-bg/95 backdrop-blur-xl border-glass-border"
          >
            <DropdownMenuItem className="text-white hover:bg-glass-bg/50">
              <Save className="w-4 h-4 mr-2" />
              Save Report
            </DropdownMenuItem>
            <DropdownMenuItem className="text-white hover:bg-glass-bg/50">
              <Download className="w-4 h-4 mr-2" />
              Export
            </DropdownMenuItem>
            <DropdownMenuItem className="text-white hover:bg-glass-bg/50">
              <Copy className="w-4 h-4 mr-2" />
              Clone Report
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-glass-border" />
            <DropdownMenuItem className="text-taxops-error hover:bg-glass-bg/50">
              <Trash2 className="w-4 h-4 mr-2" />
              Delete Report
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};
