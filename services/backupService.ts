
import Dexie from 'dexie';
import { dbEngine } from './db';
import { Database, User } from '../types';
import { toast } from 'react-hot-toast';
import { rebuildSnapshotsFromJournal } from './financialEngine';

const SCHEMA_VERSION = 12; // Current internal schema version for backup compatibility

export interface BackupPayload {
    version: number;
    timestamp: number;
    data: Database;
    checksum?: string;
}

export const backupService = {
    createBackup: async (): Promise<string> => {
        const data = await dbEngine.getAllData();
        const payload: BackupPayload = {
            version: SCHEMA_VERSION,
            timestamp: Date.now(),
            data
        };
        return JSON.stringify(payload);
    },

    validateBackup: async (json: string): Promise<BackupPayload> => {
        try {
            const payload: BackupPayload = JSON.parse(json);
            
            if (!payload.version || !payload.data) {
                throw new Error('ملف النسخة الاحتياطية غير صالح أو تالف.');
            }

            if (payload.version > SCHEMA_VERSION) {
                throw new Error(`إصدار النسخة الاحتياطية (${payload.version}) أحدث من إصدار النظام الحالي (${SCHEMA_VERSION}). يرجى تحديث النظام أولاً.`);
            }

            return payload;
        } catch (e: any) {
            throw new Error(`فشل التحقق من النسخة الاحتياطية: ${e.message}`);
        }
    },

    restoreBackup: async (json: string, user: User | null | undefined): Promise<{ success: boolean; report: string[] }> => {
        const report: string[] = [];
        try {
            const payload = await backupService.validateBackup(json);
            const data = payload.data;

            // 1. Check Financial Lock
            const governance = data.governance;
            if (governance?.isLocked && user?.role !== 'ADMIN') {
                throw new Error('لا يمكن استعادة نسخة احتياطية تحتوي على فترة مالية مقفلة إلا من قبل مدير النظام.');
            }

            report.push(`بدء استعادة النسخة الاحتياطية بتاريخ ${new Date(payload.timestamp).toLocaleString()}`);
            report.push(`إصدار المخطط: ${payload.version}`);

            // 2. Clear current DB
            const tables = (dbEngine as any).tables;
            for (const table of tables) {
                await table.clear();
            }
            report.push('تم مسح قاعدة البيانات الحالية بنجاح.');

            // 3. Restore tables
            const STATIC_ID = 1;
            for (const table of tables) {
                const tableName = table.name;
                let tableData: any[] = [];

                if (['settings', 'governance', 'serials'].includes(tableName)) {
                    const singleRec = (data as any)[tableName];
                    if (singleRec) tableData = [{ ...singleRec, id: STATIC_ID }];
                } else if (tableName === 'users') {
                    tableData = data.auth?.users || [];
                } else {
                    tableData = (data as any)[tableName] || [];
                }

                if (tableData.length > 0) {
                    await table.bulkAdd(tableData);
                    report.push(`تم استعادة ${tableData.length} سجل في جدول ${tableName}.`);
                }
            }

            // 4. Post-restore Integrity Validation
            report.push('بدء فحص سلامة البيانات بعد الاستعادة...');
            const invoiceCount = await dbEngine.invoices.count();
            const contractCount = await dbEngine.contracts.count();
            if (invoiceCount > 0 && contractCount === 0) {
                report.push('تحذير: تم العثور على فواتير بدون عقود مرتبطة.');
            }

            // 5. Rebuild Financials
            report.push('جاري إعادة بناء السجلات المالية والأرصدة...');
            await rebuildSnapshotsFromJournal();
            report.push('تمت إعادة بناء الأرصدة بنجاح.');

            toast.success('تمت استعادة النسخة الاحتياطية بنجاح.');
            return { success: true, report };

        } catch (error: any) {
            console.error('Restore Error:', error);
            toast.error(error.message || 'فشل استعادة النسخة الاحتياطية.');
            return { success: false, report: [...report, `خطأ فادح: ${error.message}`] };
        }
    }
};
