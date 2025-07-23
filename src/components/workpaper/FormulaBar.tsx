
import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, X, Function } from 'lucide-react';
import { useSpreadsheetStore } from '@/stores/useSpreadsheetStore';

export const FormulaBar: React.FC = () => {
  const {
    selectedCell,
    isEditing,
    editingValue,
    sheets,
    activeSheet,
    startEditing,
    updateEditingValue,
    commitEdit,
    cancelEdit,
  } = useSpreadsheetStore();

  const [localValue, setLocalValue] = useState('');

  const currentCell = selectedCell && sheets[activeSheet]?.cells[selectedCell];
  const displayValue = currentCell?.formula || currentCell?.value || '';

  useEffect(() => {
    if (isEditing) {
      setLocalValue(editingValue);
    } else {
      setLocalValue(displayValue);
    }
  }, [isEditing, editingValue, displayValue]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setLocalValue(value);
    if (isEditing) {
      updateEditingValue(value);
    }
  };

  const handleInputFocus = () => {
    if (!isEditing && selectedCell) {
      startEditing(selectedCell, displayValue);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (isEditing) {
        commitEdit();
      } else if (selectedCell) {
        startEditing(selectedCell, displayValue);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      if (isEditing) {
        cancelEdit();
      }
    }
  };

  const handleCommit = () => {
    commitEdit();
  };

  const handleCancel = () => {
    cancelEdit();
  };

  const isFormula = localValue.startsWith('=');

  return (
    <div className="h-10 bg-background border-b border-border flex items-center px-4 gap-3">
      {/* Cell reference */}
      <div className="flex items-center gap-2 min-w-0">
        <Badge variant="outline" className="text-xs font-mono">
          {selectedCell || 'A1'}
        </Badge>
        {isFormula && (
          <Function className="h-4 w-4 text-primary" />
        )}
      </div>

      {/* Formula/Value input */}
      <div className="flex-1 flex items-center gap-2">
        <Input
          value={localValue}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onKeyDown={handleKeyDown}
          placeholder={selectedCell ? "Enter value or formula (=SUM(A1:A10))" : "Select a cell to edit"}
          className={`font-mono text-sm border-none bg-transparent focus-visible:ring-0 ${
            isFormula ? 'text-primary' : 'text-foreground'
          }`}
          disabled={!selectedCell}
        />
        
        {isEditing && (
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="ghost"
              onClick={handleCommit}
              className="h-6 w-6 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
            >
              <Check className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleCancel}
              className="h-6 w-6 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Status indicators */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {currentCell?.dataBinding && (
          <Badge variant="secondary" className="text-xs">
            Bound: {currentCell.dataBinding.source}
          </Badge>
        )}
        {isEditing && (
          <Badge variant="outline" className="text-xs">
            Editing
          </Badge>
        )}
      </div>
    </div>
  );
};
