import { NavLink, Outlet, useLocation, useNavigate, Link } from "react-router-dom";
import { Users, Link2, FileText, Settings, Bot, Sparkles, Bell, User, LogOut, ChevronDown, Brain, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";

const Layout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [userProfile, setUserProfile] = useState<{ display_name: string | null; email: string | null }>({ 
    display_name: null, 
    email: null 
  });

  useEffect(() => {
    loadUserProfile();
  }, []);

  const loadUserProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Load profile from profiles table
        const { data: profile, error } = await supabase
          .from("profiles")
          .select("display_name, email")
          .eq("user_id", user.id)
          .maybeSingle();

        if (error && error.code !== "PGRST116") {
          console.error("Error loading profile:", error);
        }

        setUserProfile({
          display_name: profile?.display_name || user.user_metadata?.full_name || user.user_metadata?.name || "User",
          email: profile?.email || user.email || "user@example.com"
        });
      }
    } catch (error) {
      console.error("Error loading user profile:", error);
    }
  };

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        toast({
          title: "Error",
          description: "Failed to sign out",
          variant: "destructive",
        });
      } else {
        navigate("/auth");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    }
  };
  
  const getPageTitle = () => {
    switch (location.pathname) {
      case "/clients":
        return "Client Management";
      case "/connections":
        return "Connections";
      case "/reports":
        return "AI Reports";
      case "/analytics":
        return "Analytics";
      default:
        return "Dashboard";
    }
  };

  const getPageDescription = () => {
    switch (location.pathname) {
      case "/clients":
        return "Manage your clients and their tax compliance status";
      case "/connections":
        return "Connect and manage financial service integrations";
      case "/reports":
        return "Generate tax and financial reports from your data sources using generative AI";
      case "/analytics":
        return "Create interactive dashboards and visualizations from your financial data";
      default:
        return "Welcome to TaxOps";
    }
  };

  const navItems = [{
    to: "/clients",
    label: "Clients",
    icon: Users
  }, {
    to: "/connections",
    label: "Connections",
    icon: Link2
  }, {
    to: "/reports",
    label: "AI Reports",
    icon: Brain
  }, {
    to: "/analytics",
    label: "Analytics",
    icon: Zap
  }];

  return <div className="min-h-screen bg-background flex">
      {/* AI-driven sidebar */}
      <aside className="fixed left-0 top-0 h-screen w-72 foldable:w-64 foldable-portrait:w-16 bg-glass-bg/95 backdrop-blur-xl border-r border-glass-border shadow-glass flex flex-col z-10">
        {/* Premium Logo */}
        <div className="p-8 foldable:p-6 foldable-portrait:p-2 border-b border-glass-border">
          <div className="flex items-center justify-center">
            <img src="/lovable-uploads/ed6e6561-0f8b-47cb-9fbd-edfe6ec7c766.png" alt="TaxOps by VALARIX" className="h-12 foldable:h-10 foldable-portrait:h-8 w-auto brightness-0 invert opacity-90 hover:opacity-100 transition-opacity duration-300" />
          </div>
        </div>

        {/* Navigation with glow effects */}
        <nav className="flex-1 p-6 foldable:p-4 foldable-portrait:p-2">
          <div className="space-y-3 foldable-portrait:space-y-2">
            {navItems.map(item => {
            const Icon = item.icon;
            return <NavLink key={item.to} to={item.to} className={({
              isActive
            }) => `group relative flex items-center gap-4 foldable-portrait:gap-0 foldable-portrait:justify-center px-6 foldable:px-4 foldable-portrait:px-2 py-4 foldable-portrait:py-3 rounded-xl text-sm foldable:text-xs font-semibold transition-all duration-300 overflow-hidden border border-transparent ${isActive ? "bg-gradient-to-r from-primary/20 to-primary/10 text-primary border-primary/30 shadow-glow" : "text-taxops-gray-light hover:text-white hover:bg-glass-bg/50 hover:border-glass-border"}`}>
                  {({
                isActive
              }) => <>
                      {/* Glow effect overlay */}
                      <div className={`absolute inset-0 bg-gradient-to-r from-primary/10 to-transparent opacity-0 transition-opacity duration-300 ${isActive ? 'opacity-100' : 'group-hover:opacity-100'}`} />
                      
                      <Icon className={`relative z-10 w-5 h-5 foldable:w-4 foldable:h-4 transition-all duration-300 ${isActive ? "text-primary" : "group-hover:scale-110"}`} />
                      <span className="relative z-10 foldable-portrait:hidden">{item.label}</span>
                      
                      {/* Active indicator */}
                      {isActive && <div className="absolute right-4 foldable-portrait:right-2 w-2 h-2 bg-primary rounded-full animate-glow-pulse" />}
                    </>}
                </NavLink>;
          })}
          </div>
        </nav>

        {/* Bottom section */}
        <div className="p-6 foldable:p-4 foldable-portrait:p-2 border-t border-glass-border">
          <Button 
            variant="ghost" 
            className="w-full justify-start foldable-portrait:justify-center gap-4 foldable-portrait:gap-0 px-6 foldable:px-4 foldable-portrait:px-2 py-4 foldable-portrait:py-3 text-taxops-gray-light hover:text-white hover:bg-glass-bg/50 transition-all duration-300 group"
            onClick={() => navigate('/settings/ai')}
          >
            <Settings className="w-5 h-5 foldable:w-4 foldable:h-4 group-hover:scale-110 transition-transform" />
            <span className="font-medium foldable-portrait:hidden">Settings</span>
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col ml-72 foldable:ml-64 foldable-portrait:ml-16">
        {/* Enhanced top header */}
        <header className="fixed top-0 left-72 foldable:left-64 foldable-portrait:left-16 right-0 h-20 foldable:h-16 bg-glass-bg/30 backdrop-blur-sm border-b border-glass-border flex items-center justify-between px-8 foldable:px-4 foldable-portrait:px-3 z-10">
          <div className="flex flex-col">
            <h1 className="text-xl foldable:text-lg foldable-portrait:text-base font-bold text-white">{getPageTitle()}</h1>
            <p className="text-sm foldable:text-xs foldable-portrait:hidden text-taxops-gray-light">{getPageDescription()}</p>
          </div>
          
          <div className="flex items-center gap-6 foldable:gap-3">
            
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <div className="flex items-center gap-4 foldable:gap-2 p-3 foldable:p-2 bg-glass-bg/30 rounded-xl border border-glass-border hover:border-primary/30 transition-all duration-300 group cursor-pointer">
                  <div className="text-right foldable-portrait:hidden">
                    <p className="text-sm foldable:text-xs font-semibold text-white group-hover:text-primary transition-colors">
                      {userProfile.display_name || "User"}
                    </p>
                    <p className="text-xs foldable:text-[10px] text-taxops-gray-light">{userProfile.email}</p>
                  </div>
                  <div className="relative">
                    <div className="w-10 h-10 foldable:w-8 foldable:h-8 bg-gradient-to-br from-primary to-primary/70 rounded-xl flex items-center justify-center">
                      <User className="w-5 h-5 foldable:w-4 foldable:h-4 text-white" />
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-3 h-3 foldable:w-2 foldable:h-2 bg-taxops-success rounded-full border-2 border-background" />
                  </div>
                  <ChevronDown className="w-4 h-4 foldable:w-3 foldable:h-3 foldable-portrait:hidden text-taxops-gray-light group-hover:text-white transition-colors" />
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-card border-border">
                <DropdownMenuItem asChild className="cursor-pointer hover:bg-accent">
                  <Link to="/profile-settings" className="flex items-center">
                    <User className="w-4 h-4 mr-2" />
                    Profile Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  className="cursor-pointer hover:bg-accent text-destructive hover:text-destructive focus:text-destructive"
                  onClick={handleLogout}
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-8 foldable:p-4 foldable-portrait:p-2 pt-28 foldable:pt-20 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>;
};
export default Layout;
