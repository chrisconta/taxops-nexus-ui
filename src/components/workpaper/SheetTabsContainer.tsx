
import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { Plus, X, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useSpreadsheetStore } from '@/stores/useSpreadsheetStore';

export const SheetTabsContainer: React.FC = () => {
  const {
    sheets,
    activeSheet,
    setActiveSheet,
    addSheet,
    removeSheet,
    renameSheet,
  } = useSpreadsheetStore();

  const [editingSheet, setEditingSheet] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  const handleTabClick = (sheetId: string) => {
    if (editingSheet === sheetId) return;
    setActiveSheet(sheetId);
  };

  const handleTabDoubleClick = (sheetId: string) => {
    setEditingSheet(sheetId);
    setEditingName(sheets[sheetId].name);
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditingName(e.target.value);
  };

  const handleNameSubmit = () => {
    if (editingSheet && editingName.trim()) {
      renameSheet(editingSheet, editingName.trim());
    }
    setEditingSheet(null);
    setEditingName('');
  };

  const handleNameCancel = () => {
    setEditingSheet(null);
    setEditingName('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleNameSubmit();
    } else if (e.key === 'Escape') {
      handleNameCancel();
    }
  };

  const handleAddSheet = () => {
    addSheet();
  };

  const handleRemoveSheet = (sheetId: string) => {
    if (Object.keys(sheets).length > 1) {
      removeSheet(sheetId);
    }
  };

  const renderTab = (sheet: any, sheetId: string) => {
    const isActive = activeSheet === sheetId;
    const isEditing = editingSheet === sheetId;
    const canDelete = Object.keys(sheets).length > 1;

    return (
      <div
        key={sheetId}
        className={cn(
          "group relative flex items-center gap-2 px-3 py-2 border-r border-border",
          "cursor-pointer transition-colors min-w-0",
          isActive 
            ? "bg-background text-foreground border-b-2 border-b-primary" 
            : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
        )}
        onClick={() => handleTabClick(sheetId)}
        onDoubleClick={() => handleTabDoubleClick(sheetId)}
      >
        {isEditing ? (
          <Input
            value={editingName}
            onChange={handleNameChange}
            onBlur={handleNameSubmit}
            onKeyDown={handleKeyDown}
            className="h-6 px-1 py-0 text-xs border-primary"
            autoFocus
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span className="text-sm font-medium truncate max-w-[120px]">
            {sheet.name}
          </span>
        )}
        
        {!isEditing && canDelete && (
          <div className="opacity-0 group-hover:opacity-100 transition-opacity">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-4 w-4 p-0 text-muted-foreground hover:text-foreground"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreHorizontal className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-32">
                <DropdownMenuItem onClick={() => handleTabDoubleClick(sheetId)}>
                  Rename
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => handleRemoveSheet(sheetId)}
                  className="text-destructive"
                  disabled={!canDelete}
                >
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="h-10 bg-muted/50 border-t border-border flex items-center">
      <div className="flex items-center overflow-x-auto">
        {Object.entries(sheets).map(([sheetId, sheet]) => renderTab(sheet, sheetId))}
      </div>
      
      <Button
        variant="ghost"
        size="sm"
        onClick={handleAddSheet}
        className="h-8 w-8 p-0 ml-2 text-muted-foreground hover:text-foreground"
      >
        <Plus className="h-4 w-4" />
      </Button>
      
      <div className="ml-auto pr-4 text-xs text-muted-foreground">
        {Object.keys(sheets).length} sheet{Object.keys(sheets).length !== 1 ? 's' : ''}
      </div>
    </div>
  );
};
