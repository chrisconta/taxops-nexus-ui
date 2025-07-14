
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Save, Eye } from "lucide-react";

export const ReportRulesEditor = () => {
  const [rules, setRules] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
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

      // Safely access the markdown property with proper type checking
      const config = data?.reports_config as { markdown?: string } | null;
      const markdown = config?.markdown || '';
      setRules(markdown);
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
    if (rules.length > 10000) {
      toast({
        title: "Error",
        description: "Report rules cannot exceed 10,000 characters",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('user_settings')
        .upsert({
          user_id: user.id,
          reports_config: { markdown: rules }
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
          Define markdown instructions for the AI assistant when generating reports.
          These rules will be included in every AI conversation.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <label className="text-sm font-medium text-white">Instructions</label>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPreview(!showPreview)}
                className="border-glass-border text-white hover:bg-glass-bg/50"
              >
                <Eye className="w-4 h-4 mr-2" />
                {showPreview ? 'Edit' : 'Preview'}
              </Button>
            </div>
          </div>
          
          {showPreview ? (
            <div className="min-h-[300px] p-4 bg-glass-bg/20 border border-glass-border rounded-md">
              <div className="prose prose-invert max-w-none">
                {rules ? (
                  <pre className="whitespace-pre-wrap text-sm text-white">{rules}</pre>
                ) : (
                  <p className="text-taxops-gray-light italic">No rules defined yet</p>
                )}
              </div>
            </div>
          ) : (
            <Textarea
              value={rules}
              onChange={(e) => setRules(e.target.value)}
              placeholder="Enter your report generation rules in markdown format..."
              className="min-h-[300px] bg-glass-bg/20 border-glass-border text-white placeholder:text-taxops-gray-light resize-none"
              maxLength={10000}
            />
          )}
          
          <div className="flex justify-between text-xs text-taxops-gray-light">
            <span>{rules.length}/10,000 characters</span>
          </div>
        </div>

        <div className="flex justify-end">
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
            Save Rules
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
