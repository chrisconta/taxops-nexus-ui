
import { create } from 'zustand';

export interface WorksheetPreview {
  id: string;
  name: string;
  columnHeaders: string[];
  sampleData: string[][]; // First 10 rows
  totalRows: number;
}

export interface ColumnMapping {
  worksheetId: string;
  columnIndex: number;
  columnName: string;
  mappedDataSource: string | null;
}

export interface UploadState {
  isModalOpen: boolean;
  uploadedFile: File | null;
  worksheets: WorksheetPreview[];
  columnMappings: ColumnMapping[];
  isProcessing: boolean;
  error: string | null;
  previewData: any[] | null;
}

interface UploadActions {
  // Modal control
  openModal: () => void;
  closeModal: () => void;
  
  // File upload
  setUploadedFile: (file: File | null) => void;
  processFile: (file: File) => Promise<void>; // TODO: implement file parsing
  
  // Worksheet management
  setWorksheets: (worksheets: WorksheetPreview[]) => void;
  
  // Column mapping
  setColumnMapping: (worksheetId: string, columnIndex: number, dataSource: string | null) => void;
  
  // Processing states
  setProcessing: (isProcessing: boolean) => void;
  setError: (error: string | null) => void;
  setPreviewData: (data: any[] | null) => void;
  
  // Reset
  reset: () => void;
}

export const useUploadStore = create<UploadState & UploadActions>((set, get) => ({
  // Initial state
  isModalOpen: false,
  uploadedFile: null,
  worksheets: [],
  columnMappings: [],
  isProcessing: false,
  error: null,
  previewData: null,

  // Modal control
  openModal: () => set({ isModalOpen: true }),
  closeModal: () => set({ isModalOpen: false }),

  // File upload
  setUploadedFile: (file) => set({ uploadedFile: file }),
  
  processFile: async (file) => {
    set({ isProcessing: true, error: null });
    
    try {
      // TODO: Implement actual file parsing logic
      // For now, create mock data
      const mockWorksheets: WorksheetPreview[] = [
        {
          id: 'sheet1',
          name: 'Financial Data',
          columnHeaders: ['Date', 'Revenue', 'Expenses', 'Profit'],
          sampleData: [
            ['2024-01-01', '10000', '5000', '5000'],
            ['2024-01-02', '12000', '6000', '6000'],
            ['2024-01-03', '8000', '4000', '4000'],
          ],
          totalRows: 365,
        },
        {
          id: 'sheet2',
          name: 'Employee Data',
          columnHeaders: ['Name', 'Department', 'Salary', 'Start Date'],
          sampleData: [
            ['John Doe', 'Engineering', '75000', '2023-01-15'],
            ['Jane Smith', 'Marketing', '65000', '2023-02-01'],
            ['Bob Johnson', 'Sales', '60000', '2023-03-01'],
          ],
          totalRows: 150,
        },
      ];

      set({ worksheets: mockWorksheets });
      
      // Initialize column mappings
      const mappings: ColumnMapping[] = [];
      mockWorksheets.forEach(worksheet => {
        worksheet.columnHeaders.forEach((header, index) => {
          mappings.push({
            worksheetId: worksheet.id,
            columnIndex: index,
            columnName: header,
            mappedDataSource: null,
          });
        });
      });
      
      set({ columnMappings: mappings });
      
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to process file' });
    } finally {
      set({ isProcessing: false });
    }
  },

  // Worksheet management
  setWorksheets: (worksheets) => set({ worksheets }),

  // Column mapping
  setColumnMapping: (worksheetId, columnIndex, dataSource) => {
    const { columnMappings } = get();
    const updatedMappings = columnMappings.map(mapping => {
      if (mapping.worksheetId === worksheetId && mapping.columnIndex === columnIndex) {
        return { ...mapping, mappedDataSource: dataSource };
      }
      return mapping;
    });
    
    set({ columnMappings: updatedMappings });
  },

  // Processing states
  setProcessing: (isProcessing) => set({ isProcessing }),
  setError: (error) => set({ error }),
  setPreviewData: (data) => set({ previewData: data }),

  // Reset
  reset: () => set({
    uploadedFile: null,
    worksheets: [],
    columnMappings: [],
    isProcessing: false,
    error: null,
    previewData: null,
  }),
}));
