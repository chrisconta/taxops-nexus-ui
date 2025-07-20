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
import { RefreshCw, Trash2, Search, Play, Square, AlertCircle, Eye, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
interface OrchestratorState {
  tool?: string;
  confirmed?: boolean;
  confirmationAttempts?: number;
  messages: Array<{
    role: string;
    content: string;
  }>;
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
  const [conversations, setConversations] = useState<any[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<any>(null);
  const [orchestratorDebugInfo, setOrchestratorDebugInfo] = useState<ConversationDebugInfo | null>(null);
  const [isLoadingDebug, setIsLoadingDebug] = useState(false);
  const [showDebugModal, setShowDebugModal] = useState(false);
  const {
    sessions,
    clearSessions
  } = useChatLogger();
  const saveDeepSeekKey = async () => {
    if (!deepseekKey.trim()) {
      toast.error("Please enter a DeepSeek API key");
      return;
    }
    setIsLoading(true);
    try {
      const {
        error
      } = await supabase.functions.invoke('save-ai-key', {
        body: {
          provider: 'deepseek',
          apiKey: deepseekKey.trim()
        }
      });
      if (error) throw error;
      toast.success('DeepSeek API key saved successfully');
      setDeepseekKey("");
    } catch (error: any) {
      console.error('Error saving DeepSeek key:', error);
      toast.error(`Failed to save API key: ${error.message || 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };
  const fetchApiLogs = async () => {
    try {
      const {
        data,
        error
      } = await supabase.from('agent_tool_logs').select('*').order('invoked_at', {
        ascending: false
      }).limit(50);
      if (error) throw error;
      setApiLogs(data || []);
    } catch (error) {
      console.error('Error fetching API logs:', error);
    }
  };
  const fetchChatHistory = async () => {
    try {
      const {
        data,
        error
      } = await supabase.from('ai_conversations').select(`
          *,
          ai_messages (
            id,
            role,
            content,
            created_at,
            api_logs
          )
        `).order('created_at', {
        ascending: false
      }).limit(20);
      if (error) throw error;
      setChatHistory(data || []);
    } catch (error) {
      console.error('Error fetching chat history:', error);
    }
  };
  const fetchConversations = async () => {
    try {
      const {
        data,
        error
      } = await supabase.from('ai_conversations').select(`
          *,
          ai_messages (
            id,
            role,
            content,
            created_at,
            api_logs
          )
        `).order('created_at', {
        ascending: false
      }).limit(50);
      if (error) throw error;
      setConversations(data || []);
    } catch (error) {
      console.error('Error fetching conversations:', error);
      toast.error('Failed to fetch conversations');
    }
  };
  const openConversationDebug = async (conversation: any) => {
    setSelectedConversation(conversation);
    setShowDebugModal(true);

    // Load debug info for this conversation
    const messages = conversation.ai_messages || [];
    const conversationMessages = messages.map((m: any) => ({
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
    const apiCallsForConversation = messages.filter((m: any) => m.api_logs && Object.keys(m.api_logs).length > 0).map((m: any) => {
      const apiLogs = m.api_logs as Record<string, any>;
      return {
        timestamp: m.created_at,
        operation: apiLogs && typeof apiLogs === 'object' && apiLogs.request?.operation || 'unknown',
        content: m.content,
        logs: m.api_logs
      };
    });
    const debugInfo: ConversationDebugInfo = {
      id: conversation.id,
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
  };
  useEffect(() => {
    fetchApiLogs();
    fetchChatHistory();
    fetchConversations();
    const interval = setInterval(() => {
      fetchApiLogs();
      fetchChatHistory();
      fetchConversations();
    }, 30000);
    return () => clearInterval(interval);
  }, []);
  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };
  const getStatusBadge = (status: string) => {
    const colors = {
      error: "bg-red-100 text-red-800",
      success: "bg-green-100 text-green-800",
      info: "bg-blue-100 text-blue-800",
      warning: "bg-yellow-100 text-yellow-800"
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
  const refreshData = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([fetchApiLogs(), fetchChatHistory(), fetchConversations()]);
      toast.success('Data refreshed successfully');
    } catch (error) {
      toast.error('Failed to refresh data');
    } finally {
      setIsRefreshing(false);
    }
  };
  const clearAllSessions = () => {
    clearSessions();
    toast.success('All chat sessions cleared');
  };
  return <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">AI Settings</h1>
        <Button onClick={refreshData} disabled={isRefreshing} className="flex items-center gap-2">
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh Data
        </Button>
      </div>

      <Tabs defaultValue="configuration" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="configuration">Configuration</TabsTrigger>
          <TabsTrigger value="api-logs">API Logs</TabsTrigger>
          <TabsTrigger value="chat-logs">Chat Logs</TabsTrigger>
          <TabsTrigger value="chat-history">Chat History</TabsTrigger>
          <TabsTrigger value="orchestrator">Orchestrator</TabsTrigger>
        </TabsList>

        <TabsContent value="configuration">
          <Card>
            <CardHeader>
              <CardTitle>DeepSeek Configuration</CardTitle>
              <CardDescription>
                Configure your DeepSeek API key for AI orchestrator functionality
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="deepseek-key" className="text-sm font-medium">
                  DeepSeek API Key
                </label>
                <Input id="deepseek-key" type="password" placeholder="Enter your DeepSeek API key" value={deepseekKey} onChange={e => setDeepseekKey(e.target.value)} />
              </div>
              <Button onClick={saveDeepSeekKey} disabled={isLoading} className="flex items-center gap-2">
                {isLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                Save API Key
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="api-logs">
          <Card>
            <CardHeader>
              <CardTitle>API Logs</CardTitle>
              <CardDescription>
                Recent API calls and their execution results ({apiLogs.length} entries)
              </CardDescription>
            </CardHeader>
            <CardContent className="overflow-hidden">
              <ScrollArea className="h-96">
                <div className="space-y-3">
                  {apiLogs.map(log => <div key={log.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{log.role}</Badge>
                          <span className="text-sm text-muted-foreground">
                            {formatTimestamp(log.created_at)}
                          </span>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">Tool:</span>
                          <Badge variant="secondary">{log.tool_name}</Badge>
                        </div>
                        {log.success ? <div className="text-sm text-green-600">
                            ✅ Success ({log.execution_time_ms}ms)
                          </div> : <div className="text-sm text-red-600">
                            ❌ Failed: {log.error_message}
                          </div>}
                        <div className="text-xs text-muted-foreground bg-muted p-2 rounded max-h-32 overflow-y-auto">
                          <pre className="whitespace-pre-wrap">
                            {JSON.stringify(log.parameters, null, 2)}
                          </pre>
                        </div>
                        {log.result && <div className="text-xs text-muted-foreground bg-muted p-2 rounded max-h-32 overflow-y-auto">
                            <strong>Result:</strong>
                            <pre className="whitespace-pre-wrap">
                              {JSON.stringify(log.result, null, 2)}
                            </pre>
                          </div>}
                      </div>
                    </div>)}
                  
                  {apiLogs.length === 0 && <div className="text-center py-8 text-muted-foreground">
                      No API logs found. Start using the AI tools to see activity here.
                    </div>}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="chat-logs">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Chat Logs
                <Button onClick={clearAllSessions} variant="outline" size="sm" className="flex items-center gap-2">
                  <Trash2 className="h-4 w-4" />
                  Clear All
                </Button>
              </CardTitle>
              <CardDescription>
                Real-time conversation activity and session management ({sessions.length} sessions)
              </CardDescription>
            </CardHeader>
            <CardContent className="overflow-hidden">
              <ScrollArea className="h-96">
                <div className="space-y-4">
                  {sessions.map(session => <div key={session.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Badge className={getStatusBadge(session.status)}>
                            {session.status}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            {formatTimestamp(session.startTime)}
                          </span>
                        </div>
                      </div>
                      
                      <div className="space-y-1">
                        {session.entries.slice(0, 10).map((entry, index) => <div key={index} className="text-sm">
                             <div className="flex items-center gap-2 mb-1">
                               <Badge variant="outline" className="text-xs">
                                 {entry.type}
                               </Badge>
                              <span className="font-medium truncate">{entry.action}</span>
                              <span className="text-muted-foreground text-xs shrink-0">
                                {formatTimestamp(entry.timestamp)}
                              </span>
                            </div>
                            <p className="text-muted-foreground ml-2 break-words overflow-wrap-anywhere">{entry.details}</p>
                          </div>)}
                        
                        {session.entries.length > 10 && <p className="text-sm text-muted-foreground mt-2">
                            ... and {session.entries.length - 10} more entries
                          </p>}
                      </div>
                      
                      <Separator className="my-2" />
                    </div>)}
                  
                  {sessions.length === 0 && <div className="text-center py-8 text-muted-foreground">
                      No chat sessions found. Start a conversation to see activity logs here.
                    </div>}
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
              <ScrollArea className="h-96">
                <div className="space-y-4">
                  {chatHistory.map(conversation => <div key={conversation.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                        <h3 className="font-medium truncate">{conversation.title}</h3>
                        <span className="text-sm text-muted-foreground shrink-0">
                          {formatTimestamp(conversation.created_at)}
                        </span>
                      </div>
                      
                      <div className="space-y-2">
                        {conversation.ai_messages && conversation.ai_messages.length > 0 && <div className="text-sm text-muted-foreground">
                            {conversation.ai_messages.length} messages
                          </div>}
                        
                        {conversation.ai_messages?.slice(0, 3).map((message: any) => <div key={message.id} className="text-sm border-l-2 border-muted pl-3">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="outline" className="text-xs">
                                {message.role}
                              </Badge>
                              <span className="text-muted-foreground text-xs shrink-0">
                                {formatTimestamp(message.created_at)}
                              </span>
                            </div>
                            <div className="text-muted-foreground ml-2 overflow-hidden">
                              <p className="line-clamp-2 break-words overflow-wrap-anywhere">
                                {message.content.length > 100 ? `${message.content.substring(0, 100)}...` : message.content}
                              </p>
                            </div>
                          </div>)}
                        
                        {conversation.ai_messages?.length > 3 && <p className="text-xs text-muted-foreground">
                            ... and {conversation.ai_messages.length - 3} more messages
                          </p>}
                      </div>
                    </div>)}
                  
                  {chatHistory.length === 0 && <div className="text-center py-8 text-muted-foreground">
                      No conversation history found. Start a conversation to see history here.
                    </div>}
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
              {/* Conversation List */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Recent Conversations</h3>
                <ScrollArea className="h-64 border rounded-lg">
                  <div className="space-y-2 p-4">
                    {conversations.map(conversation => <div key={conversation.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 cursor-pointer" onClick={() => openConversationDebug(conversation)}>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium truncate">{conversation.title}</h4>
                          <p className="text-sm text-muted-foreground">
                            {conversation.ai_messages?.length || 0} messages • {formatTimestamp(conversation.created_at)}
                          </p>
                        </div>
                        <Button size="sm" variant="outline" className="flex items-center gap-1">
                          <Eye className="h-3 w-3" />
                          Debug
                        </Button>
                      </div>)}
                    {conversations.length === 0 && <div className="text-center py-8 text-muted-foreground">
                        <AlertCircle className="h-8 w-8 mx-auto mb-2" />
                        <p>No conversations found. Start a conversation to see debug information.</p>
                      </div>}
                  </div>
                </ScrollArea>
              </div>
            </CardContent>
          </Card>

          {/* Debug Modal */}
          <Dialog open={showDebugModal} onOpenChange={setShowDebugModal}>
            <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
              <DialogHeader>
                <DialogTitle className="flex items-center justify-between">
                  <span>Orchestrator Debug: {selectedConversation?.title}</span>
                  
                </DialogTitle>
              </DialogHeader>
              
              {orchestratorDebugInfo && <Tabs defaultValue="logs" className="h-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="logs">Conversation Logs</TabsTrigger>
                    <TabsTrigger value="instructions">API Instructions</TabsTrigger>
                  </TabsList>

                  <TabsContent value="logs" className="mt-4">
                    <ScrollArea className="h-[60vh]">
                      <div className="space-y-4 pr-4">
                        {/* Current State Summary */}
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-sm">Current Orchestrator State</CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-2">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <span className="font-medium">Tool:</span>
                                <Badge variant="outline" className="ml-2">
                                  {orchestratorDebugInfo.state.tool || 'None'}
                                </Badge>
                              </div>
                              <div>
                                <span className="font-medium">Confirmed:</span>
                                <Badge variant={orchestratorDebugInfo.state.confirmed ? "default" : "secondary"} className="ml-2">
                                  {orchestratorDebugInfo.state.confirmed ? 'Yes' : 'No'}
                                </Badge>
                              </div>
                              <div>
                                <span className="font-medium">Instruction Type:</span>
                                <Badge className={`ml-2 ${getInstructionTypeBadge(orchestratorDebugInfo.instructionType)}`}>
                                  {orchestratorDebugInfo.instructionType}
                                </Badge>
                              </div>
                              <div>
                                <span className="font-medium">Attempts:</span>
                                <Badge variant="outline" className="ml-2">
                                  {orchestratorDebugInfo.state.confirmationAttempts || 0}
                                </Badge>
                              </div>
                            </div>
                          </CardContent>
                        </Card>

                        {/* Conversation Messages */}
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-sm">Conversation Messages</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-3">
                              {orchestratorDebugInfo.state.messages.map((message, index) => <div key={index} className="flex gap-2 text-sm">
                                  <Badge variant={message.role === 'user' ? 'default' : 'secondary'}>
                                    {message.role}
                                  </Badge>
                                  <div className="flex-1 bg-muted p-2 rounded text-xs">
                                    {message.content}
                                  </div>
                                </div>)}
                            </div>
                          </CardContent>
                        </Card>

                        {/* API Call History */}
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-sm">API Call History</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-3">
                              {orchestratorDebugInfo.apiCalls.map((call, index) => <div key={index} className="border rounded p-3">
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
                                </div>)}
                              {orchestratorDebugInfo.apiCalls.length === 0 && <p className="text-sm text-muted-foreground">No API calls found for this conversation</p>}
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    </ScrollArea>
                  </TabsContent>

                  <TabsContent value="instructions" className="mt-4">
                    <ScrollArea className="h-[60vh]">
                      <div className="space-y-4 pr-4">
                        {/* Instruction Logic */}
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-sm flex items-center gap-2">
                              Current Instruction Logic
                              {orchestratorDebugInfo.instructionType === 'tool_selection' && <AlertCircle className="h-4 w-4 text-yellow-500" />}
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            <div className="text-sm">
                              <div className="mb-2">
                                <span className="font-medium">Decision Path:</span>
                                <Badge className={`ml-2 ${getInstructionTypeBadge(orchestratorDebugInfo.instructionType)}`}>
                                  {orchestratorDebugInfo.instructionType}
                                </Badge>
                              </div>
                              <div className="bg-muted p-3 rounded text-xs">
                                {orchestratorDebugInfo.instructionType === 'tool_selection' ? <div>
                                    <p className="font-medium mb-2">Logic: !state.tool (no tool selected yet)</p>
                                    <p>The orchestrator will ask DeepSeek to analyze the conversation and select an appropriate tool.</p>
                                  </div> : orchestratorDebugInfo.instructionType === 'confirmation' ? <div>
                                    <p className="font-medium mb-2">Logic: state.tool exists but !state.confirmed</p>
                                    <p>The orchestrator will ask DeepSeek to confirm if the user wants to proceed with {orchestratorDebugInfo.state.tool}.</p>
                                  </div> : <div>
                                    <p className="font-medium mb-2">Logic: No specific path</p>
                                    <p>The conversation doesn't match expected orchestrator patterns.</p>
                                  </div>}
                              </div>
                            </div>
                          </CardContent>
                        </Card>

                        {/* Next DeepSeek Instruction */}
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-sm">Next DeepSeek Instruction</CardTitle>
                            <CardDescription className="text-xs">
                              This is the exact instruction that would be sent to DeepSeek on the next API call
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

                        {/* Tool Pattern Analysis */}
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-sm">Tool Pattern Analysis</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="text-xs space-y-2">
                              <div className="grid grid-cols-1 gap-2">
                                <div className="p-2 bg-muted rounded">
                                  <span className="font-medium">register_client:</span> /register[_\s]client|client[_\s]registration|register.*client/i
                                </div>
                                <div className="p-2 bg-muted rounded">
                                  <span className="font-medium">create_connection:</span> /create[_\s]connection|connection|connect|linking/i
                                </div>
                                <div className="p-2 bg-muted rounded">
                                  <span className="font-medium">build_dashboard:</span> /build[_\s]dashboard|dashboard|report|analytics/i
                                </div>
                                <div className="p-2 bg-muted rounded">
                                  <span className="font-medium">ai-chat:</span> /ai[_\s]chat|general|conversation|chat|question/i
                                </div>
                              </div>
                              {orchestratorDebugInfo.state.tool && <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded">
                                  <p className="text-green-800">
                                    ✓ Detected tool: <span className="font-medium">{orchestratorDebugInfo.state.tool}</span>
                                  </p>
                                </div>}
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    </ScrollArea>
                  </TabsContent>
                </Tabs>}
            </DialogContent>
          </Dialog>
        </TabsContent>
      </Tabs>
    </div>;
};
export default AISettings;