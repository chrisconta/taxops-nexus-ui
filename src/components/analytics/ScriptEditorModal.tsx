import { useState, useEffect } from "react";
import { X, Save, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import Editor from "@monaco-editor/react";
import type { Widget } from "@/pages/Analytics";

interface ScriptEditorModalProps {
  visible: boolean;
  widget: Widget | null;
  onClose: () => void;
  onSave: (widgetId: string, script: string) => void;
}

export const ScriptEditorModal = ({ 
  visible, 
  widget, 
  onClose, 
  onSave 
}: ScriptEditorModalProps) => {
  const [script, setScript] = useState("");
  const [isValidating, setIsValidating] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (widget && visible) {
      setScript(widget.script || getDefaultScript(widget.type));
    }
  }, [widget, visible]);

  const getDefaultScript = (type: string) => {
    switch (type) {
      case 'table':
        return `-- Table Script
SELECT * FROM transactions 
WHERE amount_cents > 0 
ORDER BY effective_at DESC 
LIMIT 100`;
      case 'bar-chart':
        return `-- Bar Chart Script
SELECT 
  DATE_TRUNC('month', effective_at) as month,
  SUM(amount_cents) / 100 as total_amount
FROM transactions 
WHERE effective_at >= NOW() - INTERVAL '12 months'
GROUP BY month
ORDER BY month`;
      case 'line-chart':
        return `-- Line Chart Script
SELECT 
  DATE_TRUNC('day', effective_at) as date,
  SUM(amount_cents) / 100 as daily_total
FROM transactions 
WHERE effective_at >= NOW() - INTERVAL '30 days'
GROUP BY date
ORDER BY date`;
      case 'pie-chart':
        return `-- Pie Chart Script
SELECT 
  COALESCE(transaction_type, 'Unknown') as category,
  COUNT(*) as count
FROM transactions 
WHERE effective_at >= NOW() - INTERVAL '30 days'
GROUP BY transaction_type
ORDER BY count DESC`;
      default:
        return "-- Widget Script\nSELECT * FROM transactions LIMIT 10";
    }
  };

  const validateScript = async (scriptText: string) => {
    try {
      setIsValidating(true);
      
      // Basic SQL validation - check for dangerous keywords
      const dangerous = ['DROP', 'DELETE', 'UPDATE', 'INSERT', 'ALTER', 'CREATE', 'TRUNCATE'];
      const upperScript = scriptText.toUpperCase();
      
      for (const keyword of dangerous) {
        if (upperScript.includes(keyword)) {
          throw new Error(`Script contains dangerous keyword: ${keyword}`);
        }
      }

      // Check if script starts with SELECT
      if (!upperScript.trim().startsWith('SELECT')) {
        throw new Error('Script must start with SELECT statement');
      }

      // Simple syntax validation
      const selectCount = (upperScript.match(/SELECT/g) || []).length;
      const fromCount = (upperScript.match(/FROM/g) || []).length;
      
      if (selectCount === 0) {
        throw new Error('Script must contain at least one SELECT statement');
      }
      
      if (fromCount === 0) {
        throw new Error('Script must contain at least one FROM clause');
      }

      return { isValid: true, validatedScript: scriptText };
    } catch (error) {
      return { 
        isValid: false, 
        error: error instanceof Error ? error.message : 'Unknown validation error' 
      };
    } finally {
      setIsValidating(false);
    }
  };

  const handleSaveAndRun = async () => {
    if (!widget) return;

    const validation = await validateScript(script);
    
    if (!validation.isValid) {
      toast({
        title: "Script Validation Failed",
        description: validation.error,
        variant: "destructive",
      });
      return;
    }

    onSave(widget.id, script);
    toast({
      title: "Script Updated",
      description: "Widget script has been saved and applied successfully",
    });
    onClose();
  };

  const handleCancel = () => {
    onClose();
  };

  if (!visible || !widget) return null;

  return (
    <Dialog open={visible} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl w-full h-[80vh] bg-card border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Edit Script - {widget.name}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCancel}
              className="h-6 w-6 p-0"
            >
              <X className="w-4 h-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 flex flex-col gap-4">
          <div className="flex-1 border border-border rounded-lg overflow-hidden">
            <Editor
              height="100%"
              defaultLanguage="sql"
              value={script}
              onChange={(value) => setScript(value || "")}
              theme="vs-dark"
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                lineNumbers: "on",
                roundedSelection: false,
                scrollBeyondLastLine: false,
                automaticLayout: true,
                tabSize: 2,
                wordWrap: "on",
              }}
            />
          </div>
          
          <div className="flex justify-between items-center">
            <div className="text-sm text-muted-foreground">
              Write a SELECT query to fetch data for this widget
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleCancel}
                disabled={isValidating}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveAndRun}
                disabled={isValidating}
                className="bg-primary hover:bg-primary/90"
              >
                {isValidating ? (
                  <>Validating...</>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save & Run
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};