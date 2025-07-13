import { useState } from "react";
import { Eye, EyeOff, Key, AlertTriangle, CheckCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface MercuryTokenSetupProps {
  clientId: string;
  onTokenValidated: (isValid: boolean) => void;
}

interface ValidationResult {
  isValid: boolean;
  isReadOnly: boolean;
  error?: string;
  accountInfo?: {
    name: string;
    id: string;
  };
}

const MercuryTokenSetup = ({ clientId, onTokenValidated }: MercuryTokenSetupProps) => {
  const [token, setToken] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const { toast } = useToast();

  const validateToken = async () => {
    if (!token.trim()) {
      toast({
        title: "Token Required",
        description: "Please enter your Mercury API token",
        variant: "destructive"
      });
      return;
    }

    setIsValidating(true);
    setValidationResult(null);

    try {
      // Call edge function to validate Mercury token
      const { data, error } = await supabase.functions.invoke('validate-mercury-token', {
        body: { token: token.trim() }
      });

      if (error) {
        throw new Error(error.message);
      }

      const result: ValidationResult = data;

      if (!result.isValid) {
        setValidationResult({
          isValid: false,
          isReadOnly: false,
          error: result.error || "Invalid token"
        });
        onTokenValidated(false);
        return;
      }

      if (!result.isReadOnly) {
        setValidationResult({
          isValid: false,
          isReadOnly: false,
          error: "Security Alert: The Mercury API token provided has write permissions. For your security and data protection, please generate and provide a read-only token instead. Write-enabled tokens pose unnecessary security risks for data synchronization."
        });
        onTokenValidated(false);
        return;
      }

      // Token is valid and read-only, save it
      await saveToken(result);
      
    } catch (error: any) {
      console.error("Token validation error:", error);
      setValidationResult({
        isValid: false,
        isReadOnly: false,
        error: error.message || "Failed to validate token. Please check your connection and try again."
      });
      onTokenValidated(false);
    } finally {
      setIsValidating(false);
    }
  };

  const saveToken = async (validationResult: ValidationResult) => {
    try {
      const { data, error } = await supabase.rpc('save_client_credentials', {
        p_client_id: clientId,
        p_connection_code: 'mercury',
        p_credentials: {
          token: token.trim(),
          account_info: validationResult.accountInfo,
          validated_at: new Date().toISOString()
        },
        p_connection_name: 'Mercury Bank'
      });

      if (error) {
        throw error;
      }

      // Update connection status to connected
      await supabase.rpc('update_connection_status', {
        p_client_id: clientId,
        p_connection_code: 'mercury',
        p_status: 'connected'
      });

      setValidationResult({
        isValid: true,
        isReadOnly: true,
        accountInfo: validationResult.accountInfo
      });
      
      onTokenValidated(true);

      toast({
        title: "Token Validated",
        description: "Mercury API token has been successfully validated and saved",
      });

    } catch (error: any) {
      console.error("Error saving token:", error);
      toast({
        title: "Save Error",
        description: "Failed to save the validated token. Please try again.",
        variant: "destructive"
      });
      onTokenValidated(false);
    }
  };

  const handleTokenChange = (value: string) => {
    setToken(value);
    setValidationResult(null);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Key className="h-5 w-5" />
          Mercury API Token
        </CardTitle>
        <CardDescription>
          Enter your Mercury read-only API token to securely connect your account.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="mercury-token">API Token</Label>
          <div className="relative">
            <Input
              id="mercury-token"
              type={showToken ? "text" : "password"}
              placeholder="Enter your Mercury API token..."
              value={token}
              onChange={(e) => handleTokenChange(e.target.value)}
              className="pr-10"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
              onClick={() => setShowToken(!showToken)}
            >
              {showToken ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        <Button
          onClick={validateToken}
          disabled={!token.trim() || isValidating}
          className="w-full"
        >
          {isValidating ? "Validating..." : "Validate Token"}
        </Button>

        {validationResult && (
          <Alert variant={validationResult.isValid ? "default" : "destructive"}>
            {validationResult.isValid ? (
              <CheckCircle className="h-4 w-4" />
            ) : (
              <AlertTriangle className="h-4 w-4" />
            )}
            <AlertDescription>
              {validationResult.isValid ? (
                <div>
                  <div className="font-medium">Token validated successfully!</div>
                  {validationResult.accountInfo && (
                    <div className="text-sm mt-1">
                      Connected to: {validationResult.accountInfo.name}
                    </div>
                  )}
                </div>
              ) : (
                validationResult.error
              )}
            </AlertDescription>
          </Alert>
        )}

        <div className="text-sm text-muted-foreground space-y-1">
          <p>• Only read-only tokens are accepted for security</p>
          <p>• Your token is encrypted and stored securely</p>
          <p>• You can revoke access anytime from Mercury's dashboard</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default MercuryTokenSetup;