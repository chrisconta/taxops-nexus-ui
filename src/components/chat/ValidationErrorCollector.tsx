import { useState, useEffect } from "react";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { useChatStore } from "@/store/useChatStore";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";

interface ValidationError {
  field: string;
  reason: string;
  hint: string;
}

interface ValidationResponse {
  missing: ValidationError[];
  invalid: ValidationError[];
}

interface ValidationErrorCollectorProps {
  errors: ValidationResponse;
  toolName: string;
  onComplete: (collectedData: Record<string, any>) => void;
}

export const ValidationErrorCollector: React.FC<ValidationErrorCollectorProps> = ({
  errors,
  toolName,
  onComplete
}) => {
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [clients, setClients] = useState<Array<{id: string, name: string}>>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Load clients for clientId field if needed
  useEffect(() => {
    const needsClientId = errors.missing.some(error => 
      error.field === "clientId" || error.field === "client_id" || error.field === "companyId"
    );
    
    if (needsClientId) {
      loadClients();
    }
  }, [errors]);
  
  const loadClients = async () => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('id, name')
        .order('name');

      if (error) throw error;
      setClients(data || []);
    } catch (error) {
      console.error('Failed to load clients:', error);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = () => {
    setIsLoading(true);
    try {
      onComplete(formData);
    } catch (error) {
      console.error("Error submitting validation data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Determine if all required fields have values
  const isCompleteForm = errors.missing.every(error => 
    formData[error.field] !== undefined && formData[error.field] !== ""
  );

  // Get field rendering configuration based on field name
  const getFieldConfig = (field: string) => {
    // Common field configurations
    if (field === 'clientId' || field === 'client_id' || field === 'companyId') {
      return {
        label: 'Client',
        type: 'select',
        options: clients.map(c => ({ value: c.id, label: c.name }))
      };
    }
    
    if (field === 'name') {
      return { label: 'Name', type: 'text', placeholder: 'Enter company name' };
    }
    
    if (field === 'email') {
      return { label: 'Email', type: 'email', placeholder: 'Enter email address' };
    }
    
    if (field === 'ein') {
      return { label: 'EIN', type: 'text', placeholder: 'Enter EIN (XX-XXXXXXX)' };
    }
    
    if (field === 'connectionType') {
      return { 
        label: 'Connection Type', 
        type: 'select', 
        options: [
          { value: 'bank', label: 'Banking' },
          { value: 'erp', label: 'ERP System' },
          { value: 'manual', label: 'Manual Import' }
        ]
      };
    }
    
    if (field === 'institution') {
      return { label: 'Institution', type: 'text', placeholder: 'Enter institution name' };
    }
    
    if (field === 'syncMode') {
      return { 
        label: 'Sync Mode', 
        type: 'select', 
        options: [
          { value: 'automatic', label: 'Automatic' },
          { value: 'historical', label: 'Historical' },
          { value: 'file_upload', label: 'File Upload' }
        ]
      };
    }
    
    if (field === 'metrics') {
      return { 
        label: 'Metrics', 
        type: 'select', 
        options: [
          { value: '["revenue","expenses"]', label: 'Revenue & Expenses' },
          { value: '["revenue"]', label: 'Revenue Only' },
          { value: '["expenses"]', label: 'Expenses Only' },
          { value: '["taxLiability"]', label: 'Tax Liability' }
        ]
      };
    }
    
    if (field === 'timeframe') {
      return { 
        label: 'Timeframe', 
        type: 'select', 
        options: [
          { value: JSON.stringify({start: '2024-01-01', end: '2024-12-31'}), label: 'This Year (2024)' },
          { value: JSON.stringify({start: '2023-01-01', end: '2023-12-31'}), label: 'Last Year (2023)' },
          { value: JSON.stringify({start: '2024-01-01', end: '2024-03-31'}), label: 'Q1 2024' },
          { value: JSON.stringify({start: '2024-04-01', end: '2024-06-30'}), label: 'Q2 2024' }
        ]
      };
    }
    
    // Default to text input for unknown fields
    return { 
      label: field.charAt(0).toUpperCase() + field.slice(1).replace(/_/g, ' '), 
      type: 'text',
      placeholder: `Enter ${field}` 
    };
  };

  return (
    <Card className="p-4 mt-3 bg-glass-bg/30 border border-glass-border">
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm text-white">
          <AlertCircle className="w-4 h-4 text-amber-400" />
          <span className="font-medium">I need some more information to {toolName.replace('_', ' ')}:</span>
        </div>

        <div className="space-y-3">
          {errors.missing.map((error, idx) => {
            const config = getFieldConfig(error.field);
            
            return (
              <div key={`${error.field}-${idx}`}>
                <Label htmlFor={`field-${error.field}`} className="text-white text-sm mb-1 flex items-center gap-1">
                  {config.label}
                  <span className="text-xs text-muted-foreground font-normal ml-1">
                    ({error.hint})
                  </span>
                </Label>
                
                {config.type === 'select' ? (
                  <Select 
                    value={formData[error.field] || ''} 
                    onValueChange={(value) => handleInputChange(error.field, value)}
                  >
                    <SelectTrigger className="bg-glass-bg/20 border-glass-border text-white">
                      <SelectValue placeholder={`Select ${config.label}`} />
                    </SelectTrigger>
                    <SelectContent>
                      {config.options?.map((option, i) => (
                        <SelectItem key={i} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    id={`field-${error.field}`}
                    type={config.type}
                    value={formData[error.field] || ''}
                    onChange={(e) => handleInputChange(error.field, e.target.value)}
                    className="bg-glass-bg/20 border-glass-border text-white"
                    placeholder={config.placeholder}
                  />
                )}
              </div>
            );
          })}
          
          {errors.invalid.map((error, idx) => (
            <div key={`invalid-${error.field}-${idx}`} className="text-sm text-red-400 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              <span>
                {error.field}: {error.reason}
              </span>
            </div>
          ))}
        </div>

        <Button 
          onClick={handleSubmit}
          disabled={!isCompleteForm || isLoading}
          className="w-full bg-primary hover:bg-primary/80"
        >
          {isLoading ? 'Submitting...' : 'Continue'}
        </Button>
      </div>
    </Card>
  );
};