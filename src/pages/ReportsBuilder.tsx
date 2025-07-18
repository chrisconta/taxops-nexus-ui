import React from "react";

const ReportsBuilder = () => {
  return (
    <div className="h-[calc(100vh-120px)] overflow-hidden">
      {/* Top Navigation Bar */}
      <div className="h-16 bg-glass-bg/95 backdrop-blur-xl border-b border-glass-border flex items-center justify-between px-6">
        <div className="flex items-center gap-4">
          <button className="text-sm text-taxops-gray-light hover:text-white transition-colors">
            ← Back
          </button>
          <h1 className="text-lg font-semibold text-white">
            New Report
          </h1>
        </div>
        
        <div className="flex items-center gap-2">
          <button className="px-4 py-2 text-sm bg-primary/20 text-primary border border-primary/30 rounded-lg hover:bg-primary/30 transition-colors">
            Table View
          </button>
          <button className="px-4 py-2 text-sm text-taxops-gray-light border border-glass-border rounded-lg hover:bg-glass-bg/50 transition-colors">
            Chart View
          </button>
          <button className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors">
            Run Report
          </button>
        </div>
      </div>

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
              <h2 className="text-2xl font-bold text-white mb-2">Start Building</h2>
              <p className="text-taxops-gray-light max-w-md">
                Add components from the panel on the left to start creating your report.
              </p>
            </div>
          </div>
        </div>

        {/* Right Sidebar - Configuration Panel (Hidden by default) */}
        <div className="w-80 bg-glass-bg/50 backdrop-blur-xl border-l border-glass-border p-6 hidden">
          <h2 className="text-lg font-semibold text-white mb-6">Configuration</h2>
          <p className="text-sm text-taxops-gray-light">
            Select a component to configure its properties.
          </p>
        </div>
      </div>

      {/* Bottom Status Bar */}
      <div className="h-12 bg-glass-bg/95 backdrop-blur-xl border-t border-glass-border flex items-center justify-between px-6">
        <div className="text-sm text-taxops-gray-light">
          Ready to build your report
        </div>
        <div className="text-sm text-taxops-gray-light">
          Last saved: Never
        </div>
      </div>
    </div>
  );
};

export default ReportsBuilder;