import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { clientValidationSchema } from "@/lib/validation";

const ClientNew = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    rfc: "",
    email: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Validate the data
      const validatedData = clientValidationSchema.parse(formData);

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Authentication Error",
          description: "You must be logged in to create a client.",
          variant: "destructive",
        });
        return;
      }

      // Insert the client
      const { data, error } = await supabase
        .from("clients")
        .insert([
          {
            name: validatedData.name,
            rfc: validatedData.rfc,
            email: validatedData.email,
            user_id: user.id,
          },
        ])
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Success",
        description: "Client created successfully.",
      });

      // Navigate to the new client's detail page
      navigate(`/clients/${data.id}`);
    } catch (error: any) {
      console.error("Error creating client:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create client.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <div className="space-y-8 animate-slide-up">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/clients")}
          className="hover:bg-glass-bg/50"
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <h1 className="text-3xl font-bold text-white">Add New Client</h1>
      </div>

      <Card className="p-8 bg-glass-bg/50 backdrop-blur-sm border-glass-border">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-white">
                Client Name *
              </Label>
              <Input
                id="name"
                name="name"
                type="text"
                value={formData.name}
                onChange={handleChange}
                placeholder="Enter client name"
                className="bg-glass-bg/30 border-glass-border"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="rfc" className="text-white">
                Tax ID (EIN) *
              </Label>
              <Input
                id="rfc"
                name="rfc"
                type="text"
                value={formData.rfc}
                onChange={handleChange}
                placeholder="92-0458797"
                className="bg-glass-bg/30 border-glass-border"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-white">
                Email *
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="client@example.com"
                className="bg-glass-bg/30 border-glass-border"
                required
              />
            </div>
          </div>

          <div className="flex gap-4 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate("/clients")}
              className="flex-1 hover:bg-glass-bg/50"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="flex-1 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-glow"
            >
              <Save className="w-4 h-4 mr-2" />
              {isLoading ? "Creating..." : "Create Client"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default ClientNew;