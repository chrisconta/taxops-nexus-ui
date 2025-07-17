import React from "react";
import { useChatStore } from "@/store/useChatStore";
import { Badge } from "@/components/ui/badge";
import { FileText, Search, Edit3, Play, AlertCircle, Eye } from "lucide-react";

const actionIcons = {
  read: Eye,
  validate: Search,
  edit: Edit3,
  execute: Play,
  error: AlertCircle,
};

const actionLabels = {
  read: "Reading",
  validate: "Validating",
  edit: "Editing",
  execute: "Executing",
  error: "Error",
};

const actionColors = {
  read: "bg-blue-100 text-blue-800 border-blue-200",
  validate: "bg-yellow-100 text-yellow-800 border-yellow-200",
  edit: "bg-purple-100 text-purple-800 border-purple-200",
  execute: "bg-green-100 text-green-800 border-green-200",
  error: "bg-red-100 text-red-800 border-red-200",
};

export const ActionBanner: React.FC = () => {
  const { currentAction, currentTarget, shouldShowBanner } = useChatStore();

  // Don't render if no action or shouldn't show banner
  if (!currentAction || !shouldShowBanner()) {
    return null;
  }

  const Icon = actionIcons[currentAction];
  const label = actionLabels[currentAction];
  const colorClass = actionColors[currentAction];

  return (
    <div className="px-4 py-2 bg-muted/30 border-b animate-fade-in">
      <div className="flex items-center gap-2">
        <Badge variant="outline" className={`${colorClass} animate-pulse`}>
          <Icon className="h-3 w-3 mr-1" />
          {label}
        </Badge>
        {currentTarget && (
          <span className="text-sm text-muted-foreground">
            {currentTarget}
          </span>
        )}
      </div>
    </div>
  );
};