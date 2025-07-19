
import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useChatLogger } from '@/hooks/useChatLogger';
import { RefreshCw, Trash2 } from "lucide-react";

const AISettings = () => {
  const [deepseekKey, setDeepseekKey] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [apiLogs, setApiLogs] = useState<any[]>([]);
  const [chatHistory, setChatHistory] = useState<any[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const { sessions, clearSessions } = useChatLogger();

  const saveDeepSeekKey = async () => {
    if (!deepseekKey.trim()) {
      toast.error("Please enter a DeepSeek API key");
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.functions.invoke('save-ai-key', {
        body: { 
          provider: 'deepseek', 
          apiKey: deepseekKey.trim() 
        }
      });

      if (error) throw error;
      
      toast.success("DeepSeek API key saved successfully");
      setDeepseekKey("");
    } catch (error: any) {
      console.error('Error saving DeepSeek key:', error);
      toast.error(`Failed to save API key: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchApiLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('ai_messages')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setApiLogs(data || []);
    } catch (error) {
      console.error('Error fetching API logs:', error);
      toast.error('Failed to fetch API logs');
    }
  };

  const fetchChatHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('ai_conversations')
        .select(`
          *,
          ai_messages (
            id,
            role,
            content,
            created_at
          )
        `)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setChatHistory(data || []);
    } catch (error) {
      console.error('Error fetching chat history:', error);
      toast.error('Failed to fetch chat history');
    }
  };

  const refreshData = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([fetchApiLogs(), fetchChatHistory()]);
      toast.success('Data refreshed successfully');
    } catch (error) {
      toast.error('Failed to refresh data');
    } finally {
      setIsRefreshing(false);
    }
  };

  // Auto-refresh data every 30 seconds
  useEffect(() => {
    fetchApiLogs();
    fetchChatHistory();
    
    const interval = setInterval(() => {
      fetchApiLogs();
      fetchChatHistory();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const getStatusBadge = (status: string) => {
    const colors = {
      success: "bg-green-100 text-green-800",
      error: "bg-red-100 text-red-800",
      pending: "bg-yellow-100 text-yellow-800",
      info: "bg-blue-100 text-blue-800"
    };
    return colors[status as keyof typeof colors] || colors.info;
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">AI Settings</h1>
          <p className="text-muted-foreground">Configure your AI service settings and monitor activity</p>
        </div>
        <Button onClick={refreshData} disabled={isRefreshing} className="flex items-center gap-2">
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh Data
        </Button>
      </div>

      <Tabs defaultValue="config" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="config">Configuration</TabsTrigger>
          <TabsTrigger value="api-logs">API Logs</TabsTrigger>
          <TabsTrigger value="chat-logs">Chat Logs</TabsTrigger>
          <TabsTrigger value="chat-history">Chat History</TabsTrigger>
        </TabsList>

        <TabsContent value="config">
          <Card>
            <CardHeader>
              <CardTitle>API Configuration</CardTitle>
              <CardDescription>
                Configure your AI service API keys. Keys are encrypted and stored securely.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="deepseek-key" className="text-sm font-medium">
                  DeepSeek API Key
                </label>
                <div className="flex gap-2">
                  <Input
                    id="deepseek-key"
                    type="password"
                    placeholder="Enter your DeepSeek API key"
                    value={deepseekKey}
                    onChange={(e) => setDeepseekKey(e.target.value)}
                  />
                  <Button onClick={saveDeepSeekKey} disabled={isLoading}>
                    {isLoading ? "Saving..." : "Save"}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Your API key will be encrypted and stored securely in the database.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="api-logs">
          <Card>
            <CardHeader>
              <CardTitle>API Request Logs</CardTitle>
              <CardDescription>
                Recent API requests and responses ({apiLogs.length} entries)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px]">
                <div className="space-y-4">
                  {apiLogs.map((log) => (
                    <div key={log.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{log.role}</Badge>
                          <span className="text-sm text-muted-foreground">
                            {formatTimestamp(log.created_at)}
                          </span>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <div>
                          <h4 className="text-sm font-medium">Content:</h4>
                          <p className="text-sm bg-muted p-2 rounded text-wrap break-words">
                            {typeof log.content === 'string' ? log.content : JSON.stringify(log.content, null, 2)}
                          </p>
                        </div>
                        
                        {log.api_logs && Object.keys(log.api_logs).length > 0 && (
                          <div>
                            <h4 className="text-sm font-medium">API Logs:</h4>
                            <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">
                              {JSON.stringify(log.api_logs, null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>
                      
                      <Separator className="my-2" />
                    </div>
                  ))}
                  
                  {apiLogs.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      No API logs found. Start a conversation to see logs here.
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="chat-logs">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Chat Activity Logs</CardTitle>
                  <CardDescription>
                    Local chat logger activity ({sessions.length} sessions)
                  </CardDescription>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={clearSessions}
                  className="flex items-center gap-2"
                >
                  <Trash2 className="h-4 w-4" />
                  Clear Logs
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px]">
                <div className="space-y-4">
                  {sessions.map((session) => (
                    <div key={session.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-medium">{session.title}</h3>
                        <div className="flex items-center gap-2">
                          <Badge className={getStatusBadge(session.status)}>
                            {session.status}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            {formatTimestamp(session.startTime)}
                          </span>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        {session.entries.slice(0, 10).map((entry) => (
                          <div key={entry.id} className="text-sm">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="outline" className={getStatusBadge(entry.status)}>
                                {entry.type}
                              </Badge>
                              <span className="font-medium">{entry.action}</span>
                              <span className="text-muted-foreground text-xs">
                                {formatTimestamp(entry.timestamp)}
                              </span>
                            </div>
                            <p className="text-muted-foreground ml-2">{entry.details}</p>
                            {entry.data && (
                              <pre className="text-xs bg-muted p-2 rounded mt-1 overflow-x-auto">
                                {JSON.stringify(entry.data, null, 2)}
                              </pre>
                            )}
                          </div>
                        ))}
                        
                        {session.entries.length > 10 && (
                          <p className="text-sm text-muted-foreground mt-2">
                            ... and {session.entries.length - 10} more entries
                          </p>
                        )}
                      </div>
                      
                      <Separator className="my-2" />
                    </div>
                  ))}
                  
                  {sessions.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      No chat sessions found. Start a conversation to see activity logs here.
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="chat-history">
          <Card>
            <CardHeader>
              <CardTitle>Chat History</CardTitle>
              <CardDescription>
                Recent conversation history ({chatHistory.length} conversations)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px]">
                <div className="space-y-4">
                  {chatHistory.map((conversation) => (
                    <div key={conversation.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-medium">{conversation.title}</h3>
                        <span className="text-sm text-muted-foreground">
                          {formatTimestamp(conversation.created_at)}
                        </span>
                      </div>
                      
                      {conversation.ai_messages && conversation.ai_messages.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-sm text-muted-foreground">
                            {conversation.ai_messages.length} messages
                          </p>
                          <div className="space-y-1">
                            {conversation.ai_messages.slice(0, 3).map((message: any) => (
                              <div key={message.id} className="text-sm">
                                <div className="flex items-center gap-2">
                                  <Badge variant={message.role === 'user' ? 'default' : 'secondary'}>
                                    {message.role}
                                  </Badge>
                                  <span className="text-muted-foreground text-xs">
                                    {formatTimestamp(message.created_at)}
                                  </span>
                                </div>
                                <p className="text-muted-foreground ml-2 truncate">
                                  {message.content.length > 100 
                                    ? `${message.content.substring(0, 100)}...` 
                                    : message.content}
                                </p>
                              </div>
                            ))}
                            
                            {conversation.ai_messages.length > 3 && (
                              <p className="text-xs text-muted-foreground ml-2">
                                ... and {conversation.ai_messages.length - 3} more messages
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                      
                      <Separator className="my-2" />
                    </div>
                  ))}
                  
                  {chatHistory.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      No chat history found. Start a conversation to see history here.
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AISettings;
