import React, { useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { useSpreadsheetStore } from '@/stores/useSpreadsheetStore';

const COLUMN_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const DEFAULT_CELL_WIDTH = 120;
const DEFAULT_CELL_HEIGHT = 32;
const HEADER_HEIGHT = 32;
const HEADER_WIDTH = 60;

// Generate column letters (A, B, C, ... Z, AA, AB, etc.)
const getColumnLabel = (index: number): string => {
  let result = '';
  let num = index;
  
  do {
    result = COLUMN_LETTERS[num % 26] + result;
    num = Math.floor(num / 26) - 1;
  } while (num >= 0);
  
  return result;
};

// Parse cell ID to row/column indices
const parseCellId = (cellId: string): { row: number; col: number } => {
  const match = cellId.match(/^([A-Z]+)(\d+)$/);
  if (!match) return { row: 0, col: 0 };
  
  const colStr = match[1];
  const rowStr = match[2];
  
  let col = 0;
  for (let i = 0; i < colStr.length; i++) {
    col = col * 26 + (colStr.charCodeAt(i) - 65 + 1);
  }
  col -= 1; // Convert to 0-based
  
  const row = parseInt(rowStr) - 1; // Convert to 0-based
  
  return { row, col };
};

// Generate cell ID from row/column indices
const getCellId = (row: number, col: number): string => {
  const colLabel = getColumnLabel(col);
  const rowLabel = (row + 1).toString();
  return `${colLabel}${rowLabel}`;
};

interface SpreadsheetGridProps {
  className?: string;
}

export const SpreadsheetGrid: React.FC<SpreadsheetGridProps> = ({ className }) => {
  const {
    sheets,
    activeSheet,
    selectedCell,
    isEditing,
    editingValue,
    setSelectedCell,
    startEditing,
    updateEditingValue,
    commitEdit,
    cancelEdit,
    setColumnWidth,
    setRowHeight,
  } = useSpreadsheetStore();

  const [visibleRows, setVisibleRows] = useState(50);
  const [visibleCols, setVisibleCols] = useState(20);
  const [scrollPosition, setScrollPosition] = useState({ x: 0, y: 0 });

  const currentSheet = sheets[activeSheet];
  const frozenRows = currentSheet?.frozenRows || 1;
  const frozenCols = currentSheet?.frozenCols || 1;

  const handleCellClick = (row: number, col: number) => {
    const cellId = getCellId(row, col);
    setSelectedCell(cellId);
  };

  const handleCellDoubleClick = (row: number, col: number) => {
    const cellId = getCellId(row, col);
    const cell = currentSheet?.cells[cellId];
    startEditing(cellId, cell?.formula || cell?.value || '');
  };

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!selectedCell) return;

    const { row, col } = parseCellId(selectedCell);

    switch (e.key) {
      case 'ArrowUp':
        e.preventDefault();
        if (row > 0) {
          setSelectedCell(getCellId(row - 1, col));
        }
        break;
      case 'ArrowDown':
        e.preventDefault();
        setSelectedCell(getCellId(row + 1, col));
        break;
      case 'ArrowLeft':
        e.preventDefault();
        if (col > 0) {
          setSelectedCell(getCellId(row, col - 1));
        }
        break;
      case 'ArrowRight':
        e.preventDefault();
        setSelectedCell(getCellId(row, col + 1));
        break;
      case 'Enter':
        e.preventDefault();
        if (isEditing) {
          commitEdit();
        } else {
          const cell = currentSheet?.cells[selectedCell];
          startEditing(selectedCell, cell?.formula || cell?.value || '');
        }
        break;
      case 'Escape':
        e.preventDefault();
        if (isEditing) {
          cancelEdit();
        }
        break;
      case 'F2':
        e.preventDefault();
        if (!isEditing) {
          const cell = currentSheet?.cells[selectedCell];
          startEditing(selectedCell, cell?.formula || cell?.value || '');
        }
        break;
      default:
        if (!isEditing && e.key.length === 1 && e.key.match(/[a-zA-Z0-9=]/)) {
          e.preventDefault();
          startEditing(selectedCell, e.key);
        }
        break;
    }
  }, [selectedCell, isEditing, currentSheet, setSelectedCell, startEditing, commitEdit, cancelEdit]);

  const handleEditingKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      commitEdit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancelEdit();
    }
  };

  const handleEditingChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateEditingValue(e.target.value);
  };

  const renderCell = (row: number, col: number) => {
    const cellId = getCellId(row, col);
    const cell = currentSheet?.cells[cellId];
    const isSelected = selectedCell === cellId;
    const isEditingThisCell = isEditing && isSelected;
    
    const cellWidth = currentSheet?.columnWidths[getColumnLabel(col)] || DEFAULT_CELL_WIDTH;
    const cellHeight = currentSheet?.rowHeights[(row + 1).toString()] || DEFAULT_CELL_HEIGHT;

    return (
      <div
        key={cellId}
        className={cn(
          "border-r border-b border-border bg-background cursor-cell",
          "hover:bg-accent/50 transition-colors",
          "flex items-center px-2 text-sm",
          isSelected && "ring-2 ring-primary bg-primary/10",
          cell?.dataBinding && "bg-blue-50 border-blue-200"
        )}
        style={{
          width: cellWidth,
          height: cellHeight,
          minWidth: cellWidth,
          minHeight: cellHeight,
        }}
        onClick={() => handleCellClick(row, col)}
        onDoubleClick={() => handleCellDoubleClick(row, col)}
      >
        {isEditingThisCell ? (
          <input
            type="text"
            value={editingValue}
            onChange={handleEditingChange}
            onKeyDown={handleEditingKeyDown}
            onBlur={commitEdit}
            className="w-full h-full bg-transparent border-none outline-none font-mono text-sm"
            autoFocus
          />
        ) : (
          <span className="truncate font-mono text-sm">
            {cell?.value || ''}
          </span>
        )}
      </div>
    );
  };

  const renderRowHeader = (row: number) => {
    const rowLabel = (row + 1).toString();
    const cellHeight = currentSheet?.rowHeights[rowLabel] || DEFAULT_CELL_HEIGHT;
    
    return (
      <div
        key={`row-${row}`}
        className="bg-muted border-r border-b border-border flex items-center justify-start pl-2 text-xs font-medium text-muted-foreground"
        style={{ width: HEADER_WIDTH, height: cellHeight }}
      >
        {rowLabel}
      </div>
    );
  };

  const renderColumnHeader = (col: number) => {
    const colLabel = getColumnLabel(col);
    const cellWidth = currentSheet?.columnWidths[colLabel] || DEFAULT_CELL_WIDTH;
    
    return (
      <div
        key={`col-${col}`}
        className="bg-muted border-r border-b border-border flex items-center justify-center text-xs font-medium text-muted-foreground"
        style={{ width: cellWidth, height: HEADER_HEIGHT }}
      >
        {colLabel}
      </div>
    );
  };

  const renderCornerCell = () => (
    <div
      className="bg-muted border-r border-b border-border"
      style={{ width: HEADER_WIDTH, height: HEADER_HEIGHT }}
    />
  );

  return (
    <div 
      className={cn("flex-1 overflow-auto bg-background", className)}
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      <div className="relative">
        {/* Corner cell */}
        <div className="absolute top-0 left-0 z-30">
          {renderCornerCell()}
        </div>
        
        {/* Frozen column headers */}
        <div className="absolute top-0 left-0 z-20 flex" style={{ marginLeft: HEADER_WIDTH }}>
          {Array.from({ length: frozenCols }, (_, col) => renderColumnHeader(col))}
        </div>
        
        {/* Frozen row headers */}
        <div className="absolute top-0 left-0 z-20 flex flex-col" style={{ marginTop: HEADER_HEIGHT }}>
          {Array.from({ length: frozenRows }, (_, row) => renderRowHeader(row))}
        </div>
        
        {/* Frozen cells */}
        <div className="absolute top-0 left-0 z-10" style={{ marginTop: HEADER_HEIGHT, marginLeft: HEADER_WIDTH }}>
          {Array.from({ length: frozenRows }, (_, row) => (
            <div key={`frozen-row-${row}`} className="flex">
              {Array.from({ length: frozenCols }, (_, col) => renderCell(row, col))}
            </div>
          ))}
        </div>
        
        {/* Scrollable row headers - positioned at the left edge below frozen headers */}
        <div 
          className="absolute left-0 z-10 bg-background" 
          style={{ 
            top: HEADER_HEIGHT + frozenRows * DEFAULT_CELL_HEIGHT,
            width: HEADER_WIDTH
          }}
        >
          {Array.from({ length: visibleRows }, (_, row) => renderRowHeader(row + frozenRows))}
        </div>
        
        {/* Scrollable area */}
        <div className="relative" style={{ 
          marginTop: HEADER_HEIGHT + frozenRows * DEFAULT_CELL_HEIGHT, 
          marginLeft: HEADER_WIDTH + frozenCols * DEFAULT_CELL_WIDTH 
        }}>
          {/* Scrollable column headers */}
          <div className="sticky top-0 z-10 flex bg-background">
            {Array.from({ length: visibleCols }, (_, col) => renderColumnHeader(col + frozenCols))}
          </div>
          
          {/* Data cells - no row headers here, just pure data */}
          <div>
            {Array.from({ length: visibleRows }, (_, row) => (
              <div key={`row-${row + frozenRows}`} className="flex">
                {Array.from({ length: visibleCols }, (_, col) => renderCell(row + frozenRows, col + frozenCols))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
