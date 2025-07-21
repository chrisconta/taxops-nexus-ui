
import { useState } from "react";
import { Plus, FileText, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useReports, Report, ReportTemplate } from "@/hooks/useReports";
import { reportTemplates } from "@/utils/reportTemplates";
import { ReportCard } from "./ReportCard";
import { ReportTemplateCard } from "./ReportTemplateCard";

interface ReportsHomeProps {
  onCreateReport: (title: string, type: string, content?: any) => void;
  onEditReport: (report: Report) => void;
}

export const ReportsHome = ({ onCreateReport, onEditReport }: ReportsHomeProps) => {
  const { reports, loading, deleteReport, duplicateReport } = useReports();
  const [isCreating, setIsCreating] = useState(false);

  const handleCreateFromTemplate = async (template: ReportTemplate) => {
    setIsCreating(true);
    try {
      await onCreateReport(`New ${template.name}`, template.type, template.content);
    } finally {
      setIsCreating(false);
    }
  };

  const handleCreateBlank = async () => {
    setIsCreating(true);
    try {
      await onCreateReport("New Report", "custom", {
        activeView: 'table',
        components: []
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleDuplicate = async (report: Report) => {
    const duplicated = await duplicateReport(report);
    if (duplicated) {
      onEditReport({
        ...duplicated,
        status: duplicated.status as 'draft' | 'published' | 'archived'
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading reports...</p>
        </div>
      </div>
    );
  }

  // Show welcome screen when no reports exist
  if (reports.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center max-w-md">
          <div className="w-24 h-24 bg-gradient-to-br from-primary/10 to-primary/5 rounded-3xl flex items-center justify-center mx-auto mb-6">
            <FileText className="w-12 h-12 text-primary/50" />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-3">Create Your First Report</h2>
          <p className="text-muted-foreground mb-6">
            Build powerful data reports with interactive tables, charts, and metrics. 
            Start from a template or create a custom report from scratch.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button onClick={handleCreateBlank} size="lg" className="gap-2" disabled={isCreating}>
              <Plus className="w-5 h-5" />
              Create Blank Report
            </Button>
            <Button onClick={() => handleCreateFromTemplate(reportTemplates[0])} variant="outline" size="lg" className="gap-2" disabled={isCreating}>
              <Sparkles className="w-5 h-5" />
              Use Template
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Show reports grid when reports exist
  return (
    <div className="space-y-8 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Reports</h1>
          <p className="text-muted-foreground">
            {reports.length} report{reports.length !== 1 ? 's' : ''} created
          </p>
        </div>
        <Button onClick={handleCreateBlank} className="gap-2" disabled={isCreating}>
          <Plus className="w-5 h-5" />
          Create New Report
        </Button>
      </div>

      {/* Templates Section */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-semibold">Report Templates</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {reportTemplates.map((template) => (
            <ReportTemplateCard
              key={template.id}
              template={template}
              onSelect={handleCreateFromTemplate}
            />
          ))}
        </div>
      </div>

      <Separator />

      {/* User Reports Section */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <FileText className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-semibold">My Reports</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {reports.map((report) => (
            <ReportCard
              key={report.id}
              report={report}
              onEdit={onEditReport}
              onDelete={deleteReport}
              onDuplicate={handleDuplicate}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
