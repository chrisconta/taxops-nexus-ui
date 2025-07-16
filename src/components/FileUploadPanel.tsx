import React, { useState, useCallback, useRef } from 'react';
import { Upload, X, File, FileText, FileSpreadsheet, FileX } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export interface UploadedFile {
  id: string;
  file: File;
  name: string;
  size: number;
  type: string;
  columns: string[];
  progress: number;
  status: 'pending' | 'processing' | 'complete' | 'error';
  error?: string;
}

interface FileUploadPanelProps {
  onFilesUploaded: (files: UploadedFile[]) => void;
  onFileRemoved: (fileId: string) => void;
  uploadedFiles: UploadedFile[];
  maxFiles?: number;
  maxFileSize?: number; // in MB
}

const ACCEPTED_FILE_TYPES = [
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
  'application/vnd.ms-excel', // .xls
  'text/csv', // .csv
  'text/plain', // .txt
  'application/xml', // .xml
  'text/xml' // .xml
];

const MAX_FILE_SIZES = {
  'text/csv': 10 * 1024 * 1024, // 10MB
  'text/plain': 10 * 1024 * 1024, // 10MB
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 20 * 1024 * 1024, // 20MB
  'application/vnd.ms-excel': 20 * 1024 * 1024, // 20MB
  'application/xml': 5 * 1024 * 1024, // 5MB
  'text/xml': 5 * 1024 * 1024 // 5MB
};

const FileUploadPanel: React.FC<FileUploadPanelProps> = ({
  onFilesUploaded,
  onFileRemoved,
  uploadedFiles,
  maxFiles = 5
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getFileIcon = (type: string) => {
    if (type.includes('spreadsheet') || type.includes('excel')) {
      return <FileSpreadsheet className="h-4 w-4" />;
    }
    if (type.includes('csv') || type.includes('plain')) {
      return <FileText className="h-4 w-4" />;
    }
    if (type.includes('xml')) {
      return <FileX className="h-4 w-4" />;
    }
    return <File className="h-4 w-4" />;
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const validateFile = (file: File): string | null => {
    if (!ACCEPTED_FILE_TYPES.includes(file.type)) {
      return 'File type not supported. Please upload XML, XLSX, CSV, or TXT files.';
    }

    const maxSize = MAX_FILE_SIZES[file.type as keyof typeof MAX_FILE_SIZES];
    if (file.size > maxSize) {
      return `File size exceeds limit of ${formatFileSize(maxSize)}`;
    }

    return null;
  };

  const processFiles = useCallback(async (files: FileList) => {
    const validFiles: UploadedFile[] = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const validationError = validateFile(file);
      
      if (validationError) {
        // Show error for invalid files
        continue;
      }

      if (uploadedFiles.length + validFiles.length >= maxFiles) {
        break;
      }

      const uploadedFile: UploadedFile = {
        id: `${Date.now()}-${i}`,
        file,
        name: file.name,
        size: file.size,
        type: file.type,
        columns: [],
        progress: 0,
        status: 'pending'
      };

      validFiles.push(uploadedFile);
    }

    if (validFiles.length > 0) {
      onFilesUploaded(validFiles);
    }
  }, [uploadedFiles.length, maxFiles, onFilesUploaded]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      processFiles(files);
    }
  }, [processFiles]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processFiles(files);
    }
    // Reset input value to allow selecting the same file again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [processFiles]);

  const handleBrowseClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-4">
      {/* Drag and Drop Zone */}
      <Card 
        className={cn(
          "border-2 border-dashed transition-colors cursor-pointer",
          isDragOver ? "border-primary bg-primary/5" : "border-muted-foreground/25",
          uploadedFiles.length >= maxFiles && "opacity-50 pointer-events-none"
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleBrowseClick}
      >
        <CardContent className="flex flex-col items-center justify-center py-8 text-center">
          <Upload className="h-8 w-8 mb-4 text-muted-foreground" />
          <p className="text-sm font-medium mb-2">
            Drag and drop files here, or click to browse
          </p>
          <p className="text-xs text-muted-foreground mb-4">
            Supports XML, XLSX, CSV, and TXT files
          </p>
          <div className="flex flex-wrap gap-2 justify-center text-xs text-muted-foreground">
            <Badge variant="outline">CSV ≤ 10MB</Badge>
            <Badge variant="outline">TXT ≤ 10MB</Badge>
            <Badge variant="outline">XLSX ≤ 20MB</Badge>
            <Badge variant="outline">XML ≤ 5MB</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".xml,.xlsx,.xls,.csv,.txt"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* File List */}
      {uploadedFiles.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Uploaded Files ({uploadedFiles.length}/{maxFiles})</h4>
          {uploadedFiles.map((file) => (
            <Card key={file.id} className="p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1">
                  {getFileIcon(file.type)}
                  <div className="flex-1">
                    <p className="text-sm font-medium">{file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(file.size)}
                      {file.columns.length > 0 && ` • ${file.columns.length} columns`}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Badge variant={
                    file.status === 'complete' ? 'default' :
                    file.status === 'error' ? 'destructive' :
                    file.status === 'processing' ? 'secondary' : 'outline'
                  }>
                    {file.status}
                  </Badge>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onFileRemoved(file.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              {file.status === 'processing' && (
                <div className="mt-2">
                  <Progress value={file.progress} className="h-2" />
                </div>
              )}
              
              {file.status === 'error' && file.error && (
                <p className="text-xs text-destructive mt-1">{file.error}</p>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default FileUploadPanel;