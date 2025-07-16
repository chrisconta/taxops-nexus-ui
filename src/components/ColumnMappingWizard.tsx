import React, { useState, useEffect } from 'react';
import { ArrowRight, Plus, AlertCircle, CheckCircle, Info } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { UploadedFile } from './FileUploadPanel';
import { FileColumn, getAvailableFields, validateMappings } from '@/lib/fileProcessing';
import { useToast } from '@/hooks/use-toast';

export interface ColumnMapping {
  fileColumn: string;
  targetField: string;
  isNewColumn?: boolean;
  newColumnName?: string;
  newColumnType?: string;
}

interface ColumnMappingWizardProps {
  files: UploadedFile[];
  connectionType: string;
  onMappingComplete: (mappings: Record<string, ColumnMapping[]>) => void;
  onBack: () => void;
  existingMappings?: Record<string, ColumnMapping[]>;
}

const ColumnMappingWizard: React.FC<ColumnMappingWizardProps> = ({
  files,
  connectionType,
  onMappingComplete,
  onBack,
  existingMappings = {}
}) => {
  const [mappings, setMappings] = useState<Record<string, ColumnMapping[]>>(existingMappings);
  const [selectedFile, setSelectedFile] = useState<UploadedFile | null>(files[0] || null);
  const [newColumnDialog, setNewColumnDialog] = useState(false);
  const [newColumnName, setNewColumnName] = useState('');
  const [newColumnType, setNewColumnType] = useState('text');
  const [pendingMapping, setPendingMapping] = useState<{ fileId: string; columnName: string } | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const { toast } = useToast();

  const availableFields = getAvailableFields(connectionType);
  const requiredFields = availableFields.filter(field => field.required);

  useEffect(() => {
    if (selectedFile) {
      validateCurrentMappings();
    }
  }, [mappings, selectedFile]);

  const validateCurrentMappings = () => {
    if (!selectedFile) return;
    
    const currentMappings = mappings[selectedFile.id] || [];
    const fieldMappings: Record<string, string> = {};
    
    currentMappings.forEach(mapping => {
      fieldMappings[mapping.fileColumn] = mapping.targetField;
    });
    
    const errors = validateMappings(fieldMappings, connectionType);
    setValidationErrors(errors);
  };

  const handleMappingChange = (fileColumn: string, targetField: string) => {
    if (!selectedFile) return;

    const currentMappings = mappings[selectedFile.id] || [];
    const existingMappingIndex = currentMappings.findIndex(m => m.fileColumn === fileColumn);
    
    if (targetField === 'create_new') {
      setPendingMapping({ fileId: selectedFile.id, columnName: fileColumn });
      setNewColumnDialog(true);
      return;
    }

    let newMappings = [...currentMappings];
    
    if (existingMappingIndex >= 0) {
      if (targetField === '') {
        // Remove mapping
        newMappings.splice(existingMappingIndex, 1);
      } else {
        // Update mapping
        newMappings[existingMappingIndex] = {
          ...newMappings[existingMappingIndex],
          targetField,
          isNewColumn: false
        };
      }
    } else if (targetField !== '') {
      // Add new mapping
      newMappings.push({
        fileColumn,
        targetField,
        isNewColumn: false
      });
    }

    setMappings(prev => ({
      ...prev,
      [selectedFile.id]: newMappings
    }));
  };

  const handleCreateNewColumn = () => {
    if (!pendingMapping || !newColumnName.trim()) return;

    const currentMappings = mappings[pendingMapping.fileId] || [];
    const newMapping: ColumnMapping = {
      fileColumn: pendingMapping.columnName,
      targetField: `new_${newColumnName.toLowerCase().replace(/\s+/g, '_')}`,
      isNewColumn: true,
      newColumnName: newColumnName.trim(),
      newColumnType: newColumnType
    };

    const newMappings = [...currentMappings.filter(m => m.fileColumn !== pendingMapping.columnName), newMapping];
    
    setMappings(prev => ({
      ...prev,
      [pendingMapping.fileId]: newMappings
    }));

    // Reset dialog state
    setNewColumnDialog(false);
    setNewColumnName('');
    setNewColumnType('text');
    setPendingMapping(null);

    toast({
      title: "New Column Created",
      description: `Column "${newColumnName}" will be added to the database during import.`
    });
  };

  const getCurrentMapping = (fileColumn: string): string => {
    if (!selectedFile) return '';
    const currentMappings = mappings[selectedFile.id] || [];
    const mapping = currentMappings.find(m => m.fileColumn === fileColumn);
    return mapping?.targetField || '';
  };

  const getUsedFields = (): string[] => {
    if (!selectedFile) return [];
    const currentMappings = mappings[selectedFile.id] || [];
    return currentMappings.map(m => m.targetField);
  };

  const isFieldUsed = (fieldValue: string): boolean => {
    return getUsedFields().includes(fieldValue);
  };

  const canProceed = (): boolean => {
    return files.every(file => {
      const fileMappings = mappings[file.id] || [];
      const fieldMappings: Record<string, string> = {};
      
      fileMappings.forEach(mapping => {
        fieldMappings[mapping.fileColumn] = mapping.targetField;
      });
      
      const errors = validateMappings(fieldMappings, connectionType);
      return errors.length === 0;
    });
  };

  const handleProceed = () => {
    if (canProceed()) {
      onMappingComplete(mappings);
    }
  };

  const getMappingPreview = () => {
    const allMappings = Object.values(mappings).flat();
    const requiredMapped = requiredFields.filter(field => 
      allMappings.some(m => m.targetField === field.value)
    );
    
    return {
      totalMappings: allMappings.length,
      requiredMapped: requiredMapped.length,
      requiredTotal: requiredFields.length,
      newColumns: allMappings.filter(m => m.isNewColumn).length
    };
  };

  const preview = getMappingPreview();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Column Mapping</h3>
          <p className="text-sm text-muted-foreground">
            Map file columns to database fields for import
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline">
            {preview.requiredMapped}/{preview.requiredTotal} required mapped
          </Badge>
          {preview.newColumns > 0 && (
            <Badge variant="secondary">
              {preview.newColumns} new columns
            </Badge>
          )}
        </div>
      </div>

      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-1">
              {validationErrors.map((error, index) => (
                <div key={index}>• {error}</div>
              ))}
            </div>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* File Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Select File</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {files.map((file) => (
              <Button
                key={file.id}
                variant={selectedFile?.id === file.id ? "default" : "outline"}
                className="w-full justify-start text-left"
                onClick={() => setSelectedFile(file)}
              >
                <div className="truncate">
                  <div className="font-medium">{file.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {file.columns.length} columns
                  </div>
                </div>
              </Button>
            ))}
          </CardContent>
        </Card>

        {/* Column Mapping */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm">
              {selectedFile ? `Map columns from ${selectedFile.name}` : 'Select a file to map columns'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedFile ? (
              <div className="space-y-4">
                {selectedFile.columns.map((column) => (
                  <div key={column} className="flex items-center gap-4 p-3 border rounded-lg">
                    <div className="flex-1">
                      <div className="font-medium">{column}</div>
                      <div className="text-xs text-muted-foreground">
                        File column
                      </div>
                    </div>
                    
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    
                    <div className="flex-1">
                      <Select
                        value={getCurrentMapping(column)}
                        onValueChange={(value) => handleMappingChange(column, value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select target field" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">No mapping</SelectItem>
                          <Separator />
                          {availableFields.map((field) => (
                            <SelectItem
                              key={field.value}
                              value={field.value}
                              disabled={isFieldUsed(field.value) && getCurrentMapping(column) !== field.value}
                            >
                              <div className="flex items-center justify-between w-full">
                                <span>{field.label}</span>
                                {field.required && <Badge variant="destructive" className="ml-2 h-4 text-xs">Required</Badge>}
                              </div>
                            </SelectItem>
                          ))}
                          <Separator />
                          <SelectItem value="create_new">
                            <div className="flex items-center gap-2">
                              <Plus className="h-4 w-4" />
                              Create new column
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Info className="h-8 w-8 mx-auto mb-2" />
                <p>Select a file to start mapping columns</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          Back to Files
        </Button>
        
        <Button 
          onClick={handleProceed}
          disabled={!canProceed()}
          className="flex items-center gap-2"
        >
          <CheckCircle className="h-4 w-4" />
          Proceed to Import
        </Button>
      </div>

      {/* New Column Dialog */}
      <Dialog open={newColumnDialog} onOpenChange={setNewColumnDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Column</DialogTitle>
            <DialogDescription>
              Add a new column to the database for this field
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="column-name">Column Name</Label>
              <Input
                id="column-name"
                placeholder="Enter column name"
                value={newColumnName}
                onChange={(e) => setNewColumnName(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="column-type">Column Type</Label>
              <Select value={newColumnType} onValueChange={setNewColumnType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="text">Text</SelectItem>
                  <SelectItem value="number">Number</SelectItem>
                  <SelectItem value="date">Date</SelectItem>
                  <SelectItem value="boolean">Boolean</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setNewColumnDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateNewColumn} disabled={!newColumnName.trim()}>
              Create Column
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ColumnMappingWizard;