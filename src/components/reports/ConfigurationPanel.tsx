import React from "react";
import { X, Calendar, Users, Filter, Settings, Database, BarChart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface ConfigurationPanelProps {
  isVisible: boolean;
  onClose: () => void;
  selectedComponent?: any;
}

export const ConfigurationPanel: React.FC<ConfigurationPanelProps> = ({
  isVisible,
  onClose,
  selectedComponent,
}) => {
  if (!isVisible) return null;

  return (
    <div className="w-80 bg-glass-bg/50 backdrop-blur-xl border-l border-glass-border flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-glass-border flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Configuration</h2>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-4">
          <Tabs defaultValue="properties" className="w-full">
            <TabsList className="grid w-full grid-cols-3 bg-glass-bg/30">
              <TabsTrigger value="properties" className="text-xs">
                <Settings className="h-3 w-3 mr-1" />
                Properties
              </TabsTrigger>
              <TabsTrigger value="data" className="text-xs">
                <Database className="h-3 w-3 mr-1" />
                Data
              </TabsTrigger>
              <TabsTrigger value="filters" className="text-xs">
                <Filter className="h-3 w-3 mr-1" />
                Filters
              </TabsTrigger>
            </TabsList>

            {/* Properties Tab */}
            <TabsContent value="properties" className="mt-4 space-y-4">
              {selectedComponent ? (
                <div className="space-y-4">
                  <div className="p-3 bg-glass-bg/30 rounded-lg border border-glass-border">
                    <div className="flex items-center gap-2 mb-2">
                      <BarChart className="h-4 w-4 text-primary" />
                      <span className="font-medium text-foreground">{selectedComponent.type}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Configure the selected component properties
                    </p>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="component-title" className="text-sm font-medium">Title</Label>
                      <Input
                        id="component-title"
                        defaultValue={selectedComponent.data?.title || "Untitled"}
                        className="mt-1 bg-glass-bg/20 border-glass-border"
                        placeholder="Enter component title"
                      />
                    </div>

                    <div>
                      <Label htmlFor="component-size" className="text-sm font-medium">Size</Label>
                      <Select defaultValue="medium">
                        <SelectTrigger className="mt-1 bg-glass-bg/20 border-glass-border">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="small">Small</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="large">Large</SelectItem>
                          <SelectItem value="full">Full Width</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-center justify-between">
                      <Label htmlFor="show-border" className="text-sm font-medium">Show Border</Label>
                      <Switch id="show-border" defaultChecked />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label htmlFor="show-header" className="text-sm font-medium">Show Header</Label>
                      <Switch id="show-header" defaultChecked />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Settings className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">
                    Select a component to configure its properties
                  </p>
                </div>
              )}
            </TabsContent>

            {/* Data Tab */}
            <TabsContent value="data" className="mt-4 space-y-4">
              <div className="space-y-4">
                <div className="p-3 bg-glass-bg/30 rounded-lg border border-glass-border">
                  <div className="flex items-center gap-2 mb-2">
                    <Database className="h-4 w-4 text-primary" />
                    <span className="font-medium text-foreground">Data Source</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Configure the data source for your report
                  </p>
                </div>

                <div>
                  <Label htmlFor="data-source" className="text-sm font-medium">Source Table</Label>
                  <Select>
                    <SelectTrigger className="mt-1 bg-glass-bg/20 border-glass-border">
                      <SelectValue placeholder="Select data source" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="clients">Clients</SelectItem>
                      <SelectItem value="transactions">Transactions</SelectItem>
                      <SelectItem value="invoices">Invoices</SelectItem>
                      <SelectItem value="payments">Payments</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="columns" className="text-sm font-medium">Columns</Label>
                  <div className="mt-2 space-y-2">
                    {['ID', 'Name', 'Amount', 'Date', 'Status'].map((column) => (
                      <div key={column} className="flex items-center justify-between">
                        <span className="text-sm text-foreground">{column}</span>
                        <Switch defaultChecked={column !== 'ID'} />
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <Label htmlFor="sort-by" className="text-sm font-medium">Sort By</Label>
                  <Select defaultValue="date">
                    <SelectTrigger className="mt-1 bg-glass-bg/20 border-glass-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="name">Name</SelectItem>
                      <SelectItem value="amount">Amount</SelectItem>
                      <SelectItem value="date">Date</SelectItem>
                      <SelectItem value="status">Status</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </TabsContent>

            {/* Filters Tab */}
            <TabsContent value="filters" className="mt-4 space-y-4">
              <div className="space-y-4">
                <div className="p-3 bg-glass-bg/30 rounded-lg border border-glass-border">
                  <div className="flex items-center gap-2 mb-2">
                    <Filter className="h-4 w-4 text-primary" />
                    <span className="font-medium text-foreground">Global Filters</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Apply filters to the entire report
                  </p>
                </div>

                <div>
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Date Range
                  </Label>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <Input
                      type="date"
                      className="bg-glass-bg/20 border-glass-border text-sm"
                      placeholder="From"
                    />
                    <Input
                      type="date"
                      className="bg-glass-bg/20 border-glass-border text-sm"
                      placeholder="To"
                    />
                  </div>
                </div>

                <Separator className="bg-glass-border" />

                <div>
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Client Filter
                  </Label>
                  <Select>
                    <SelectTrigger className="mt-2 bg-glass-bg/20 border-glass-border">
                      <SelectValue placeholder="All clients" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Clients</SelectItem>
                      <SelectItem value="active">Active Only</SelectItem>
                      <SelectItem value="inactive">Inactive Only</SelectItem>
                      <SelectItem value="custom">Custom Selection</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="status-filter" className="text-sm font-medium">Status Filter</Label>
                  <Select>
                    <SelectTrigger className="mt-2 bg-glass-bg/20 border-glass-border">
                      <SelectValue placeholder="All statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="amount-range" className="text-sm font-medium">Amount Range</Label>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <Input
                      type="number"
                      className="bg-glass-bg/20 border-glass-border text-sm"
                      placeholder="Min"
                    />
                    <Input
                      type="number"
                      className="bg-glass-bg/20 border-glass-border text-sm"
                      placeholder="Max"
                    />
                  </div>
                </div>

                <Button className="w-full mt-4 bg-primary hover:bg-primary/90">
                  Apply Filters
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </ScrollArea>
    </div>
  );
};