// Generic field prompt component for progressive client registration

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, CheckCircle2, Send } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PartialClientParams } from '@/types/registration';
import { getFieldLabel, getFieldHint } from '@/utils/clientValidation';

interface FieldPromptProps {
  field: keyof PartialClientParams;
  value?: string;
  error?: string;
  retryCount?: number;
  maxRetries?: number;
  isLoading?: boolean;
  onSubmit: (value: string) => void;
  onFallback?: () => void;
  className?: string;
}

export const FieldPrompt: React.FC<FieldPromptProps> = ({
  field,
  value = '',
  error,
  retryCount = 0,
  maxRetries = 3,
  isLoading = false,
  onSubmit,
  onFallback,
  className,
}) => {
  const [inputValue, setInputValue] = useState(value);
  const [isFocused, setIsFocused] = useState(false);

  const label = getFieldLabel(field);
  const hint = getFieldHint(field);
  const isRetryLimitReached = retryCount >= maxRetries;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim() && !isLoading) {
      onSubmit(inputValue.trim());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const getInputType = () => {
    switch (field) {
      case 'email':
        return 'email';
      case 'ein':
        return 'text';
      default:
        return 'text';
    }
  };

  const getPlaceholder = () => {
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

  return (
    <Card className={cn('max-w-md mx-auto', className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          {label}
          {retryCount > 0 && (
            <span className="text-sm text-muted-foreground">
              (Attempt {retryCount + 1})
            </span>
          )}
        </CardTitle>
        <p className="text-sm text-muted-foreground">{hint}</p>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {retryCount > 0 && retryCount < maxRetries && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Let's try again. Please check the format and try once more.
            </AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor={field} className="sr-only">
              {label}
            </Label>
            <Input
              id={field}
              type={getInputType()}
              placeholder={getPlaceholder()}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              onKeyDown={handleKeyDown}
              disabled={isLoading}
              className={cn(
                'transition-colors',
                isFocused && 'border-primary',
                error && 'border-destructive'
              )}
              autoFocus
            />
          </div>

          <div className="flex gap-2">
            <Button 
              type="submit" 
              disabled={!inputValue.trim() || isLoading}
              className="flex-1"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                  Validating...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Submit
                </>
              )}
            </Button>
            
            {isRetryLimitReached && onFallback && (
              <Button 
                type="button" 
                variant="outline" 
                onClick={onFallback}
                className="flex-1"
              >
                Use Form Instead
              </Button>
            )}
          </div>
        </form>

        {isRetryLimitReached && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Having trouble? Try using the form interface for easier input.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};