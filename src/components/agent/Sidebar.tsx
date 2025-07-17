import React from "react";
import { useUIStore } from "@/stores/uiStore";
import { X, MessageSquare, History, Settings, User, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChatWindow } from "@/components/chat/ChatWindow";
import { useNavigate } from "react-router-dom";

export const Sidebar: React.FC = () => {
  const { isSidebarOpen, closeSidebar } = useUIStore();
  const navigate = useNavigate();
  
  return (
    <>
      {/* Backdrop */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 transition-opacity duration-300 z-40"
          onClick={closeSidebar}
        />
      )}
      
      {/* Sidebar */}
      <div
        className={`
          fixed top-0 left-0 h-full w-80 bg-background/95 backdrop-blur-md border-r border-border/50
          transform transition-transform duration-300 ease-in-out z-50 shadow-2xl
          ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        {/* Clean Header */}
        <div className="flex items-center justify-between p-4 border-b border-border/50">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center space-x-3 p-0 hover:bg-transparent">
                <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                  <MessageSquare className="w-4 h-4 text-primary" />
                </div>
                <h2 className="text-sm font-medium text-foreground">AI Assistant</h2>
                <ChevronDown className="w-3 h-3 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48 bg-background/95 backdrop-blur-md border-border/50">
              <DropdownMenuItem onClick={() => navigate('/reports')} className="text-sm">
                <MessageSquare className="w-4 h-4 mr-2" />
                New Chat
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/reports?tab=history')} className="text-sm">
                <History className="w-4 h-4 mr-2" />
                Chat History
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/clients')} className="text-sm">
                <User className="w-4 h-4 mr-2" />
                Clients
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/analytics')} className="text-sm">
                <Settings className="w-4 h-4 mr-2" />
                Analytics
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            variant="ghost"
            size="sm"
            onClick={closeSidebar}
            aria-label="Close sidebar"
            className="h-8 w-8 p-0 hover:bg-muted/50"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </Button>
        </div>
        
        {/* Chat Content */}
        <div className="flex-1 h-[calc(100vh-65px)] overflow-hidden">
          <ChatWindow />
        </div>
      </div>
    </>
  );
};