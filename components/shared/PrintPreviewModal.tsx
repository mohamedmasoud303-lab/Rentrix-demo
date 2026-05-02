
import React, { useRef } from 'react';
import { Printer, X, FileText } from 'lucide-react';

interface PrintPreviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
    onExportPdf?: () => void;
}

const PrintPreviewModal: React.FC<PrintPreviewModalProps> = ({ isOpen, onClose, title, children, onExportPdf }) => {
    const componentRef = useRef<HTMLDivElement>(null);
    
    const handlePrint = () => {
        const content = componentRef.current;
        if (!content) return;

        const printWindow = window.open('', '', 'height=800,width=1000');
        if (printWindow) {
            printWindow.document.write('<html><head><title>طباعة</title>');
            printWindow.document.write(`
                <style>
                    @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;700&display=swap');
                    body { 
                        font-family: 'Cairo', sans-serif;
                        direction: rtl;
                        margin: 20px;
                        color: #333;
                    }
                    table { width: 100%; border-collapse: collapse; margin-top: 1rem; font-size: 0.9rem; }
                    th, td { border: 1px solid #ccc; padding: 8px; text-align: right; }
                    thead { background-color: #f2f2f2; }
                    h1, h2, h3, h4 { margin-bottom: 1rem; color: #000; }
                    .text-center { text-align: center; }
                    .font-bold { font-weight: 700; }
                    .mb-2 { margin-bottom: 0.5rem; }
                    .mb-6 { margin-bottom: 1.5rem; }
                    .text-sm { font-size: 0.875rem; }
                    .text-text-muted { color: #666; }
                    @media print {
                        body { margin: 0; }
                    }
                </style>
            `);
            printWindow.document.write('</head><body>');
            printWindow.document.write(content.innerHTML);
            printWindow.document.write('</body></html>');
            printWindow.document.close();
            printWindow.focus();
            setTimeout(() => {
                printWindow.print();
                printWindow.close();
            }, 250);
        }
    };


    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/75 z-[70] flex justify-center items-center p-4">
            <div className="bg-background rounded-lg shadow-xl w-full max-w-4xl h-[95vh] flex flex-col">
                <div className="bg-card p-3 flex justify-between items-center rounded-t-lg border-b border-border">
                    <h3 className="text-lg font-bold text-heading">{title}</h3>
                    <div className="flex items-center gap-2">
                        {onExportPdf && (
                            <button onClick={onExportPdf} className="btn bg-secondary text-secondary-foreground hover:bg-secondary/90 flex items-center gap-2">
                                <FileText size={16} />
                                تصدير PDF
                            </button>
                        )}
                        <button onClick={handlePrint} className="btn bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-2">
                            <Printer size={16} />
                            طباعة
                        </button>
                        <button onClick={onClose} className="btn btn-ghost p-2">
                            <X size={20} />
                        </button>
                    </div>
                </div>
                <div className="p-5 overflow-y-auto flex-1">
                    <div ref={componentRef} className="bg-card text-foreground shadow-lg mx-auto p-8" style={{ width: '210mm' }}>
                        {children}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PrintPreviewModal;
