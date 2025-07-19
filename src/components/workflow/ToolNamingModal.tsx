import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ToolNamingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (name: string, description?: string) => void;
  initialName?: string;
  initialDescription?: string;
  title?: string;
  description?: string;
}

export const ToolNamingModal = ({
  isOpen,
  onClose,
  onConfirm,
  initialName = "",
  initialDescription = "",
  title = "Name Your Tool",
  description = "Give your tool a descriptive name to help you identify it later."
}: ToolNamingModalProps) => {
  const [name, setName] = useState(initialName);
  const [desc, setDesc] = useState(initialDescription);

  const handleConfirm = () => {
    if (name.trim()) {
      onConfirm(name.trim(), desc.trim() || undefined);
      onClose();
      setName("");
      setDesc("");
    }
  };

  const handleClose = () => {
    onClose();
    setName(initialName);
    setDesc(initialDescription);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="tool-name">Tool Name *</Label>
            <Input
              id="tool-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter tool name..."
              onKeyDown={(e) => {
                if (e.key === 'Enter' && name.trim()) {
                  handleConfirm();
                }
              }}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="tool-description">Description (optional)</Label>
            <Input
              id="tool-description"
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="Enter tool description..."
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={!name.trim()}>
            Create Tool
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};