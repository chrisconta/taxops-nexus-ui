import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, Clock, Settings, User, Database, BarChart3 } from "lucide-react";
import type { Plan, PlanStep } from "@/agent/planner/schema";

interface PlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  plan: Plan | null;
  onConfirm: (plan: Plan) => void;
  onEdit?: (step: PlanStep) => void;
  isExecuting?: boolean;
}

const toolIcons = {
  register_client: User,
  create_connection: Database, 
  build_dashboard: BarChart3,
};

const toolColors = {
  register_client: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  create_connection: "bg-green-500/20 text-green-300 border-green-500/30",
  build_dashboard: "bg-purple-500/20 text-purple-300 border-purple-500/30",
};

export const PlanModal: React.FC<PlanModalProps> = ({
  isOpen,
  onClose,
  plan,
  onConfirm,
  onEdit,
  isExecuting = false
}) => {
  if (!plan) return null;

  const handleConfirm = () => {
    onConfirm(plan);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto bg-background border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Settings className="w-5 h-5 text-primary" />
            Execution Plan
          </DialogTitle>
          <div className="text-sm text-muted-foreground mt-2">
            <strong>Intent:</strong> {plan.intent}
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="text-sm font-medium text-foreground mb-3">
            Plan Steps ({plan.steps.length})
          </div>
          
          {plan.steps.map((step, index) => {
            const Icon = toolIcons[step.toolName];
            const colorClass = toolColors[step.toolName];
            
            return (
              <Card key={step.stepId} className="border-glass-border bg-glass-bg/20">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/20 text-primary text-xs font-bold">
                        {index + 1}
                      </span>
                      <Icon className="w-4 h-4" />
                      {step.description}
                    </CardTitle>
                    <Badge variant="outline" className={colorClass}>
                      {step.toolName.replace('_', ' ')}
                    </Badge>
                  </div>
                </CardHeader>
                
                <CardContent className="pt-0">
                  <div className="text-xs text-muted-foreground">
                    <strong>Parameters:</strong>
                    <pre className="mt-1 p-2 bg-muted/30 rounded text-xs overflow-x-auto">
{JSON.stringify(step.params, null, 2)}
                    </pre>
                  </div>
                  
                  {onEdit && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2 h-7 text-xs"
                      onClick={() => onEdit(step)}
                    >
                      Edit Parameters
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        <DialogFooter className="flex gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isExecuting}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isExecuting}
            className="flex-1 bg-primary hover:bg-primary/90"
          >
            {isExecuting ? (
              <>
                <Clock className="w-4 h-4 mr-2 animate-spin" />
                Executing...
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4 mr-2" />
                Execute Plan
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};