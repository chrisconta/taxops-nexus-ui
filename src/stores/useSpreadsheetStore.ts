
import { create } from 'zustand';

export interface CellData {
  value: string;
  formula?: string;
  dataSource?: string;
  dataBinding?: {
    source: string;
    column: string;
    range: string;
  };
}

export interface SheetDefinition {
  id: string;
  name: string;
  cells: Record<string, CellData>; // e.g., "A1": { value: "123", formula: "=B1+C1" }
  frozenRows: number;
  frozenCols: number;
  columnWidths: Record<string, number>; // e.g., "A": 120
  rowHeights: Record<string, number>; // e.g., "1": 25
}

export interface SpreadsheetState {
  sheets: Record<string, SheetDefinition>;
  activeSheet: string;
  selectedCell: string | null;
  selectedRange: string | null;
  isEditing: boolean;
  editingValue: string;
}

interface SpreadsheetActions {
  // Sheet management
  addSheet: (name?: string) => void;
  removeSheet: (sheetId: string) => void;
  renameSheet: (sheetId: string, newName: string) => void;
  setActiveSheet: (sheetId: string) => void;
  
  // Cell operations
  setCellValue: (cellId: string, value: string, formula?: string) => void;
  setCellDataBinding: (cellId: string, binding: CellData['dataBinding']) => void;
  setSelectedCell: (cellId: string | null) => void;
  setSelectedRange: (range: string | null) => void;
  
  // Editing
  startEditing: (cellId: string, initialValue?: string) => void;
  updateEditingValue: (value: string) => void;
  commitEdit: () => void;
  cancelEdit: () => void;
  
  // Layout
  setColumnWidth: (column: string, width: number) => void;
  setRowHeight: (row: string, height: number) => void;
  setFrozenRows: (count: number) => void;
  setFrozenCols: (count: number) => void;
}

export const useSpreadsheetStore = create<SpreadsheetState & SpreadsheetActions>((set, get) => ({
  // Initial state
  sheets: {
    'sheet1': {
      id: 'sheet1',
      name: 'Sheet1',
      cells: {},
      frozenRows: 1,
      frozenCols: 1,
      columnWidths: {},
      rowHeights: {},
    }
  },
  activeSheet: 'sheet1',
  selectedCell: null,
  selectedRange: null,
  isEditing: false,
  editingValue: '',

  // Sheet management actions
  addSheet: (name) => {
    const sheets = get().sheets;
    const sheetCount = Object.keys(sheets).length;
    const newSheetId = `sheet${sheetCount + 1}`;
    const newSheetName = name || `Sheet${sheetCount + 1}`;
    
    set({
      sheets: {
        ...sheets,
        [newSheetId]: {
          id: newSheetId,
          name: newSheetName,
          cells: {},
          frozenRows: 1,
          frozenCols: 1,
          columnWidths: {},
          rowHeights: {},
        }
      },
      activeSheet: newSheetId,
    });
  },

  removeSheet: (sheetId) => {
    const { sheets, activeSheet } = get();
    const remainingSheets = { ...sheets };
    delete remainingSheets[sheetId];
    
    const newActiveSheet = activeSheet === sheetId 
      ? Object.keys(remainingSheets)[0] 
      : activeSheet;
    
    set({
      sheets: remainingSheets,
      activeSheet: newActiveSheet,
    });
  },

  renameSheet: (sheetId, newName) => {
    const sheets = get().sheets;
    set({
      sheets: {
        ...sheets,
        [sheetId]: {
          ...sheets[sheetId],
          name: newName,
        }
      }
    });
  },

  setActiveSheet: (sheetId) => {
    set({ activeSheet: sheetId, selectedCell: null, selectedRange: null });
  },

  // Cell operations
  setCellValue: (cellId, value, formula) => {
    const { sheets, activeSheet } = get();
    const currentSheet = sheets[activeSheet];
    
    set({
      sheets: {
        ...sheets,
        [activeSheet]: {
          ...currentSheet,
          cells: {
            ...currentSheet.cells,
            [cellId]: {
              ...currentSheet.cells[cellId],
              value,
              formula,
            }
          }
        }
      }
    });
  },

  setCellDataBinding: (cellId, binding) => {
    const { sheets, activeSheet } = get();
    const currentSheet = sheets[activeSheet];
    
    set({
      sheets: {
        ...sheets,
        [activeSheet]: {
          ...currentSheet,
          cells: {
            ...currentSheet.cells,
            [cellId]: {
              ...currentSheet.cells[cellId],
              dataBinding: binding,
            }
          }
        }
      }
    });
  },

  setSelectedCell: (cellId) => {
    set({ selectedCell: cellId, selectedRange: null });
  },

  setSelectedRange: (range) => {
    set({ selectedRange: range, selectedCell: null });
  },

  // Editing actions
  startEditing: (cellId, initialValue) => {
    const { sheets, activeSheet } = get();
    const currentCell = sheets[activeSheet]?.cells[cellId];
    
    set({
      selectedCell: cellId,
      isEditing: true,
      editingValue: initialValue || currentCell?.formula || currentCell?.value || '',
    });
  },

  updateEditingValue: (value) => {
    set({ editingValue: value });
  },

  commitEdit: () => {
    const { selectedCell, editingValue, setCellValue } = get();
    if (selectedCell) {
      const isFormula = editingValue.startsWith('=');
      setCellValue(selectedCell, editingValue, isFormula ? editingValue : undefined);
    }
    set({ isEditing: false, editingValue: '' });
  },

  cancelEdit: () => {
    set({ isEditing: false, editingValue: '' });
  },

  // Layout actions
  setColumnWidth: (column, width) => {
    const { sheets, activeSheet } = get();
    const currentSheet = sheets[activeSheet];
    
    set({
      sheets: {
        ...sheets,
        [activeSheet]: {
          ...currentSheet,
          columnWidths: {
            ...currentSheet.columnWidths,
            [column]: width,
          }
        }
      }
    });
  },

  setRowHeight: (row, height) => {
    const { sheets, activeSheet } = get();
    const currentSheet = sheets[activeSheet];
    
    set({
      sheets: {
        ...sheets,
        [activeSheet]: {
          ...currentSheet,
          rowHeights: {
            ...currentSheet.rowHeights,
            [row]: height,
          }
        }
      }
    });
  },

  setFrozenRows: (count) => {
    const { sheets, activeSheet } = get();
    const currentSheet = sheets[activeSheet];
    
    set({
      sheets: {
        ...sheets,
        [activeSheet]: {
          ...currentSheet,
          frozenRows: count,
        }
      }
    });
  },

  setFrozenCols: (count) => {
    const { sheets, activeSheet } = get();
    const currentSheet = sheets[activeSheet];
    
    set({
      sheets: {
        ...sheets,
        [activeSheet]: {
          ...currentSheet,
          frozenCols: count,
        }
      }
    });
  },
}));
