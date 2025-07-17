import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { CheckCircle, Clock, Settings, User, Database, BarChart3, Edit3, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Plan, PlanStep } from "@/agent/planner/schema";

interface PlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  plan: Plan | null;
  onConfirm: (plan: Plan) => void;
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
  isExecuting = false
}) => {
  // Default steps to empty array for safety
  const steps = plan?.steps ?? [];
  
  const [editedSteps, setEditedSteps] = useState<PlanStep[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editErrors, setEditErrors] = useState<{ [key: number]: string }>({});

  // Initialize edited steps when plan changes
  React.useEffect(() => {
    if (plan && plan.steps && Array.isArray(plan.steps)) {
      setEditedSteps(plan.steps);
      setEditErrors({});
    } else {
      setEditedSteps([]);
      setEditErrors({});
    }
  }, [plan]);

  if (!plan) return null;

  const updateStepParams = (stepIndex: number, newParamsString: string) => {
    try {
      const newParams = JSON.parse(newParamsString);
      const updatedSteps = editedSteps.map((step, index) =>
        index === stepIndex ? { ...step, params: newParams } : step
      );
      setEditedSteps(updatedSteps);
      
      // Clear error for this step
      setEditErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[stepIndex];
        return newErrors;
      });
    } catch (error) {
      setEditErrors(prev => ({
        ...prev,
        [stepIndex]: "Invalid JSON format"
      }));
    }
  };

  const handleConfirm = () => {
    // Check for any JSON errors
    const hasErrors = Object.keys(editErrors).length > 0;
    if (hasErrors) {
      return;
    }

    const updatedPlan: Plan = {
      ...plan,
      steps: editedSteps
    };
    
    onConfirm(updatedPlan);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !isExecuting && onClose()}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto bg-background border-border">
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
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium text-foreground">
              Plan Steps ({editedSteps.length})
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditing(!isEditing)}
              disabled={isExecuting}
              className="text-muted-foreground hover:text-foreground"
            >
              <Edit3 className="w-4 h-4 mr-2" />
              {isEditing ? 'View Mode' : 'Edit Mode'}
            </Button>
          </div>
          
          {editedSteps.map((step, index) => {
            const Icon = toolIcons[step.toolName];
            const colorClass = toolColors[step.toolName];
            
            return (
              <Card 
                key={step.stepId} 
                className={cn(
                  "border-glass-border transition-all duration-200",
                  isEditing 
                    ? "bg-glass-bg/30 hover:bg-glass-bg/50" 
                    : "bg-glass-bg/20"
                )}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/20 text-primary text-xs font-bold">
                        {index + 1}
                      </span>
                      <Icon className="w-4 h-4" />
                      {step.description}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      {editErrors[index] && (
                        <div className="flex items-center gap-1 text-destructive text-xs">
                          <AlertCircle className="w-3 h-3" />
                          {editErrors[index]}
                        </div>
                      )}
                      <Badge variant="outline" className={colorClass}>
                        {step.toolName.replace('_', ' ')}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="pt-0">
                  {isEditing ? (
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">
                        Parameters (JSON format):
                      </Label>
                      <Textarea
                        className={cn(
                          "font-mono text-xs resize-none bg-background/80 transition-colors min-h-[100px]",
                          editErrors[index] 
                            ? "border-destructive focus-visible:ring-destructive" 
                            : "border-border/50 focus-visible:ring-primary"
                        )}
                        value={JSON.stringify(step.params, null, 2)}
                        onChange={(e) => updateStepParams(index, e.target.value)}
                        placeholder="Enter valid JSON parameters..."
                      />
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground">
                      <strong>Parameters:</strong>
                      <pre className="mt-1 p-2 bg-muted/30 rounded text-xs overflow-x-auto">
{JSON.stringify(step.params, null, 2)}
                      </pre>
                    </div>
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
            disabled={isExecuting || Object.keys(editErrors).length > 0}
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