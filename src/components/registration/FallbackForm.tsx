// Mobile-friendly fallback form for client registration

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, AlertCircle, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PartialClientParams } from '@/types/registration';
import { 
  validateField, 
  getFieldLabel, 
  getFieldHint,
  isClientParamsComplete 
} from '@/utils/clientValidation';

interface FallbackFormProps {
  initialData?: PartialClientParams;
  onSubmit: (data: PartialClientParams) => void;
  onBack: () => void;
  isLoading?: boolean;
  className?: string;
}

export const FallbackForm: React.FC<FallbackFormProps> = ({
  initialData = {},
  onSubmit,
  onBack,
  isLoading = false,
  className,
}) => {
  const [formData, setFormData] = useState<PartialClientParams>(initialData);
  const [errors, setErrors] = useState<Partial<Record<keyof PartialClientParams, string>>>({});
  const [touchedFields, setTouchedFields] = useState<Set<keyof PartialClientParams>>(new Set());

  const fields: (keyof PartialClientParams)[] = ['name', 'ein', 'email'];

  const validateFormField = (field: keyof PartialClientParams, value: string) => {
    const result = validateField(field, value);
    return result.isValid ? null : result.error;
  };

  const handleFieldChange = (field: keyof PartialClientParams, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const handleFieldBlur = (field: keyof PartialClientParams) => {
    setTouchedFields(prev => new Set(prev).add(field));
    
    const value = formData[field];
    if (value) {
      const error = validateFormField(field, value);
      setErrors(prev => ({ ...prev, [field]: error || undefined }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate all fields
    const newErrors: Partial<Record<keyof PartialClientParams, string>> = {};
    let hasErrors = false;

    for (const field of fields) {
      const value = formData[field];
      if (!value?.trim()) {
        newErrors[field] = `${getFieldLabel(field)} is required`;
        hasErrors = true;
      } else {
        const error = validateFormField(field, value);
        if (error) {
          newErrors[field] = error;
          hasErrors = true;
        }
      }
    }

    setErrors(newErrors);
    setTouchedFields(new Set(fields));

    if (!hasErrors) {
      onSubmit(formData);
    }
  };

  const getProgress = () => {
    const completed = fields.filter(field => 
      formData[field] && formData[field]!.trim().length > 0
    ).length;
    return (completed / fields.length) * 100;
  };

  const getPlaceholder = (field: keyof PartialClientParams) => {
    switch (field) {
      case 'name':
        return 'e.g., Acme Corporation';
      case 'ein':
        return 'e.g., 12-3456789';
      case 'email':
        return 'e.g., contact@company.com';
      default:
        return '';
    }
  };

  const getInputType = (field: keyof PartialClientParams) => {
    switch (field) {
      case 'email':
        return 'email';
      case 'ein':
        return 'text';
      default:
        return 'text';
    }
  };

  const isComplete = isClientParamsComplete(formData);

  return (
    <Card className={cn('max-w-md mx-auto', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2 mb-2">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onBack}
            className="p-1 h-8 w-8"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <CardTitle className="text-lg">Client Registration Form</CardTitle>
        </div>
        
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Progress</span>
            <span className="text-muted-foreground">{Math.round(getProgress())}%</span>
          </div>
          <Progress value={getProgress()} className="h-2" />
        </div>
      </CardHeader>
      
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {fields.map((field) => (
            <div key={field} className="space-y-2">
              <Label htmlFor={field} className="text-sm font-medium">
                {getFieldLabel(field)}
                <span className="text-destructive ml-1">*</span>
              </Label>
              
              <Input
                id={field}
                type={getInputType(field)}
                placeholder={getPlaceholder(field)}
                value={formData[field] || ''}
                onChange={(e) => handleFieldChange(field, e.target.value)}
                onBlur={() => handleFieldBlur(field)}
                disabled={isLoading}
                className={cn(
                  'transition-colors',
                  errors[field] && touchedFields.has(field) && 'border-destructive'
                )}
              />
              
              {errors[field] && touchedFields.has(field) && (
                <Alert variant="destructive" className="py-2">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-sm">
                    {errors[field]}
                  </AlertDescription>
                </Alert>
              )}
              
              {!errors[field] && (
                <p className="text-xs text-muted-foreground">
                  {getFieldHint(field)}
                </p>
              )}
            </div>
          ))}

          <Button 
            type="submit" 
            disabled={!isComplete || isLoading}
            className="w-full"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                Processing...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Register Client
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};