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
          fixed top-0 left-0 h-full w-80 bg-background border-r border-border
          transform transition-transform duration-300 ease-in-out z-50
          ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center space-x-2 p-0">
                <div className="w-10 h-10 bg-primary/20 rounded-lg flex items-center justify-center">
                  <MessageSquare className="w-5 h-5 text-primary" />
                </div>
                <h2 className="text-lg font-semibold text-foreground">AI Assistant</h2>
                <ChevronDown className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              <DropdownMenuItem onClick={() => navigate('/reports')}>
                <MessageSquare className="w-4 h-4 mr-2" />
                New Chat
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/client-new')}>
                <User className="w-4 h-4 mr-2" />
                Add a Client
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/reports?tab=history')}>
                <History className="w-4 h-4 mr-2" />
                Chat History
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/clients')}>
                <User className="w-4 h-4 mr-2" />
                Clients
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/analytics')}>
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
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
        
        {/* Chat Content */}
        <div className="flex-1 overflow-hidden">
          <ChatWindow />
        </div>
      </div>
    </>
  );
};