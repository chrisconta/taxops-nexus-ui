import { useState } from "react";
import { Search, Filter, Calendar, FileText, Download, MoreHorizontal, MessageSquare, Bot, Users, Calculator, DollarSign, BarChart3, Loader2, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";

const mockReports = [
  // Empty for demonstration of empty state
];

const Reports = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedClient, setSelectedClient] = useState("");
  const [dateRange, setDateRange] = useState("");
  const [generatingReport, setGeneratingReport] = useState<string | null>(null);
  const [generatedReports, setGeneratedReports] = useState<string[]>([]);

  const reportCards = [
    {
      id: "monthly-tax",
      title: "Monthly Tax Report",
      description: "Summary of monthly tax obligations",
      icon: Calendar,
      color: "primary"
    },
    {
      id: "vendor-invoice",
      title: "Vendor Invoice Summary", 
      description: "List of invoices received by vendors",
      icon: FileText,
      color: "success"
    },
    {
      id: "isr-declaration",
      title: "ISR Declaration",
      description: "Standard ISR tax declaration",
      icon: Calculator,
      color: "warning"
    },
    {
      id: "payroll-summary",
      title: "Payroll Summary",
      description: "Employee payment breakdown",
      icon: Users,
      color: "purple"
    },
    {
      id: "vat-breakdown",
      title: "VAT Breakdown",
      description: "Breakdown of VAT from sales and purchases",
      icon: DollarSign,
      color: "orange"
    },
    {
      id: "annual-report",
      title: "Annual Report",
      description: "Consolidated tax data by fiscal year",
      icon: BarChart3,
      color: "primary"
    }
  ];

  const handleGenerateReport = async (reportId: string, reportTitle: string) => {
    setGeneratingReport(reportId);
    
    // Simulate processing
    setTimeout(() => {
      setGeneratingReport(null);
      setGeneratedReports(prev => [...prev, reportId]);
    }, 2000);
  };

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
      {/* Header */}
      <div className="space-y-2 mb-8">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-white to-taxops-gray-light bg-clip-text text-transparent">
          VALARIX AI Assistant
        </h1>
        <p className="text-lg text-taxops-gray-light">
          Generate reports using intelligent prompts
        </p>
      </div>

      {/* Main Chat Interface */}
      <div className="flex-1 flex flex-col">
        <Card className="flex-1 bg-glass-bg/50 backdrop-blur-xl border-glass-border shadow-glass overflow-hidden">
          {/* Chat Header */}
          <div className="p-6 border-b border-glass-border bg-gradient-to-r from-primary/10 to-primary/5">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-br from-primary to-primary/80 rounded-xl flex items-center justify-center animate-glow-pulse">
                <Bot className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">AI Tax Assistant</h2>
                <p className="text-sm text-taxops-gray-light">Ready to help you generate reports</p>
              </div>
            </div>
          </div>

          {/* Chat Messages Container */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Welcome Message */}
            <div className="flex items-start space-x-4">
              <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary/80 rounded-full flex items-center justify-center flex-shrink-0">
                <MessageSquare className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 max-w-2xl">
                <div className="bg-primary/10 rounded-2xl p-4 border border-primary/20 animate-slide-up">
                  <p className="text-white leading-relaxed">
                    Hi! I'm your AI tax assistant. You can generate any report below by clicking a button. 
                    Each report is tailored to your specific tax requirements and compliance needs.
                  </p>
                </div>
              </div>
            </div>

            {/* Report Cards as Chat Messages */}
            <div className="space-y-4">
              {reportCards.map((report, index) => {
                const Icon = report.icon;
                const isGenerating = generatingReport === report.id;
                const isGenerated = generatedReports.includes(report.id);
                
                return (
                  <div key={report.id} className="flex items-start space-x-4">
                    <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary/80 rounded-full flex items-center justify-center flex-shrink-0">
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1 max-w-2xl">
                      <Card 
                        className={`bg-glass-bg/30 border-glass-border hover:border-primary/30 transition-all duration-300 group hover:shadow-glow cursor-pointer animate-slide-up`}
                        style={{ animationDelay: `${index * 150}ms` }}
                        onClick={() => !isGenerating && !isGenerated && handleGenerateReport(report.id, report.title)}
                      >
                        <div className="p-5">
                          <div className="flex items-center space-x-4 mb-4">
                            <div className={`w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform`}>
                              <Icon className={`w-6 h-6 ${getCardIconColor(report.color)}`} />
                            </div>
                            <div className="flex-1">
                              <h3 className="text-lg font-semibold text-white group-hover:text-primary transition-colors">
                                {report.title}
                              </h3>
                              <p className="text-sm text-taxops-gray-light mt-1">{report.description}</p>
                            </div>
                          </div>
                          
                          <Button 
                            className={`w-full transition-all duration-300 ${
                              isGenerated 
                                ? "bg-taxops-success/20 text-taxops-success border-taxops-success/30 hover:bg-taxops-success/30" 
                                : "bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-glow"
                            }`}
                            disabled={isGenerating}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (!isGenerating && !isGenerated) {
                                handleGenerateReport(report.id, report.title);
                              }
                            }}
                          >
                            {isGenerating ? (
                              <div className="flex items-center space-x-2">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span>Generating...</span>
                              </div>
                            ) : isGenerated ? (
                              <div className="flex items-center space-x-2">
                                <CheckCircle className="w-4 h-4" />
                                <span>Download Report</span>
                              </div>
                            ) : (
                              <div className="flex items-center space-x-2">
                                <Icon className="w-4 h-4" />
                                <span>Generate {report.title}</span>
                              </div>
                            )}
                          </Button>
                        </div>
                      </Card>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Processing Messages */}
            {generatingReport && (
              <div className="flex items-start space-x-4">
                <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary/80 rounded-full flex items-center justify-center flex-shrink-0">
                  <MessageSquare className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 max-w-2xl">
                  <div className="bg-primary/10 rounded-2xl p-4 border border-primary/20 animate-slide-up">
                    <div className="flex items-center space-x-3">
                      <Loader2 className="w-5 h-5 animate-spin text-primary" />
                      <p className="text-white">
                        Generating your {reportCards.find(r => r.id === generatingReport)?.title}... 
                        This may take a few moments while I process your tax data.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Success Messages */}
            {generatedReports.map((reportId) => {
              const report = reportCards.find(r => r.id === reportId);
              if (!report) return null;
              
              return (
                <div key={`success-${reportId}`} className="flex items-start space-x-4">
                  <div className="w-10 h-10 bg-gradient-to-br from-taxops-success to-taxops-success/80 rounded-full flex items-center justify-center flex-shrink-0">
                    <CheckCircle className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 max-w-2xl">
                    <div className="bg-taxops-success/10 rounded-2xl p-4 border border-taxops-success/20 animate-slide-up">
                      <p className="text-white mb-3">
                        Great! Your <strong>{report.title}</strong> is ready for download.
                      </p>
                      <div className="flex gap-3">
                        <Button className="bg-taxops-success/20 text-taxops-success border-taxops-success/30 hover:bg-taxops-success/30">
                          <Download className="w-4 h-4 mr-2" />
                          Download PDF
                        </Button>
                        <Button variant="outline" className="border-taxops-success/30 text-taxops-success hover:bg-taxops-success/10">
                          <FileText className="w-4 h-4 mr-2" />
                          View Online
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Bottom Input Area */}
          <div className="p-6 border-t border-glass-border bg-glass-bg/30">
            <div className="relative max-w-2xl">
              <input 
                type="text" 
                placeholder="Voice and custom prompts coming soon! Click the cards above to generate reports."
                disabled
                className="w-full px-4 py-3 pr-20 bg-glass-bg/20 border border-glass-border rounded-xl text-white placeholder:text-taxops-gray-light/60 cursor-not-allowed focus:outline-none"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center space-x-2">
                <Button size="sm" variant="ghost" disabled className="h-8 w-8 p-0 cursor-not-allowed">
                  <MessageSquare className="w-4 h-4 text-taxops-gray-light" />
                </Button>
                <span className="text-xs bg-primary/20 text-primary px-2 py-1 rounded-full">Soon</span>
              </div>
            </div>
            <p className="text-xs text-taxops-gray-light mt-3 text-center max-w-2xl">
              🎤 Voice commands and custom report prompts are coming in the next update
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Reports;