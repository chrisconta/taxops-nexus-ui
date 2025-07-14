import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Save, ExternalLink, Eye, EyeOff } from "lucide-react";

const AISettings = () => {
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [loading, setSaving] = useState(false);
  const { toast } = useToast();

  const handleSave = async () => {
    if (!apiKey.trim()) {
      toast({
        title: "Error",
        description: "Please enter your DeepSeek API key",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    
    try {
      const { error } = await supabase.functions.invoke('save-ai-key', {
        body: { deepseek_api_key: apiKey.trim() }
      });

      if (error) {
        throw error;
      }

      toast({
        title: "Success",
        description: "DeepSeek API key saved successfully",
      });
      
      setApiKey("");
    } catch (error) {
      console.error('Error saving API key:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to save API key",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">AI Settings</h1>
        <p className="text-taxops-gray-light mt-2">
          Configure AI providers for intelligent report generation
        </p>
      </div>

      <Card className="bg-glass-bg/50 border-glass-border">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            DeepSeek API Configuration
          </CardTitle>
          <CardDescription>
            Configure your DeepSeek API key to enable AI-powered SQL query generation from natural language
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="deepseek-key" className="text-white">
              DeepSeek API Key
            </Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  id="deepseek-key"
                  type={showKey ? "text" : "password"}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="sk-..."
                  className="bg-glass-bg/30 border-glass-border text-white pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 text-taxops-gray-light hover:text-white"
                  onClick={() => setShowKey(!showKey)}
                >
                  {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      className="border-glass-border bg-glass-bg/30 hover:bg-glass-bg/50"
                      onClick={() => window.open('https://platform.deepseek.com/api_keys', '_blank')}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Get your API key from DeepSeek</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <p className="text-sm text-taxops-gray-light">
              Your API key is encrypted and stored securely. It's only used to process your AI requests.
            </p>
          </div>

          <Button 
            onClick={handleSave} 
            disabled={loading || !apiKey.trim()}
            className="w-full"
          >
            <Save className="w-4 h-4 mr-2" />
            {loading ? "Saving..." : "Save API Key"}
          </Button>
        </CardContent>
      </Card>

      <Card className="bg-glass-bg/50 border-glass-border">
        <CardHeader>
          <CardTitle className="text-white">How it works</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-sm text-taxops-gray-light space-y-2">
            <p>• Ask natural language questions in the AI Reports Assistant</p>
            <p>• DeepSeek converts your questions into SQL queries</p>
            <p>• Results are displayed in an interactive table</p>
            <p>• All queries respect your data access permissions</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AISettings;