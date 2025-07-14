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
  rfc: string;
}

interface TransactionDataCollectorProps {
  messageId: string;
  onDataSubmitted: () => void;
}

export const TransactionDataCollector = ({ messageId, onDataSubmitted }: TransactionDataCollectorProps) => {
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState<string>("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const { send, markDataCollected } = useChatStore();

  useEffect(() => {
    loadClients();
  }, []);

  const loadClients = async () => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('id, name, rfc')
        .order('name');

      if (error) throw error;
      setClients(data || []);
    } catch (error) {
      console.error('Failed to load clients:', error);
    }
  };

  const handleSubmit = async () => {
    if (!selectedClient || !startDate || !endDate) return;

    setIsLoading(true);
    try {
      // Send structured transaction request
      const transactionRequest = JSON.stringify({
        clientId: selectedClient,
        startDate,
        endDate
      });

      await send(transactionRequest);
      markDataCollected(messageId);
      onDataSubmitted();
    } catch (error) {
      console.error('Failed to submit transaction request:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const isValidDateRange = startDate && endDate && new Date(startDate) <= new Date(endDate);

  return (
    <Card className="p-4 mt-3 bg-glass-bg/30 border border-glass-border">
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm text-white">
          <Calendar className="w-4 h-4" />
          <span>Please provide the missing information:</span>
        </div>

        <div className="space-y-3">
          <div>
            <Label htmlFor={`client-${messageId}`} className="text-white text-sm">Client</Label>
            <Select value={selectedClient} onValueChange={setSelectedClient}>
              <SelectTrigger className="bg-glass-bg/20 border-glass-border text-white">
                <SelectValue placeholder="Select a client" />
              </SelectTrigger>
              <SelectContent>
                {clients.map(client => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.name} ({client.rfc})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
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
          </div>
        </div>

        <Button 
          onClick={handleSubmit}
          disabled={!isValidDateRange || !selectedClient || isLoading}
          className="w-full bg-primary hover:bg-primary/80"
        >
          {isLoading ? 'Fetching Transactions...' : 'Generate Report'}
        </Button>
      </div>
    </Card>
  );
};