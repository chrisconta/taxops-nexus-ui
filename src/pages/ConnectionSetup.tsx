import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Calendar, Clock, Users, Play, CheckCircle, XCircle, AlertCircle, RefreshCw, Trash2, History, Search, Eye, ChevronDown, ChevronUp } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import MercuryTokenSetup from "@/components/MercuryTokenSetup";
import { DataTablePagination } from "@/components/ui/data-table-pagination";

interface Client {
  id: string;
  name: string;
  email: string;
  taxid: string;
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

interface Transaction {
  id: string;
  postedAt: string;
  amount: number;
  counterpartyName: string;
  note: string;
  status: string;
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
  const [selectedSyncRequest, setSelectedSyncRequest] = useState<SyncRequest | null>(null);
  const [syncRequestsSearch, setSyncRequestsSearch] = useState("");
  const [syncDetailsLoading, setSyncDetailsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"setup" | "history">("setup");
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [transactionsLoading, setTransactionsLoading] = useState(false);
  const [transactionsError, setTransactionsError] = useState<string | null>(null);
  const [summaryCollapsed, setSummaryCollapsed] = useState(false); // Collapsible state for overview + logs
  
  // Pagination state for transactions
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState<number>(() => {
    const saved = localStorage.getItem('txPageSize');
    return saved ? Number(saved) : 25;
  });

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
      const url = new URL('https://zitderdjvqtadtwgatmm.supabase.co/functions/v1/mercury-sync-manager');
      url.searchParams.set('action', 'list-syncs');
      
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InppdGRlcmRqdnF0YWR0d2dhdG1tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIyNzI4MTAsImV4cCI6MjA2Nzg0ODgxMH0.apenqp5pSuLZtRGD7K2iXWr5cFJLtXD9xuhu0gsJ0QA',
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('Sync requests fetched:', data); // Debug log
      setSyncRequests(data.sync_requests || []);
    } catch (error) {
      console.error("Error fetching sync requests:", error);
      toast({
        title: "Error",
        description: "Failed to load sync history",
        variant: "destructive"
      });
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
      const url = new URL('https://zitderdjvqtadtwgatmm.supabase.co/functions/v1/mercury-sync-manager');
      url.searchParams.set('action', 'create-sync');
      
      const response = await fetch(url.toString(), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InppdGRlcmRqdnF0YWR0d2dhdG1tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIyNzI4MTAsImV4cCI6MjA2Nzg0ODgxMH0.apenqp5pSuLZtRGD7K2iXWr5cFJLtXD9xuhu0gsJ0QA',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          connection_code: connectionId,
          client_ids: selectedClients,
          sync_type: syncSettings.syncType,
          frequency: syncSettings.frequency,
          start_date: syncSettings.startDate,
          end_date: syncSettings.endDate
        })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Request failed');
      }

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
      const url = new URL('https://zitderdjvqtadtwgatmm.supabase.co/functions/v1/mercury-sync-manager');
      url.searchParams.set('action', 'cancel-sync');
      url.searchParams.set('sync_id', syncId);
      
      const response = await fetch(url.toString(), {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InppdGRlcmRqdnF0YWR0d2dhdG1tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIyNzI4MTAsImV4cCI6MjA2Nzg0ODgxMH0.apenqp5pSuLZtRGD7K2iXWr5cFJLtXD9xuhu0gsJ0QA',
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Request failed');
      }

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

  const fetchSyncDetails = async (syncId: string) => {
    setSyncDetailsLoading(true);
    try {
      const url = new URL('https://zitderdjvqtadtwgatmm.supabase.co/functions/v1/mercury-sync-manager');
      url.searchParams.set('action', 'get-sync-details');
      url.searchParams.set('sync_id', syncId);
      
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InppdGRlcmRqdnF0YWR0d2dhdG1tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIyNzI4MTAsImV4cCI6MjA2Nzg0ODgxMH0.apenqp5pSuLZtRGD7K2iXWr5cFJLtXD9xuhu0gsJ0QA',
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Request failed');
      }
      
      // Update the selected sync request with detailed logs
      setSelectedSyncRequest(prev => ({
        ...prev!,
        sync_logs: data.sync_logs || []
      }));
    } catch (error) {
      console.error("Error fetching sync details:", error);
      toast({
        title: "Error",
        description: "Failed to load sync details",
        variant: "destructive"
      });
    } finally {
      setSyncDetailsLoading(false);
    }
  };

  const fetchTransactionData = async (syncId: string) => {
    if (!syncId) return;
    
    setTransactionsLoading(true);
    setTransactionsError(null);
    
    try {
      const url = new URL('https://zitderdjvqtadtwgatmm.supabase.co/functions/v1/mercury-sync-manager');
      url.searchParams.set('action', 'transactions');
      url.searchParams.set('sync_id', syncId);
      
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InppdGRlcmRqdnF0YWR0d2dhdG1tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIyNzI4MTAsImV4cCI6MjA2Nzg0ODgxMH0.apenqp5pSuLZtRGD7K2iXWr5cFJLtXD9xuhu0gsJ0QA',
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch transactions');
      }
      
      setTransactions(data.transactions || []);
    } catch (error) {
      console.error("Error fetching transaction data:", error);
      setTransactionsError(error instanceof Error ? error.message : 'Failed to load transaction data');
    } finally {
      setTransactionsLoading(false);
    }
  };

  const handleSyncRowClick = (syncRequest: SyncRequest) => {
    setSelectedSyncRequest(syncRequest);
    setTransactions([]);
    setTransactionsError(null);
    setPageIndex(0); // Reset to first page when opening new sync request
    fetchSyncDetails(syncRequest.id);
    fetchTransactionData(syncRequest.id);
  };

  // Pagination handlers
  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    localStorage.setItem('txPageSize', String(newPageSize));
    setPageIndex(0); // Reset to first page when changing page size
  };

  const handlePageChange = (newPageIndex: number) => {
    setPageIndex(newPageIndex);
  };

  // Calculate paginated transactions
  const paginatedTransactions = transactions.slice(
    pageIndex * pageSize, 
    (pageIndex + 1) * pageSize
  );

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { 
        className: "bg-yellow-100 text-yellow-800 hover:bg-yellow-200 border-yellow-300 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800", 
        label: "Pending" 
      },
      running: { 
        className: "bg-blue-100 text-blue-800 hover:bg-blue-200 border-blue-300 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800", 
        label: "In Progress" 
      },
      success: { 
        className: "bg-green-100 text-green-800 hover:bg-green-200 border-green-300 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800", 
        label: "Success" 
      },
      failed: { 
        className: "bg-red-100 text-red-800 hover:bg-red-200 border-red-300 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800", 
        label: "Failed" 
      },
      cancelled: { 
        className: "bg-gray-100 text-gray-800 hover:bg-gray-200 border-gray-300 dark:bg-gray-900/20 dark:text-gray-400 dark:border-gray-800", 
        label: "Cancelled" 
      }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    return <Badge className={config.className}>{config.label}</Badge>;
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
    client.taxid.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredSyncRequests = syncRequests.filter(request =>
    request.sync_type.toLowerCase().includes(syncRequestsSearch.toLowerCase()) ||
    request.status.toLowerCase().includes(syncRequestsSearch.toLowerCase()) ||
    request.id.toLowerCase().includes(syncRequestsSearch.toLowerCase())
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

      {/* Tab Navigation */}
      <div className="border-b border-border">
        <div className="flex space-x-8">
          <Button
            variant="ghost"
            className={`relative px-0 py-2 border-b-2 transition-colors ${
              activeTab === "setup"
                ? "border-primary text-primary font-medium"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => setActiveTab("setup")}
          >
            Setup
          </Button>
          <Button
            variant="ghost"
            className={`relative px-0 py-2 border-b-2 transition-colors ${
              activeTab === "history"
                ? "border-primary text-primary font-medium"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => setActiveTab("history")}
          >
            Sync History
            {syncRequests.length > 0 && (
              <Badge variant="secondary" className="ml-2 text-xs">
                {syncRequests.length}
              </Badge>
            )}
          </Button>
        </div>
      </div>

      {/* Tab Content */}
      <div className="animate-fade-in">
        {activeTab === "setup" && (
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
                        placeholder="Search by name, email, or Tax ID..."
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
                          <div className="text-sm text-muted-foreground">{client.email} • Tax ID: {client.taxid}</div>
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
        )}

        {activeTab === "history" && connectionId === "mercury" && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <History className="h-5 w-5" />
                    Sync Requests History
                  </CardTitle>
                  <CardDescription>
                    Track the status and history of your Mercury data sync requests. Click on any row to view detailed information.
                  </CardDescription>
                </div>
              </div>
              {syncRequests.length > 0 && (
                <div className="flex items-center gap-4 mt-4">
                  <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by ID, type, or status..."
                      value={syncRequestsSearch}
                      onChange={(e) => setSyncRequestsSearch(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Button
                    onClick={fetchSyncRequests}
                    variant="outline"
                    size="sm"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                  </Button>
                </div>
              )}
            </CardHeader>
            <CardContent>
              {syncRequests.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No sync requests found. Create your first sync request in the Setup tab.
                </div>
              ) : filteredSyncRequests.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No sync requests match your search criteria.
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Request ID</TableHead>
                        <TableHead>Sync Type</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Created At</TableHead>
                        <TableHead>Last Run</TableHead>
                        <TableHead>Next Scheduled</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredSyncRequests.map((request) => (
                        <TableRow 
                          key={request.id} 
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => handleSyncRowClick(request)}
                        >
                          <TableCell className="font-mono text-sm">
                            {request.id.slice(-8).toUpperCase()}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {request.sync_type === "automatic" ? "Automatic" : "Historical"}
                            </Badge>
                            <div className="text-xs text-muted-foreground mt-1">
                              {request.sync_type === "automatic" 
                                ? `${request.frequency?.charAt(0).toUpperCase()}${request.frequency?.slice(1)}`
                                : request.start_date && request.end_date
                                  ? `${request.start_date} to ${request.end_date}`
                                  : "One-time"
                              }
                            </div>
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(request.status)}
                            {request.error_message && (
                              <div className="text-xs text-red-600 mt-1 truncate max-w-32">
                                {request.error_message}
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-sm">
                            {formatDate(request.created_at)}
                          </TableCell>
                          <TableCell className="text-sm">
                            {request.last_run_at ? formatDate(request.last_run_at) : "Never"}
                          </TableCell>
                          <TableCell className="text-sm">
                            {request.next_run_at 
                              ? formatDate(request.next_run_at)
                              : request.sync_type === "historical" 
                                ? "N/A" 
                                : "Not scheduled"
                            }
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSyncRowClick(request);
                                }}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              {(request.status === "pending" || request.status === "running") && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleCancelSync(request.id);
                                  }}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Sync Details Modal */}
      <Dialog open={!!selectedSyncRequest} onOpenChange={() => setSelectedSyncRequest(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Sync Request Details
            </DialogTitle>
            <DialogDescription>
              Detailed information and logs for sync request {selectedSyncRequest?.id.slice(-8).toUpperCase()}
            </DialogDescription>
          </DialogHeader>
          
          {selectedSyncRequest && (
            <div className="space-y-6">
              {/* Error Message */}
              {selectedSyncRequest.error_message && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg text-red-600">Error Details</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg border border-red-200 dark:border-red-800">
                      <div className="text-sm text-red-800 dark:text-red-400">
                        {selectedSyncRequest.error_message}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Request Summary & Logs - Collapsible Card */}
              <Collapsible defaultOpen={false}>
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg">Request Summary & Logs</CardTitle>
                        <CardDescription>
                          Overview details and execution logs for this sync request
                        </CardDescription>
                      </div>
                      <CollapsibleTrigger asChild>
                        <Button variant="outline" size="sm">
                          <span className="text-xs">Show Metadata</span>
                          <ChevronDown className="h-4 w-4 ml-2" />
                        </Button>
                      </CollapsibleTrigger>
                    </div>
                  </CardHeader>
                  <CollapsibleContent>
                    <CardContent className="space-y-6 pt-0">
                      {/* Request Overview Section */}
                      <div>
                        <h4 className="font-semibold text-sm text-muted-foreground mb-3 uppercase tracking-wide">Overview</h4>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label className="text-sm font-medium text-muted-foreground">Request ID</Label>
                            <div className="font-mono text-sm">{selectedSyncRequest.id}</div>
                          </div>
                          <div>
                            <Label className="text-sm font-medium text-muted-foreground">Sync Type</Label>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">
                                {selectedSyncRequest.sync_type === "automatic" ? "Automatic" : "Historical"}
                              </Badge>
                            </div>
                          </div>
                          <div>
                            <Label className="text-sm font-medium text-muted-foreground">Status</Label>
                            <div>{getStatusBadge(selectedSyncRequest.status)}</div>
                          </div>
                          <div>
                            <Label className="text-sm font-medium text-muted-foreground">Clients Selected</Label>
                            <div>{selectedSyncRequest.client_ids.length} client(s)</div>
                          </div>
                          <div>
                            <Label className="text-sm font-medium text-muted-foreground">Created At</Label>
                            <div className="text-sm">{formatDate(selectedSyncRequest.created_at)}</div>
                          </div>
                          <div>
                            <Label className="text-sm font-medium text-muted-foreground">Last Run</Label>
                            <div className="text-sm">
                              {selectedSyncRequest.last_run_at ? formatDate(selectedSyncRequest.last_run_at) : "Never"}
                            </div>
                          </div>
                          {selectedSyncRequest.sync_type === "automatic" && (
                            <>
                              <div>
                                <Label className="text-sm font-medium text-muted-foreground">Frequency</Label>
                                <div className="text-sm capitalize">{selectedSyncRequest.frequency}</div>
                              </div>
                              <div>
                                <Label className="text-sm font-medium text-muted-foreground">Next Scheduled</Label>
                                <div className="text-sm">
                                  {selectedSyncRequest.next_run_at ? formatDate(selectedSyncRequest.next_run_at) : "Not scheduled"}
                                </div>
                              </div>
                            </>
                          )}
                          {selectedSyncRequest.sync_type === "historical" && (
                            <>
                              <div>
                                <Label className="text-sm font-medium text-muted-foreground">Start Date</Label>
                                <div className="text-sm">{selectedSyncRequest.start_date || "Not specified"}</div>
                              </div>
                              <div>
                                <Label className="text-sm font-medium text-muted-foreground">End Date</Label>
                                <div className="text-sm">{selectedSyncRequest.end_date || "Not specified"}</div>
                              </div>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Sync Logs Section */}
                      <div>
                        <h4 className="font-semibold text-sm text-muted-foreground mb-3 uppercase tracking-wide">Execution Logs</h4>
                        {syncDetailsLoading ? (
                          <div className="flex items-center justify-center py-8">
                            <RefreshCw className="h-6 w-6 animate-spin mr-2" />
                            Loading sync details...
                          </div>
                        ) : selectedSyncRequest.sync_logs && selectedSyncRequest.sync_logs.length > 0 ? (
                          <div className="rounded-md border">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Client ID</TableHead>
                                  <TableHead>Status</TableHead>
                                  <TableHead>Records Processed</TableHead>
                                  <TableHead>Execution Time</TableHead>
                                  <TableHead>Error Message</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {selectedSyncRequest.sync_logs.map((log, index) => (
                                  <TableRow key={index}>
                                    <TableCell className="font-mono text-sm">
                                      {log.client_id.slice(-8).toUpperCase()}
                                    </TableCell>
                                    <TableCell>
                                      {getStatusBadge(log.status)}
                                    </TableCell>
                                    <TableCell>{log.records_processed || 0}</TableCell>
                                    <TableCell className="text-sm">
                                      {formatDate(log.created_at)}
                                    </TableCell>
                                    <TableCell className="text-sm">
                                      {log.error_message || "None"}
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        ) : (
                          <div className="text-center py-8 text-muted-foreground">
                            No sync logs available for this request.
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>

              {/* Transaction Data - Primary Focus */}
              <Card className="border-2">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    Transaction Data ({transactions.length})
                  </CardTitle>
                  <CardDescription>
                    Real Mercury transaction data retrieved from your account
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {transactionsLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <RefreshCw className="h-6 w-6 animate-spin mr-2" />
                      Loading transaction data...
                    </div>
                  ) : transactionsError ? (
                    <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg border border-red-200 dark:border-red-800">
                      <div className="text-sm text-red-800 dark:text-red-400">
                        Failed to load transaction data: {transactionsError}
                      </div>
                    </div>
                  ) : transactions.length > 0 ? (
                    <div className="space-y-4">
                      <div className="rounded-md border">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Posted Date</TableHead>
                              <TableHead>Amount</TableHead>
                              <TableHead>Counterparty</TableHead>
                              <TableHead>Note</TableHead>
                              <TableHead>Status</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {paginatedTransactions.map((transaction) => (
                              <TableRow key={transaction.id}>
                                <TableCell className="text-sm">
                                  {new Date(transaction.postedAt).toLocaleDateString()}
                                </TableCell>
                                <TableCell className="font-medium">
                                  <span className={transaction.amount < 0 ? "text-red-600" : "text-green-600"}>
                                    ${Math.abs(transaction.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                  </span>
                                </TableCell>
                                <TableCell className="text-sm max-w-xs">
                                  <div className="truncate" title={transaction.counterpartyName}>
                                    {transaction.counterpartyName}
                                  </div>
                                </TableCell>
                                <TableCell className="text-sm max-w-xs">
                                  <div className="truncate" title={transaction.note}>
                                    {transaction.note || "—"}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Badge variant={transaction.status === "posted" ? "default" : "secondary"}>
                                    {transaction.status}
                                  </Badge>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                      
                      {/* Pagination Component */}
                      <DataTablePagination
                        total={transactions.length}
                        pageSize={pageSize}
                        pageIndex={pageIndex}
                        onPageSizeChange={handlePageSizeChange}
                        onPageChange={handlePageChange}
                      />
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      No transaction data available for this sync request.
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ConnectionSetup;