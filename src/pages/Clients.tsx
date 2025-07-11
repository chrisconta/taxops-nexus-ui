import { useState } from "react";
import { Search, Plus, Download, MoreHorizontal, AlertTriangle, Shield, CheckCircle, XCircle, Users, AlertCircle, Clock, Activity } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Mock data
const clients = [
  {
    id: 1,
    name: "Acme Corporation",
    email: "admin@acme.com",
    rfc: "ACM850101ABC",
    certificates: {
      fiel: "valid",
      csd: "expired",
      ciec: "valid"
    },
    satStatus: "active",
    lastSync: "2024-01-15"
  },
  {
    id: 2,
    name: "TechStart Solutions",
    email: "contact@techstart.mx",
    rfc: "TSS901201XYZ",
    certificates: {
      fiel: "valid",
      csd: "valid",
      ciec: "invalid"
    },
    satStatus: "rejected",
    lastSync: "2024-01-14"
  },
  {
    id: 3,
    name: "Global Imports SA",
    email: "info@globalimports.com",
    rfc: "GIM751215DEF",
    certificates: {
      fiel: "expired",
      csd: "valid",
      ciec: "valid"
    },
    satStatus: "pending",
    lastSync: "2024-01-13"
  }
];

const metrics = [
  {
    title: "Total Clients",
    value: "124",
    change: "+12%",
    icon: Users,
    color: "blue"
  },
  {
    title: "Active Clients",
    value: "98",
    change: "+8%",
    icon: CheckCircle,
    color: "green"
  },
  {
    title: "Invalid Certificates",
    value: "7",
    change: "-2",
    icon: AlertTriangle,
    color: "orange"
  },
  {
    title: "Pending Sync",
    value: "15",
    change: "+3",
    icon: Clock,
    color: "purple"
  }
];

const Clients = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedAccountant, setSelectedAccountant] = useState("");

  const getCertificateIcon = (status: string) => {
    switch (status) {
      case "valid":
        return <CheckCircle className="w-4 h-4 text-taxops-success" />;
      case "expired":
        return <AlertCircle className="w-4 h-4 text-taxops-warning" />;
      case "invalid":
        return <XCircle className="w-4 h-4 text-taxops-error" />;
      default:
        return <AlertTriangle className="w-4 h-4 text-taxops-gray-light" />;
    }
  };

  const getSatStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-taxops-success/20 text-taxops-success border-taxops-success/30">Active</Badge>;
      case "rejected":
        return <Badge className="bg-taxops-error/20 text-taxops-error border-taxops-error/30">Rejected</Badge>;
      case "pending":
        return <Badge className="bg-taxops-warning/20 text-taxops-warning border-taxops-warning/30">Pending</Badge>;
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  const getMetricColor = (color: string) => {
    const colors = {
      blue: "text-primary",
      green: "text-taxops-success",
      orange: "text-taxops-warning",
      purple: "text-purple-400"
    };
    return colors[color as keyof typeof colors] || "text-primary";
  };

  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.rfc.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-slide-up">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-white to-taxops-gray-light bg-clip-text text-transparent">
          Client Management
        </h1>
        <p className="text-lg text-taxops-gray-light">
          Manage your clients and their tax compliance status
        </p>
      </div>

      {/* Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {metrics.map((metric, index) => {
          const Icon = metric.icon;
          return (
            <Card
              key={metric.title}
              className={`p-6 bg-glass-bg/50 backdrop-blur-sm border-glass-border hover:border-primary/30 transition-all duration-300 group hover:shadow-glow animate-slide-up`}
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <p className="text-sm text-taxops-gray-light">{metric.title}</p>
                  <p className="text-3xl font-bold text-white">{metric.value}</p>
                  <p className={`text-sm ${metric.change.startsWith('+') ? 'text-taxops-success' : 'text-taxops-error'}`}>
                    {metric.change} from last month
                  </p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <Icon className={`w-6 h-6 ${getMetricColor(metric.color)}`} />
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Controls */}
      <Card className="p-6 bg-glass-bg/50 backdrop-blur-sm border-glass-border">
        <div className="flex flex-col lg:flex-row gap-4 lg:items-center lg:justify-between">
          <div className="flex flex-col sm:flex-row gap-4 flex-1">
            <Select value={selectedAccountant} onValueChange={setSelectedAccountant}>
              <SelectTrigger className="w-full sm:w-64 bg-glass-bg/30 border-glass-border">
                <SelectValue placeholder="Select Accountant" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Accountants</SelectItem>
                <SelectItem value="maria">María González</SelectItem>
                <SelectItem value="carlos">Carlos Rodriguez</SelectItem>
                <SelectItem value="ana">Ana Martinez</SelectItem>
              </SelectContent>
            </Select>
            
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-taxops-gray-light" />
              <Input
                placeholder="Search client..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-glass-bg/30 border-glass-border"
              />
            </div>
          </div>
          
          <div className="flex gap-3">
            <Button variant="outline" className="gap-2 hover:bg-glass-bg/50 transition-all duration-300 group">
              <Download className="w-4 h-4 group-hover:scale-110 transition-transform" />
              Download Client List
            </Button>
            <Button className="gap-2 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-glow transition-all duration-300 group">
              <Plus className="w-4 h-4 group-hover:scale-110 transition-transform" />
              Add Client
            </Button>
          </div>
        </div>
      </Card>

      {/* Client Cards */}
      <div className="space-y-4">
        {filteredClients.length > 0 ? (
          filteredClients.map((client, index) => (
            <Card
              key={client.id}
              className={`p-6 bg-glass-bg/50 backdrop-blur-sm border-glass-border hover:border-primary/30 transition-all duration-300 group hover:shadow-glow animate-slide-up`}
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-6 flex-1">
                  {/* Client Info */}
                  <div className="space-y-1">
                    <h3 className="text-lg font-semibold text-white group-hover:text-primary transition-colors">
                      {client.name}
                    </h3>
                    <p className="text-sm text-taxops-gray-light">{client.email}</p>
                    <p className="text-sm text-taxops-gray-light font-mono">{client.rfc}</p>
                  </div>
                  
                  {/* Certificates */}
                  <div className="flex flex-col space-y-2">
                    <p className="text-xs text-taxops-gray-light uppercase tracking-wide">Certificates</p>
                    <div className="flex items-center space-x-4">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex items-center space-x-1">
                              {getCertificateIcon(client.certificates.fiel)}
                              <span className="text-xs text-taxops-gray-light">FIEL</span>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>FIEL Status: {client.certificates.fiel}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex items-center space-x-1">
                              {getCertificateIcon(client.certificates.csd)}
                              <span className="text-xs text-taxops-gray-light">CSD</span>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>CSD Status: {client.certificates.csd}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex items-center space-x-1">
                              {getCertificateIcon(client.certificates.ciec)}
                              <span className="text-xs text-taxops-gray-light">CIEC</span>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>CIEC Status: {client.certificates.ciec}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </div>
                  
                  {/* SAT Status */}
                  <div className="flex flex-col space-y-2">
                    <p className="text-xs text-taxops-gray-light uppercase tracking-wide">SAT Status</p>
                    {getSatStatusBadge(client.satStatus)}
                  </div>
                  
                  {/* Last Sync */}
                  <div className="flex flex-col space-y-2">
                    <p className="text-xs text-taxops-gray-light uppercase tracking-wide">Last Sync</p>
                    <p className="text-sm text-white">{client.lastSync}</p>
                  </div>
                </div>
                
                {/* Actions */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="hover:bg-glass-bg/50 transition-all duration-300 group">
                      <MoreHorizontal className="w-4 h-4 group-hover:scale-110 transition-transform" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-glass-bg/95 backdrop-blur-xl border-glass-border">
                    <DropdownMenuItem className="hover:bg-glass-bg/50">
                      View Details
                    </DropdownMenuItem>
                    <DropdownMenuItem className="hover:bg-glass-bg/50">
                      Edit Client
                    </DropdownMenuItem>
                    <DropdownMenuItem className="hover:bg-glass-bg/50">
                      Sync Data
                    </DropdownMenuItem>
                    <DropdownMenuItem className="hover:bg-glass-bg/50 text-taxops-error">
                      Remove Client
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </Card>
          ))
        ) : (
          <Card className="p-12 bg-glass-bg/50 backdrop-blur-sm border-glass-border">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-glass-bg/50 rounded-full flex items-center justify-center mx-auto animate-float">
                <Users className="w-8 h-8 text-taxops-gray-light" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-semibold text-white">No clients found</h3>
                <p className="text-taxops-gray-light">
                  {searchTerm ? "Try adjusting your search terms." : "Add a client to get started with AI-powered tax automation."}
                </p>
              </div>
              <Button className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-glow transition-all duration-300 group">
                <Plus className="w-4 h-4 mr-2 group-hover:scale-110 transition-transform" />
                Add Your First Client
              </Button>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Clients;