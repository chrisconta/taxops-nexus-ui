import { useState } from "react";
import { Search, Filter, Calendar, FileText, Download, MoreHorizontal } from "lucide-react";
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
    </div>
  );
};

export default Reports;