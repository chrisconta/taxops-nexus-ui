
import { useState, useEffect } from "react";
import { ArrowLeft, Key, FileText, Activity, Download, Code, Calendar, Clock, CheckCircle, XCircle, AlertCircle, MessageSquare, User, Bot, Cog, AlertTriangle, Info, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ReportRulesEditor } from "@/components/settings/ReportRulesEditor";
import { useChatLogger } from "@/hooks/useChatLogger";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

const AISettings = () => {
  const [apiKey, setApiKey] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [apiLogs, setApiLogs] = useState<any[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const { toast } = useToast();
  const { sessions, clearSessions } = useChatLogger();

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
      max_tokens: log.api_logs?.request?.body?.max_tokens || '',
      request_json: log.api_logs?.request?.body ? JSON.stringify(log.api_logs.request.body, null, 2) : '',
      response_json: log.api_logs?.response?.data ? JSON.stringify(log.api_logs.response.data, null, 2) : ''
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

  const downloadChatLogs = () => {
    const textContent = sessions.map(session => {
      const sessionHeader = `=== SESSION ${session.id} ===\nTitle: ${session.title}\nStatus: ${session.status}\nStarted: ${new Date(session.startTime).toLocaleString()}\nEnded: ${session.endTime ? new Date(session.endTime).toLocaleString() : 'Ongoing'}\nEntries: ${session.entries.length}\n\n`;
      
      const logsText = session.entries.map(entry => {
        const timestamp = new Date(entry.timestamp).toLocaleString();
        const header = `[${timestamp}] ${entry.type.toUpperCase()} - ${entry.action} (${entry.status})`;
        const details = entry.details ? `\nDetails: ${entry.details}` : '';
        const data = entry.data ? `\nData: ${JSON.stringify(entry.data, null, 2)}` : '';
        return `${header}${details}${data}\n`;
      }).join('\n');
      
      return `${sessionHeader}${logsText}\n${'='.repeat(70)}\n\n`;
    }).join('');
    
    const blob = new Blob([textContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chat-logs-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Success",
      description: "Chat logs downloaded successfully",
    });
  };

  const getLogTypeIcon = (type: string) => {
    switch (type) {
      case 'message': return <MessageSquare className="w-4 h-4" />;
      case 'system': return <Cog className="w-4 h-4" />;
      case 'process': return <Activity className="w-4 h-4" />;
      case 'error': return <XCircle className="w-4 h-4" />;
      default: return <Info className="w-4 h-4" />;
    }
  };

  const getLogTypeColor = (type: string) => {
    switch (type) {
      case 'message': return 'bg-blue-500/20 text-blue-300';
      case 'system': return 'bg-gray-500/20 text-gray-300';
      case 'process': return 'bg-purple-500/20 text-purple-300';
      case 'error': return 'bg-red-500/20 text-red-300';
      default: return 'bg-gray-500/20 text-gray-300';
    }
  };

  const getStatusIcon = (status: any) => {
    if (typeof status === 'number') {
      if (status >= 200 && status < 300) return <CheckCircle className="w-4 h-4 text-green-400" />;
      if (status >= 400 && status < 500) return <AlertCircle className="w-4 h-4 text-yellow-400" />;
      if (status >= 500) return <XCircle className="w-4 h-4 text-red-400" />;
      return <Clock className="w-4 h-4 text-gray-400" />;
    }
    
    switch (status) {
      case 'success': return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'error': return <XCircle className="w-4 h-4 text-red-400" />;
      case 'pending': return <Clock className="w-4 h-4 text-yellow-400" />;
      default: return <Info className="w-4 h-4 text-gray-400" />;
    }
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
          <TabsList className="grid w-full grid-cols-4 bg-glass-bg/50 border border-glass-border">
            <TabsTrigger value="api-keys" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
              <Key className="w-4 h-4 mr-2" />
              API Keys
            </TabsTrigger>
            <TabsTrigger value="api-logs" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
              <Activity className="w-4 h-4 mr-2" />
              API Logs
            </TabsTrigger>
            <TabsTrigger value="chat-logs" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
              <MessageSquare className="w-4 h-4 mr-2" />
              Chat Logs
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
                    <div className="min-w-[1200px]">
                      <Table>
                        <TableHeader>
                          <TableRow className="border-glass-border">
                            <TableHead className="text-white min-w-[180px]">Timestamp</TableHead>
                            <TableHead className="text-white min-w-[140px]">Conversation</TableHead>
                            <TableHead className="text-white min-w-[80px]">Status</TableHead>
                            <TableHead className="text-white min-w-[100px]">Model</TableHead>
                            <TableHead className="text-white min-w-[80px]">Tokens</TableHead>
                            <TableHead className="text-white min-w-[200px]">Request JSON</TableHead>
                            <TableHead className="text-white min-w-[200px]">Response JSON</TableHead>
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
                                {log.api_logs?.request?.body ? (
                                  <ScrollArea className="h-20 w-full">
                                    <pre className="text-xs font-mono whitespace-pre-wrap">
                                      {JSON.stringify(log.api_logs.request.body, null, 2)}
                                    </pre>
                                  </ScrollArea>
                                ) : (
                                  <span className="text-taxops-gray-light/50">No request data</span>
                                )}
                              </TableCell>
                              <TableCell className="text-taxops-gray-light max-w-xs">
                                {log.api_logs?.response?.data ? (
                                  <ScrollArea className="h-20 w-full">
                                    <pre className="text-xs font-mono whitespace-pre-wrap">
                                      {JSON.stringify(log.api_logs.response.data, null, 2)}
                                    </pre>
                                  </ScrollArea>
                                ) : (
                                  <span className="text-taxops-gray-light/50">No response data</span>
                                )}
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
                    <ScrollBar orientation="horizontal" className="bg-glass-bg/30 hover:bg-glass-bg/50" />
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="chat-logs" className="mt-6 space-y-6">
            {/* Chat Logs Header */}
            <Card className="bg-glass-bg/30 border-glass-border">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-white flex items-center gap-2">
                      <MessageSquare className="w-5 h-5" />
                      Chat Activity Logs
                    </CardTitle>
                    <CardDescription className="text-taxops-gray-light">
                      Detailed logs of chat conversations, system routing, processes, and errors
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={downloadChatLogs}
                      variant="outline"
                      className="bg-glass-bg/20 border-glass-border text-white hover:bg-glass-bg/30"
                      disabled={sessions.length === 0}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download TXT
                    </Button>
                    <Button
                      onClick={clearSessions}
                      variant="outline"
                      className="bg-glass-bg/20 border-glass-border text-white hover:bg-glass-bg/30"
                      disabled={sessions.length === 0}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Clear All Logs
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {sessions.length === 0 ? (
                  <div className="flex items-center justify-center h-32">
                    <div className="text-taxops-gray-light">No chat sessions found</div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {sessions.map((session) => (
                      <Collapsible key={session.id}>
                        <CollapsibleTrigger className="w-full">
                          <Card className="bg-glass-bg/20 border-glass-border hover:bg-glass-bg/30 transition-colors">
                            <CardHeader className="pb-3">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <div className="flex items-center gap-2">
                                    <Calendar className="w-4 h-4 text-taxops-gray-light" />
                                    <span className="text-white font-medium">{session.title}</span>
                                  </div>
                                  <Badge 
                                    variant="secondary"
                                    className={`${session.status === 'active' ? 'bg-green-500/20 text-green-300' : 
                                                session.status === 'failed' ? 'bg-red-500/20 text-red-300' : 
                                                'bg-blue-500/20 text-blue-300'}`}
                                  >
                                    {session.status}
                                  </Badge>
                                </div>
                                <div className="flex items-center gap-4 text-sm text-taxops-gray-light">
                                  <span>{session.entries.length} entries</span>
                                  <span>{new Date(session.startTime).toLocaleString()}</span>
                                </div>
                              </div>
                            </CardHeader>
                          </Card>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <Card className="bg-glass-bg/10 border-glass-border/50 mt-2">
                            <CardContent className="p-4">
                              <ScrollArea className="h-96">
                                <div className="space-y-2">
                                  {session.entries.map((entry) => (
                                    <div key={entry.id} className="flex items-start gap-3 p-3 bg-glass-bg/20 rounded border border-glass-border/30">
                                      <div className="flex items-center gap-2 min-w-0">
                                        <div className={`flex items-center gap-2 px-2 py-1 rounded text-xs ${getLogTypeColor(entry.type)}`}>
                                          {getLogTypeIcon(entry.type)}
                                          <span className="uppercase font-medium">{entry.type}</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                          {getStatusIcon(entry.status)}
                                          <span className="text-xs text-taxops-gray-light">
                                            {new Date(entry.timestamp).toLocaleTimeString()}
                                          </span>
                                        </div>
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <div className="text-sm font-medium text-white mb-1">{entry.action}</div>
                                        <div className="text-xs text-taxops-gray-light break-words">{entry.details}</div>
                                        {entry.data && (
                                          <Collapsible>
                                            <CollapsibleTrigger className="text-xs text-primary hover:text-primary/80 mt-1">
                                              View Data
                                            </CollapsibleTrigger>
                                            <CollapsibleContent>
                                              <ScrollArea className="h-20 mt-2 p-2 bg-glass-bg/30 border border-glass-border/50 rounded">
                                                <pre className="text-xs text-taxops-gray-light font-mono whitespace-pre-wrap">
                                                  {JSON.stringify(entry.data, null, 2)}
                                                </pre>
                                              </ScrollArea>
                                            </CollapsibleContent>
                                          </Collapsible>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </ScrollArea>
                            </CardContent>
                          </Card>
                        </CollapsibleContent>
                      </Collapsible>
                    ))}
                  </div>
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
