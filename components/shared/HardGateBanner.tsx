
import React, { useMemo } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toArabicDigits } from '../../utils/helpers';
import { useApp } from '../../contexts/AppContext';

const runDataIntegrityAudit = (db: any): any[] => [];

const HardGateBanner: React.FC = () => {
    const { db } = useApp();

    const criticalIssues = useMemo(() => {
        const allIssues = runDataIntegrityAudit(db);
        return allIssues.filter(issue => issue.severity === 'ERROR');
    }, [db]);

    if (criticalIssues.length === 0) {
        return null;
    }

    return (
        <div className="bg-danger-foreground text-danger p-4 rounded-lg mb-6 flex items-center justify-between gap-4 border border-danger">
            <div className="flex items-center gap-3">
                <AlertTriangle className="h-6 w-6" />
                <div>
                    <h3 className="font-bold text-heading">تنبيه سلامة البيانات</h3>
                    <p className="text-sm text-foreground">
                        تم العثور على <strong>{toArabicDigits(criticalIssues.length)}</strong> أخطاء حرجة. قد يؤثر هذا على دقة الحسابات والتقارير.
                    </p>
                </div>
            </div>
            <Link to="/data-integrity" className="btn btn-secondary flex-shrink-0">
                عرض التفاصيل والإصلاح
            </Link>
        </div>
    );
};

export default HardGateBanner;
