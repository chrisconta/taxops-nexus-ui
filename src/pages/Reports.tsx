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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-foreground">Reports</h1>
          <p className="text-muted-foreground">Generate and manage your tax reports</p>
        </div>
        
        <Button className="gap-2">
          <FileText className="w-4 h-4" />
          Generate New Report
        </Button>
      </div>

      {/* Filters */}
      <Card className="p-6 bg-card/50 backdrop-blur border-glass-border">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Client Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Client</label>
            <Select value={selectedClient} onValueChange={setSelectedClient}>
              <SelectTrigger className="bg-input/50 border-border">
                <SelectValue placeholder="Select Client" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Clients</SelectItem>
                <SelectItem value="client1">COMISION ESTATAL DE AGUAS</SelectItem>
                <SelectItem value="client2">Empresa Example S.A.</SelectItem>
                <SelectItem value="client3">Consultores ABC</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Date Range */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Date Range</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Select Date Range"
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="pl-10 bg-input/50 border-border"
              />
            </div>
          </div>

          {/* Search */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search by vendor or status..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-input/50 border-border"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 mt-4">
          <Button variant="outline" className="gap-2">
            <Filter className="w-4 h-4" />
            Advanced Filters
          </Button>
          <Button variant="outline" className="gap-2">
            <Download className="w-4 h-4" />
            Export Results
          </Button>
        </div>
      </Card>

      {/* Report Types Tabs */}
      <div className="flex gap-4 border-b border-border">
        <button className="px-4 py-2 text-primary border-b-2 border-primary font-medium">
          Purchase Orders
        </button>
        <button className="px-4 py-2 text-muted-foreground hover:text-foreground">
          Invoice Reports
        </button>
        <button className="px-4 py-2 text-muted-foreground hover:text-foreground">
          Tax Summaries
        </button>
        <button className="px-4 py-2 text-muted-foreground hover:text-foreground">
          Compliance Reports
        </button>
      </div>

      {/* Reports Table */}
      <Card className="bg-card/50 backdrop-blur border-glass-border">
        <div className="p-6">
          {mockReports.length > 0 ? (
            <>
              <div className="rounded-lg border border-border overflow-hidden">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left p-4 font-medium text-foreground">Vendor Name</th>
                      <th className="text-left p-4 font-medium text-foreground">Email</th>
                      <th className="text-left p-4 font-medium text-foreground">Total</th>
                      <th className="text-left p-4 font-medium text-foreground">Transaction Date</th>
                      <th className="text-left p-4 font-medium text-foreground">Status</th>
                      <th className="text-left p-4 font-medium text-foreground"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {mockReports.map((report: any) => (
                      <tr key={report.id} className="border-t border-border hover:bg-muted/20">
                        <td className="p-4 text-foreground font-medium">{report.vendorName}</td>
                        <td className="p-4 text-muted-foreground">{report.email}</td>
                        <td className="p-4 text-foreground">{report.total}</td>
                        <td className="p-4 text-muted-foreground">{report.date}</td>
                        <td className="p-4">
                          <Badge 
                            variant={report.status === "completed" ? "default" : "secondary"}
                            className={
                              report.status === "completed" 
                                ? "bg-taxops-success/20 text-taxops-success border-taxops-success/30"
                                : "bg-taxops-warning/20 text-taxops-warning border-taxops-warning/30"
                            }
                          >
                            {report.status}
                          </Badge>
                        </td>
                        <td className="p-4">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                              <DropdownMenuItem>View Report</DropdownMenuItem>
                              <DropdownMenuItem>Download PDF</DropdownMenuItem>
                              <DropdownMenuItem>Download Excel</DropdownMenuItem>
                              <DropdownMenuItem>Send Email</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div className="text-center py-16">
              <FileText className="w-16 h-16 text-muted-foreground mx-auto mb-6" />
              <h3 className="text-xl font-semibold text-foreground mb-3">No records available</h3>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                Try adjusting filters or connecting a data source to start generating reports.
              </p>
              <div className="flex items-center justify-center gap-3">
                <Button variant="outline" className="gap-2">
                  <Filter className="w-4 h-4" />
                  Adjust Filters
                </Button>
                <Button className="gap-2">
                  <FileText className="w-4 h-4" />
                  Connect Data Source
                </Button>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4 bg-card/30 border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-taxops-success/20 rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-taxops-success" />
            </div>
            <div>
              <h3 className="font-medium text-foreground">Monthly Report</h3>
              <p className="text-sm text-muted-foreground">Generate monthly summary</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-card/30 border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-taxops-warning/20 rounded-lg flex items-center justify-center">
              <Download className="w-5 h-5 text-taxops-warning" />
            </div>
            <div>
              <h3 className="font-medium text-foreground">Bulk Export</h3>
              <p className="text-sm text-muted-foreground">Export all data</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-card/30 border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/20 rounded-lg flex items-center justify-center">
              <Calendar className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-medium text-foreground">Scheduled Reports</h3>
              <p className="text-sm text-muted-foreground">Manage schedules</p>
            </div>
          </div>
        </Card>
      </div>

      {/* VALARIX AI Assistant Panel */}
      <div className="fixed bottom-6 right-6 w-96 z-50">
        <Card className="bg-glass-bg/95 backdrop-blur-xl border-glass-border shadow-glow-lg overflow-hidden">
          {/* Header */}
          <div className="p-4 border-b border-glass-border bg-gradient-to-r from-primary/10 to-primary/5">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-br from-primary to-primary/80 rounded-full flex items-center justify-center animate-glow-pulse">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-white">VALARIX AI Assistant</h3>
            </div>
          </div>

          {/* Chat Container */}
          <div className="max-h-96 overflow-y-auto p-4 space-y-4">
            {/* Welcome Message */}
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-gradient-to-br from-primary to-primary/80 rounded-full flex items-center justify-center flex-shrink-0">
                <MessageSquare className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1">
                <div className="bg-primary/10 rounded-lg p-3 border border-primary/20">
                  <p className="text-sm text-white leading-relaxed">
                    Hi! I'm your AI assistant. I can help you generate any report instantly. Just choose one below to get started.
                  </p>
                </div>
              </div>
            </div>

            {/* Report Cards */}
            <div className="space-y-3">
              {reportCards.map((report) => {
                const Icon = report.icon;
                const isGenerating = generatingReport === report.id;
                const isGenerated = generatedReports.includes(report.id);
                
                return (
                  <div key={report.id} className="bg-glass-bg/30 rounded-lg border border-glass-border hover:border-primary/30 transition-all duration-300 group hover:shadow-glow">
                    <div className="p-4">
                      <div className="flex items-center space-x-3 mb-3">
                        <div className={`w-10 h-10 rounded-lg bg-${report.color === 'primary' ? 'primary' : 'glass-bg'}/20 flex items-center justify-center group-hover:scale-110 transition-transform`}>
                          <Icon className={`w-5 h-5 ${getCardIconColor(report.color)}`} />
                        </div>
                        <div className="flex-1">
                          <h4 className="text-sm font-semibold text-white group-hover:text-primary transition-colors">
                            {report.title}
                          </h4>
                          <p className="text-xs text-taxops-gray-light">{report.description}</p>
                        </div>
                      </div>
                      
                      <Button 
                        className={`w-full text-xs transition-all duration-300 ${
                          isGenerated 
                            ? "bg-taxops-success/20 text-taxops-success border-taxops-success/30 hover:bg-taxops-success/30" 
                            : "bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-glow"
                        }`}
                        onClick={() => handleGenerateReport(report.id, report.title)}
                        disabled={isGenerating}
                      >
                        {isGenerating ? (
                          <div className="flex items-center space-x-2">
                            <Loader2 className="w-3 h-3 animate-spin" />
                            <span>Generating...</span>
                          </div>
                        ) : isGenerated ? (
                          <div className="flex items-center space-x-2">
                            <CheckCircle className="w-3 h-3" />
                            <span>View Report</span>
                          </div>
                        ) : (
                          "Generate"
                        )}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Processing Messages */}
            {generatingReport && (
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 bg-gradient-to-br from-primary to-primary/80 rounded-full flex items-center justify-center flex-shrink-0">
                  <MessageSquare className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1">
                  <div className="bg-primary/10 rounded-lg p-3 border border-primary/20">
                    <div className="flex items-center space-x-2">
                      <Loader2 className="w-4 h-4 animate-spin text-primary" />
                      <p className="text-sm text-white">
                        Generating your {reportCards.find(r => r.id === generatingReport)?.title}...
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Bottom Input (Disabled/Future) */}
          <div className="p-4 border-t border-glass-border bg-glass-bg/30">
            <div className="relative">
              <input 
                type="text" 
                placeholder="Voice and custom prompts coming soon!"
                disabled
                className="w-full px-3 py-2 bg-glass-bg/20 border border-glass-border rounded-lg text-sm text-taxops-gray-light placeholder:text-taxops-gray-light/60 cursor-not-allowed"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2">
                <span className="text-xs bg-primary/20 text-primary px-2 py-1 rounded-full">Soon</span>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Reports;