import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Info, Building, BookOpen, Briefcase, Check, X, AlertTriangle, CheckCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useConnectionStatuses } from "@/hooks/useConnectionStatuses";

const connectionTypes = [
  // Bookkeeping Software
  {
    id: "quickbooks",
    title: "QuickBooks",
    description: "Connect your QuickBooks account to import transactions, reports, and tax data.",
    icon: BookOpen,
    category: "bookkeeping",
    status: "connected",
  },
  {
    id: "xero",
    title: "Xero",
    description: "Sync Xero to access invoices, expenses, and financial summaries.",
    icon: BookOpen,
    category: "bookkeeping",
    status: "not-connected",
  },
  {
    id: "sage",
    title: "Sage 50cloud",
    description: "Integrate Sage to pull ledger and balance sheet data.",
    icon: BookOpen,
    category: "bookkeeping",
    status: "not-connected",
  },
  {
    id: "freshbooks",
    title: "FreshBooks",
    description: "Access billing, payments, and income reports through FreshBooks.",
    icon: BookOpen,
    category: "bookkeeping",
    status: "not-connected",
  },
  {
    id: "wave",
    title: "Wave Accounting",
    description: "Connect Wave to retrieve categorized income and expense records.",
    icon: BookOpen,
    category: "bookkeeping",
    status: "not-connected",
  },
  
  // ERP Systems
  {
    id: "sap",
    title: "SAP ERP",
    description: "Link SAP ERP to analyze enterprise-level financials and compliance data.",
    icon: Briefcase,
    category: "erp",
    status: "not-connected",
  },
  {
    id: "oracle",
    title: "Oracle ERP Cloud",
    description: "Pull accounting and reporting data from Oracle ERP.",
    icon: Briefcase,
    category: "erp",
    status: "not-connected",
  },
  {
    id: "dynamics",
    title: "Microsoft Dynamics 365",
    description: "Sync Dynamics 365 to automate financial workflows and tax analysis.",
    icon: Briefcase,
    category: "erp",
    status: "not-connected",
  },
  {
    id: "netsuite",
    title: "NetSuite",
    description: "Connect to NetSuite to retrieve corporate financial reports.",
    icon: Briefcase,
    category: "erp",
    status: "not-connected",
  },
  {
    id: "infor",
    title: "Infor ERP",
    description: "Import structured financials from Infor ERP into your reports.",
    icon: Briefcase,
    category: "erp",
    status: "not-connected",
  },
  
  // Banks
  {
    id: "chase",
    title: "JPMorgan Chase",
    description: "Securely connect Chase bank feeds to retrieve transaction history.",
    icon: Building,
    category: "banks",
    status: "connected",
  },
  {
    id: "bofa",
    title: "Bank of America",
    description: "Access statement data and account transactions from BofA.",
    icon: Building,
    category: "banks",
    status: "not-connected",
  },
  {
    id: "wells",
    title: "Wells Fargo",
    description: "Integrate Wells Fargo banking activity for reporting.",
    icon: Building,
    category: "banks",
    status: "not-connected",
  },
  {
    id: "citi",
    title: "Citibank (Citigroup)",
    description: "Connect Citibank accounts to import deposit and payment details.",
    icon: Building,
    category: "banks",
    status: "not-connected",
  },
  {
    id: "usbank",
    title: "U.S. Bank",
    description: "Pull U.S. Bank statements and transaction flows.",
    icon: Building,
    category: "banks",
    status: "not-connected",
  },
  {
    id: "mercury",
    title: "Mercury",
    description: "Sync startup-friendly bank feeds from Mercury for report generation.",
    icon: Building,
    category: "banks",
    status: "not-connected",
  },
  {
    id: "brex",
    title: "Brex",
    description: "Connect Brex financial data and smart cards for business analysis.",
    icon: Building,
    category: "banks",
    status: "not-connected",
  },
];

const categories = [
  { id: "all", label: "All", icon: null },
  { id: "active", label: "Active", icon: CheckCircle },
  { id: "bookkeeping", label: "Bookkeeping", icon: BookOpen },
  { id: "erp", label: "ERP", icon: Briefcase },
  { id: "banks", label: "Banks", icon: Building },
];

const Connections = () => {
  const navigate = useNavigate();
  const [selectedConnection, setSelectedConnection] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const { statuses, loading } = useConnectionStatuses();

  // Get dynamic status for a connection, fallback logic
  const getConnectionStatus = (connectionId: string, staticStatus: string) => {
    if (loading) return staticStatus === "coming-soon" ? "coming-soon" : "not-connected";
    const dynamicStatus = statuses.find(s => s.connectionId === connectionId);
    // Only return dynamic status if it exists, otherwise default to not-connected
    // Only preserve "coming-soon" from static status
    return dynamicStatus?.status || (staticStatus === "coming-soon" ? "coming-soon" : "not-connected");
  };

  // Get error details for a connection
  const getConnectionErrorDetails = (connectionId: string) => {
    const status = statuses.find(s => s.connectionId === connectionId);
    return status?.errorDetails;
  };

  const handleConnectionClick = (connectionId: string) => {
    setSelectedConnection(connectionId);
    navigate(`/connections/${connectionId}/setup`);
  };

  const filteredConnections = connectionTypes.filter(connection => {
    if (activeFilter === "all") return true;
    if (activeFilter === "active") {
      const status = getConnectionStatus(connection.id, connection.status);
      return status === "connected";
    }
    return connection.category === activeFilter;
  });

  const getStatusBadge = (connectionId: string, staticStatus: string) => {
    const dynamicStatus = getConnectionStatus(connectionId, staticStatus);
    const errorDetails = getConnectionErrorDetails(connectionId);

    switch (dynamicStatus) {
      case "connected":
        return (
          <div className="flex items-center gap-1 text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded-full">
            <Check className="w-3 h-3" />
            Connected
          </div>
        );
      case "error":
        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1 text-xs bg-red-500/20 text-red-400 px-2 py-1 rounded-full cursor-help">
                  <AlertTriangle className="w-3 h-3" />
                  Error
                </div>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p>{errorDetails || "Connection failed due to authentication or sync errors"}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      case "coming-soon":
        return (
          <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-1 rounded-full">
            Coming Soon
          </span>
        );
      default:
        return (
          <span className="text-xs bg-gray-500/20 text-gray-400 px-2 py-1 rounded-full">
            Not Connected
          </span>
        );
    }
  };

  const isClickable = (status: string) => status !== "coming-soon";

  return (
    <div className="space-y-6">
      {/* Filter Controls */}
      <div className="flex flex-wrap gap-3">
        {categories.map((category) => {
          const Icon = category.icon;
          return (
            <Button
              key={category.id}
              variant={activeFilter === category.id ? "default" : "outline"}
              onClick={() => setActiveFilter(category.id)}
              className={`flex items-center gap-2 transition-all duration-300 ${
                activeFilter === category.id 
                  ? "bg-primary text-primary-foreground shadow-glow" 
                  : "bg-glass-bg/50 hover:bg-glass-bg/70 border-glass-border hover:border-primary/50"
              }`}
            >
              {Icon && <Icon className="w-4 h-4" />}
              {category.label}
            </Button>
          );
        })}
      </div>

      {/* Connection Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredConnections.map((connection) => {
          const Icon = connection.icon;
          const clickable = isClickable(connection.status);
          
          return (
            <Card
              key={connection.id}
              className={`group relative p-6 bg-glass-bg/50 backdrop-blur-sm border-glass-border transition-all duration-300 overflow-hidden
                ${clickable 
                  ? "hover:bg-glass-bg/70 hover:border-primary/50 hover:shadow-glow hover:-translate-y-1 cursor-pointer" 
                  : "opacity-60 cursor-not-allowed"
                }
                ${selectedConnection === connection.id ? "border-primary shadow-glow" : ""}
              `}
              onClick={() => clickable && handleConnectionClick(connection.id)}
            >
              {/* Status badge */}
              <div className="absolute top-4 right-4">
                {getStatusBadge(connection.id, connection.status)}
              </div>

              {/* Icon */}
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                  <Icon className="w-6 h-6 text-primary" />
                </div>
              </div>

              {/* Content */}
              <div className="space-y-3 pr-20">
                <h3 className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors">
                  {connection.title}
                </h3>
                
                <p className="text-sm text-muted-foreground line-clamp-3">
                  {connection.description}
                </p>
              </div>

              {/* Action */}
              {clickable && (
                <div className="flex items-center justify-end mt-6">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="group-hover:text-primary transition-colors"
                  >
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              )}

              {/* Hover effect overlay */}
              <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-lg pointer-events-none" />
            </Card>
          );
        })}
      </div>

      {/* Getting Started */}
      <Card className="p-6 bg-muted/20 border-border">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
            <Info className="w-5 h-5 text-primary" />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-foreground">Getting Started</h3>
            <p className="text-muted-foreground">
              Select a connection type above to begin configuring your data source. 
              Each integration has different requirements and capabilities for accessing your financial data.
            </p>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1 mt-3">
              <li>Some integrations require OAuth or API key access</li>
              <li>Bank feeds may be connected via aggregators like Plaid or Finicity</li>
              <li>ERP systems often require admin-level credentials or sandbox tokens</li>
              <li>Bookkeeping software typically uses secure API connections</li>
            </ul>
          </div>
        </div>
      </Card>

      {/* Recent Connections */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-foreground">Recent Connections</h2>
        <Card className="p-4 bg-card/30 border-border">
          <div className="text-center py-8">
            <Building className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No recent connections</h3>
            <p className="text-muted-foreground">
              Your recent connection activities will appear here.
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Connections;