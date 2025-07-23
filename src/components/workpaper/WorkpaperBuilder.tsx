
import React, { useState, useEffect } from 'react';
import { WorkpaperTopNav } from './WorkpaperTopNav';
import { FormulaBar } from './FormulaBar';
import { SpreadsheetGrid } from './SpreadsheetGrid';
import { DataSourceSidebar } from './DataSourceSidebar';
import { SheetTabsContainer } from './SheetTabsContainer';
import { UploadTemplateModal } from './UploadTemplateModal';
import { useWorkpaperStore } from '@/stores/useWorkpaperStore';
import { useUploadStore } from '@/stores/useUploadStore';

interface WorkpaperBuilderProps {
  onBack: () => void;
}

export const WorkpaperBuilder: React.FC<WorkpaperBuilderProps> = ({ onBack }) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { saveWorkpaper } = useWorkpaperStore();
  const { isModalOpen } = useUploadStore();

  const handleSave = async () => {
    try {
      await saveWorkpaper();
      console.log('Workpaper saved successfully');
    } catch (error) {
      console.error('Failed to save workpaper:', error);
    }
  };

  const handleShare = () => {
    // TODO: Implement share functionality
    console.log('Share workpaper');
  };

  const handleSettings = () => {
    // TODO: Implement settings modal
    console.log('Open settings');
  };

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Top Navigation */}
      <WorkpaperTopNav
        onBack={onBack}
        onSave={handleSave}
        onShare={handleShare}
        onSettings={handleSettings}
      />

      {/* Formula Bar */}
      <FormulaBar />

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Spreadsheet Grid */}
        <div className="flex-1 flex flex-col">
          <SpreadsheetGrid className="flex-1" />
          <SheetTabsContainer />
        </div>

        {/* Data Source Sidebar */}
        <DataSourceSidebar
          isCollapsed={sidebarCollapsed}
          onToggleCollapse={toggleSidebar}
        />
      </div>

      {/* Upload Template Modal */}
      <UploadTemplateModal />
    </div>
  );
};
