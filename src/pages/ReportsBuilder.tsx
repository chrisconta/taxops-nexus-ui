
import React, { useState } from "react";
import { ReportTopNav } from "@/components/reports/ReportTopNav";
import { ReportCanvas } from "@/components/reports/ReportCanvas";
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
        <div className="w-80 bg-glass-bg/50 backdrop-blur-xl border-r border-glass-border p-6">
          <h2 className="text-lg font-semibold text-white mb-6">Components</h2>
          
          <div className="space-y-4">
            <div className="p-4 bg-glass-bg/30 rounded-lg border border-glass-border">
              <h3 className="font-medium text-white mb-2">📂 Data Tables</h3>
              <div className="space-y-2 text-sm text-taxops-gray-light">
                <div className="p-2 hover:bg-glass-bg/50 rounded cursor-pointer">Facturación</div>
                <div className="p-2 hover:bg-glass-bg/50 rounded cursor-pointer">Pagos</div>
                <div className="p-2 hover:bg-glass-bg/50 rounded cursor-pointer">Nómina</div>
              </div>
            </div>

            <div className="p-4 bg-glass-bg/30 rounded-lg border border-glass-border">
              <h3 className="font-medium text-white mb-2">📊 KPIs / Metrics</h3>
              <div className="space-y-2 text-sm text-taxops-gray-light">
                <div className="p-2 hover:bg-glass-bg/50 rounded cursor-pointer">Total IVA</div>
                <div className="p-2 hover:bg-glass-bg/50 rounded cursor-pointer">Nómina Net</div>
                <div className="p-2 hover:bg-glass-bg/50 rounded cursor-pointer">Retenciones</div>
              </div>
            </div>

            <div className="p-4 bg-glass-bg/30 rounded-lg border border-glass-border">
              <h3 className="font-medium text-white mb-2">🔢 Formulas</h3>
              <div className="space-y-2 text-sm text-taxops-gray-light">
                <div className="p-2 hover:bg-glass-bg/50 rounded cursor-pointer">SUM</div>
                <div className="p-2 hover:bg-glass-bg/50 rounded cursor-pointer">AVG</div>
                <div className="p-2 hover:bg-glass-bg/50 rounded cursor-pointer">IF</div>
                <div className="p-2 hover:bg-glass-bg/50 rounded cursor-pointer">Custom Formula</div>
              </div>
            </div>
          </div>
        </div>

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
        <div className={`w-80 bg-glass-bg/50 backdrop-blur-xl border-l border-glass-border p-6 transition-all duration-300 ${showFilters ? 'block' : 'hidden'}`}>
          <h2 className="text-lg font-semibold text-white mb-6">Filters & Configuration</h2>
          <div className="space-y-4">
            <div className="p-4 bg-glass-bg/30 rounded-lg border border-glass-border">
              <h3 className="font-medium text-white mb-2">📅 Date Range</h3>
              <p className="text-sm text-taxops-gray-light">
                Configure date filters for your report data.
              </p>
            </div>
            <div className="p-4 bg-glass-bg/30 rounded-lg border border-glass-border">
              <h3 className="font-medium text-white mb-2">🏢 Client Filter</h3>
              <p className="text-sm text-taxops-gray-light">
                Select specific clients to include in the report.
              </p>
            </div>
          </div>
        </div>
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
