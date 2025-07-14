import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Save, Eye, Building2, User, BarChart3, FileSpreadsheet, DollarSign } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const reportTypes = [
  {
    id: "form-1065",
    title: "Form 1065",
    shortTitle: "1065",
    description: "U.S. Return of Partnership Income",
    icon: Building2,
  },
  {
    id: "form-1120", 
    title: "Form 1120",
    shortTitle: "1120",
    description: "U.S. Corporation Income Tax Return",
    icon: Building2,
  },
  {
    id: "form-1040",
    title: "Form 1040",
    shortTitle: "1040", 
    description: "U.S. Individual Income Tax Return",
    icon: User,
  },
  {
    id: "profit-loss",
    title: "Profit and Loss Statement",
    shortTitle: "P&L",
    description: "Summarized view of income and expenses",
    icon: BarChart3,
  },
  {
    id: "balance-sheet",
    title: "Balance Sheet Statement",
    shortTitle: "Balance Sheet", 
    description: "Snapshot of company's assets, liabilities, and equity",
    icon: FileSpreadsheet,
  },
  {
    id: "cash-flow",
    title: "Cash Flow Statement",
    shortTitle: "Cash Flow",
    description: "Tracks cash inflows and outflows",
    icon: DollarSign,
  }
];

export const ReportRulesEditor = () => {
  const [rulesData, setRulesData] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState<Record<string, boolean>>({});
  const [activeTab, setActiveTab] = useState("form-1065");
  const { toast } = useToast();

  useEffect(() => {
    loadRules();
  }, []);

  const loadRules = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('user_settings')
        .select('reports_config')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      // Safely access the rules property with proper type checking
      const config = data?.reports_config as { rules?: Record<string, string> } | null;
      const rules = config?.rules || {};
      setRulesData(rules);
    } catch (error) {
      console.error('Failed to load rules:', error);
      toast({
        title: "Error",
        description: "Failed to load report rules",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const saveRules = async () => {
    // Check if any rule exceeds character limit
    for (const [reportId, rules] of Object.entries(rulesData)) {
      if (rules && rules.length > 5000) {
        toast({
          title: "Error",
          description: `Rules for ${reportTypes.find(r => r.id === reportId)?.title} cannot exceed 5,000 characters`,
          variant: "destructive",
        });
        return;
      }
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('user_settings')
        .upsert({
          user_id: user.id,
          reports_config: { rules: rulesData }
        }, {
          onConflict: 'user_id'
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Report rules saved successfully",
      });
    } catch (error) {
      console.error('Failed to save rules:', error);
      toast({
        title: "Error",
        description: "Failed to save report rules",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const updateRules = (reportId: string, value: string) => {
    setRulesData(prev => ({
      ...prev,
      [reportId]: value
    }));
  };

  const togglePreview = (reportId: string) => {
    setShowPreview(prev => ({
      ...prev,
      [reportId]: !prev[reportId]
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  return (
    <Card className="bg-glass-bg/30 border-glass-border">
      <CardHeader>
        <CardTitle className="text-white">Report Rules</CardTitle>
        <CardDescription className="text-taxops-gray-light">
          Define specific markdown instructions for each report type. These rules will be included 
          when the AI assistant generates the corresponding reports.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 bg-glass-bg/50 border border-glass-border w-full h-auto">
            {reportTypes.map((report) => {
              const Icon = report.icon;
              return (
                <TabsTrigger 
                  key={report.id} 
                  value={report.id}
                  className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary flex flex-col items-center gap-1 p-2 h-12 text-center text-xs"
                >
                  <Icon className="w-3 h-3 flex-shrink-0" />
                  <span className="leading-tight whitespace-nowrap overflow-hidden text-[10px]">{report.shortTitle}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>

          {reportTypes.map((report) => (
            <TabsContent key={report.id} value={report.id} className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-lg font-medium text-white">{report.title}</h3>
                    <p className="text-sm text-taxops-gray-light">{report.description}</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => togglePreview(report.id)}
                    className="border-glass-border text-white hover:bg-glass-bg/50"
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    {showPreview[report.id] ? 'Edit' : 'Preview'}
                  </Button>
                </div>
                
                {showPreview[report.id] ? (
                  <div className="min-h-[200px] p-4 bg-glass-bg/20 border border-glass-border rounded-md">
                    <div className="prose prose-invert max-w-none">
                      {rulesData[report.id] ? (
                        <pre className="whitespace-pre-wrap text-sm text-white">{rulesData[report.id]}</pre>
                      ) : (
                        <p className="text-taxops-gray-light italic">No rules defined for this report type</p>
                      )}
                    </div>
                  </div>
                ) : (
                  <Textarea
                    value={rulesData[report.id] || ''}
                    onChange={(e) => updateRules(report.id, e.target.value)}
                    placeholder={`Enter specific rules for ${report.title} generation...`}
                    className="min-h-[200px] bg-glass-bg/20 border-glass-border text-white placeholder:text-taxops-gray-light resize-none"
                    maxLength={5000}
                  />
                )}
                
                <div className="flex justify-between text-xs text-taxops-gray-light">
                  <span>{(rulesData[report.id] || '').length}/5,000 characters</span>
                </div>
              </div>
            </TabsContent>
          ))}
        </Tabs>

        <div className="flex justify-end pt-4 border-t border-glass-border">
          <Button 
            onClick={saveRules}
            disabled={saving}
            className="bg-primary hover:bg-primary/80"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Save All Rules
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};