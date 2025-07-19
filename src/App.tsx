
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect } from "react";
import Layout from "./components/Layout";
import Clients from "./pages/Clients";
import ClientNew from "./pages/ClientNew";
import ClientDetail from "./pages/ClientDetail";
import Connections from "./pages/Connections";
import ConnectionSetup from "./pages/ConnectionSetup";
import Reports from "./pages/Reports";
import ReportsBuilder from "./pages/ReportsBuilder";
import ToolBuilder from "./pages/ToolBuilder";
import Analytics from "./pages/Analytics";
import Auth from "./pages/Auth";
import ProfileSettings from "./pages/ProfileSettings";
import AISettings from "./pages/AISettings";
import NotFound from "./pages/NotFound";
import { initSecurity } from "@/lib/security";

const queryClient = new QueryClient();

const App = () => {
  // SECURITY: Initialize security monitoring on app start
  useEffect(() => {
    initSecurity();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/" element={<Layout />}>
              <Route index element={<Navigate to="/reports" replace />} />
              <Route path="clients" element={<Clients />} />
              <Route path="clients/new" element={<ClientNew />} />
              <Route path="clients/:id" element={<ClientDetail />} />
              <Route path="connections" element={<Connections />} />
              <Route path="connections/:connectionId/setup" element={<ConnectionSetup />} />
              <Route path="reports" element={<Reports />} />
              <Route path="reports-builder" element={<ReportsBuilder />} />
              <Route path="tool-builder" element={<ToolBuilder />} />
              <Route path="analytics" element={<Analytics />} />
              <Route path="profile-settings" element={<ProfileSettings />} />
              <Route path="settings/ai" element={<AISettings />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
