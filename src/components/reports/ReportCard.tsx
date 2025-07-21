
import { Calendar, Clock, Trash2, Copy, Edit, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Report } from "@/hooks/useReports";

interface ReportCardProps {
  report: Report;
  onEdit: (report: Report) => void;
  onDelete: (id: string) => void;
  onDuplicate: (report: Report) => void;
}

export const ReportCard = ({ report, onEdit, onDelete, onDuplicate }: ReportCardProps) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published':
        return 'text-green-600';
      case 'draft':
        return 'text-yellow-600';
      case 'archived':
        return 'text-gray-600';
      default:
        return 'text-gray-600';
    }
  };

  const componentCount = report.content?.components?.length || 0;

  return (
    <Card 
      className="cursor-pointer hover:border-primary/50 transition-all duration-300 group overflow-hidden"
      onClick={() => onEdit(report)}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-base group-hover:text-primary transition-colors line-clamp-1">
              {report.title}
            </CardTitle>
            <CardDescription className="text-sm">
              {componentCount} component{componentCount !== 1 ? 's' : ''} • {report.report_type}
            </CardDescription>
          </div>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-primary"
              onClick={(e) => {
                e.stopPropagation();
                onDuplicate(report);
              }}
            >
              <Copy className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-destructive"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(report.id);
              }}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Calendar className="w-3 h-3" />
            Created {formatDate(report.created_at)}
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="w-3 h-3" />
            Modified {formatDate(report.updated_at)}
          </div>
          <div className="flex items-center justify-between">
            <span className={`text-xs font-medium ${getStatusColor(report.status)}`}>
              {report.status.charAt(0).toUpperCase() + report.status.slice(1)}
            </span>
          </div>
        </div>
        
        {/* Visual preview */}
        <div className="mt-3 pt-3 border-t border-border/50 overflow-hidden">
          <div className="grid grid-cols-4 gap-1">
            {Array.from({ length: Math.min(8, componentCount) }).map((_, i) => (
              <div 
                key={i}
                className="h-4 bg-gradient-to-br from-primary/10 to-primary/5 rounded border border-primary/20 shrink-0"
              />
            ))}
            {componentCount > 8 && (
              <div className="h-4 bg-muted rounded flex items-center justify-center shrink-0">
                <span className="text-xs text-muted-foreground">+{componentCount - 8}</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
