
import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ReportTopNav } from "@/components/reports/ReportTopNav";
import { ReportCanvas } from "@/components/reports/ReportCanvas";
import { ComponentPalette } from "@/components/reports/ComponentPalette";
import { ConfigurationPanel } from "@/components/reports/ConfigurationPanel";
import { ReportStatusBar } from "@/components/reports/ReportStatusBar";
import { ReportsHome } from "@/components/reports/ReportsHome";
import { WorkpaperBuilder } from "@/components/workpaper/WorkpaperBuilder";
import { useReportBuilder } from "@/hooks/useReportBuilder";
import { useReports, Report } from "@/hooks/useReports";

const ReportsBuilder = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const reportId = searchParams.get('id');
  const reportType = searchParams.get('type'); // 'workpaper' or 'report'
  
  const { reports, updateReport, createReport } = useReports();
  const {
    reportState,
    updateState,
    undo,
    redo,
    canUndo,
    canRedo,
    runReport,
    isRunning,
    status,
    progress,
  } = useReportBuilder();

  const [showFilters, setShowFilters] = useState(false);
  const [currentReport, setCurrentReport] = useState(null);

  // Load existing report if ID is provided
  useEffect(() => {
    if (reportId && reports.length > 0) {
      const report = reports.find(r => r.id === reportId);
      if (report) {
        setCurrentReport(report);
        // Load the report content into the builder
        updateState({
          title: report.title,
          activeView: report.content?.activeView || 'table',
          components: report.content?.components || [],
          selectedComponent: null
        });
      }
    }
  }, [reportId, reports, updateState]);

  // Auto-save functionality
  useEffect(() => {
    if (currentReport && reportState.title !== 'New Report') {
      const saveTimer = setTimeout(() => {
        updateReport(currentReport.id, {
          title: reportState.title,
          content: {
            activeView: reportState.activeView,
            components: reportState.components,
            filters: reportState.filters
          }
        });
        updateState({ lastSaved: new Date() });
      }, 2000);

      return () => clearTimeout(saveTimer);
    }
  }, [reportState, currentReport, updateReport]);

  const handleTitleChange = (title: string) => {
    updateState({ title });
  };

  const handleViewChange = (activeView: 'table' | 'chart') => {
    updateState({ activeView });
  };

  const handleShowFilters = () => {
    setShowFilters(!showFilters);
  };

  const handleBack = () => {
    navigate('/reports');
  };

  const handleCreateReport = async (title: string, type: string, content?: any) => {
    const newReport = await createReport(title, type, content);
    if (newReport) {
      navigate(`/reports?id=${newReport.id}&type=${type}`);
    }
  };

  const handleEditReport = (report: Report) => {
    // Determine if this is a workpaper or regular report
    const type = report.report_type === 'workpaper' ? 'workpaper' : 'report';
    navigate(`/reports?id=${report.id}&type=${type}`);
  };

  // If no report ID is provided, show the ReportsHome component
  if (!reportId) {
    return (
      <div className="h-[calc(100vh-120px)] overflow-auto">
        <ReportsHome 
          onCreateReport={handleCreateReport}
          onEditReport={handleEditReport}
        />
      </div>
    );
  }

  // If this is a workpaper, show the WorkpaperBuilder
  if (reportType === 'workpaper') {
    return (
      <div className="h-[calc(100vh-120px)] overflow-hidden">
        <WorkpaperBuilder onBack={handleBack} />
      </div>
    );
  }

  // Show the legacy report builder interface for regular reports
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
        onBack={handleBack}
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
            components: [...reportState.components, item],
            selectedComponent: item
          })}
          onItemUpdate={(id, updates) => updateState({
            components: reportState.components.map(item => 
              item.id === id ? { ...item, ...updates } : item
            )
          })}
          onItemDelete={(id) => updateState({
            components: reportState.components.filter(item => item.id !== id),
            selectedComponent: reportState.selectedComponent?.id === id ? null : reportState.selectedComponent
          })}
          onItemSelect={(item) => updateState({
            selectedComponent: item
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
      <ReportStatusBar
        isRunning={isRunning}
        progress={progress}
        status={status}
        lastSaved={reportState.lastSaved}
        componentsCount={reportState.components.length}
        onSave={() => {
          if (currentReport) {
            updateReport(currentReport.id, {
              title: reportState.title,
              content: {
                activeView: reportState.activeView,
                components: reportState.components,
                filters: reportState.filters
              }
            });
            updateState({ lastSaved: new Date() });
          }
        }}
        onExport={() => {
          console.log('Exporting report...');
        }}
        onImport={() => {
          console.log('Importing report...');
        }}
        onRunReport={runReport}
      />
    </div>
  );
};

export default ReportsBuilder;
