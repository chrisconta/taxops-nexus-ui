import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { parseStringPromise } from 'xml2js';

export interface FileColumn {
  name: string;
  type: string;
  sampleValues: string[];
}

export interface ParsedFileData {
  columns: FileColumn[];
  rows: any[];
  totalRows: number;
  previewRows: any[];
}

export interface ParseResult {
  success: boolean;
  data?: ParsedFileData;
  error?: string;
}

// Core transaction table fields that are always available
export const CORE_TRANSACTION_FIELDS = [
  { value: 'effective_at', label: 'Effective Date', required: true },
  { value: 'posted_at', label: 'Posted Date', required: true },
  { value: 'amount_cents', label: 'Amount', required: true },
  { value: 'counterparty', label: 'Counterparty', required: false },
  { value: 'description', label: 'Description', required: false },
  { value: 'note', label: 'Note', required: false },
  { value: 'status', label: 'Status', required: false },
  { value: 'connection_code', label: 'Connection Code', required: false },
  { value: 'transaction_type', label: 'Transaction Type', required: false }
];

// Mercury-specific fields for detail table
export const MERCURY_DETAIL_FIELDS = [
  { value: 'category_code', label: 'Category Code', required: false },
  { value: 'merchant_name', label: 'Merchant Name', required: false },
  { value: 'account_number', label: 'Account Number', required: false }
];

// Get available fields based on connection type
export const getAvailableFields = (connectionType: string) => {
  let fields = [...CORE_TRANSACTION_FIELDS];
  
  if (connectionType === 'mercury') {
    fields = [...fields, ...MERCURY_DETAIL_FIELDS];
  }
  
  return fields;
};

// Detect date format from sample values
const detectDateFormat = (sampleValues: string[]): string => {
  const formats = [
    'YYYY-MM-DD',
    'MM/DD/YYYY',
    'DD/MM/YYYY',
    'YYYY/MM/DD',
    'MM-DD-YYYY',
    'DD-MM-YYYY'
  ];
  
  // Simple heuristic - return most common format
  return 'YYYY-MM-DD'; // Default to ISO format
};

// Detect column type from sample values
const detectColumnType = (sampleValues: string[]): string => {
  if (sampleValues.length === 0) return 'text';
  
  // Check for dates
  const dateRegex = /^\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}\/\d{4}|\d{1,2}-\d{1,2}-\d{4}/;
  if (sampleValues.some(val => dateRegex.test(val))) {
    return 'date';
  }
  
  // Check for numbers
  const numericValues = sampleValues.filter(val => !isNaN(Number(val.replace(/[,$]/g, ''))));
  if (numericValues.length > sampleValues.length * 0.7) {
    return 'number';
  }
  
  return 'text';
};

// Parse XLSX files
export const parseXLSXFile = async (file: File): Promise<ParseResult> => {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    
    // Get first sheet
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Convert to JSON
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    
    if (jsonData.length === 0) {
      return { success: false, error: 'File is empty' };
    }
    
    // First row should be headers
    const headers = jsonData[0] as string[];
    const rows = jsonData.slice(1);
    
    // Create column definitions
    const columns: FileColumn[] = headers.map((header, index) => {
      const sampleValues = rows
        .slice(0, 10) // First 10 rows for sampling
        .map(row => (row as any[])[index])
        .filter(val => val !== undefined && val !== null && val !== '')
        .map(val => String(val));
      
      return {
        name: header,
        type: detectColumnType(sampleValues),
        sampleValues: sampleValues.slice(0, 5) // Keep first 5 samples
      };
    });
    
    return {
      success: true,
      data: {
        columns,
        rows,
        totalRows: rows.length,
        previewRows: rows.slice(0, 5)
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to parse XLSX file'
    };
  }
};

// Parse CSV files
export const parseCSVFile = async (file: File): Promise<ParseResult> => {
  return new Promise((resolve) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          if (results.errors.length > 0) {
            resolve({
              success: false,
              error: results.errors[0].message
            });
            return;
          }
          
          if (results.data.length === 0) {
            resolve({ success: false, error: 'File is empty' });
            return;
          }
          
          // Get column names from first row
          const headers = results.meta.fields || [];
          const rows = results.data;
          
          // Create column definitions
          const columns: FileColumn[] = headers.map(header => {
            const sampleValues = rows
              .slice(0, 10)
              .map(row => (row as any)[header])
              .filter(val => val !== undefined && val !== null && val !== '')
              .map(val => String(val));
            
            return {
              name: header,
              type: detectColumnType(sampleValues),
              sampleValues: sampleValues.slice(0, 5)
            };
          });
          
          resolve({
            success: true,
            data: {
              columns,
              rows,
              totalRows: rows.length,
              previewRows: rows.slice(0, 5)
            }
          });
        } catch (error) {
          resolve({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to parse CSV file'
          });
        }
      },
      error: (error) => {
        resolve({
          success: false,
          error: error.message
        });
      }
    });
  });
};

// Parse TXT files (assuming CSV format)
export const parseTXTFile = async (file: File): Promise<ParseResult> => {
  return parseCSVFile(file);
};

// Parse XML files
export const parseXMLFile = async (file: File): Promise<ParseResult> => {
  try {
    const text = await file.text();
    const result = await parseStringPromise(text);
    
    // Extract structure from XML
    // This is a simplified approach - may need to be more sophisticated
    const extractColumnsFromXML = (obj: any, prefix = ''): FileColumn[] => {
      const columns: FileColumn[] = [];
      
      if (Array.isArray(obj)) {
        if (obj.length > 0) {
          return extractColumnsFromXML(obj[0], prefix);
        }
        return columns;
      }
      
      if (typeof obj === 'object' && obj !== null) {
        for (const [key, value] of Object.entries(obj)) {
          const columnName = prefix ? `${prefix}.${key}` : key;
          
          if (Array.isArray(value)) {
            if (value.length > 0 && typeof value[0] === 'object') {
              columns.push(...extractColumnsFromXML(value[0], columnName));
            } else {
              columns.push({
                name: columnName,
                type: 'text',
                sampleValues: value.slice(0, 5).map(String)
              });
            }
          } else if (typeof value === 'object' && value !== null) {
            columns.push(...extractColumnsFromXML(value, columnName));
          } else {
            columns.push({
              name: columnName,
              type: detectColumnType([String(value)]),
              sampleValues: [String(value)]
            });
          }
        }
      }
      
      return columns;
    };
    
    const columns = extractColumnsFromXML(result);
    
    return {
      success: true,
      data: {
        columns,
        rows: [result], // XML typically represents one complex object
        totalRows: 1,
        previewRows: [result]
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to parse XML file'
    };
  }
};

// Main parser function
export const parseFile = async (file: File): Promise<ParseResult> => {
  const type = file.type;
  
  if (type.includes('spreadsheet') || type.includes('excel')) {
    return parseXLSXFile(file);
  } else if (type === 'text/csv') {
    return parseCSVFile(file);
  } else if (type === 'text/plain') {
    return parseTXTFile(file);
  } else if (type.includes('xml')) {
    return parseXMLFile(file);
  }
  
  return {
    success: false,
    error: 'Unsupported file type'
  };
};

// Convert amount to cents
export const convertAmountToCents = (amount: string | number): number => {
  if (typeof amount === 'number') {
    return Math.round(amount * 100);
  }
  
  // Remove currency symbols and commas
  const cleanAmount = amount.replace(/[$,]/g, '');
  const numericAmount = parseFloat(cleanAmount);
  
  if (isNaN(numericAmount)) {
    return 0;
  }
  
  return Math.round(numericAmount * 100);
};

// Validate required mappings
export const validateMappings = (mappings: Record<string, string>, connectionType: string): string[] => {
  const errors: string[] = [];
  const availableFields = getAvailableFields(connectionType);
  const requiredFields = availableFields.filter(field => field.required);
  
  // Check if all required fields are mapped
  const mappedFields = Object.values(mappings);
  
  for (const requiredField of requiredFields) {
    if (!mappedFields.includes(requiredField.value)) {
      errors.push(`${requiredField.label} is required and must be mapped`);
    }
  }
  
  return errors;
};