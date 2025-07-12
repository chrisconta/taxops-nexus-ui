import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Calendar, Clock, Users, Play, CheckCircle, XCircle, AlertCircle } from "lucide-react";
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

interface Client {
  id: string;
  name: string;
  email: string;
  rfc: string;
  sat_status: string;
}

interface SyncSettings {
  frequency: "daily" | "weekly" | "monthly";
  historicalPeriod: "last_month" | "last_year" | "custom";
  customStartDate?: string;
  customEndDate?: string;
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
    frequency: "daily",
    historicalPeriod: "last_month"
  });
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    status: "idle",
    progress: 0,
    message: ""
  });
  const [credentialsValid, setCredentialsValid] = useState(false);

  // Connection metadata based on connectionId
  const getConnectionInfo = (id: string) => {
    const connections: Record<string, { title: string; description: string; requiresAuth: boolean }> = {
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
      }
    };
    return connections[id] || { title: "Unknown", description: "", requiresAuth: true };
  };

  const connectionInfo = getConnectionInfo(connectionId || "");

  useEffect(() => {
    fetchClients();
    checkCredentials();
  }, []);

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
                Select clients to sync data for. You can choose multiple clients.
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

          {/* Sync Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Automation Settings
              </CardTitle>
              <CardDescription>
                Configure how often data should be synced and the historical period to include.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label>Sync Frequency</Label>
                <RadioGroup
                  value={syncSettings.frequency}
                  onValueChange={(value) => setSyncSettings(prev => ({ ...prev, frequency: value as any }))}
                  className="mt-2"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="daily" id="daily" />
                    <Label htmlFor="daily">Daily</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="weekly" id="weekly" />
                    <Label htmlFor="weekly">Weekly</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="monthly" id="monthly" />
                    <Label htmlFor="monthly">Monthly</Label>
                  </div>
                </RadioGroup>
              </div>

              <div>
                <Label>Historical Data Period</Label>
                <Select
                  value={syncSettings.historicalPeriod}
                  onValueChange={(value) => setSyncSettings(prev => ({ ...prev, historicalPeriod: value as any }))}
                >
                  <SelectTrigger className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="last_month">Last Month</SelectItem>
                    <SelectItem value="last_year">Last Year</SelectItem>
                    <SelectItem value="custom">Custom Date Range</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {syncSettings.historicalPeriod === "custom" && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="start-date">Start Date</Label>
                    <Input
                      id="start-date"
                      type="date"
                      value={syncSettings.customStartDate || ""}
                      onChange={(e) => setSyncSettings(prev => ({ ...prev, customStartDate: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="end-date">End Date</Label>
                    <Input
                      id="end-date"
                      type="date"
                      value={syncSettings.customEndDate || ""}
                      onChange={(e) => setSyncSettings(prev => ({ ...prev, customEndDate: e.target.value }))}
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
                onClick={handleSync}
                disabled={selectedClients.length === 0 || !credentialsValid || syncStatus.status === "in_progress"}
                className="w-full"
                size="lg"
              >
                <Play className="h-4 w-4 mr-2" />
                Request Data Sync
              </Button>

              {!credentialsValid && (
                <div className="text-sm text-yellow-600 bg-yellow-50 p-3 rounded border">
                  ⚠️ No valid credentials found. Please configure connection credentials first.
                </div>
              )}

              {selectedClients.length === 0 && (
                <div className="text-sm text-muted-foreground">
                  Select at least one client to enable sync
                </div>
              )}
            </CardContent>
          </Card>

          {/* Sync Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {getStatusIcon()}
                Sync Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {syncStatus.status === "in_progress" && (
                <div className="space-y-2">
                  <Progress value={syncStatus.progress} />
                  <div className="text-sm text-center">{syncStatus.progress}%</div>
                </div>
              )}

              <div className="text-sm">
                <div className="font-medium">{syncStatus.message}</div>
                {syncStatus.details && (
                  <div className="text-muted-foreground mt-1">{syncStatus.details}</div>
                )}
              </div>

              {syncStatus.status === "success" && (
                <Badge variant="default" className="w-full justify-center">
                  Sync Completed Successfully
                </Badge>
              )}

              {syncStatus.status === "error" && (
                <Badge variant="destructive" className="w-full justify-center">
                  Sync Failed
                </Badge>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ConnectionSetup;