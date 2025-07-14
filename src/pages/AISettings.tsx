
import { useState, useEffect } from "react";
import { ArrowLeft, Key, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ReportRulesEditor } from "@/components/settings/ReportRulesEditor";

const AISettings = () => {
  const [apiKey, setApiKey] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    checkExistingKey();
  }, []);

  const checkExistingKey = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('ai_credentials')
        .select('id')
        .eq('provider', 'deepseek')
        .eq('user_id', user.id)
        .single();

      if (data) {
        setApiKey('••••••••••••••••••••••••••••••••');
      }
    } catch (error) {
      console.log('No existing key');
    } finally {
      setLoading(false);
    }
  };

  const saveApiKey = async () => {
    if (!apiKey || apiKey.startsWith('••••')) {
      toast({
        title: "Error",
        description: "Please enter a valid API key",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke('save-ai-key', {
        body: { provider: 'deepseek', apiKey }
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "DeepSeek API key saved successfully",
      });

      setApiKey('••••••••••••••••••••••••••••••••');
    } catch (error) {
      console.error('Failed to save API key:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to save API key',
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-taxops-dark via-taxops-dark-lighter to-taxops-dark p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center space-x-4 mb-8">
          <Button
            variant="ghost"
            onClick={() => window.history.back()}
            className="text-white hover:bg-glass-bg/50"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <h1 className="text-3xl font-bold text-white">AI Settings</h1>
        </div>

        <Tabs defaultValue="api-keys" className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-glass-bg/50 border border-glass-border">
            <TabsTrigger value="api-keys" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
              <Key className="w-4 h-4 mr-2" />
              API Keys
            </TabsTrigger>
            <TabsTrigger value="report-rules" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
              <FileText className="w-4 h-4 mr-2" />
              Report Rules
            </TabsTrigger>
          </TabsList>

          <TabsContent value="api-keys" className="mt-6">
            <Card className="bg-glass-bg/30 border-glass-border">
              <CardHeader>
                <CardTitle className="text-white">DeepSeek API Key</CardTitle>
                <CardDescription className="text-taxops-gray-light">
                  Configure your DeepSeek API key to enable AI-powered features.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-white">API Key</label>
                  <Input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="Enter your DeepSeek API key"
                    className="bg-glass-bg/20 border-glass-border text-white placeholder:text-taxops-gray-light"
                  />
                </div>

                <Button 
                  onClick={saveApiKey}
                  disabled={saving || loading}
                  className="bg-primary hover:bg-primary/80"
                >
                  {saving ? "Saving..." : "Save API Key"}
                </Button>

                <div className="mt-4 p-4 bg-glass-bg/20 border border-glass-border rounded-lg">
                  <p className="text-sm text-taxops-gray-light">
                    Get your API key from{" "}
                    <a 
                      href="https://platform.deepseek.com/api_keys" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-primary hover:text-primary/80 underline"
                    >
                      DeepSeek Platform
                    </a>
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="report-rules" className="mt-6">
            <ReportRulesEditor />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AISettings;
