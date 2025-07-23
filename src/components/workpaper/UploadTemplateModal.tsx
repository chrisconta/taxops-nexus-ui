
import React, { useState } from 'react';
import { Upload, FileSpreadsheet, X, Check, AlertCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useUploadStore } from '@/stores/useUploadStore';

// Mock data sources for mapping
const AVAILABLE_DATA_SOURCES = [
  { id: 'invoices', name: 'Invoice Data', columns: ['invoice_id', 'customer_id', 'amount', 'date'] },
  { id: 'payments', name: 'Payment Records', columns: ['payment_id', 'amount', 'date', 'method'] },
  { id: 'expenses', name: 'Expense Tracking', columns: ['expense_id', 'category', 'amount', 'date'] },
  { id: 'employees', name: 'Employee Data', columns: ['employee_id', 'name', 'department', 'salary'] },
];

export const UploadTemplateModal: React.FC = () => {
  const {
    isModalOpen,
    uploadedFile,
    worksheets,
    columnMappings,
    isProcessing,
    error,
    closeModal,
    setUploadedFile,
    processFile,
    setColumnMapping,
    reset,
  } = useUploadStore();

  const [dragActive, setDragActive] = useState(false);
  const [uploadStep, setUploadStep] = useState<'upload' | 'mapping' | 'preview'>('upload');

  const handleFileChange = (file: File | null) => {
    if (file) {
      setUploadedFile(file);
      processFile(file);
      setUploadStep('mapping');
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (file.type.includes('spreadsheet') || file.name.endsWith('.xlsx') || file.name.endsWith('.csv')) {
        handleFileChange(file);
      }
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileChange(file);
    }
  };

  const handleMappingChange = (worksheetId: string, columnIndex: number, dataSourceId: string | null) => {
    setColumnMapping(worksheetId, columnIndex, dataSourceId);
  };

  const handleClose = () => {
    reset();
    setUploadStep('upload');
    closeModal();
  };

  const handleConfirmImport = () => {
    // TODO: Implement actual import logic
    console.log('Importing template with mappings:', columnMappings);
    handleClose();
  };

  const renderUploadStep = () => (
    <div className="space-y-6">
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          dragActive 
            ? 'border-primary bg-primary/10' 
            : 'border-muted-foreground/25 hover:border-muted-foreground/50'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <FileSpreadsheet className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium mb-2">Upload Template File</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Drop your Excel or CSV file here, or click to browse
        </p>
        
        <Input
          type="file"
          accept=".xlsx,.xls,.csv"
          onChange={handleInputChange}
          className="hidden"
          id="file-upload"
        />
        <Label htmlFor="file-upload">
          <Button variant="outline" className="cursor-pointer">
            <Upload className="h-4 w-4 mr-2" />
            Choose File
          </Button>
        </Label>
        
        <div className="mt-4 text-xs text-muted-foreground">
          Supported formats: .xlsx, .xls, .csv
        </div>
      </div>

      {uploadedFile && (
        <div className="p-4 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">{uploadedFile.name}</span>
            <Badge variant="outline" className="text-xs">
              {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB
            </Badge>
          </div>
        </div>
      )}
    </div>
  );

  const renderMappingStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-medium mb-2">Map Columns to Data Sources</h3>
        <p className="text-sm text-muted-foreground">
          Select which data source each column should be mapped to
        </p>
      </div>

      <ScrollArea className="h-[400px] pr-4">
        <div className="space-y-6">
          {worksheets.map(worksheet => (
            <div key={worksheet.id} className="border rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <FileSpreadsheet className="h-4 w-4 text-primary" />
                <h4 className="font-medium">{worksheet.name}</h4>
                <Badge variant="outline" className="text-xs">
                  {worksheet.totalRows} rows
                </Badge>
              </div>
              
              <div className="space-y-3">
                {worksheet.columnHeaders.map((header, index) => {
                  const mapping = columnMappings.find(
                    m => m.worksheetId === worksheet.id && m.columnIndex === index
                  );
                  
                  return (
                    <div key={index} className="flex items-center gap-3">
                      <div className="w-32">
                        <Badge variant="secondary" className="text-xs">
                          {header}
                        </Badge>
                      </div>
                      
                      <div className="flex-1">
                        <Select
                          value={mapping?.mappedDataSource || ''}
                          onValueChange={(value) => handleMappingChange(worksheet.id, index, value || null)}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select data source..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">No mapping</SelectItem>
                            {AVAILABLE_DATA_SOURCES.map(source => (
                              <SelectItem key={source.id} value={source.id}>
                                {source.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {mapping?.mappedDataSource ? (
                          <Check className="h-4 w-4 text-green-600" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-yellow-600" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              
              {worksheet.sampleData.length > 0 && (
                <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                  <div className="text-xs font-medium mb-2">Preview (first 3 rows):</div>
                  <div className="space-y-1">
                    {worksheet.sampleData.slice(0, 3).map((row, rowIndex) => (
                      <div key={rowIndex} className="flex gap-2">
                        {row.map((cell, cellIndex) => (
                          <div key={cellIndex} className="text-xs bg-background px-2 py-1 rounded border min-w-[80px] truncate">
                            {cell}
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );

  return (
    <Dialog open={isModalOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Upload Template</DialogTitle>
          <DialogDescription>
            Upload an Excel or CSV template and map columns to your data sources
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="flex-1 overflow-hidden">
          {uploadStep === 'upload' && renderUploadStep()}
          {uploadStep === 'mapping' && renderMappingStep()}
        </div>

        <div className="flex items-center justify-between pt-4 border-t">
          <div className="flex items-center gap-2">
            {uploadStep === 'mapping' && (
              <Button
                variant="outline"
                onClick={() => setUploadStep('upload')}
                disabled={isProcessing}
              >
                Back
              </Button>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleClose} disabled={isProcessing}>
              Cancel
            </Button>
            
            {uploadStep === 'mapping' && (
              <Button onClick={handleConfirmImport} disabled={isProcessing}>
                Import Template
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
