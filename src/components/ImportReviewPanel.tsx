import React, { useState } from 'react';
import { FileText, Database, ArrowRight, CheckCircle, AlertCircle, Download, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { UploadedFile } from './FileUploadPanel';
import { ColumnMapping } from './ColumnMappingWizard';
import { getAvailableFields } from '@/lib/fileProcessing';

export interface ImportResult {
  fileId: string;
  fileName: string;
  status: 'success' | 'error' | 'partial';
  recordsInserted: number;
  recordsSkipped: number;
  totalRecords: number;
  errors: ImportError[];
}

export interface ImportError {
  row: number;
  column: string;
  error: string;
  value: string;
}

interface ImportReviewPanelProps {
  files: UploadedFile[];
  mappings: Record<string, ColumnMapping[]>;
  connectionType: string;
  clientIds: string[];
  onImport: () => Promise<ImportResult[]>;
  onBack: () => void;
  importResults?: ImportResult[];
  isImporting?: boolean;
}

const ImportReviewPanel: React.FC<ImportReviewPanelProps> = ({
  files,
  mappings,
  connectionType,
  clientIds,
  onImport,
  onBack,
  importResults,
  isImporting = false
}) => {
  const [showErrorDetails, setShowErrorDetails] = useState<ImportResult | null>(null);
  
  const availableFields = getAvailableFields(connectionType);
  
  const getSummaryStats = () => {
    const totalFiles = files.length;
    const totalMappings = Object.values(mappings).flat().length;
    const newColumns = Object.values(mappings).flat().filter(m => m.isNewColumn).length;
    const totalRows = files.reduce((sum, file) => sum + (file.columns.length > 0 ? 1000 : 0), 0); // Placeholder
    
    return {
      totalFiles,
      totalMappings,
      newColumns,
      totalRows
    };
  };

  const stats = getSummaryStats();

  const getFieldLabel = (fieldValue: string): string => {
    const field = availableFields.find(f => f.value === fieldValue);
    return field?.label || fieldValue;
  };

  const downloadErrorReport = (result: ImportResult) => {
    const csvContent = [
      ['Row', 'Column', 'Error', 'Value'],
      ...result.errors.map(error => [
        error.row,
        error.column,
        error.error,
        error.value
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${result.fileName}_errors.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getOverallProgress = (): number => {
    if (!importResults) return 0;
    
    const totalFiles = files.length;
    const completedFiles = importResults.length;
    
    return (completedFiles / totalFiles) * 100;
  };

  const getOverallStatus = (): 'pending' | 'success' | 'error' | 'partial' => {
    if (!importResults || importResults.length === 0) return 'pending';
    
    const hasErrors = importResults.some(r => r.status === 'error');
    const hasPartial = importResults.some(r => r.status === 'partial');
    
    if (hasErrors) return 'error';
    if (hasPartial) return 'partial';
    return 'success';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Import Review</h3>
          <p className="text-sm text-muted-foreground">
            Review your import configuration and start the import process
          </p>
        </div>
        <Badge variant="outline">
          {clientIds.length} client(s) selected
        </Badge>
      </div>

      {/* Import Progress */}
      {(isImporting || importResults) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {isImporting ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                getOverallStatus() === 'success' ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-red-500" />
                )
              )}
              Import Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Progress value={getOverallProgress()} className="mb-4" />
            <div className="space-y-2">
              {importResults?.map((result) => (
                <div key={result.fileId} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <div className="font-medium">{result.fileName}</div>
                      <div className="text-sm text-muted-foreground">
                        {result.recordsInserted} inserted, {result.recordsSkipped} skipped
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={
                      result.status === 'success' ? 'default' :
                      result.status === 'error' ? 'destructive' : 'secondary'
                    }>
                      {result.status}
                    </Badge>
                    {result.errors.length > 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowErrorDetails(result)}
                      >
                        View Errors ({result.errors.length})
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-primary">{stats.totalFiles}</div>
            <div className="text-sm text-muted-foreground">Files</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-primary">{stats.totalMappings}</div>
            <div className="text-sm text-muted-foreground">Mappings</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-primary">{stats.newColumns}</div>
            <div className="text-sm text-muted-foreground">New Columns</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-primary">{clientIds.length}</div>
            <div className="text-sm text-muted-foreground">Clients</div>
          </CardContent>
        </Card>
      </div>

      {/* File Details */}
      <Card>
        <CardHeader>
          <CardTitle>Files & Mappings</CardTitle>
          <CardDescription>
            Review the column mappings for each file
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {files.map((file) => {
              const fileMappings = mappings[file.id] || [];
              return (
                <div key={file.id} className="border rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-4">
                    <FileText className="h-5 w-5" />
                    <div>
                      <div className="font-medium">{file.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {file.columns.length} columns, {fileMappings.length} mapped
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    {fileMappings.map((mapping) => (
                      <div key={mapping.fileColumn} className="flex items-center gap-4 p-2 bg-muted/50 rounded">
                        <div className="flex-1 font-mono text-sm">{mapping.fileColumn}</div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                        <div className="flex-1 flex items-center gap-2">
                          <span className="text-sm">{getFieldLabel(mapping.targetField)}</span>
                          {mapping.isNewColumn && (
                            <Badge variant="secondary" className="text-xs">New</Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack} disabled={isImporting}>
          Back to Mapping
        </Button>
        
        <Button 
          onClick={onImport}
          disabled={isImporting}
          className="flex items-center gap-2"
        >
          {isImporting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Importing...
            </>
          ) : (
            <>
              <Database className="h-4 w-4" />
              Import Now
            </>
          )}
        </Button>
      </div>

      {/* Error Details Dialog */}
      <Dialog open={!!showErrorDetails} onOpenChange={(open) => !open && setShowErrorDetails(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Import Errors - {showErrorDetails?.fileName}</DialogTitle>
            <DialogDescription>
              {showErrorDetails?.errors.length} error(s) occurred during import
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div className="text-sm text-muted-foreground">
                {showErrorDetails?.recordsInserted} records imported successfully
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => showErrorDetails && downloadErrorReport(showErrorDetails)}
              >
                <Download className="h-4 w-4 mr-2" />
                Download Error Report
              </Button>
            </div>
            
            <div className="max-h-96 overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Row</TableHead>
                    <TableHead>Column</TableHead>
                    <TableHead>Error</TableHead>
                    <TableHead>Value</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {showErrorDetails?.errors.map((error, index) => (
                    <TableRow key={index}>
                      <TableCell>{error.row}</TableCell>
                      <TableCell>{error.column}</TableCell>
                      <TableCell>{error.error}</TableCell>
                      <TableCell className="font-mono text-sm">{error.value}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ImportReviewPanel;