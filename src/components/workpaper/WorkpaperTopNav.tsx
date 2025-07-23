
import React from 'react';
import { ArrowLeft, Upload, Save, Settings, Share } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useWorkpaperStore } from '@/stores/useWorkpaperStore';
import { useUploadStore } from '@/stores/useUploadStore';

interface WorkpaperTopNavProps {
  onBack: () => void; // Navigate back to reports homepage
  onSave: () => void; // TODO: implement save functionality
  onShare: () => void; // TODO: implement share functionality
  onSettings: () => void; // TODO: implement settings modal
}

export const WorkpaperTopNav: React.FC<WorkpaperTopNavProps> = ({
  onBack,
  onSave,
  onShare,
  onSettings,
}) => {
  const { metadata, mode, isDirty, setTitle, setMode } = useWorkpaperStore();
  const { openModal } = useUploadStore();

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(e.target.value);
  };

  const handleUploadClick = () => {
    setMode('upload');
    openModal();
  };

  return (
    <div className="h-14 bg-background border-b border-border flex items-center justify-between px-4">
      {/* Left section - Back button and title */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        
        <div className="flex items-center gap-2">
          <Input
            value={metadata.title}
            onChange={handleTitleChange}
            className="text-lg font-semibold border-none bg-transparent p-0 h-auto focus-visible:ring-0"
            placeholder="Enter workpaper title..."
          />
          {isDirty && (
            <Badge variant="secondary" className="text-xs">
              Unsaved
            </Badge>
          )}
        </div>
      </div>

      {/* Center section - Mode toggle */}
      <div className="flex items-center gap-2">
        <Button
          variant={mode === 'blank' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setMode('blank')}
          className="text-sm"
        >
          Blank Canvas
        </Button>
        <Button
          variant={mode === 'upload' ? 'default' : 'outline'}
          size="sm"
          onClick={handleUploadClick}
          className="text-sm"
        >
          <Upload className="h-4 w-4 mr-2" />
          Upload Template
        </Button>
      </div>

      {/* Right section - Action buttons */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onSettings}
          className="text-muted-foreground hover:text-foreground"
        >
          <Settings className="h-4 w-4" />
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          onClick={onShare}
          className="text-muted-foreground hover:text-foreground"
        >
          <Share className="h-4 w-4" />
        </Button>
        
        <Button
          variant="default"
          size="sm"
          onClick={onSave}
          disabled={!isDirty}
          className="bg-primary hover:bg-primary/90"
        >
          <Save className="h-4 w-4 mr-2" />
          Save
        </Button>
      </div>
    </div>
  );
};
