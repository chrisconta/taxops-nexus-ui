import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowLeft, 
  Save, 
  Plus, 
  Settings,
  CheckCircle,
  XCircle,
  AlertCircle,
  Trash2,
  RefreshCw
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
  rfc: string;
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
        rfc: client.rfc,
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
    if (!selectedConnectionType) return;

    try {
      const connectionType = connectionTypes.find(ct => ct.code === selectedConnectionType);
      if (!connectionType) return;

      const { error } = await supabase
        .from("client_credentials")
        .insert([
          {
            client_id: id,
            name: connectionType.name,
            code: connectionType.code,
            status: "pending",
            credentials: JSON.parse(connectionCredentials || "{}"),
          },
        ]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Connection added successfully.",
      });

      setIsConnectionDialogOpen(false);
      setSelectedConnectionType("");
      setConnectionCredentials("");
      fetchClientData();
    } catch (error: any) {
      console.error("Error adding connection:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to add connection.",
        variant: "destructive",
      });
    }
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
      case "pending":
        return <AlertCircle className="w-4 h-4 text-taxops-warning" />;
      default:
        return <XCircle className="w-4 h-4 text-taxops-error" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "connected":
        return <Badge className="bg-taxops-success/20 text-taxops-success border-taxops-success/30">Connected</Badge>;
      case "pending":
        return <Badge className="bg-taxops-warning/20 text-taxops-warning border-taxops-warning/30">Pending</Badge>;
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
              <Label htmlFor="rfc" className="text-white">Tax ID (RFC)</Label>
              <Input
                id="rfc"
                value={client.rfc}
                onChange={(e) => setClient({ ...client, rfc: e.target.value })}
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
          <Dialog open={isConnectionDialogOpen} onOpenChange={setIsConnectionDialogOpen}>
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
                  <Label className="text-white">Connection Type</Label>
                  <Select value={selectedConnectionType} onValueChange={setSelectedConnectionType}>
                    <SelectTrigger className="bg-glass-bg/30 border-glass-border">
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
                </div>
                <div className="space-y-2">
                  <Label className="text-white">Credentials (JSON)</Label>
                  <Textarea
                    placeholder='{"username": "user", "password": "pass", "api_key": "key"}'
                    value={connectionCredentials}
                    onChange={(e) => setConnectionCredentials(e.target.value)}
                    className="bg-glass-bg/30 border-glass-border min-h-[100px]"
                  />
                </div>
                <Button onClick={handleAddConnection} className="w-full bg-gradient-to-r from-primary to-primary/80">
                  Add Connection
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