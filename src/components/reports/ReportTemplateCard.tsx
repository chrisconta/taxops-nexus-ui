
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ReportTemplate } from "@/hooks/useReports";
import { getTemplateIcon } from "@/utils/reportTemplates";

interface ReportTemplateCardProps {
  template: ReportTemplate;
  onSelect: (template: ReportTemplate) => void;
}

export const ReportTemplateCard = ({ template, onSelect }: ReportTemplateCardProps) => {
  const Icon = getTemplateIcon(template.icon);

  return (
    <Card className="cursor-pointer hover:border-primary/50 transition-all duration-300 group">
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg flex items-center justify-center">
            <Icon className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1">
            <CardTitle className="text-base group-hover:text-primary transition-colors">
              {template.name}
            </CardTitle>
            <CardDescription className="text-sm">
              {template.description}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Button 
          onClick={() => onSelect(template)}
          className="w-full"
          variant="outline"
        >
          Use Template
        </Button>
      </CardContent>
    </Card>
  );
};
