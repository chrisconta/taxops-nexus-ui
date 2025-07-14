import { useState } from "react";
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
import { deepseekChat } from "@/lib/deepseek";
const Reports = () => {
  const [activeTab, setActiveTab] = useState("reports");
  const [searchTerm, setSearchTerm] = useState("");
  const [generatingReport, setGeneratingReport] = useState<string | null>(null);
  const [generatedReports, setGeneratedReports] = useState<string[]>([]);
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
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
  const handleGenerateReport = (report: any) => {
    setSelectedReport(report);
    setActiveTab("assistant");

    // Initialize chat with contextual message
    const welcomeMessage = {
      id: Date.now(),
      type: "assistant",
      content: `Great! Let's generate your ${report.title}. ${report.description.split('.')[0]}. I'll guide you through the process. What specific information would you like to include?`,
      timestamp: new Date().toISOString()
    };
    setChatMessages([welcomeMessage]);
  };
  const handleSendMessage = async () => {
    if (!chatInput.trim() || isProcessing) return;
    
    const userMessage = {
      id: Date.now(),
      type: "user",
      content: chatInput,
      timestamp: new Date().toISOString()
    };
    
    setChatMessages(prev => [...prev, userMessage]);
    setChatInput("");
    setIsProcessing(true);

    try {
      // Get DeepSeek response
      const deepseekResponse = await deepseekChat(chatInput);
      
      // Parse SQL from response
      const sqlMatch = deepseekResponse.match(/```sql\n([\s\S]*?)\n```/);
      
      if (sqlMatch) {
        const sql = sqlMatch[1].trim();
        const explanation = deepseekResponse.replace(/```sql\n[\s\S]*?\n```/, '').trim();
        
        // Show AI explanation first
        const aiResponse = {
          id: Date.now() + 1,
          type: "assistant",
          content: explanation || "I've generated a SQL query to answer your question.",
          timestamp: new Date().toISOString()
        };
        setChatMessages(prev => [...prev, aiResponse]);
        
        // Execute SQL
        const { data, error } = await supabase.functions.invoke('execute-sql', {
          body: { sql }
        });
        
        if (error) {
          throw new Error(error.message);
        }
        
        // Show results
        const resultsMessage = {
          id: Date.now() + 2,
          type: "assistant",
          content: "",
          timestamp: new Date().toISOString(),
          sqlResults: data.rows || [],
          sql: sql
        };
        setChatMessages(prev => [...prev, resultsMessage]);
        
      } else {
        // Regular text response
        const aiResponse = {
          id: Date.now() + 1,
          type: "assistant", 
          content: deepseekResponse,
          timestamp: new Date().toISOString()
        };
        setChatMessages(prev => [...prev, aiResponse]);
      }
      
    } catch (error) {
      console.error('Error processing message:', error);
      
      const errorMessage = {
        id: Date.now() + 1,
        type: "assistant",
        content: `Sorry, I encountered an error: ${error.message}. ${error.message.includes('DeepSeek API key') ? 'Please configure your DeepSeek API key in Settings.' : ''}`,
        timestamp: new Date().toISOString(),
        error: true
      };
      setChatMessages(prev => [...prev, errorMessage]);
      
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };
  const filteredReports = reportCards.filter(report => report.title.toLowerCase().includes(searchTerm.toLowerCase()) || report.description.toLowerCase().includes(searchTerm.toLowerCase()));
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
  return <div className="h-full flex flex-col">
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
              <Input placeholder="Search reports..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10 bg-glass-bg/20 border-glass-border text-white placeholder:text-taxops-gray-light" />
            </div>
          </div>

          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredReports.map(report => {
            const Icon = report.icon;
            return <Card key={report.id} className="bg-glass-bg/30 border-glass-border hover:border-primary/30 transition-all duration-300 group hover:shadow-glow cursor-pointer">
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
                    
                    <Button className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-glow" onClick={() => handleGenerateReport(report)}>
                      <Icon className="w-4 h-4 mr-2" />
                      Generate
                    </Button>
                  </div>
                </Card>;
          })}
          </div>
        </TabsContent>

        {/* Assistant Tab */}
        <TabsContent value="assistant" className="flex-1 flex flex-col mt-6">
          <Card className="h-[600px] bg-glass-bg/50 backdrop-blur-xl border-glass-border shadow-glass overflow-hidden flex flex-col">
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
                    {selectedReport ? `Generating ${selectedReport.title}` : 'Ready to help you generate reports'}
                  </p>
                </div>
              </div>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {chatMessages.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <Brain className="w-16 h-16 text-taxops-gray-light mx-auto mb-4" />
                    <p className="text-taxops-gray-light mb-2">Ask me questions about your transaction data</p>
                    <p className="text-sm text-taxops-gray-light/70">
                      Try: "Show me all deposits over $1000 last month" or "Total expenses by category"
                    </p>
                  </div>
                </div>
              ) : (
                chatMessages.map(message => (
                  <div key={message.id} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-full ${message.type === 'user' ? 'max-w-xs lg:max-w-md' : 'max-w-4xl'}`}>
                      <div className={`px-4 py-2 rounded-2xl ${
                        message.type === 'user' 
                          ? 'bg-primary text-white' 
                          : message.error 
                            ? 'bg-red-900/20 border border-red-500/30 text-red-200'
                            : 'bg-glass-bg/30 border border-glass-border text-white'
                      }`}>
                        {message.content && <p className="whitespace-pre-wrap">{message.content}</p>}
                        
                        {/* SQL Results Table */}
                        {message.sqlResults && (
                          <div className="mt-4">
                            {message.sqlResults.length > 0 ? (
                              <>
                                {message.sqlResults.length <= 50 ? (
                                  <div className="bg-glass-bg/20 border border-glass-border rounded-lg overflow-hidden">
                                    <Table>
                                      <TableHeader>
                                        <TableRow>
                                          {Object.keys(message.sqlResults[0]).map((key) => (
                                            <TableHead key={key} className="text-white font-semibold">
                                              {key}
                                            </TableHead>
                                          ))}
                                        </TableRow>
                                      </TableHeader>
                                      <TableBody>
                                        {message.sqlResults.slice(0, 50).map((row: any, index: number) => (
                                          <TableRow key={index}>
                                            {Object.values(row).map((value: any, cellIndex: number) => (
                                              <TableCell key={cellIndex} className="text-white">
                                                {typeof value === 'number' && value > 1000000 
                                                  ? `$${(value / 100).toLocaleString()}` 
                                                  : String(value || '')}
                                              </TableCell>
                                            ))}
                                          </TableRow>
                                        ))}
                                      </TableBody>
                                    </Table>
                                    <div className="p-3 bg-glass-bg/10 border-t border-glass-border">
                                      <p className="text-sm text-taxops-gray-light">
                                        Showing {Math.min(50, message.sqlResults.length)} of {message.sqlResults.length} results
                                      </p>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="bg-glass-bg/20 border border-glass-border rounded-lg p-4">
                                    <p className="text-white mb-2">
                                      Found {message.sqlResults.length} results (too many to display)
                                    </p>
                                    <Button 
                                      size="sm" 
                                      onClick={() => {
                                        const csv = [
                                          Object.keys(message.sqlResults[0]).join(','),
                                          ...message.sqlResults.map((row: any) => 
                                            Object.values(row).map(v => `"${v}"`).join(',')
                                          )
                                        ].join('\n');
                                        const blob = new Blob([csv], { type: 'text/csv' });
                                        const url = URL.createObjectURL(blob);
                                        const a = document.createElement('a');
                                        a.href = url;
                                        a.download = 'query-results.csv';
                                        a.click();
                                      }}
                                    >
                                      <Download className="w-4 h-4 mr-2" />
                                      Download CSV
                                    </Button>
                                  </div>
                                )}
                              </>
                            ) : (
                              <div className="bg-glass-bg/20 border border-glass-border rounded-lg p-4">
                                <p className="text-taxops-gray-light">No results found</p>
                              </div>
                            )}
                          </div>
                        )}
                        
                        {/* Show SQL query if present */}
                        {message.sql && (
                          <details className="mt-2">
                            <summary className="text-sm text-taxops-gray-light cursor-pointer hover:text-white">
                              View SQL Query
                            </summary>
                            <pre className="mt-2 p-2 bg-glass-bg/20 rounded text-xs overflow-x-auto">
                              <code>{message.sql}</code>
                            </pre>
                          </details>
                        )}
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
                  placeholder="Ask about your transaction data..."
                  className="flex-1 bg-glass-bg/20 border-glass-border text-white placeholder:text-taxops-gray-light" 
                  onKeyPress={e => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                  disabled={isProcessing}
                />
                <Button 
                  onClick={handleSendMessage} 
                  disabled={!chatInput.trim() || isProcessing}
                >
                  {isProcessing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </div>
              
              {!selectedReport && (
                <div className="mt-3 p-3 bg-glass-bg/20 border border-glass-border rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-taxops-warning mt-0.5" />
                    <div className="text-sm">
                      <p className="text-white font-medium">Configure DeepSeek API Key</p>
                      <p className="text-taxops-gray-light">
                        To use AI-powered queries, please add your DeepSeek API key in{" "}
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
              )}
            </div>
          </Card>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="flex-1 flex flex-col mt-6">
          <Card className="flex-1 bg-glass-bg/30 border-glass-border">
            <div className="p-6">
              <h3 className="text-xl font-semibold text-white mb-6">Report History</h3>
              
              <div className="space-y-4">
                {historyItems.map(item => <Card key={item.id} className="bg-glass-bg/20 border-glass-border hover:border-primary/30 transition-all cursor-pointer">
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
                  </Card>)}
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>;
};
export default Reports;