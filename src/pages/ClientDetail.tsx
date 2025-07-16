import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  ArrowLeft, 
  Save, 
  Plus, 
  Settings,
  CheckCircle,
  XCircle,
  AlertCircle,
  Trash2,
  RefreshCw,
  HelpCircle
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { clientValidationSchema } from "@/lib/validation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Client {
  id: string;
  name: string;
  taxid: string;
  email: string;
  sat_status: string | null;
  last_sync: string | null;
  last_sync_successful: boolean | null;
  last_sync_at: string | null;
}

interface Connection {
  id: string;
  name: string;
  code: string;
  status: string;
  credentials: any;
}

const connectionTypes = [
  // Bookkeeping Software
  {
    id: "quickbooks",
    name: "QuickBooks",
    description: "Connect to QuickBooks Online",
    code: "quickbooks"
  },
  {
    id: "xero",
    name: "Xero",
    description: "Sync Xero to access invoices, expenses, and financial summaries",
    code: "xero"
  },
  {
    id: "sage",
    name: "Sage 50cloud",
    description: "Integrate Sage to pull ledger and balance sheet data",
    code: "sage"
  },
  {
    id: "freshbooks",
    name: "FreshBooks",
    description: "Access billing, payments, and income reports through FreshBooks",
    code: "freshbooks"
  },
  {
    id: "wave",
    name: "Wave Accounting",
    description: "Connect Wave to retrieve categorized income and expense records",
    code: "wave"
  },
  
  // ERP Systems
  {
    id: "sap",
    name: "SAP ERP",
    description: "Link SAP ERP to analyze enterprise-level financials and compliance data",
    code: "sap"
  },
  {
    id: "oracle",
    name: "Oracle ERP Cloud",
    description: "Pull accounting and reporting data from Oracle ERP",
    code: "oracle"
  },
  {
    id: "dynamics",
    name: "Microsoft Dynamics 365",
    description: "Sync Dynamics 365 to automate financial workflows and tax analysis",
    code: "dynamics"
  },
  {
    id: "netsuite",
    name: "NetSuite",
    description: "Connect to NetSuite to retrieve corporate financial reports",
    code: "netsuite"
  },
  {
    id: "infor",
    name: "Infor ERP",
    description: "Import structured financials from Infor ERP into your reports",
    code: "infor"
  },
  
  // Banks
  {
    id: "chase",
    name: "JPMorgan Chase",
    description: "Securely connect Chase bank feeds to retrieve transaction history",
    code: "chase"
  },
  {
    id: "bofa",
    name: "Bank of America",
    description: "Access statement data and account transactions from BofA",
    code: "bofa"
  },
  {
    id: "wells",
    name: "Wells Fargo",
    description: "Integrate Wells Fargo banking activity for reporting",
    code: "wells"
  },
  {
    id: "citi",
    name: "Citibank (Citigroup)",
    description: "Connect Citibank accounts to import deposit and payment details",
    code: "citi"
  },
  {
    id: "usbank",
    name: "U.S. Bank",
    description: "Pull U.S. Bank statements and transaction flows",
    code: "usbank"
  },
  {
    id: "mercury",
    name: "Mercury",
    description: "Sync startup-friendly bank feeds from Mercury for report generation",
    code: "mercury"
  },
  {
    id: "brex",
    name: "Brex",
    description: "Connect Brex financial data and smart cards for business analysis",
    code: "brex"
  }
];

const ClientDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [client, setClient] = useState<Client | null>(null);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [isConnectionDialogOpen, setIsConnectionDialogOpen] = useState(false);
  const [selectedConnectionType, setSelectedConnectionType] = useState("");
  const [connectionCredentials, setConnectionCredentials] = useState("");
  
  // Mercury-specific state
  const [mercuryApiToken, setMercuryApiToken] = useState("");
  const [validationErrors, setValidationErrors] = useState<{ [key: string]: string }>({});
  const [isSubmittingConnection, setIsSubmittingConnection] = useState(false);
  const [testingConnectionId, setTestingConnectionId] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      fetchClientData();
    }
  }, [id]);

  const fetchClientData = async () => {
    try {
      // Fetch client data
      const { data: clientData, error: clientError } = await supabase
        .from("clients")
        .select("*")
        .eq("id", id)
        .single();

      if (clientError) throw clientError;
      setClient(clientData);

      // Fetch connections data
      const { data: connectionsData, error: connectionsError } = await supabase
        .from("client_credentials")
        .select("*")
        .eq("client_id", id);

      if (connectionsError) throw connectionsError;
      setConnections(connectionsData || []);
    } catch (error: any) {
      console.error("Error fetching client data:", error);
      toast({
        title: "Error",
        description: "Failed to load client data.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClientUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!client) return;

    setIsSaving(true);
    try {
      const validatedData = clientValidationSchema.parse({
        name: client.name,
        taxid: client.taxid,
        email: client.email,
      });

      const { error } = await supabase
        .from("clients")
        .update(validatedData)
        .eq("id", client.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Client updated successfully.",
      });
    } catch (error: any) {
      console.error("Error updating client:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to update client.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddConnection = async () => {
    // Validate fields based on connection type
    const errors: { [key: string]: string } = {};
    let credentials: any = {};

    // Connection type validation
    if (!selectedConnectionType.trim()) {
      errors.connectionType = "Please select a connection type";
    }

    if (selectedConnectionType === "mercury") {
      if (!mercuryApiToken.trim()) {
        errors.apiToken = "Mercury API token is required";
      }
      credentials = { api_token: mercuryApiToken.trim() };
    } else {
      // For other connection types, use JSON credentials
      if (!connectionCredentials.trim()) {
        errors.credentials = "Credentials are required";
      } else {
        try {
          credentials = JSON.parse(connectionCredentials);
        } catch {
          errors.credentials = "Invalid JSON format";
        }
      }
    }

    setValidationErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setIsSubmittingConnection(true);
    
    try {
      const connectionType = connectionTypes.find(ct => ct.code === selectedConnectionType);
      if (!connectionType) return;

      // NOTE: Credentials are transmitted securely over HTTPS via Supabase
      // Backend storage uses encryption for sensitive data like API tokens
      const { error } = await supabase
        .from("client_credentials")
        .insert([
          {
            client_id: id,
            name: connectionType.name,
            code: connectionType.code,
            status: "disconnected", // Use valid constraint value instead of "pending"
            credentials: credentials,
          },
        ]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Connection added successfully.",
      });

      // Reset form
      setIsConnectionDialogOpen(false);
      setSelectedConnectionType("");
      setConnectionCredentials("");
      setMercuryApiToken("");
      setValidationErrors({});
      fetchClientData();
    } catch (error: any) {
      console.error("Error adding connection:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to add connection.",
        variant: "destructive",
      });
    } finally {
      setIsSubmittingConnection(false);
    }
  };

  const resetConnectionForm = () => {
    setSelectedConnectionType("");
    setConnectionCredentials("");
    setMercuryApiToken("");
    setValidationErrors({});
  };

  const handleTestConnection = async (connectionId: string) => {
    setTestingConnectionId(connectionId);
    
    try {
      const { data, error } = await supabase.functions.invoke('test-mercury-connection', {
        body: { connectionId }
      });

      if (error) {
        console.error('Edge function error:', error);
        toast({
          title: "Error",
          description: "Failed to test connection. Please try again.",
          variant: "destructive",
        });
        return;
      }

      if (data.success) {
        toast({
          title: "Connection Test Successful",
          description: data.message,
        });
        // Refresh connection data to update status
        fetchClientData();
      } else {
        toast({
          title: "Connection Test Failed",
          description: data.error || "Unable to connect to Mercury API.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error("Error testing connection:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred while testing the connection.",
        variant: "destructive",
      });
    } finally {
      setTestingConnectionId(null);
    }
  };

  const renderCredentialFields = () => {
    if (selectedConnectionType === "mercury") {
      return (
        <TooltipProvider>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label className="text-white">Mercury API Token</Label>
              <Tooltip>
                <TooltipTrigger>
                  <HelpCircle className="w-4 h-4 text-taxops-gray-light" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-xs">
                    Generate a read-only API token from your Mercury dashboard under Settings → API Access. 
                    Read-only tokens are recommended for security.
                  </p>
                </TooltipContent>
              </Tooltip>
            </div>
            <Input
              id="mercury-api-token"
              type="password"
              placeholder="secret-token:... or mercury_live_..."
              value={mercuryApiToken}
              onChange={(e) => setMercuryApiToken(e.target.value)}
              disabled={isSubmittingConnection}
              className={`bg-glass-bg/30 border-glass-border ${
                validationErrors.apiToken ? 'border-taxops-error' : ''
              } disabled:opacity-50 disabled:cursor-not-allowed`}
              aria-label="Mercury API token"
              aria-describedby={validationErrors.apiToken ? "mercury-token-error" : "mercury-token-help"}
            />
            {validationErrors.apiToken && (
              <p id="mercury-token-error" className="text-sm text-taxops-error" role="alert">
                {validationErrors.apiToken}
              </p>
            )}
            <p id="mercury-token-help" className="text-xs text-taxops-gray-light">
              <strong>Important:</strong> Use a read-only token for security. 
              <a 
                href="https://app.mercury.com/settings/api" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-primary hover:underline ml-1"
                tabIndex={isSubmittingConnection ? -1 : 0}
              >
                Create token →
              </a>
            </p>
          </div>
        </TooltipProvider>
      );
    }

    // Default JSON input for other connection types
    return (
      <div className="space-y-2">
        <Label className="text-white">Credentials (JSON)</Label>
        <Textarea
          placeholder='{"username": "user", "password": "pass", "api_key": "key"}'
          value={connectionCredentials}
          onChange={(e) => setConnectionCredentials(e.target.value)}
          disabled={isSubmittingConnection}
          className={`bg-glass-bg/30 border-glass-border min-h-[100px] ${
            validationErrors.credentials ? 'border-taxops-error' : ''
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        />
        {validationErrors.credentials && (
          <p className="text-sm text-taxops-error">{validationErrors.credentials}</p>
        )}
      </div>
    );
  };

  const handleDeleteConnection = async (connectionId: string) => {
    try {
      const { error } = await supabase
        .from("client_credentials")
        .delete()
        .eq("id", connectionId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Connection deleted successfully.",
      });

      fetchClientData();
    } catch (error: any) {
      console.error("Error deleting connection:", error);
      toast({
        title: "Error",
        description: "Failed to delete connection.",
        variant: "destructive",
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "connected":
        return <CheckCircle className="w-4 h-4 text-taxops-success" />;
      case "partial":
        return <AlertCircle className="w-4 h-4 text-taxops-warning" />;
      case "disconnected":
      default:
        return <XCircle className="w-4 h-4 text-taxops-error" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "connected":
        return <Badge className="bg-taxops-success/20 text-taxops-success border-taxops-success/30">Connected</Badge>;
      case "partial":
        return <Badge className="bg-taxops-warning/20 text-taxops-warning border-taxops-warning/30">Partial</Badge>;
      case "disconnected":
      default:
        return <Badge className="bg-taxops-error/20 text-taxops-error border-taxops-error/30">Disconnected</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <RefreshCw className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!client) {
    return (
      <div className="space-y-8 animate-slide-up">
        <div className="text-center space-y-4">
          <h1 className="text-3xl font-bold text-white">Client Not Found</h1>
          <Button onClick={() => navigate("/clients")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Clients
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-slide-up">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/clients")}
          className="hover:bg-glass-bg/50"
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <h1 className="text-3xl font-bold text-white">{client.name}</h1>
      </div>

      {/* Client Information */}
      <Card className="p-8 bg-glass-bg/50 backdrop-blur-sm border-glass-border">
        <h2 className="text-xl font-semibold text-white mb-6">Client Information</h2>
        <form onSubmit={handleClientUpdate} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-white">Client Name</Label>
              <Input
                id="name"
                value={client.name}
                onChange={(e) => setClient({ ...client, name: e.target.value })}
                className="bg-glass-bg/30 border-glass-border"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="taxid" className="text-white">Tax ID</Label>
              <Input
                id="taxid"
                value={client.taxid}
                onChange={(e) => setClient({ ...client, taxid: e.target.value })}
                className="bg-glass-bg/30 border-glass-border"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email" className="text-white">Email</Label>
              <Input
                id="email"
                type="email"
                value={client.email}
                onChange={(e) => setClient({ ...client, email: e.target.value })}
                className="bg-glass-bg/30 border-glass-border"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-white">SAT Status</Label>
              <div className="flex items-center gap-2">
                {client.sat_status === "active" && (
                  <Badge className="bg-taxops-success/20 text-taxops-success border-taxops-success/30">Active</Badge>
                )}
                {client.sat_status === "pending" && (
                  <Badge className="bg-taxops-warning/20 text-taxops-warning border-taxops-warning/30">Pending</Badge>
                )}
                {client.sat_status === "rejected" && (
                  <Badge className="bg-taxops-error/20 text-taxops-error border-taxops-error/30">Rejected</Badge>
                )}
              </div>
            </div>
          </div>
          <Button
            type="submit"
            disabled={isSaving}
            className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-glow"
          >
            <Save className="w-4 h-4 mr-2" />
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
        </form>
      </Card>

      {/* Connections */}
      <Card className="p-8 bg-glass-bg/50 backdrop-blur-sm border-glass-border">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-white">Connections</h2>
          <Dialog open={isConnectionDialogOpen} onOpenChange={(open) => {
            setIsConnectionDialogOpen(open);
            if (!open) resetConnectionForm();
          }}>
            <DialogTrigger asChild>
              <Button className="gap-2 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-glow">
                <Plus className="w-4 h-4" />
                Add Connection
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-glass-bg/95 backdrop-blur-xl border-glass-border">
              <DialogHeader>
                <DialogTitle className="text-white">Add New Connection</DialogTitle>
                <DialogDescription className="text-taxops-gray-light">
                  Configure a new integration for this client.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-white" htmlFor="connection-type">Connection Type</Label>
                  <Select 
                    value={selectedConnectionType} 
                    onValueChange={setSelectedConnectionType}
                    disabled={isSubmittingConnection}
                  >
                    <SelectTrigger 
                      id="connection-type"
                      className={`bg-glass-bg/30 border-glass-border ${
                        validationErrors.connectionType ? 'border-taxops-error' : ''
                      }`}
                      aria-label="Select connection type"
                    >
                      <SelectValue placeholder="Select connection type" />
                    </SelectTrigger>
                    <SelectContent>
                      {connectionTypes.map((type) => (
                        <SelectItem key={type.code} value={type.code}>
                          {type.name} - {type.description}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {validationErrors.connectionType && (
                    <p className="text-sm text-taxops-error" role="alert">
                      {validationErrors.connectionType}
                    </p>
                  )}
                </div>
                {renderCredentialFields()}
                <Button 
                  onClick={handleAddConnection} 
                  disabled={isSubmittingConnection}
                  className="w-full bg-gradient-to-r from-primary to-primary/80 disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label={isSubmittingConnection ? "Adding connection..." : "Add connection"}
                >
                  {isSubmittingConnection ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4 mr-2" />
                      Add Connection
                    </>
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="space-y-4">
          {connections.length > 0 ? (
            connections.map((connection) => (
              <Card key={connection.id} className="p-6 bg-glass-bg/30 border-glass-border">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Settings className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white">{connection.name}</h3>
                      <p className="text-sm text-taxops-gray-light">Type: {connection.code}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {getStatusIcon(connection.status)}
                    {getStatusBadge(connection.status)}
                    {connection.code === "mercury" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleTestConnection(connection.id)}
                        disabled={testingConnectionId === connection.id}
                        className="border-primary/30 hover:bg-primary/10 text-primary"
                      >
                        {testingConnectionId === connection.id ? (
                          <>
                            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                            Testing...
                          </>
                        ) : (
                          <>
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Test Connection
                          </>
                        )}
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteConnection(connection.id)}
                      className="hover:bg-taxops-error/20 hover:text-taxops-error"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))
          ) : (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-glass-bg/50 rounded-full flex items-center justify-center mx-auto mb-4">
                <Settings className="w-8 h-8 text-taxops-gray-light" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">No Connections</h3>
              <p className="text-taxops-gray-light mb-4">
                Add integrations to sync data for this client.
              </p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

export default ClientDetail;