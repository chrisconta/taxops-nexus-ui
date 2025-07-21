
import React from "react";
import { useNavigate } from "react-router-dom";
import { ReportsHome } from "@/components/reports/ReportsHome";
import { useReports, Report } from "@/hooks/useReports";

export const ReportsPage: React.FC = () => {
  const navigate = useNavigate();
  const { createReport } = useReports();

  const handleCreateReport = async (title: string, type: string, content?: any) => {
    const newReport = await createReport(title, type, content);
    if (newReport) {
      navigate(`/reports-builder?id=${newReport.id}`);
    }
  };

  const handleEditReport = (report: Report) => {
    navigate(`/reports-builder?id=${report.id}`);
  };

  return (
    <div className="h-[calc(100vh-120px)] overflow-auto">
      <ReportsHome 
        onCreateReport={handleCreateReport}
        onEditReport={handleEditReport}
      />
    </div>
  );
};

export default ReportsPage;
