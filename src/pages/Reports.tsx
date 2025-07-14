import { useState, useEffect } from "react";
import { Search, Filter, Calendar, FileText, Download, MoreHorizontal, MessageSquare, Brain, Users, Calculator, DollarSign, BarChart3, Loader2, CheckCircle, Send, Mic, History, FileSpreadsheet, Building2, User, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const Reports = () => {
  const [activeTab, setActiveTab] = useState("reports");
  const [searchTerm, setSearchTerm] = useState("");
  const [generatingReport, setGeneratingReport] = useState<string | null>(null);
  const [generatedReports, setGeneratedReports] = useState<string[]>([]);
  const [selectedReport, setSelectedReport] = useState<any>(null);
  
  // AI Chat state
  const [conversations, setConversations] = useState<any[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  
  const { toast } = useToast();

  const reportCards = [{
    id: "form-1065",
    title: "Form 1065",
    description: "U.S. Return of Partnership Income. Informational return for partnerships. Requires financial statements and Schedule K-1s for each partner.",
    icon: Building2,
    color: "primary"
  }, {
    id: "form-1120",
    title: "Form 1120",
    description: "U.S. Corporation Income Tax Return. Annual return for C Corporations. Requires financials, taxable income reconciliation, adjustments, and prepayments.",
    icon: Building2,
    color: "success"
  }, {
    id: "form-1040",
    title: "Form 1040",
    description: "U.S. Individual Income Tax Return. Annual return for U.S. individuals (residents or citizens).",
    icon: User,
    color: "warning"
  }, {
    id: "profit-loss",
    title: "Profit and Loss Statement",
    description: "Summarized view of income and expenses.",
    icon: BarChart3,
    color: "purple"
  }, {
    id: "balance-sheet",
    title: "Balance Sheet Statement",
    description: "Snapshot of company's assets, liabilities, and equity.",
    icon: FileSpreadsheet,
    color: "orange"
  }, {
    id: "cash-flow",
    title: "Cash Flow Statement",
    description: "Tracks cash inflows and outflows across operations, investing, and financing.",
    icon: DollarSign,
    color: "primary"
  }];

  const historyItems = [{
    id: "hist-1",
    reportType: "Form 1120",
    clientName: "ABC Corp",
    timestamp: "2024-01-15 14:30",
    status: "completed"
  }, {
    id: "hist-2",
    reportType: "Form 1065",
    clientName: "XYZ Partnership",
    timestamp: "2024-01-14 10:15",
    status: "completed"
  }];

  // Load conversations on component mount
  useEffect(() => {
    if (activeTab === "assistant") {
      loadConversations();
    }
  }, [activeTab]);

  const loadConversations = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('list-conversations');
      if (error) throw error;
      setConversations(data.conversations || []);
    } catch (error) {
      console.error('Failed to load conversations:', error);
      toast({
        title: "Error",
        description: "Failed to load conversation history",
        variant: "destructive",
      });
    }
  };

  const loadMessages = async (conversationId: string) => {
    try {
      const response = await fetch(`https://zitderdjvqtadtwgatmm.supabase.co/functions/v1/get-conversation-messages?conversation_id=${conversationId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch messages');
      }
      
      const data = await response.json();
      setMessages(data.messages || []);
      setActiveConversationId(conversationId);
    } catch (error) {
      console.error('Failed to load messages:', error);
      toast({
        title: "Error",
        description: "Failed to load conversation messages",
        variant: "destructive",
      });
    }
  };

  const startNewChat = () => {
    setActiveConversationId(null);
    setMessages([]);
  };

  const handleGenerateReport = (report: any) => {
    setSelectedReport(report);
    setActiveTab("assistant");
  };

  const handleSendMessage = async () => {
    if (!chatInput.trim() || isProcessing || chatInput.length > 2000) return;
    
    const userMessage = chatInput.trim();
    setChatInput("");
    setIsProcessing(true);

    try {
      const { data, error } = await supabase.functions.invoke('ai-chat', {
        body: { 
          message: userMessage,
          conversation_id: activeConversationId
        }
      });

      if (error) throw error;

      // If this was a new conversation, set the active conversation ID
      if (!activeConversationId) {
        setActiveConversationId(data.conversation_id);
      }

      // Reload conversations to update the list
      await loadConversations();
      
      // Reload messages for the current conversation
      await loadMessages(data.conversation_id);

    } catch (error) {
      console.error('Chat error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to send message',
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredReports = reportCards.filter(report => 
    report.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    report.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getCardIconColor = (color: string) => {
    const colors = {
      primary: "text-primary",
      success: "text-taxops-success",
      warning: "text-taxops-warning",
      purple: "text-purple-400",
      orange: "text-orange-400"
    };
    return colors[color as keyof typeof colors] || "text-primary";
  };

  return (
    <div className="h-full flex flex-col">
      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsList className="grid w-full grid-cols-3 bg-glass-bg/50 border border-glass-border">
          <TabsTrigger value="reports" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
            <FileText className="w-4 h-4 mr-2" />
            Reports
          </TabsTrigger>
          <TabsTrigger value="assistant" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
            <Brain className="w-4 h-4 mr-2" />
            Assistant
          </TabsTrigger>
          <TabsTrigger value="history" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
            <History className="w-4 h-4 mr-2" />
            History
          </TabsTrigger>
        </TabsList>

        {/* Reports Tab */}
        <TabsContent value="reports" className="flex-1 flex flex-col mt-6">
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-taxops-gray-light w-4 h-4" />
              <Input 
                placeholder="Search reports..." 
                value={searchTerm} 
                onChange={e => setSearchTerm(e.target.value)} 
                className="pl-10 bg-glass-bg/20 border-glass-border text-white placeholder:text-taxops-gray-light" 
              />
            </div>
          </div>

          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredReports.map(report => {
              const Icon = report.icon;
              return (
                <Card key={report.id} className="bg-glass-bg/30 border-glass-border hover:border-primary/30 transition-all duration-300 group hover:shadow-glow cursor-pointer">
                  <div className="p-6">
                    <div className="flex items-center space-x-4 mb-4">
                      <div className={`w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform`}>
                        <Icon className={`w-6 h-6 ${getCardIconColor(report.color)}`} />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-white group-hover:text-primary transition-colors">
                          {report.title}
                        </h3>
                      </div>
                    </div>
                    
                    <p className="text-sm text-taxops-gray-light mb-4 line-clamp-3">
                      {report.description}
                    </p>
                    
                    <Button 
                      className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-glow" 
                      onClick={() => handleGenerateReport(report)}
                    >
                      <Icon className="w-4 h-4 mr-2" />
                      Generate
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* Assistant Tab */}
        <TabsContent value="assistant" className="flex-1 flex flex-col mt-6">
          <div className="flex gap-6 h-[600px]">
            {/* Sidebar - Conversation History */}
            <Card className="w-80 bg-glass-bg/50 backdrop-blur-xl border-glass-border shadow-glass overflow-hidden flex flex-col">
              <div className="p-4 border-b border-glass-border">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold text-white">Chat History</h3>
                  <Button 
                    size="sm" 
                    onClick={startNewChat}
                    className="bg-primary hover:bg-primary/80"
                  >
                    New Chat
                  </Button>
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {conversations.map((conv) => (
                  <div
                    key={conv.id}
                    onClick={() => loadMessages(conv.id)}
                    className={`p-3 rounded-lg cursor-pointer transition-all ${
                      activeConversationId === conv.id
                        ? 'bg-primary/20 border border-primary/30'
                        : 'bg-glass-bg/20 border border-glass-border hover:bg-glass-bg/30'
                    }`}
                  >
                    <p className="text-white font-medium text-sm truncate">{conv.title}</p>
                    <p className="text-taxops-gray-light text-xs mt-1">
                      {new Date(conv.updated_at).toLocaleDateString()}
                    </p>
                  </div>
                ))}
                
                {conversations.length === 0 && (
                  <div className="text-center py-8">
                    <MessageSquare className="w-12 h-12 text-taxops-gray-light mx-auto mb-3" />
                    <p className="text-taxops-gray-light text-sm">No conversations yet</p>
                  </div>
                )}
              </div>
            </Card>

            {/* Main Chat Panel */}
            <Card className="flex-1 bg-glass-bg/50 backdrop-blur-xl border-glass-border shadow-glass overflow-hidden flex flex-col">
              {/* Chat Header */}
              <div className="p-6 border-b border-glass-border bg-gradient-to-r from-primary/10 to-primary/5">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-primary to-primary/80 rounded-xl flex items-center justify-center animate-glow-pulse">
                    <Brain className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">
                      {selectedReport ? `${selectedReport.title} Assistant` : 'AI Tax Assistant'}
                    </h2>
                    <p className="text-sm text-taxops-gray-light">
                      {selectedReport ? `Generating ${selectedReport.title}` : 'Ready to help you with your questions'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Chat Messages */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {messages.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <Brain className="w-16 h-16 text-taxops-gray-light mx-auto mb-4" />
                      <p className="text-taxops-gray-light mb-2">Start a conversation with the AI assistant</p>
                      <p className="text-sm text-taxops-gray-light/70">
                        Ask anything and I'll help you with your questions!
                      </p>
                    </div>
                  </div>
                ) : (
                  messages.map(message => (
                    <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-full ${message.role === 'user' ? 'max-w-xs lg:max-w-md' : 'max-w-4xl'}`}>
                        <div className={`px-4 py-2 rounded-2xl ${
                          message.role === 'user' 
                            ? 'bg-primary text-white' 
                            : 'bg-glass-bg/30 border border-glass-border text-white'
                        }`}>
                          <p className="whitespace-pre-wrap">{message.content}</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Chat Input */}
              <div className="p-6 border-t border-glass-border bg-glass-bg/30">
                <div className="flex space-x-3">
                  <Input 
                    value={chatInput} 
                    onChange={e => setChatInput(e.target.value)} 
                    placeholder="Type your message... (max 2000 chars)"
                    className="flex-1 bg-glass-bg/20 border-glass-border text-white placeholder:text-taxops-gray-light" 
                    onKeyPress={e => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                    disabled={isProcessing}
                    maxLength={2000}
                  />
                  <Button 
                    onClick={handleSendMessage} 
                    disabled={!chatInput.trim() || isProcessing || chatInput.length > 2000}
                  >
                    {isProcessing ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </Button>
                </div>
                
                <div className="flex justify-between text-xs text-taxops-gray-light mt-2">
                  <span>{chatInput.length}/2000 characters</span>
                  {activeConversationId && (
                    <span>Conversation active</span>
                  )}
                </div>
                
                <div className="mt-3 p-3 bg-glass-bg/20 border border-glass-border rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-taxops-warning mt-0.5" />
                    <div className="text-sm">
                      <p className="text-white font-medium">Configure DeepSeek API Key</p>
                      <p className="text-taxops-gray-light">
                        To use AI-powered chat, please add your DeepSeek API key in{" "}
                        <Button 
                          variant="link" 
                          className="p-0 h-auto text-primary hover:text-primary/80"
                          onClick={() => window.location.href = '/settings/ai'}
                        >
                          Settings
                        </Button>
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="flex-1 flex flex-col mt-6">
          <Card className="flex-1 bg-glass-bg/30 border-glass-border">
            <div className="p-6">
              <h3 className="text-xl font-semibold text-white mb-6">Report History</h3>
              
              <div className="space-y-4">
                {historyItems.map(item => (
                  <Card key={item.id} className="bg-glass-bg/20 border-glass-border hover:border-primary/30 transition-all cursor-pointer">
                    <div className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-semibold text-white">{item.reportType}</h4>
                          <p className="text-sm text-taxops-gray-light">{item.clientName}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-taxops-gray-light">{item.timestamp}</p>
                          <Badge variant="outline" className="text-taxops-success border-taxops-success">
                            {item.status}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Reports;