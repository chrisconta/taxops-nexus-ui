import { NavLink, Outlet, useLocation } from "react-router-dom";
import { Users, Link2, FileText, Settings, Bot, Sparkles, Bell, User } from "lucide-react";
import { Button } from "@/components/ui/button";
const Layout = () => {
  const location = useLocation();
  
  const getPageTitle = () => {
    switch (location.pathname) {
      case "/clients":
        return "Client Management";
      case "/connections":
        return "Connections";
      case "/reports":
        return "Artificial Intelligence Reports";
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
        return "View and generate comprehensive reports";
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
    label: "Reports",
    icon: FileText
  }];
  return <div className="min-h-screen bg-background flex">
      {/* AI-driven sidebar */}
      <aside className="fixed left-0 top-0 h-screen w-72 bg-glass-bg/95 backdrop-blur-xl border-r border-glass-border shadow-glass flex flex-col z-10">
        {/* Premium Logo */}
        <div className="p-8 border-b border-glass-border">
          <div className="flex items-center justify-center">
            <img src="/lovable-uploads/ed6e6561-0f8b-47cb-9fbd-edfe6ec7c766.png" alt="TaxOps by VALARIX" className="h-12 w-auto brightness-0 invert opacity-90 hover:opacity-100 transition-opacity duration-300" />
          </div>
        </div>

        {/* Navigation with glow effects */}
        <nav className="flex-1 p-6">
          <div className="space-y-3">
            {navItems.map(item => {
            const Icon = item.icon;
            return <NavLink key={item.to} to={item.to} className={({
              isActive
            }) => `group relative flex items-center gap-4 px-6 py-4 rounded-xl text-sm font-semibold transition-all duration-300 overflow-hidden border border-transparent ${isActive ? "bg-gradient-to-r from-primary/20 to-primary/10 text-primary border-primary/30 shadow-glow" : "text-taxops-gray-light hover:text-white hover:bg-glass-bg/50 hover:border-glass-border"}`}>
                  {({
                isActive
              }) => <>
                      {/* Glow effect overlay */}
                      <div className={`absolute inset-0 bg-gradient-to-r from-primary/10 to-transparent opacity-0 transition-opacity duration-300 ${isActive ? 'opacity-100' : 'group-hover:opacity-100'}`} />
                      
                      <Icon className={`relative z-10 w-5 h-5 transition-all duration-300 ${isActive ? "text-primary" : "group-hover:scale-110"}`} />
                      <span className="relative z-10">{item.label}</span>
                      
                      {/* Active indicator */}
                      {isActive && <div className="absolute right-4 w-2 h-2 bg-primary rounded-full animate-glow-pulse" />}
                    </>}
                </NavLink>;
          })}
          </div>
        </nav>

        {/* Bottom section */}
        <div className="p-6 border-t border-glass-border">
          <Button variant="ghost" className="w-full justify-start gap-4 px-6 py-4 text-taxops-gray-light hover:text-white hover:bg-glass-bg/50 transition-all duration-300 group">
            <Settings className="w-5 h-5 group-hover:scale-110 transition-transform" />
            <span className="font-medium">Settings</span>
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col ml-72">
        {/* Enhanced top header */}
        <header className="fixed top-0 left-72 right-0 h-20 bg-glass-bg/30 backdrop-blur-sm border-b border-glass-border flex items-center justify-between px-8 z-10">
          <div className="flex flex-col">
            <h1 className="text-xl font-bold text-white">{getPageTitle()}</h1>
            <p className="text-sm text-taxops-gray-light">{getPageDescription()}</p>
          </div>
          
          <div className="flex items-center gap-6">
            
            
            <div className="flex items-center gap-4 p-3 bg-glass-bg/30 rounded-xl border border-glass-border hover:border-primary/30 transition-all duration-300 group">
              <div className="text-right">
                <p className="text-sm font-semibold text-white group-hover:text-primary transition-colors">Admin User</p>
                <p className="text-xs text-taxops-gray-light">admin@taxops.ai</p>
              </div>
              <div className="relative">
                <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary/70 rounded-xl flex items-center justify-center">
                  <User className="w-5 h-5 text-white" />
                </div>
                <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-taxops-success rounded-full border-2 border-background" />
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-8 pt-28 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>;
};
export default Layout;