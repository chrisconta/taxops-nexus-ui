
import { useState, useEffect } from "react";
import { ArrowLeft, Key, FileText, Activity, Download, Code, Calendar, Clock, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ReportRulesEditor } from "@/components/settings/ReportRulesEditor";

const AISettings = () => {
  const [apiKey, setApiKey] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [apiLogs, setApiLogs] = useState<any[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    checkExistingKey();
    loadApiLogs();
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

  const loadApiLogs = async () => {
    setLogsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('ai_messages')
        .select(`
          id, 
          content, 
          role, 
          created_at, 
          api_logs,
          conversation_id,
          ai_conversations(title)
        `)
        .eq('role', 'assistant')
        .not('api_logs', 'is', null)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      setApiLogs(data || []);
    } catch (error) {
      console.error('Failed to load API logs:', error);
      toast({
        title: "Error",
        description: "Failed to load API logs",
        variant: "destructive",
      });
    } finally {
      setLogsLoading(false);
    }
  };

  const downloadLogs = () => {
    const csvData = apiLogs.map(log => ({
      timestamp: log.created_at,
      conversation: log.ai_conversations?.title || 'Unknown',
      request_url: log.api_logs?.request?.url || '',
      request_method: log.api_logs?.request?.method || '',
      response_status: log.api_logs?.response?.status || '',
      content_preview: log.content.substring(0, 100) + '...',
      model: log.api_logs?.request?.body?.model || '',
      temperature: log.api_logs?.request?.body?.temperature || '',
      max_tokens: log.api_logs?.request?.body?.max_tokens || ''
    }));

    const headers = Object.keys(csvData[0] || {});
    const csvContent = [
      headers.join(','),
      ...csvData.map(row => headers.map(header => `"${row[header as keyof typeof row]}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `deepseek-api-logs-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Success",
      description: "API logs downloaded successfully",
    });
  };

  const getStatusIcon = (status: number) => {
    if (status >= 200 && status < 300) return <CheckCircle className="w-4 h-4 text-green-400" />;
    if (status >= 400 && status < 500) return <AlertCircle className="w-4 h-4 text-yellow-400" />;
    if (status >= 500) return <XCircle className="w-4 h-4 text-red-400" />;
    return <Clock className="w-4 h-4 text-gray-400" />;
  };

  const currentApiDesign = {
    endpoint: "https://api.deepseek.com/v1/chat/completions",
    method: "POST",
    headers: {
      "Authorization": "Bearer [API_KEY]",
      "Content-Type": "application/json"
    },
    body: {
      model: "deepseek-chat",
      temperature: 0.7,
      max_tokens: 512,
      messages: [
        { role: "system", content: "You are a helpful AI assistant." },
        { role: "user", content: "[USER_MESSAGE]" }
      ]
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
          <TabsList className="grid w-full grid-cols-3 bg-glass-bg/50 border border-glass-border">
            <TabsTrigger value="api-keys" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
              <Key className="w-4 h-4 mr-2" />
              API Keys
            </TabsTrigger>
            <TabsTrigger value="api-logs" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
              <Activity className="w-4 h-4 mr-2" />
              API Logs
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

          <TabsContent value="api-logs" className="mt-6 space-y-6">
            {/* Current API Design */}
            <Card className="bg-glass-bg/30 border-glass-border">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Code className="w-5 h-5" />
                  Current DeepSeek API Design
                </CardTitle>
                <CardDescription className="text-taxops-gray-light">
                  Current configuration for DeepSeek API calls
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-white">Endpoint</label>
                      <div className="mt-1 p-2 bg-glass-bg/20 border border-glass-border rounded text-sm text-taxops-gray-light font-mono">
                        {currentApiDesign.endpoint}
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-white">Method</label>
                      <div className="mt-1 p-2 bg-glass-bg/20 border border-glass-border rounded text-sm text-taxops-gray-light font-mono">
                        {currentApiDesign.method}
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-white">Request Body Structure</label>
                    <ScrollArea className="mt-1 h-40 p-3 bg-glass-bg/20 border border-glass-border rounded">
                      <pre className="text-sm text-taxops-gray-light font-mono">
                        {JSON.stringify(currentApiDesign.body, null, 2)}
                      </pre>
                    </ScrollArea>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* API Logs Table */}
            <Card className="bg-glass-bg/30 border-glass-border">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-white flex items-center gap-2">
                      <Activity className="w-5 h-5" />
                      API Request Logs
                    </CardTitle>
                    <CardDescription className="text-taxops-gray-light">
                      Recent DeepSeek API requests and responses
                    </CardDescription>
                  </div>
                  <Button
                    onClick={downloadLogs}
                    variant="outline"
                    className="bg-glass-bg/20 border-glass-border text-white hover:bg-glass-bg/30"
                    disabled={apiLogs.length === 0}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download CSV
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {logsLoading ? (
                  <div className="flex items-center justify-center h-32">
                    <div className="text-taxops-gray-light">Loading logs...</div>
                  </div>
                ) : apiLogs.length === 0 ? (
                  <div className="flex items-center justify-center h-32">
                    <div className="text-taxops-gray-light">No API logs found</div>
                  </div>
                ) : (
                  <ScrollArea className="h-96 border border-glass-border rounded">
                    <div className="min-w-[800px]">
                      <Table>
                        <TableHeader>
                          <TableRow className="border-glass-border">
                            <TableHead className="text-white min-w-[180px]">Timestamp</TableHead>
                            <TableHead className="text-white min-w-[140px]">Conversation</TableHead>
                            <TableHead className="text-white min-w-[80px]">Status</TableHead>
                            <TableHead className="text-white min-w-[100px]">Model</TableHead>
                            <TableHead className="text-white min-w-[80px]">Tokens</TableHead>
                            <TableHead className="text-white min-w-[200px]">Content Preview</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {apiLogs.map((log) => (
                            <TableRow key={log.id} className="border-glass-border">
                              <TableCell className="text-taxops-gray-light">
                                <div className="flex items-center gap-2">
                                  <Calendar className="w-4 h-4" />
                                  {new Date(log.created_at).toLocaleString()}
                                </div>
                              </TableCell>
                              <TableCell className="text-taxops-gray-light">
                                <Badge variant="secondary" className="bg-primary/20 text-primary">
                                  {log.ai_conversations?.title || 'Unknown'}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  {getStatusIcon(log.api_logs?.response?.status)}
                                  <span className="text-taxops-gray-light">
                                    {log.api_logs?.response?.status || 'Unknown'}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell className="text-taxops-gray-light">
                                {log.api_logs?.request?.body?.model || 'Unknown'}
                              </TableCell>
                              <TableCell className="text-taxops-gray-light">
                                {log.api_logs?.request?.body?.max_tokens || 'Unknown'}
                              </TableCell>
                              <TableCell className="text-taxops-gray-light max-w-xs">
                                <div className="truncate">
                                  {log.content.substring(0, 100)}...
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </ScrollArea>
                )}
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
