import { useState } from "react";
import { ArrowRight, Info, Download, Bot, Globe, Upload, Zap } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const connectionTypes = [
  {
    id: "xml-auto",
    title: "Download XML Automatically",
    description: "Automated XML download from SAT",
    icon: Download,
    status: "available",
  },
  {
    id: "xml-bot",
    title: "Download XML via Web Bot",
    description: "Use web automation to download XML files",
    icon: Bot,
    status: "available",
  },
  {
    id: "xml-service",
    title: "Download XML via Web Service",
    description: "Connect directly to SAT web services",
    icon: Globe,
    status: "available",
  },
  {
    id: "bulk-upload",
    title: "Bulk Upload (.zip)",
    description: "Upload multiple XML files at once",
    icon: Upload,
    status: "available",
  },
  {
    id: "netsuite",
    title: "NetSuite Integration",
    description: "Connect to your NetSuite instance",
    icon: Zap,
    status: "coming-soon",
  },
];

const Connections = () => {
  const [selectedConnection, setSelectedConnection] = useState<string | null>(null);

  const handleConnectionClick = (connectionId: string) => {
    setSelectedConnection(connectionId);
    // In a real app, this would navigate to a configuration page
    console.log(`Configuring connection: ${connectionId}`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-foreground">Connections</h1>
        <p className="text-lg text-muted-foreground">
          Choose a connection type to generate your report
        </p>
      </div>

      {/* Connection Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {connectionTypes.map((connection) => {
          const Icon = connection.icon;
          const isAvailable = connection.status === "available";
          
          return (
            <Card
              key={connection.id}
              className={`group relative p-6 bg-card/50 backdrop-blur border-glass-border transition-all duration-300 cursor-pointer
                ${isAvailable 
                  ? "hover:bg-card/80 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/20" 
                  : "opacity-60 cursor-not-allowed"
                }
                ${selectedConnection === connection.id ? "border-primary shadow-lg shadow-primary/20" : ""}
              `}
              onClick={() => isAvailable && handleConnectionClick(connection.id)}
            >
              {/* Status badge */}
              {connection.status === "coming-soon" && (
                <div className="absolute top-4 right-4">
                  <span className="text-xs bg-taxops-warning/20 text-taxops-warning px-2 py-1 rounded-full">
                    Coming Soon
                  </span>
                </div>
              )}

              {/* Icon */}
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                  <Icon className="w-6 h-6 text-primary" />
                </div>
                
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" className="w-8 h-8">
                        <Info className="w-4 h-4 text-muted-foreground" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs">{connection.description}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>

              {/* Content */}
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors">
                  {connection.title}
                </h3>
                
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {connection.description}
                </p>
              </div>

              {/* Action */}
              <div className="flex items-center justify-end mt-6">
                <Button
                  variant="ghost"
                  size="icon"
                  className={`group-hover:text-primary transition-colors ${
                    isAvailable ? "" : "opacity-50"
                  }`}
                  disabled={!isAvailable}
                >
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>

              {/* Hover effect overlay */}
              <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-lg pointer-events-none" />
            </Card>
          );
        })}
      </div>

      {/* Additional Info */}
      <Card className="p-6 bg-muted/20 border-border">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
            <Info className="w-5 h-5 text-primary" />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-foreground">Getting Started</h3>
            <p className="text-muted-foreground">
              Select a connection type above to begin configuring your data source. 
              Each connection type has different requirements and capabilities for accessing your tax data.
            </p>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1 mt-3">
              <li>Automatic downloads require valid SAT credentials</li>
              <li>Web bot connections may need additional browser configuration</li>
              <li>Bulk uploads support ZIP files containing multiple XML documents</li>
              <li>NetSuite integration requires API access and configuration</li>
            </ul>
          </div>
        </div>
      </Card>

      {/* Recent Connections */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-foreground">Recent Connections</h2>
        <Card className="p-4 bg-card/30 border-border">
          <div className="text-center py-8">
            <Globe className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
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