import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { User, Mail, Save, CreditCard, ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { profileValidationSchema, type ProfileFormData } from "@/lib/validation";

export default function ProfileSettings() {
  const [user, setUser] = useState<any>(null);
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [subscriptionInfo, setSubscriptionInfo] = useState<any>(null);
  const [isCheckingSubscription, setIsCheckingSubscription] = useState(false);
  
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    loadUserProfile();
    checkSubscriptionStatus();
  }, []);

  const loadUserProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      setUser(user);
      setEmail(user.email || "");

      // Load profile from profiles table
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error && error.code !== "PGRST116") {
        console.error("Error loading profile:", error);
        toast({
          title: "Error",
          description: "Failed to load profile information",
          variant: "destructive",
        });
      }

      if (profile) {
        setDisplayName(profile.display_name || "");
      }
    } catch (error) {
      console.error("Error loading user profile:", error);
      toast({
        title: "Error",
        description: "Failed to load user information",
        variant: "destructive",
      });
    } finally {
      setIsLoadingProfile(false);
    }
  };

  const checkSubscriptionStatus = async () => {
    setIsCheckingSubscription(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase.functions.invoke('check-subscription', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        console.error("Error checking subscription:", error);
      } else {
        setSubscriptionInfo(data);
      }
    } catch (error) {
      console.error("Error checking subscription:", error);
    } finally {
      setIsCheckingSubscription(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsLoading(true);
    try {
      // SECURITY: Validate and sanitize input data
      const validationResult = profileValidationSchema.safeParse({
        displayName,
        email,
      });

      if (!validationResult.success) {
        const errorMessage = validationResult.error.issues
          .map(issue => issue.message)
          .join(", ");
        toast({
          title: "Validation Error",
          description: errorMessage,
          variant: "destructive",
        });
        return;
      }

      const { displayName: sanitizedDisplayName, email: sanitizedEmail } = validationResult.data;
      // Check if email has changed and validate it's not already in use
      if (sanitizedEmail !== user.email) {
        // Check if the email is already registered
        const { data: existingProfiles, error: profileCheckError } = await supabase
          .from("profiles")
          .select("email")
          .eq("email", sanitizedEmail)
          .neq("user_id", user.id);

        if (profileCheckError) {
          console.error("Error checking email availability:", profileCheckError);
          toast({
            title: "Error",
            description: "Failed to validate email availability",
            variant: "destructive",
          });
          return;
        }

        if (existingProfiles && existingProfiles.length > 0) {
          toast({
            title: "Email Already in Use",
            description: "This email address is already registered. Please choose a different email.",
            variant: "destructive",
          });
          return;
        }
      }

      // Update profile in profiles table with sanitized data
      const { error: profileError } = await supabase
        .from("profiles")
        .upsert({
          user_id: user.id,
          display_name: sanitizedDisplayName,
          email: sanitizedEmail,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: "user_id"
        });

      if (profileError) {
        throw profileError;
      }

      // Update auth email if changed
      if (sanitizedEmail !== user.email) {
        const { error: emailError } = await supabase.auth.updateUser({
          email: sanitizedEmail,
        });

        if (emailError) {
          // If auth update fails, revert the profile update
          await supabase
            .from("profiles")
            .upsert({
              user_id: user.id,
              display_name: sanitizedDisplayName,
              email: user.email, // Revert to original email
              updated_at: new Date().toISOString(),
            }, {
              onConflict: "user_id"
            });
          
          throw emailError;
        }

        toast({
          title: "Email Update",
          description: "Please check your new email for verification",
        });
      } else {
        toast({
          title: "Success",
          description: "Profile updated successfully",
        });
      }
    } catch (error: any) {
      console.error("Error updating profile:", error);
      
      // Check for specific Supabase auth errors
      if (error.message?.includes("email address is already registered")) {
        toast({
          title: "Email Already in Use", 
          description: "This email address is already registered. Please choose a different email.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: error.message || "Failed to update profile",
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleManageSubscription = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({
          title: "Error",
          description: "Please log in to manage subscription",
          variant: "destructive",
        });
        return;
      }

      const { data, error } = await supabase.functions.invoke('customer-portal', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        throw error;
      }

      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error: any) {
      console.error("Error accessing customer portal:", error);
      toast({
        title: "Error", 
        description: error.message || "Failed to access subscription management",
        variant: "destructive",
      });
    }
  };

  const handleStartSubscription = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({
          title: "Error",
          description: "Please log in to start subscription",
          variant: "destructive",
        });
        return;
      }

      const { data, error } = await supabase.functions.invoke('create-checkout', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        throw error;
      }

      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error: any) {
      console.error("Error creating checkout:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to start subscription",
        variant: "destructive",
      });
    }
  };

  if (isLoadingProfile) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/reports")}
          className="hover:bg-accent"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-white">Profile Settings</h1>
          <p className="text-taxops-gray-light">Manage your account information and subscription</p>
        </div>
      </div>

      <div className="grid gap-6 max-w-2xl">
        {/* Profile Information */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Profile Information
            </CardTitle>
            <CardDescription>
              Update your personal information and account details
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="displayName">Display Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="displayName"
                    type="text"
                    placeholder="Enter your display name"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="pl-10 bg-background border-input"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 bg-background border-input"
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="bg-primary hover:bg-primary/90"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Subscription Management */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Subscription Management
            </CardTitle>
            <CardDescription>
              Manage your subscription plan and billing information
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isCheckingSubscription ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                Checking subscription status...
              </div>
            ) : subscriptionInfo ? (
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-accent/50 border border-accent">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">Current Plan</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                      subscriptionInfo.subscribed ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
                    }`}>
                      {subscriptionInfo.subscribed ? "Active" : "Free"}
                    </span>
                  </div>
                  {subscriptionInfo.subscribed && (
                    <>
                      <p className="text-sm text-muted-foreground mb-1">
                        Plan: {subscriptionInfo.subscription_tier || "Premium"}
                      </p>
                      {subscriptionInfo.subscription_end && (
                        <p className="text-sm text-muted-foreground">
                          Renews: {new Date(subscriptionInfo.subscription_end).toLocaleDateString()}
                        </p>
                      )}
                    </>
                  )}
                </div>

                {subscriptionInfo.subscribed ? (
                  <Button
                    onClick={handleManageSubscription}
                    variant="outline"
                    className="w-full border-input bg-background hover:bg-accent"
                  >
                    <CreditCard className="w-4 h-4 mr-2" />
                    Manage Subscription
                  </Button>
                ) : (
                  <Button
                    onClick={handleStartSubscription}
                    className="w-full bg-primary hover:bg-primary/90"
                  >
                    <CreditCard className="w-4 h-4 mr-2" />
                    Start Subscription
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-accent/50 border border-accent">
                  <p className="text-sm text-muted-foreground">
                    Unable to load subscription information
                  </p>
                </div>
                <Button
                  onClick={checkSubscriptionStatus}
                  variant="outline"
                  className="w-full border-input bg-background hover:bg-accent"
                >
                  Retry
                </Button>
              </div>
            )}

            <Separator />
            
            <Button
              onClick={checkSubscriptionStatus}
              variant="ghost"
              size="sm"
              disabled={isCheckingSubscription}
              className="text-muted-foreground hover:text-foreground"
            >
              {isCheckingSubscription ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Refreshing...
                </>
              ) : (
                "Refresh Status"
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}