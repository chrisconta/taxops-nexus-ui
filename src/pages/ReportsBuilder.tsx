
import React, { useState } from "react";
import { ReportTopNav } from "@/components/reports/ReportTopNav";
import { ReportCanvas } from "@/components/reports/ReportCanvas";
import { ComponentPalette } from "@/components/reports/ComponentPalette";
import { ConfigurationPanel } from "@/components/reports/ConfigurationPanel";
import { useReportBuilder } from "@/hooks/useReportBuilder";

const ReportsBuilder = () => {
  const {
    reportState,
    updateState,
    undo,
    redo,
    canUndo,
    canRedo,
    runReport,
    isRunning,
  } = useReportBuilder();

  const [showFilters, setShowFilters] = useState(false);

  const handleTitleChange = (title: string) => {
    updateState({ title });
  };

  const handleViewChange = (activeView: 'table' | 'chart') => {
    updateState({ activeView });
  };

  const handleShowFilters = () => {
    setShowFilters(!showFilters);
  };

  return (
    <div className="h-[calc(100vh-120px)] overflow-hidden">
      {/* Top Navigation Bar */}
      <ReportTopNav
        reportTitle={reportState.title}
        onTitleChange={handleTitleChange}
        activeView={reportState.activeView}
        onViewChange={handleViewChange}
        onRunReport={runReport}
        onUndo={undo}
        onRedo={redo}
        onShowFilters={handleShowFilters}
        canUndo={canUndo}
        canRedo={canRedo}
      />

      {/* Main Content Area */}
      <div className="flex h-[calc(100%-4rem)]">
        {/* Left Sidebar - Component Palette */}
        <ComponentPalette 
          onItemDragStart={(item, e) => {
            console.log('Dragging item:', item.name);
          }}
        />

        {/* Main Canvas */}
        <ReportCanvas 
          isRunning={isRunning}
          items={reportState.components}
          onItemAdd={(item) => updateState({ 
            components: [...reportState.components, item] 
          })}
          onItemUpdate={(id, updates) => updateState({
            components: reportState.components.map(item => 
              item.id === id ? { ...item, ...updates } : item
            )
          })}
          onItemDelete={(id) => updateState({
            components: reportState.components.filter(item => item.id !== id)
          })}
        />

        {/* Right Sidebar - Configuration Panel */}
        <ConfigurationPanel
          isVisible={showFilters}
          onClose={() => setShowFilters(false)}
          selectedComponent={reportState.selectedComponent}
        />
      </div>

      {/* Bottom Status Bar */}
      <div className="h-12 bg-glass-bg/95 backdrop-blur-xl border-t border-glass-border flex items-center justify-between px-6">
        <div className="text-sm text-taxops-gray-light">
          {isRunning ? 'Executing report...' : 'Ready to build your report'}
        </div>
        <div className="text-sm text-taxops-gray-light">
          Last saved: {reportState.lastSaved ? reportState.lastSaved.toLocaleString() : 'Never'}
        </div>
      </div>
    </div>
  );
};

export default ReportsBuilder;
