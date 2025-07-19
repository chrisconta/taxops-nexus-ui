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
import { RefreshCw, Trash2, Search, Play, Square, AlertCircle } from "lucide-react";

interface OrchestratorState {
  tool?: string;
  confirmed?: boolean;
  confirmationAttempts?: number;
  messages: Array<{ role: string; content: string }>;
  toolChain?: string[];
  sourceTools?: string[];
}

interface ConversationDebugInfo {
  id: string;
  state: OrchestratorState;
  lastActivity: string;
  instructionType: 'tool_selection' | 'confirmation' | 'none';
  nextInstruction: string;
  apiCalls: any[];
}

const AISettings = () => {
  const [deepseekKey, setDeepseekKey] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [apiLogs, setApiLogs] = useState<any[]>([]);
  const [chatHistory, setChatHistory] = useState<any[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Orchestrator debug state
  const [debugConversationId, setDebugConversationId] = useState("");
  const [orchestratorDebugInfo, setOrchestratorDebugInfo] = useState<ConversationDebugInfo | null>(null);
  const [isLoadingDebug, setIsLoadingDebug] = useState(false);
  
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
        .not('api_logs', 'eq', '{}')
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

  const loadOrchestratorDebugInfo = async () => {
    if (!debugConversationId.trim()) {
      toast.error("Please enter a conversation ID");
      return;
    }

    setIsLoadingDebug(true);
    try {
      // Fetch conversation messages to understand current state
      const { data: messages, error: messagesError } = await supabase
        .from('ai_messages')
        .select('*')
        .eq('conversation_id', debugConversationId)
        .order('created_at', { ascending: true });

      if (messagesError) throw messagesError;

      // Analyze the conversation to simulate orchestrator state
      const conversationMessages = (messages || []).map(m => ({
        role: m.role === 'user' ? 'user' : 'assistant',
        content: m.content
      }));

      // Simulate orchestrator logic to determine current state
      let tool: string | undefined;
      let confirmed = false;
      let confirmationAttempts = 0;

      // Look for tool identification patterns
      const toolPatterns = {
        'register_client': /(?:register[_\s]client|client[_\s]registration|register.*client)/i,
        'create_connection': /(?:create[_\s]connection|connection|connect|linking)/i,
        'build_dashboard': /(?:build[_\s]dashboard|dashboard|report|analytics)/i,
        'ai-chat': /(?:ai[_\s]chat|general|conversation|chat|question)/i
      };

      // Analyze conversation for tool selection
      for (const message of conversationMessages) {
        if (message.role === 'user') {
          for (const [toolName, pattern] of Object.entries(toolPatterns)) {
            if (pattern.test(message.content)) {
              tool = toolName;
              break;
            }
          }
        }
      }

      // Determine instruction type based on state
      let instructionType: 'tool_selection' | 'confirmation' | 'none' = 'none';
      let nextInstruction = '';

      if (!tool) {
        instructionType = 'tool_selection';
        nextInstruction = `You are helping an AI orchestrator decide which tool to use based on the user's conversation. Look at the ENTIRE conversation history to understand context and extract information. Available tools:
- register_client: Register a new client (needs name, email, ein)
- create_connection: Create a connection for a client (needs clientId, connectionType, credentials)
- build_dashboard: Build a dashboard for a client (needs clientId, metrics, timeframe)
- ai-chat: Handle general conversations and questions that don't fit other tools
CRITICAL RULES:
1. If user wants to "create a new client", "register a client", or provides client details (name, email, EIN), use "register_client"
2. If user mentions connecting to external services, use "create_connection"
3. If user wants to build reports or dashboards, use "build_dashboard"
4. For general questions or unclear intent, use "ai-chat"
RESPONSE FORMAT: Respond with ONLY the tool name (e.g., "register_client", "ai-chat") OR provide a user-friendly message if clarification is needed. DO NOT include both tool name and message together. The tool name will be processed separately from the user message.`;
      } else if (!confirmed) {
        instructionType = 'confirmation';
        nextInstruction = `Is this message indicating the user wants to proceed with ${tool}?

User's message: "[LATEST_MESSAGE]"

Previous conversation context:
[CONVERSATION_CONTEXT]

The user has already been asked about ${tool}. Are they confirming they want to proceed?

Respond with ONLY:
- "YES" if they want to proceed with ${tool}
- "NO" if they don't want to proceed or are unclear

Do not provide explanations, just YES or NO.`;
      }

      // Get API logs for this conversation
      const apiCallsForConversation = (messages || [])
        .filter(m => m.api_logs && Object.keys(m.api_logs).length > 0)
        .map(m => {
          const apiLogs = m.api_logs as Record<string, any>;
          return {
            timestamp: m.created_at,
            operation: (apiLogs && typeof apiLogs === 'object' && apiLogs.request?.operation) || 'unknown',
            content: m.content,
            logs: m.api_logs
          };
        });

      const debugInfo: ConversationDebugInfo = {
        id: debugConversationId,
        state: {
          tool,
          confirmed,
          confirmationAttempts,
          messages: conversationMessages,
          toolChain: tool ? [tool] : [],
          sourceTools: []
        },
        lastActivity: messages && messages.length > 0 ? messages[messages.length - 1].created_at : 'No activity',
        instructionType,
        nextInstruction,
        apiCalls: apiCallsForConversation
      };

      setOrchestratorDebugInfo(debugInfo);
      toast.success('Debug info loaded successfully');
    } catch (error: any) {
      console.error('Error loading orchestrator debug info:', error);
      toast.error(`Failed to load debug info: ${error.message}`);
    } finally {
      setIsLoadingDebug(false);
    }
  };

  const simulateUserInput = async (input: string) => {
    if (!debugConversationId.trim()) {
      toast.error("Please load a conversation first");
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('User not authenticated');
        return;
      }

      const { data, error } = await supabase.functions.invoke('ai-orchestrator', {
        body: { 
          message: input, 
          conversation_id: debugConversationId 
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;

      toast.success('Simulation completed');
      // Reload debug info to see updated state
      await loadOrchestratorDebugInfo();
    } catch (error: any) {
      console.error('Error simulating user input:', error);
      toast.error(`Simulation failed: ${error.message}`);
    }
  };

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

  const getInstructionTypeBadge = (type: string) => {
    const colors = {
      tool_selection: "bg-blue-100 text-blue-800",
      confirmation: "bg-orange-100 text-orange-800",
      none: "bg-gray-100 text-gray-800"
    };
    return colors[type as keyof typeof colors] || colors.none;
  };

  return (
    <div className="container mx-auto py-6 space-y-6 max-w-full overflow-hidden">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">AI Settings</h1>
          <p className="text-muted-foreground">Configure your AI service settings and monitor activity</p>
        </div>
        <Button onClick={refreshData} disabled={isRefreshing} className="flex items-center gap-2 shrink-0">
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh Data
        </Button>
      </div>

      <Tabs defaultValue="config" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="config">Configuration</TabsTrigger>
          <TabsTrigger value="api-logs">API Logs</TabsTrigger>
          <TabsTrigger value="chat-logs">Chat Logs</TabsTrigger>
          <TabsTrigger value="chat-history">Chat History</TabsTrigger>
          <TabsTrigger value="orchestrator">Orchestrator</TabsTrigger>
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
            <CardContent className="overflow-hidden">
              <ScrollArea className="h-[600px] w-full">
                <div className="space-y-4 pr-4">
                  {apiLogs.map((log) => (
                    <div key={log.id} className="border rounded-lg p-4 overflow-hidden">
                      <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{log.role}</Badge>
                          <span className="text-sm text-muted-foreground">
                            {formatTimestamp(log.created_at)}
                          </span>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="overflow-hidden">
                          <h4 className="text-sm font-medium">Content:</h4>
                          <div className="text-sm bg-muted p-2 rounded max-h-32 overflow-y-auto w-full">
                            <pre className="whitespace-pre-wrap break-words text-wrap overflow-wrap-anywhere">
                              {typeof log.content === 'string' ? log.content : JSON.stringify(log.content, null, 2)}
                            </pre>
                          </div>
                        </div>
                        
                        {log.api_logs && Object.keys(log.api_logs).length > 0 && (
                          <div className="overflow-hidden">
                            <h4 className="text-sm font-medium">API Logs:</h4>
                            <div className="text-xs bg-muted p-2 rounded max-h-40 overflow-auto w-full">
                              <pre className="whitespace-pre-wrap break-words text-wrap overflow-wrap-anywhere">
                                {JSON.stringify(log.api_logs, null, 2)}
                              </pre>
                            </div>
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
            <CardContent className="overflow-hidden">
              <ScrollArea className="h-[600px] w-full">
                <div className="space-y-4 pr-4">
                  {sessions.map((session) => (
                    <div key={session.id} className="border rounded-lg p-4 overflow-hidden">
                      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                        <h3 className="font-medium truncate">{session.title}</h3>
                        <div className="flex items-center gap-2 shrink-0">
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
                          <div key={entry.id} className="text-sm overflow-hidden">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <Badge variant="outline" className={getStatusBadge(entry.status)}>
                                {entry.type}
                              </Badge>
                              <span className="font-medium truncate">{entry.action}</span>
                              <span className="text-muted-foreground text-xs shrink-0">
                                {formatTimestamp(entry.timestamp)}
                              </span>
                            </div>
                            <p className="text-muted-foreground ml-2 break-words overflow-wrap-anywhere">{entry.details}</p>
                            {entry.data && (
                              <div className="text-xs bg-muted p-2 rounded mt-1 max-h-32 overflow-auto w-full">
                                <pre className="whitespace-pre-wrap break-words overflow-wrap-anywhere">
                                  {JSON.stringify(entry.data, null, 2)}
                                </pre>
                              </div>
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
            <CardContent className="overflow-hidden">
              <ScrollArea className="h-[600px] w-full">
                <div className="space-y-4 pr-4">
                  {chatHistory.map((conversation) => (
                    <div key={conversation.id} className="border rounded-lg p-4 overflow-hidden">
                      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                        <h3 className="font-medium truncate">{conversation.title}</h3>
                        <span className="text-sm text-muted-foreground shrink-0">
                          {formatTimestamp(conversation.created_at)}
                        </span>
                      </div>
                      
                      {conversation.ai_messages && conversation.ai_messages.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-sm text-muted-foreground">
                            {conversation.ai_messages.length} messages
                          </p>
                          <details className="space-y-2">
                            <summary className="cursor-pointer text-sm text-primary hover:underline">
                              Show all messages
                            </summary>
                            <div className="space-y-2 mt-2 max-h-80 overflow-y-auto w-full">
                              {conversation.ai_messages.map((message: any) => (
                                <div key={message.id} className="text-sm border-l-2 border-muted pl-3 overflow-hidden">
                                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                                    <Badge variant={message.role === 'user' ? 'default' : 'secondary'}>
                                      {message.role}
                                    </Badge>
                                    <span className="text-muted-foreground text-xs shrink-0">
                                      {formatTimestamp(message.created_at)}
                                    </span>
                                  </div>
                                  <div className="text-muted-foreground ml-2 overflow-hidden">
                                    <div className="whitespace-pre-wrap text-xs bg-muted/50 p-2 rounded break-words overflow-wrap-anywhere max-h-40 overflow-y-auto">
                                      {message.content}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </details>
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

        <TabsContent value="orchestrator">
          <Card>
            <CardHeader>
              <CardTitle>AI Orchestrator Debug</CardTitle>
              <CardDescription>
                Debug the AI orchestrator conversation flow and state management
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Conversation ID Input */}
              <div className="space-y-2">
                <label htmlFor="debug-conversation-id" className="text-sm font-medium">
                  Conversation ID to Debug
                </label>
                <div className="flex gap-2">
                  <Input
                    id="debug-conversation-id"
                    placeholder="Enter conversation ID"
                    value={debugConversationId}
                    onChange={(e) => setDebugConversationId(e.target.value)}
                  />
                  <Button 
                    onClick={loadOrchestratorDebugInfo} 
                    disabled={isLoadingDebug}
                    className="flex items-center gap-2"
                  >
                    {isLoadingDebug ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <Search className="h-4 w-4" />
                    )}
                    Load
                  </Button>
                </div>
              </div>

              {orchestratorDebugInfo && (
                <div className="space-y-4">
                  {/* Current State */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Current Orchestrator State</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <span className="text-sm font-medium">Tool:</span>
                          <Badge variant="outline" className="ml-2">
                            {orchestratorDebugInfo.state.tool || 'None'}
                          </Badge>
                        </div>
                        <div>
                          <span className="text-sm font-medium">Confirmed:</span>
                          <Badge 
                            variant={orchestratorDebugInfo.state.confirmed ? "default" : "secondary"}
                            className="ml-2"
                          >
                            {orchestratorDebugInfo.state.confirmed ? 'Yes' : 'No'}
                          </Badge>
                        </div>
                        <div>
                          <span className="text-sm font-medium">Confirmation Attempts:</span>
                          <Badge variant="outline" className="ml-2">
                            {orchestratorDebugInfo.state.confirmationAttempts || 0}
                          </Badge>
                        </div>
                        <div>
                          <span className="text-sm font-medium">Instruction Type:</span>
                          <Badge 
                            className={`ml-2 ${getInstructionTypeBadge(orchestratorDebugInfo.instructionType)}`}
                          >
                            {orchestratorDebugInfo.instructionType}
                          </Badge>
                        </div>
                      </div>
                      <div>
                        <span className="text-sm font-medium">Tool Chain:</span>
                        <div className="flex gap-1 mt-1">
                          {orchestratorDebugInfo.state.toolChain?.map((tool, index) => (
                            <Badge key={index} variant="outline">{tool}</Badge>
                          )) || <span className="text-sm text-muted-foreground">None</span>}
                        </div>
                      </div>
                      <div>
                        <span className="text-sm font-medium">Last Activity:</span>
                        <span className="text-sm text-muted-foreground ml-2">
                          {formatTimestamp(orchestratorDebugInfo.lastActivity)}
                        </span>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Next DeepSeek Instruction */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        Next DeepSeek Instruction
                        {orchestratorDebugInfo.instructionType === 'tool_selection' && (
                          <AlertCircle className="h-5 w-5 text-yellow-500" />
                        )}
                      </CardTitle>
                      <CardDescription>
                        This is the instruction that would be sent to DeepSeek on the next API call
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="bg-muted p-4 rounded-lg">
                        <pre className="text-xs whitespace-pre-wrap break-words">
                          {orchestratorDebugInfo.nextInstruction}
                        </pre>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Conversation Messages */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Conversation Messages</CardTitle>
                      <CardDescription>
                        Current conversation history ({orchestratorDebugInfo.state.messages.length} messages)
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ScrollArea className="h-64">
                        <div className="space-y-2">
                          {orchestratorDebugInfo.state.messages.map((message, index) => (
                            <div key={index} className="flex gap-2 text-sm">
                              <Badge variant={message.role === 'user' ? 'default' : 'secondary'}>
                                {message.role}
                              </Badge>
                              <span className="flex-1 break-words">{message.content}</span>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </CardContent>
                  </Card>

                  {/* API Call History */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">API Call History</CardTitle>
                      <CardDescription>
                        Recent orchestrator API calls for this conversation
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ScrollArea className="h-64">
                        <div className="space-y-3">
                          {orchestratorDebugInfo.apiCalls.map((call, index) => (
                            <div key={index} className="border rounded p-3">
                              <div className="flex items-center gap-2 mb-2">
                                <Badge variant="outline">{call.operation}</Badge>
                                <span className="text-xs text-muted-foreground">
                                  {formatTimestamp(call.timestamp)}
                                </span>
                              </div>
                              <div className="text-xs bg-muted p-2 rounded max-h-32 overflow-y-auto">
                                <pre className="whitespace-pre-wrap">
                                  {JSON.stringify(call.logs, null, 2)}
                                </pre>
                              </div>
                            </div>
                          ))}
                          {orchestratorDebugInfo.apiCalls.length === 0 && (
                            <p className="text-sm text-muted-foreground">No API calls found for this conversation</p>
                          )}
                        </div>
                      </ScrollArea>
                    </CardContent>
                  </Card>

                  {/* Debug Controls */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Debug Controls</CardTitle>
                      <CardDescription>
                        Simulate user inputs to test orchestrator behavior
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex gap-2 flex-wrap">
                        <Button 
                          size="sm" 
                          onClick={() => simulateUserInput("yes")}
                          className="flex items-center gap-1"
                        >
                          <Play className="h-3 w-3" />
                          Simulate "yes"
                        </Button>
                        <Button 
                          size="sm" 
                          onClick={() => simulateUserInput("no")}
                          className="flex items-center gap-1"
                        >
                          <Square className="h-3 w-3" />
                          Simulate "no"
                        </Button>
                        <Button 
                          size="sm" 
                          onClick={() => simulateUserInput("i want to register a client")}
                          className="flex items-center gap-1"
                        >
                          <Play className="h-3 w-3" />
                          Simulate register request
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        These buttons will send simulated messages to the orchestrator and reload the debug info
                      </p>
                    </CardContent>
                  </Card>
                </div>
              )}

              {!orchestratorDebugInfo && (
                <div className="text-center py-8 text-muted-foreground">
                  <AlertCircle className="h-8 w-8 mx-auto mb-2" />
                  <p>Enter a conversation ID and click Load to view orchestrator debug information</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AISettings;
