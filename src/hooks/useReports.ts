
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Report {
  id: string;
  title: string;
  report_type: string;
  content: any;
  status: 'draft' | 'published' | 'archived';
  created_at: string;
  updated_at: string;
  user_id: string;
  client_id?: string;
}

export interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  type: string;
  icon: string;
  content: any;
}

export const useReports = () => {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const loadReports = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('reports')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setReports((data || []).map(report => ({
        ...report,
        status: report.status as 'draft' | 'published' | 'archived'
      })));
    } catch (error) {
      console.error('Error loading reports:', error);
      toast({
        title: "Error",
        description: "Failed to load reports",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createReport = async (title: string, type: string, content: any = {}) => {
    try {
      const { data, error } = await supabase
        .from('reports')
        .insert({
          title,
          report_type: type,
          content,
          status: 'draft',
          user_id: (await supabase.auth.getUser()).data.user?.id
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Success",
        description: "Report created successfully",
      });

      await loadReports();
      return data;
    } catch (error) {
      console.error('Error creating report:', error);
      toast({
        title: "Error",
        description: "Failed to create report",
        variant: "destructive",
      });
      return null;
    }
  };

  const updateReport = async (id: string, updates: Partial<Report>) => {
    try {
      const { error } = await supabase
        .from('reports')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Report updated successfully",
      });

      await loadReports();
    } catch (error) {
      console.error('Error updating report:', error);
      toast({
        title: "Error",
        description: "Failed to update report",
        variant: "destructive",
      });
    }
  };

  const deleteReport = async (id: string) => {
    try {
      const { error } = await supabase
        .from('reports')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Report deleted successfully",
      });

      await loadReports();
    } catch (error) {
      console.error('Error deleting report:', error);
      toast({
        title: "Error",
        description: "Failed to delete report",
        variant: "destructive",
      });
    }
  };

  const duplicateReport = async (report: Report) => {
    try {
      const { data, error } = await supabase
        .from('reports')
        .insert({
          title: `${report.title} Copy`,
          report_type: report.report_type,
          content: report.content,
          status: 'draft',
          user_id: (await supabase.auth.getUser()).data.user?.id
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Success",
        description: "Report duplicated successfully",
      });

      await loadReports();
      return data;
    } catch (error) {
      console.error('Error duplicating report:', error);
      toast({
        title: "Error",
        description: "Failed to duplicate report",
        variant: "destructive",
      });
      return null;
    }
  };

  useEffect(() => {
    loadReports();
  }, []);

  return {
    reports,
    loading,
    createReport,
    updateReport,
    deleteReport,
    duplicateReport,
    loadReports,
  };
};
