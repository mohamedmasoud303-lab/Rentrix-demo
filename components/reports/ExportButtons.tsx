import React from 'react';
import * as XLSX from 'xlsx';
import { Printer, Download } from 'lucide-react';

interface ExportButtonsProps {
    data: any[];
    filename: string;
    onPrint: () => void;
}

const ExportButtons: React.FC<ExportButtonsProps> = ({ data, filename, onPrint }) => {
    const exportToExcel = () => {
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Report");
        XLSX.writeFile(wb, `${filename}.xlsx`);
    };

    return (
        <div className="flex items-center gap-2 no-print">
            <button onClick={onPrint} className="btn btn-secondary flex items-center gap-2 text-xs">
                <Printer className="w-4 h-4" /> طباعة PDF
            </button>
            <button onClick={exportToExcel} className="btn btn-secondary flex items-center gap-2 text-xs">
                <Download className="w-4 h-4" /> تصدير Excel
            </button>
        </div>
    );
};

export default ExportButtons;
