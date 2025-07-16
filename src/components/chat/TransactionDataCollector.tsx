import { useState, useEffect } from "react";
import { Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useChatStore } from "@/store/useChatStore";

interface Client {
  id: string;
  name: string;
  taxid: string;
}

interface ParameterCollectorProps {
  messageId: string;
  missingParams?: string[];
  onDataSubmitted: () => void;
}

export const TransactionDataCollector = ({ messageId, missingParams = ['clientId', 'startDate', 'endDate'], onDataSubmitted }: ParameterCollectorProps) => {
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState<string>("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const { send, markDataCollected } = useChatStore();

  useEffect(() => {
    if (missingParams.includes('clientId')) {
      loadClients();
    }
  }, [missingParams]);

  const loadClients = async () => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('id, name, taxid')
        .order('name');

      if (error) throw error;
      setClients(data || []);
    } catch (error) {
      console.error('Failed to load clients:', error);
    }
  };

  const handleSubmit = async () => {
    // Validate required fields based on missing params
    const hasRequiredClient = !missingParams.includes('clientId') || selectedClient;
    const hasRequiredStartDate = !missingParams.includes('startDate') || startDate;
    const hasRequiredEndDate = !missingParams.includes('endDate') || endDate;
    
    if (!hasRequiredClient || !hasRequiredStartDate || !hasRequiredEndDate) return;

    setIsLoading(true);
    try {
      // Build request object based on missing parameters
      const requestData: any = {};
      
      if (missingParams.includes('clientId') && selectedClient) {
        requestData.clientId = selectedClient;
      }
      if (missingParams.includes('startDate') && startDate) {
        requestData.startDate = startDate;
      }
      if (missingParams.includes('endDate') && endDate) {
        requestData.endDate = endDate;
      }

      // Send structured request
      const parameterRequest = JSON.stringify(requestData);
      await send(parameterRequest);
      markDataCollected(messageId);
      onDataSubmitted();
    } catch (error) {
      console.error('Failed to submit parameter request:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const isValidSubmission = () => {
    const hasRequiredClient = !missingParams.includes('clientId') || selectedClient;
    const hasRequiredStartDate = !missingParams.includes('startDate') || startDate;
    const hasRequiredEndDate = !missingParams.includes('endDate') || endDate;
    const isValidDateRange = !startDate || !endDate || new Date(startDate) <= new Date(endDate);
    
    return hasRequiredClient && hasRequiredStartDate && hasRequiredEndDate && isValidDateRange;
  };

  return (
    <Card className="p-4 mt-3 bg-glass-bg/30 border border-glass-border">
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm text-white">
          <Calendar className="w-4 h-4" />
          <span>Please provide the missing information:</span>
        </div>

        <div className="space-y-3">
          {missingParams.includes('clientId') && (
            <div>
              <Label htmlFor={`client-${messageId}`} className="text-white text-sm">Client</Label>
              <Select value={selectedClient} onValueChange={setSelectedClient}>
                <SelectTrigger className="bg-glass-bg/20 border-glass-border text-white">
                  <SelectValue placeholder="Select a client" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map(client => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name} ({client.taxid})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {(missingParams.includes('startDate') || missingParams.includes('endDate')) && (
            <div className="grid grid-cols-2 gap-3">
              {missingParams.includes('startDate') && (
                <div>
                  <Label htmlFor={`start-date-${messageId}`} className="text-white text-sm">Start Date</Label>
                  <Input
                    id={`start-date-${messageId}`}
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="bg-glass-bg/20 border-glass-border text-white"
                  />
                </div>
              )}
              {missingParams.includes('endDate') && (
                <div>
                  <Label htmlFor={`end-date-${messageId}`} className="text-white text-sm">End Date</Label>
                  <Input
                    id={`end-date-${messageId}`}
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="bg-glass-bg/20 border-glass-border text-white"
                  />
                </div>
              )}
            </div>
          )}
        </div>

        <Button 
          onClick={handleSubmit}
          disabled={!isValidSubmission() || isLoading}
          className="w-full bg-primary hover:bg-primary/80"
        >
          {isLoading ? 'Generating Report...' : 'Generate Report'}
        </Button>
      </div>
    </Card>
  );
};