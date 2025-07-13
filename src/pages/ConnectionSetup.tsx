import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Calendar, Clock, Users, Play, CheckCircle, XCircle, AlertCircle, RefreshCw, Trash2, History } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import MercuryTokenSetup from "@/components/MercuryTokenSetup";

interface Client {
  id: string;
  name: string;
  email: string;
  rfc: string;
  sat_status: string;
}

interface SyncSettings {
  syncType: "automatic" | "historical";
  frequency?: "daily" | "weekly" | "monthly";
  startDate?: string;
  endDate?: string;
}

interface SyncRequest {
  id: string;
  sync_type: string;
  client_ids: string[];
  frequency?: string;
  start_date?: string;
  end_date?: string;
  status: string;
  last_run_at?: string;
  next_run_at?: string;
  created_at: string;
  error_message?: string;
  sync_logs?: Array<{
    client_id: string;
    status: string;
    records_processed: number;
    error_message?: string;
    created_at: string;
  }>;
}

interface SyncStatus {
  status: "idle" | "in_progress" | "success" | "error";
  progress: number;
  message: string;
  details?: string;
}

const ConnectionSetup = () => {
  const { connectionId } = useParams<{ connectionId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClients, setSelectedClients] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [syncSettings, setSyncSettings] = useState<SyncSettings>({
    syncType: "automatic",
    frequency: "daily"
  });
  const [syncRequests, setSyncRequests] = useState<SyncRequest[]>([]);
  const [loadingSync, setLoadingSync] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    status: "idle",
    progress: 0,
    message: ""
  });
  const [credentialsValid, setCredentialsValid] = useState(false);

  // Connection metadata based on connectionId
  const getConnectionInfo = (id: string) => {
    const connections: Record<string, { title: string; description: string; requiresAuth: boolean }> = {
      // Bookkeeping Software
      quickbooks: {
        title: "QuickBooks",
        description: "Connect your QuickBooks account to import transactions, reports, and tax data.",
        requiresAuth: true
      },
      xero: {
        title: "Xero",
        description: "Sync Xero to access invoices, expenses, and financial summaries.",
        requiresAuth: true
      },
      sage: {
        title: "Sage 50cloud",
        description: "Integrate Sage to pull ledger and balance sheet data.",
        requiresAuth: true
      },
      freshbooks: {
        title: "FreshBooks",
        description: "Access billing, payments, and income reports through FreshBooks.",
        requiresAuth: true
      },
      wave: {
        title: "Wave Accounting",
        description: "Connect Wave to retrieve categorized income and expense records.",
        requiresAuth: true
      },
      // ERP Systems
      sap: {
        title: "SAP ERP",
        description: "Link SAP ERP to analyze enterprise-level financials and compliance data.",
        requiresAuth: true
      },
      oracle: {
        title: "Oracle ERP Cloud",
        description: "Pull accounting and reporting data from Oracle ERP.",
        requiresAuth: true
      },
      dynamics: {
        title: "Microsoft Dynamics 365",
        description: "Sync Dynamics 365 to automate financial workflows and tax analysis.",
        requiresAuth: true
      },
      netsuite: {
        title: "NetSuite",
        description: "Connect to NetSuite to retrieve corporate financial reports.",
        requiresAuth: true
      },
      infor: {
        title: "Infor ERP",
        description: "Import structured financials from Infor ERP into your reports.",
        requiresAuth: true
      },
      // Banks
      chase: {
        title: "JPMorgan Chase",
        description: "Securely connect Chase bank feeds to retrieve transaction history.",
        requiresAuth: true
      },
      bofa: {
        title: "Bank of America",
        description: "Access statement data and account transactions from BofA.",
        requiresAuth: true
      },
      wells: {
        title: "Wells Fargo",
        description: "Integrate Wells Fargo banking activity for reporting.",
        requiresAuth: true
      },
      citi: {
        title: "Citibank (Citigroup)",
        description: "Connect Citibank accounts to import deposit and payment details.",
        requiresAuth: true
      },
      usbank: {
        title: "U.S. Bank",
        description: "Pull U.S. Bank statements and transaction flows.",
        requiresAuth: true
      },
      mercury: {
        title: "Mercury",
        description: "Sync startup-friendly bank feeds from Mercury for report generation.",
        requiresAuth: true
      },
      brex: {
        title: "Brex",
        description: "Connect Brex financial data and smart cards for business analysis.",
        requiresAuth: true
      }
    };
    return connections[id] || { title: "Unknown", description: "", requiresAuth: true };
  };

  const connectionInfo = getConnectionInfo(connectionId || "");

  useEffect(() => {
    fetchClients();
    checkCredentials();
    if (connectionId === "mercury") {
      fetchSyncRequests();
    }
  }, [connectionId]);

  const fetchSyncRequests = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('mercury-sync-manager?action=list-syncs', {
        method: 'GET'
      });

      if (error) throw error;
      setSyncRequests(data.sync_requests || []);
    } catch (error) {
      console.error("Error fetching sync requests:", error);
    }
  };

  const handleCreateSync = async () => {
    if (selectedClients.length === 0) {
      toast({
        title: "No clients selected",
        description: "Please select at least one client to sync",
        variant: "destructive"
      });
      return;
    }

    if (syncSettings.syncType === "historical" && (!syncSettings.startDate || !syncSettings.endDate)) {
      toast({
        title: "Invalid date range",
        description: "Please select both start and end dates for historical sync",
        variant: "destructive"
      });
      return;
    }

    setLoadingSync(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('mercury-sync-manager?action=create-sync', {
        method: 'POST',
        body: JSON.stringify({
          connection_code: connectionId,
          client_ids: selectedClients,
          sync_type: syncSettings.syncType,
          frequency: syncSettings.frequency,
          start_date: syncSettings.startDate,
          end_date: syncSettings.endDate
        })
      });

      if (error) throw error;

      toast({
        title: "Sync Request Created",
        description: `${syncSettings.syncType === "historical" ? "Historical" : "Automatic"} sync request created successfully`,
      });

      await fetchSyncRequests();
    } catch (error) {
      console.error("Error creating sync:", error);
      toast({
        title: "Sync Failed",
        description: "Failed to create sync request. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoadingSync(false);
    }
  };

  const handleCancelSync = async (syncId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke(`mercury-sync-manager?action=cancel-sync&sync_id=${syncId}`, {
        method: 'DELETE'
      });

      if (error) throw error;

      toast({
        title: "Sync Cancelled",
        description: "Sync request has been cancelled successfully",
      });

      await fetchSyncRequests();
    } catch (error) {
      console.error("Error cancelling sync:", error);
      toast({
        title: "Cancel Failed",
        description: "Failed to cancel sync request. Please try again.",
        variant: "destructive"
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { variant: "secondary" as const, label: "Pending" },
      running: { variant: "default" as const, label: "Running" },
      success: { variant: "default" as const, label: "Success" },
      failed: { variant: "destructive" as const, label: "Failed" },
      cancelled: { variant: "secondary" as const, label: "Cancelled" }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const fetchClients = async () => {
    try {
      const { data, error } = await supabase
        .from("clients")
        .select("*")
        .order("name");

      if (error) throw error;
      setClients(data || []);
    } catch (error) {
      console.error("Error fetching clients:", error);
      toast({
        title: "Error",
        description: "Failed to load clients",
        variant: "destructive"
      });
    }
  };

  const checkCredentials = async () => {
    if (!connectionId) return;
    
    // Check if we have valid credentials for any clients for this connection
    try {
      const { data, error } = await supabase
        .from("client_credentials")
        .select("*")
        .eq("code", connectionId)
        .eq("status", "connected");

      if (error) throw error;
      setCredentialsValid(data && data.length > 0);
    } catch (error) {
      console.error("Error checking credentials:", error);
      setCredentialsValid(false);
    }
  };

  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.rfc.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleClientToggle = (clientId: string) => {
    setSelectedClients(prev =>
      prev.includes(clientId)
        ? prev.filter(id => id !== clientId)
        : [...prev, clientId]
    );
  };

  const handleSelectAll = () => {
    if (selectedClients.length === filteredClients.length) {
      setSelectedClients([]);
    } else {
      setSelectedClients(filteredClients.map(client => client.id));
    }
  };

  const handleSync = async () => {
    if (selectedClients.length === 0) {
      toast({
        title: "No clients selected",
        description: "Please select at least one client to sync",
        variant: "destructive"
      });
      return;
    }

    setSyncStatus({
      status: "in_progress",
      progress: 0,
      message: "Initializing sync..."
    });

    try {
      // Simulate sync progress
      for (let i = 0; i <= 100; i += 10) {
        setSyncStatus(prev => ({
          ...prev,
          progress: i,
          message: i < 50 ? "Authenticating..." : i < 80 ? "Extracting data..." : "Processing..."
        }));
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      setSyncStatus({
        status: "success",
        progress: 100,
        message: `Successfully synced ${selectedClients.length} client(s)`
      });

      toast({
        title: "Sync Complete",
        description: `Successfully synced data for ${selectedClients.length} client(s)`,
      });

    } catch (error) {
      setSyncStatus({
        status: "error",
        progress: 0,
        message: "Sync failed",
        details: "Unable to connect to external service"
      });

      toast({
        title: "Sync Failed",
        description: "Please check your connection and try again",
        variant: "destructive"
      });
    }
  };

  const getStatusIcon = () => {
    switch (syncStatus.status) {
      case "success":
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case "error":
        return <XCircle className="h-5 w-5 text-red-500" />;
      case "in_progress":
        return <Clock className="h-5 w-5 text-blue-500 animate-spin" />;
      default:
        return <AlertCircle className="h-5 w-5 text-muted-foreground" />;
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/connections")}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{connectionInfo.title} Setup</h1>
          <p className="text-muted-foreground">{connectionInfo.description}</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Client Selection */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Client Selection
              </CardTitle>
              <CardDescription>
                Select clients to sync Mercury data for. You can choose multiple clients.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <Label htmlFor="search">Search clients</Label>
                  <Input
                    id="search"
                    placeholder="Search by name, email, or RFC..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <Button variant="outline" onClick={handleSelectAll} className="mt-6">
                  {selectedClients.length === filteredClients.length ? "Deselect All" : "Select All"}
                </Button>
              </div>

              <div className="max-h-64 overflow-y-auto space-y-2">
                {filteredClients.map((client) => (
                  <div
                    key={client.id}
                    className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer"
                    onClick={() => handleClientToggle(client.id)}
                  >
                    <Checkbox
                      checked={selectedClients.includes(client.id)}
                      onChange={() => handleClientToggle(client.id)}
                    />
                    <div className="flex-1">
                      <div className="font-medium">{client.name}</div>
                      <div className="text-sm text-muted-foreground">{client.email} • RFC: {client.rfc}</div>
                    </div>
                    <Badge variant={client.sat_status === "active" ? "default" : "secondary"}>
                      {client.sat_status}
                    </Badge>
                  </div>
                ))}
              </div>

              {selectedClients.length > 0 && (
                <div className="text-sm text-muted-foreground">
                  {selectedClients.length} client(s) selected
                </div>
              )}
            </CardContent>
          </Card>

          {/* Sync Type Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Sync Type
              </CardTitle>
              <CardDescription>
                Choose between automatic recurring sync or one-time historical data sync.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <RadioGroup
                value={syncSettings.syncType}
                onValueChange={(value) => setSyncSettings(prev => ({ ...prev, syncType: value as any }))}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="automatic" id="automatic" />
                  <Label htmlFor="automatic">Automatic Sync</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="historical" id="historical" />
                  <Label htmlFor="historical">Historical Data Sync</Label>
                </div>
              </RadioGroup>

              {syncSettings.syncType === "automatic" && (
                <div>
                  <Label>Sync Frequency</Label>
                  <RadioGroup
                    value={syncSettings.frequency}
                    onValueChange={(value) => setSyncSettings(prev => ({ ...prev, frequency: value as any }))}
                    className="mt-2"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="daily" id="freq-daily" />
                      <Label htmlFor="freq-daily">Daily</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="weekly" id="freq-weekly" />
                      <Label htmlFor="freq-weekly">Weekly</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="monthly" id="freq-monthly" />
                      <Label htmlFor="freq-monthly">Monthly</Label>
                    </div>
                  </RadioGroup>
                </div>
              )}

              {syncSettings.syncType === "historical" && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="start-date">Start Date</Label>
                    <Input
                      id="start-date"
                      type="date"
                      value={syncSettings.startDate || ""}
                      onChange={(e) => setSyncSettings(prev => ({ ...prev, startDate: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="end-date">End Date</Label>
                    <Input
                      id="end-date"
                      type="date"
                      value={syncSettings.endDate || ""}
                      onChange={(e) => setSyncSettings(prev => ({ ...prev, endDate: e.target.value }))}
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Action Panel */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Sync Control</CardTitle>
              <CardDescription>
                Request data synchronization for selected clients
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                onClick={handleCreateSync}
                disabled={selectedClients.length === 0 || !credentialsValid || loadingSync}
                className="w-full"
                size="lg"
              >
                {loadingSync ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Play className="h-4 w-4 mr-2" />
                )}
                Request Data Sync
              </Button>

              <Button
                onClick={fetchSyncRequests}
                variant="outline"
                className="w-full"
                size="sm"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh Status
              </Button>

              {!credentialsValid && (
                <div className="text-sm text-yellow-600 bg-yellow-50 p-3 rounded border">
                  ⚠️ No valid Mercury credentials found. Please configure connection credentials on the main connections page first.
                </div>
              )}

              {selectedClients.length === 0 && (
                <div className="text-sm text-muted-foreground">
                  Select at least one client to enable sync
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Sync Requests Table */}
      {connectionId === "mercury" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Sync Requests History
            </CardTitle>
            <CardDescription>
              Track the status and history of your Mercury data sync requests
            </CardDescription>
          </CardHeader>
          <CardContent>
            {syncRequests.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No sync requests found. Create your first sync request above.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Sync Type</th>
                      <th className="text-left p-2">Clients</th>
                      <th className="text-left p-2">Schedule</th>
                      <th className="text-left p-2">Last Run</th>
                      <th className="text-left p-2">Next Run</th>
                      <th className="text-left p-2">Status</th>
                      <th className="text-left p-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {syncRequests.map((request) => (
                      <tr key={request.id} className="border-b hover:bg-muted/50">
                        <td className="p-2">
                          <Badge variant="outline">
                            {request.sync_type === "automatic" ? "Automatic" : "Historical"}
                          </Badge>
                        </td>
                        <td className="p-2">
                          <div className="text-sm">
                            {request.client_ids.length} client(s)
                          </div>
                        </td>
                        <td className="p-2">
                          <div className="text-sm">
                            {request.sync_type === "automatic" 
                              ? `${request.frequency?.charAt(0).toUpperCase()}${request.frequency?.slice(1)}`
                              : request.start_date && request.end_date
                                ? `${request.start_date} to ${request.end_date}`
                                : "One-time"
                            }
                          </div>
                        </td>
                        <td className="p-2">
                          <div className="text-sm">
                            {request.last_run_at 
                              ? formatDate(request.last_run_at)
                              : "Never"
                            }
                          </div>
                        </td>
                        <td className="p-2">
                          <div className="text-sm">
                            {request.next_run_at 
                              ? formatDate(request.next_run_at)
                              : request.sync_type === "historical" 
                                ? "N/A" 
                                : "Not scheduled"
                            }
                          </div>
                        </td>
                        <td className="p-2">
                          {getStatusBadge(request.status)}
                          {request.error_message && (
                            <div className="text-xs text-red-600 mt-1">
                              {request.error_message}
                            </div>
                          )}
                        </td>
                        <td className="p-2">
                          {(request.status === "pending" || request.status === "running") && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleCancelSync(request.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ConnectionSetup;