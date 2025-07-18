
import React, { useState } from "react";
import { ReportTopNav } from "@/components/reports/ReportTopNav";
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
        <div className="flex-1 bg-[radial-gradient(circle_at_center,_rgba(255,255,255,0.02)_1px,_transparent_1px)] bg-[size:24px_24px] relative">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">📊</span>
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">
                {isRunning ? 'Running Report...' : 'Start Building'}
              </h2>
              <p className="text-taxops-gray-light max-w-md">
                {isRunning 
                  ? 'Please wait while we execute your report.'
                  : 'Add components from the panel on the left to start creating your report.'
                }
              </p>
              {isRunning && (
                <div className="mt-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                </div>
              )}
            </div>
          </div>
        </div>

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
