import React from "react";
import { useUIStore } from "@/stores/uiStore";
import { X, MessageSquare, History, Settings, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export const Sidebar: React.FC = () => {
  const { isSidebarOpen, closeSidebar } = useUIStore();
  
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
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-primary/20 rounded-lg flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-primary" />
            </div>
            <h2 className="text-lg font-semibold text-foreground">AI Assistant</h2>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={closeSidebar}
            aria-label="Close sidebar"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-4">
            {/* Quick Actions */}
            <Card className="p-4 bg-glass-bg/30 border-glass-border">
              <h3 className="text-sm font-medium text-foreground mb-3">Quick Actions</h3>
              <div className="space-y-2">
                <Button 
                  variant="ghost" 
                  className="w-full justify-start text-sm"
                  onClick={() => window.location.href = '/reports'}
                >
                  <MessageSquare className="w-4 h-4 mr-2" />
                  New Chat
                </Button>
                <Button 
                  variant="ghost" 
                  className="w-full justify-start text-sm"
                  onClick={() => window.location.href = '/reports?tab=history'}
                >
                  <History className="w-4 h-4 mr-2" />
                  Chat History
                </Button>
                <Button 
                  variant="ghost" 
                  className="w-full justify-start text-sm"
                  onClick={() => window.location.href = '/clients'}
                >
                  <User className="w-4 h-4 mr-2" />
                  Clients
                </Button>
                <Button 
                  variant="ghost" 
                  className="w-full justify-start text-sm"
                  onClick={() => window.location.href = '/analytics'}
                >
                  <Settings className="w-4 h-4 mr-2" />
                  Analytics
                </Button>
              </div>
            </Card>
            
            {/* Recent Chats Preview */}
            <Card className="p-4 bg-glass-bg/30 border-glass-border">
              <h3 className="text-sm font-medium text-foreground mb-3">Recent Chats</h3>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Recent conversations will appear here
                </p>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
};