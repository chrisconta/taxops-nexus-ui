import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { FileText, Upload, Download, Trash2, Calendar } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface TaxReport {
  id: string;
  file_name: string;
  original_filename: string;
  storage_path: string;
  file_size: number;
  tax_year: number | null;
  description: string | null;
  created_at: string;
}

export const TaxReportManager = () => {
  const [taxReports, setTaxReports] = useState<TaxReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [taxYear, setTaxYear] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const { toast } = useToast();

  useEffect(() => {
    fetchTaxReports();
  }, []);

  const fetchTaxReports = async () => {
    try {
      const { data, error } = await supabase
        .from('tax_reports')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTaxReports(data || []);
    } catch (error) {
      console.error('Error fetching tax reports:', error);
      toast({
        title: "Error",
        description: "Failed to load tax reports",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      const allowedTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel'
      ];
      
      if (!allowedTypes.includes(file.type)) {
        toast({
          title: "Invalid file type",
          description: "Please select an Excel file (.xlsx or .xls)",
          variant: "destructive",
        });
        return;
      }

      // Validate file size (50MB limit)
      if (file.size > 50 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "File size must be less than 50MB",
          variant: "destructive",
        });
        return;
      }

      setSelectedFile(file);
      
      // Try to extract year from filename
      const yearMatch = file.name.match(/20\d{2}/);
      if (yearMatch) {
        setTaxYear(yearMatch[0]);
      }
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');

      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${Date.now()}_${selectedFile.name}`;
      const filePath = `${user.user.id}/${fileName}`;

      // Upload file to storage
      const { error: uploadError } = await supabase.storage
        .from('tax-reports')
        .upload(filePath, selectedFile);

      if (uploadError) throw uploadError;

      // Save metadata to database
      const { error: dbError } = await supabase
        .from('tax_reports')
        .insert({
          user_id: user.user.id,
          file_name: fileName,
          original_filename: selectedFile.name,
          storage_path: filePath,
          file_size: selectedFile.size,
          tax_year: taxYear ? parseInt(taxYear) : null,
          description: description || null,
        });

      if (dbError) throw dbError;

      toast({
        title: "Success",
        description: "Tax report uploaded successfully",
      });

      // Reset form and refresh list
      setSelectedFile(null);
      setTaxYear('');
      setDescription('');
      setUploadModalOpen(false);
      fetchTaxReports();
    } catch (error) {
      console.error('Error uploading tax report:', error);
      toast({
        title: "Error",
        description: "Failed to upload tax report",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDownload = async (report: TaxReport) => {
    try {
      const { data, error } = await supabase.storage
        .from('tax-reports')
        .download(report.storage_path);

      if (error) throw error;

      // Create download link
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = report.original_filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Success",
        description: "Tax report downloaded successfully",
      });
    } catch (error) {
      console.error('Error downloading tax report:', error);
      toast({
        title: "Error",
        description: "Failed to download tax report",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (report: TaxReport) => {
    if (!confirm('Are you sure you want to delete this tax report?')) return;

    try {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('tax-reports')
        .remove([report.storage_path]);

      if (storageError) throw storageError;

      // Delete from database
      const { error: dbError } = await supabase
        .from('tax_reports')
        .delete()
        .eq('id', report.id);

      if (dbError) throw dbError;

      toast({
        title: "Success",
        description: "Tax report deleted successfully",
      });

      fetchTaxReports();
    } catch (error) {
      console.error('Error deleting tax report:', error);
      toast({
        title: "Error",
        description: "Failed to delete tax report",
        variant: "destructive",
      });
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Tax Reports</CardTitle>
          <CardDescription>Loading tax reports...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Tax Reports
          </CardTitle>
          <CardDescription>
            Upload and manage your tax documents. These files will be accessible to the AI assistant when requested.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between items-center mb-4">
            <div className="text-sm text-muted-foreground">
              {taxReports.length} tax report{taxReports.length !== 1 ? 's' : ''} uploaded
            </div>
            <Dialog open={uploadModalOpen} onOpenChange={setUploadModalOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Tax Report
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Upload Tax Report</DialogTitle>
                  <DialogDescription>
                    Upload an Excel spreadsheet containing your tax information.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="file">Select Excel File</Label>
                    <Input
                      id="file"
                      type="file"
                      accept=".xlsx,.xls"
                      onChange={handleFileSelect}
                      className="mt-1"
                    />
                    {selectedFile && (
                      <p className="text-sm text-muted-foreground mt-1">
                        Selected: {selectedFile.name} ({formatFileSize(selectedFile.size)})
                      </p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="taxYear">Tax Year (Optional)</Label>
                    <Input
                      id="taxYear"
                      type="number"
                      placeholder="e.g., 2023"
                      value={taxYear}
                      onChange={(e) => setTaxYear(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="description">Description (Optional)</Label>
                    <Textarea
                      id="description"
                      placeholder="Brief description of this tax report..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setUploadModalOpen(false)}>
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleUpload} 
                      disabled={!selectedFile || isUploading}
                    >
                      {isUploading ? 'Uploading...' : 'Upload'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {taxReports.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No tax reports uploaded yet.</p>
              <p className="text-sm">Upload your first tax document to get started.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>File Name</TableHead>
                  <TableHead>Tax Year</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Upload Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {taxReports.map((report) => (
                  <TableRow key={report.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{report.original_filename}</p>
                        {report.description && (
                          <p className="text-sm text-muted-foreground">{report.description}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {report.tax_year ? (
                        <Badge variant="secondary">
                          <Calendar className="h-3 w-3 mr-1" />
                          {report.tax_year}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>{formatFileSize(report.file_size)}</TableCell>
                    <TableCell>{formatDate(report.created_at)}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownload(report)}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(report)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};