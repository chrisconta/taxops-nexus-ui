// Duplicate client detection card component

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Mail, Building2, Hash } from 'lucide-react';
import type { DuplicateClientInfo } from '@/types/registration';

interface DuplicateClientCardProps {
  duplicateInfo: DuplicateClientInfo;
  onUpdate: () => void;
  onCreateNew: () => void;
  isLoading?: boolean;
}

export const DuplicateClientCard: React.FC<DuplicateClientCardProps> = ({
  duplicateInfo,
  onUpdate,
  onCreateNew,
  isLoading = false,
}) => {
  return (
    <Card className="max-w-md mx-auto border-orange-200 bg-orange-50/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2 text-orange-800">
          <AlertTriangle className="h-5 w-5" />
          Duplicate Client Found
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <Alert className="border-orange-200 bg-orange-50">
          <AlertTriangle className="h-4 w-4 text-orange-600" />
          <AlertDescription className="text-orange-800">
            A client with the same EIN already exists in your system.
          </AlertDescription>
        </Alert>

        <div className="space-y-3 p-3 bg-white rounded-lg border">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">{duplicateInfo.name}</span>
          </div>
          
          <div className="flex items-center gap-2">
            <Hash className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              EIN: {duplicateInfo.ein}
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              {duplicateInfo.email}
            </span>
          </div>
          
          <Badge variant="secondary" className="w-fit">
            Existing Client
          </Badge>
        </div>

        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Would you like to update the existing client record or create a new one?
          </p>
          
          <div className="flex gap-2">
            <Button 
              onClick={onUpdate}
              disabled={isLoading}
              variant="default"
              className="flex-1"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                  Updating...
                </>
              ) : (
                'Update Existing'
              )}
            </Button>
            
            <Button 
              onClick={onCreateNew}
              disabled={isLoading}
              variant="outline"
              className="flex-1"
            >
              Create New
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};