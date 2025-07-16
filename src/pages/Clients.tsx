import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Plus, Download, MoreHorizontal, AlertTriangle, Shield, CheckCircle, XCircle, Users, AlertCircle, Clock, Activity } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Client {
  id: string;
  name: string;
  email: string;
  taxid: string;
  
  last_sync: string | null;
  last_sync_successful: boolean | null;
  last_sync_at: string | null;
  created_at?: string;
  updated_at?: string;
  credentials: Array<{
    id: string;
    name: string;
    code: string;
    status: string;
  }>;
}

interface Metrics {
  registeredClients: number;
  activeClients: number;
  invalidCredentials: number;
  successfulSyncs: number;
}

const metricsConfig = [
  {
    title: "Registered Clients",
    key: "registeredClients" as keyof Metrics,
    icon: Users,
    color: "blue"
  },
  {
    title: "Active Clients", 
    key: "activeClients" as keyof Metrics,
    icon: CheckCircle,
    color: "green"
  },
  {
    title: "Invalid Credentials",
    key: "invalidCredentials" as keyof Metrics,
    icon: AlertTriangle,
    color: "orange"
  },
  {
    title: "Successful Syncs",
    key: "successfulSyncs" as keyof Metrics,
    icon: Clock,
    color: "purple"
  }
];

const Clients = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [clients, setClients] = useState<Client[]>([]);
  const [metrics, setMetrics] = useState<Metrics>({
    registeredClients: 0,
    activeClients: 0,
    invalidCredentials: 0,
    successfulSyncs: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState<string | null>(null);

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      // Check current session and user
      const { data: { session } } = await supabase.auth.getSession();
      console.log("Current session:", session);
      console.log("Current user:", session?.user?.id);
      
      if (!session?.user) {
        console.error("No authenticated user found");
        setIsLoading(false);
        return;
      }

      // Fetch clients with their credentials
      const { data: clientsData, error: clientsError } = await supabase
        .from("clients")
        .select(`
          *,
          client_credentials (
            id,
            name,
            code,
            status
          )
        `);

      console.log("Clients query result:", { clientsData, clientsError });

      if (clientsError) throw clientsError;

      // Transform the data to match our interface
      const transformedClients: Client[] = (clientsData || []).map(client => ({
        id: client.id,
        name: client.name,
        email: client.email,
        taxid: client.taxid,
        
        last_sync: client.last_sync,
        last_sync_successful: client.last_sync_successful,
        last_sync_at: client.last_sync_at,
        created_at: client.created_at,
        updated_at: client.updated_at,
        credentials: client.client_credentials || []
      }));

      console.log("Transformed clients:", transformedClients);
      setClients(transformedClients);
      calculateMetrics(transformedClients);
    } catch (error: any) {
      console.error("Error fetching clients:", error);
      toast({
        title: "Error",
        description: "Failed to load clients.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const calculateMetrics = (clientsData: Client[]) => {
    const registeredClients = clientsData.length;
    const activeClients = clientsData.filter(client => 
      client.credentials.some(cred => cred.status === "connected")
    ).length;
    const invalidCredentials = clientsData.filter(client => 
      client.credentials.length === 0 || 
      client.credentials.every(cred => cred.status === "disconnected")
    ).length;
    const successfulSyncs = clientsData.filter(client => 
      client.last_sync_successful === true
    ).length;

    setMetrics({
      registeredClients,
      activeClients,
      invalidCredentials,
      successfulSyncs,
    });
  };

  const handleMetricClick = (metricKey: keyof Metrics) => {
    setSelectedFilter(selectedFilter === metricKey ? null : metricKey);
  };

  const handleSyncClient = async (clientId: string) => {
    try {
      // Mock sync operation - update last_sync_at and last_sync_successful
      const { error } = await supabase
        .from("clients")
        .update({
          last_sync_at: new Date().toISOString(),
          last_sync_successful: true,
        })
        .eq("id", clientId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Client data synced successfully.",
      });

      fetchClients(); // Refresh the data
    } catch (error: any) {
      console.error("Error syncing client:", error);
      toast({
        title: "Error",
        description: "Failed to sync client data.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteClient = async (clientId: string) => {
    try {
      const { error } = await supabase
        .from("clients")
        .delete()
        .eq("id", clientId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Client deleted successfully.",
      });

      fetchClients(); // Refresh the data
    } catch (error: any) {
      console.error("Error deleting client:", error);
      toast({
        title: "Error",
        description: "Failed to delete client.",
        variant: "destructive",
      });
    }
  };

  const handleDownloadCSV = () => {
    if (clients.length === 0) {
      toast({
        title: "No Data",
        description: "No clients available to download.",
        variant: "destructive",
      });
      return;
    }

    // CSV headers
    const headers = [
      "Client Name",
      "Email", 
      "Tax ID (EIN)",
      "Last Sync",
      "Last Sync Successful",
      "Credentials Status",
      "Created Date"
    ];

    // Convert clients data to CSV rows
    const csvRows = clients.map(client => [
      `"${client.name}"`,
      `"${client.email}"`,
      `"${client.taxid}"`,
      `"${client.last_sync_at ? new Date(client.last_sync_at).toLocaleDateString() : 'Never'}"`,
      `"${client.last_sync_successful === null ? 'N/A' : client.last_sync_successful ? 'Yes' : 'No'}"`,
      `"${client.credentials.length > 0 ? client.credentials.map(c => `${c.code}:${c.status}`).join('; ') : 'None'}"`,
      `"${new Date(client.created_at || '').toLocaleDateString()}"`
    ]);

    // Combine headers and rows
    const csvContent = [
      headers.join(','),
      ...csvRows.map(row => row.join(','))
    ].join('\n');

    // Create and trigger download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `clients-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "Success",
      description: "Client list downloaded successfully.",
    });
  };
  

  const getCredentialIcon = (status: string) => {
    switch (status) {
      case "connected":
        return <CheckCircle className="w-4 h-4 text-taxops-success" />;
      case "partial":
        return <AlertCircle className="w-4 h-4 text-taxops-warning" />;
      case "disconnected":
        return <XCircle className="w-4 h-4 text-taxops-error" />;
      default:
        return <AlertTriangle className="w-4 h-4 text-taxops-gray-light" />;
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

  const getFilteredClients = () => {
    let filtered = clients.filter(client =>
      client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.taxid.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Apply metric filter
    if (selectedFilter) {
      switch (selectedFilter) {
        case "activeClients":
          filtered = filtered.filter(client => 
            client.credentials.some(cred => cred.status === "connected")
          );
          break;
        case "invalidCredentials":
          filtered = filtered.filter(client => 
            client.credentials.length === 0 || 
            client.credentials.every(cred => cred.status === "disconnected")
          );
          break;
        case "successfulSyncs":
          filtered = filtered.filter(client => client.last_sync_successful === true);
          break;
        default:
          break;
      }
    }

    return filtered;
  };

  const filteredClients = getFilteredClients();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Activity className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-slide-up">
      {/* Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {metricsConfig.map((metric, index) => {
          const Icon = metric.icon;
          const value = metrics[metric.key];
          const isSelected = selectedFilter === metric.key;
          return (
            <Card
              key={metric.title}
              className={`p-6 bg-glass-bg/50 backdrop-blur-sm border-glass-border hover:border-primary/30 transition-all duration-300 group hover:shadow-glow animate-slide-up cursor-pointer ${
                isSelected ? 'border-primary/50 shadow-glow' : ''
              }`}
              style={{ animationDelay: `${index * 100}ms` }}
              onClick={() => handleMetricClick(metric.key)}
            >
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <p className="text-sm text-taxops-gray-light">{metric.title}</p>
                  <p className="text-3xl font-bold text-white">{value}</p>
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
            <Button 
              variant="outline" 
              className="gap-2 hover:bg-glass-bg/50 transition-all duration-300 group"
              onClick={handleDownloadCSV}
            >
              <Download className="w-4 h-4 group-hover:scale-110 transition-transform" />
              Download Client List
            </Button>
            <Button className="gap-2 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-glow transition-all duration-300 group"
              onClick={() => navigate("/clients/new")}
            >
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
                    <p className="text-sm text-taxops-gray-light font-mono">{client.taxid}</p>
                  </div>
                  
                  {/* Credentials */}
                  <div className="flex flex-col space-y-2">
                    <p className="text-xs text-taxops-gray-light uppercase tracking-wide">Credentials</p>
                    <div className="flex items-center space-x-4">
                      {client.credentials.map((credential, credIndex) => (
                        <TooltipProvider key={credIndex}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="flex items-center space-x-1">
                                {getCredentialIcon(credential.status)}
                                <span className="text-xs text-taxops-gray-light uppercase">
                                  {credential.code}
                                </span>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{credential.name}: {credential.status}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ))}
                    </div>
                  </div>
                  
                  {/* Last Sync */}
                  <div className="flex flex-col space-y-2">
                    <p className="text-xs text-taxops-gray-light uppercase tracking-wide">Last Sync</p>
                    <p className="text-sm text-white">
                      {client.last_sync_at ? new Date(client.last_sync_at).toLocaleDateString() : 'Never'}
                    </p>
                    {client.last_sync_successful !== null && (
                      <div className="flex items-center gap-1">
                        {client.last_sync_successful ? (
                          <CheckCircle className="w-3 h-3 text-taxops-success" />
                        ) : (
                          <XCircle className="w-3 h-3 text-taxops-error" />
                        )}
                        <span className={`text-xs ${client.last_sync_successful ? 'text-taxops-success' : 'text-taxops-error'}`}>
                          {client.last_sync_successful ? 'Success' : 'Failed'}
                        </span>
                      </div>
                    )}
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
                    <DropdownMenuItem 
                      className="hover:bg-glass-bg/50"
                      onClick={() => navigate(`/clients/${client.id}`)}
                    >
                      View Details
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      className="hover:bg-glass-bg/50"
                      onClick={() => handleSyncClient(client.id)}
                    >
                      Sync Data
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      className="hover:bg-glass-bg/50 text-taxops-error"
                      onClick={() => handleDeleteClient(client.id)}
                    >
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
              <Button 
                className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-glow transition-all duration-300 group"
                onClick={() => navigate("/clients/new")}
              >
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