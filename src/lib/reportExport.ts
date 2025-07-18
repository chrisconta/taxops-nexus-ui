import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export interface ExportOptions {
  format: 'pdf' | 'png' | 'json';
  filename?: string;
  quality?: number;
}

export const exportReport = async (
  canvasElement: HTMLElement,
  reportData: any,
  options: ExportOptions
) => {
  const { format, filename = 'report', quality = 0.95 } = options;

  try {
    switch (format) {
      case 'png':
        await exportAsPNG(canvasElement, filename, quality);
        break;
      case 'pdf':
        await exportAsPDF(canvasElement, filename, quality);
        break;
      case 'json':
        exportAsJSON(reportData, filename);
        break;
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  } catch (error) {
    console.error('Export error:', error);
    throw error;
  }
};

const exportAsPNG = async (element: HTMLElement, filename: string, quality: number) => {
  const canvas = await html2canvas(element, {
    backgroundColor: '#ffffff',
    scale: 2,
    logging: false,
    useCORS: true,
  });

  const link = document.createElement('a');
  link.download = `${filename}.png`;
  link.href = canvas.toDataURL('image/png', quality);
  link.click();
};

const exportAsPDF = async (element: HTMLElement, filename: string, quality: number) => {
  const canvas = await html2canvas(element, {
    backgroundColor: '#ffffff',
    scale: 2,
    logging: false,
    useCORS: true,
  });

  const imgData = canvas.toDataURL('image/png', quality);
  const pdf = new jsPDF();
  
  const imgWidth = 210;
  const pageHeight = 295;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;
  let heightLeft = imgHeight;
  
  let position = 0;
  
  pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
  heightLeft -= pageHeight;
  
  while (heightLeft >= 0) {
    position = heightLeft - imgHeight;
    pdf.addPage();
    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;
  }
  
  pdf.save(`${filename}.pdf`);
};

const exportAsJSON = (reportData: any, filename: string) => {
  const dataStr = JSON.stringify(reportData, null, 2);
  const dataBlob = new Blob([dataStr], { type: 'application/json' });
  
  const link = document.createElement('a');
  link.download = `${filename}.json`;
  link.href = URL.createObjectURL(dataBlob);
  link.click();
};

export const importReport = (file: File): Promise<any> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const result = e.target?.result as string;
        const reportData = JSON.parse(result);
        resolve(reportData);
      } catch (error) {
        reject(new Error('Invalid JSON file'));
      }
    };
    
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
};