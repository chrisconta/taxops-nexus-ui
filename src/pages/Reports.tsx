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
import { useSearchParams } from "react-router-dom";
import { ChatWindow } from "@/components/chat/ChatWindow";

const Reports = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'reports';
  const [searchTerm, setSearchTerm] = useState("");
  const [generatingReport, setGeneratingReport] = useState<string | null>(null);
  const [generatedReports, setGeneratedReports] = useState<string[]>([]);
  const [selectedReport, setSelectedReport] = useState<any>(null);
  
  // AI Chat state for history tab
  const [conversations, setConversations] = useState<any[]>([]);
  
  const { toast } = useToast();

  const setActiveTab = (tab: string) => {
    const newSearchParams = new URLSearchParams(searchParams);
    if (tab === 'reports') {
      newSearchParams.delete('tab');
    } else {
      newSearchParams.set('tab', tab);
    }
    setSearchParams(newSearchParams);
  };

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
    if (activeTab === "history") {
      loadConversations();
    }
  }, [activeTab]);

  const loadConversations = async () => {
    try {
      const { data, error } = await supabase
        .from('ai_conversations')
        .select('id, title, updated_at')
        .order('updated_at', { ascending: false });
        
      if (error) throw error;
      setConversations(data || []);
    } catch (error) {
      console.error('Failed to load conversations:', error);
      toast({
        title: "Error",
        description: "Failed to load conversation history",
        variant: "destructive",
      });
    }
  };

  const handleGenerateReport = (report: any) => {
    setSelectedReport(report);
    setActiveTab('assistant');
  };

  const handleOpenConversation = (convId: string) => {
    const newSearchParams = new URLSearchParams(searchParams);
    newSearchParams.set('tab', 'assistant');
    newSearchParams.set('conv', convId);
    setSearchParams(newSearchParams);
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
          <Card className="flex-1 bg-glass-bg/50 backdrop-blur-xl border-glass-border shadow-glass overflow-hidden flex flex-col">
            {/* Chat Header */}
            <div className="p-6 border-b border-glass-border bg-gradient-to-r from-primary/10 to-primary/5">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-gradient-to-br from-primary to-primary/80 rounded-xl flex items-center justify-center animate-glow-pulse">
                  <Brain className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">AI Tax Assistant</h2>
                  <p className="text-sm text-taxops-gray-light">Ready to help you with your questions</p>
                </div>
              </div>
            </div>

            <ChatWindow />
          </Card>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="flex-1 flex flex-col mt-6">
          <Card className="flex-1 bg-glass-bg/30 border-glass-border">
            <div className="p-6">
              <h3 className="text-xl font-semibold text-white mb-6">Chat History</h3>
              
              <div className="space-y-4">
                {conversations.map((conv) => (
                  <Card 
                    key={conv.id} 
                    className="bg-glass-bg/20 border-glass-border hover:border-primary/30 transition-all cursor-pointer"
                    onClick={() => handleOpenConversation(conv.id)}
                  >
                    <div className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-primary/20 rounded-lg flex items-center justify-center">
                            <MessageSquare className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <h4 className="text-white font-medium">{conv.title}</h4>
                            <p className="text-sm text-taxops-gray-light">
                              {new Date(conv.updated_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
                
                {conversations.length === 0 && (
                  <div className="text-center py-8">
                    <MessageSquare className="w-12 h-12 text-taxops-gray-light mx-auto mb-3" />
                    <p className="text-taxops-gray-light text-sm">No conversations yet</p>
                    <Button 
                      className="mt-4 bg-primary hover:bg-primary/80"
                      onClick={() => setActiveTab('assistant')}
                    >
                      Start First Chat
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Reports;
