
import React, { useState } from 'react';
import { useApp } from '../contexts/AppContext';
import { Download, Upload, AlertTriangle, Trash2, Cloud, RefreshCw } from 'lucide-react';
import { toast } from 'react-hot-toast';
import Card from '../components/ui/Card';
import { NavLink } from 'react-router-dom';

const exportToJson = (data: any, filename: string) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};

const GoogleIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 48 48">
      <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4C12.955 4 4 12.955 4 24s8.955 20 20 20s20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"></path>
      <path fill="#FF3D00" d="m6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4C16.318 4 9.656 8.337 6.306 14.691z"></path>
      <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"></path>
      <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.574l6.19 5.238C39.999 35.937 44 30.413 44 24c0-1.341-.138-2.65-.389-3.917z"></path>
    </svg>
);

const CloudBackupManager: React.FC = () => {
// FIX: `settings` is not a direct property of AppContext, it's inside `db`.
    const { db, googleUser, googleSignIn, googleSignOut, syncToGoogleDrive, restoreFromGoogleDrive } = useApp();
    const settings = db.settings;
    const [isSyncing, setIsSyncing] = useState(false);
    const [isRestoring, setIsRestoring] = useState(false);

    if (!settings.googleClientId) {
        return (
            <div className="p-4 bg-yellow-50 text-yellow-800 rounded-lg text-sm text-center">
                ميزة المزامنة السحابية معطلة. يرجى <NavLink to="/system" className="font-bold underline">إضافة Google Client ID</NavLink> في الإعدادات لتفعيلها.
            </div>
        );
    }
    
    const handleSync = async () => {
        setIsSyncing(true);
        try {
            await syncToGoogleDrive();
        } finally {
            setIsSyncing(false);
        }
    };

    const handleRestore = async () => {
        if (!window.confirm("تحذير! سيتم استبدال جميع بياناتك الحالية بالنسخة الاحتياطية الموجودة في Google Drive. هل أنت متأكد؟")) return;
        setIsRestoring(true);
        try {
            await restoreFromGoogleDrive();
        } finally {
            setIsRestoring(false);
        }
    };

    return (
         <div className="space-y-4 p-4 bg-background rounded-lg border border-border">
            <h3 className="font-bold flex items-center gap-2"><Cloud size={18}/> المزامنة السحابية (Google Drive)</h3>
            {googleUser ? (
                <div>
                    <div className="flex items-center gap-3 mb-4">
                        <img src={googleUser.picture} alt="profile" className="w-12 h-12 rounded-full" />
                        <div>
                            <p className="font-bold">{googleUser.name}</p>
                            <p className="text-xs text-text-muted">{googleUser.email}</p>
                        </div>
                    </div>
                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <button onClick={handleSync} disabled={isSyncing} className="btn btn-secondary flex items-center justify-center gap-2">
                            <RefreshCw size={16} className={isSyncing ? 'animate-spin' : ''} /> {isSyncing ? 'جاري المزامنة...' : 'مزامنة الآن'}
                        </button>
                        <button onClick={handleRestore} disabled={isRestoring} className="btn btn-warning flex items-center justify-center gap-2">
                            <Download size={16} /> {isRestoring ? 'جاري الاستعادة...' : 'استعادة من Drive'}
                        </button>
                    </div>
                    <button onClick={googleSignOut} className="btn btn-ghost text-xs w-full mt-2">تسجيل الخروج</button>
                </div>
            ) : (
                <div>
                    <p className="text-sm text-text-muted mb-3">
                        احفظ نسخة احتياطية من بياناتك بشكل آمن في حسابك على Google Drive واستعدها في أي وقت.
                    </p>
                    <button onClick={googleSignIn} className="btn btn-secondary w-full flex items-center justify-center gap-2">
                        <GoogleIcon /> تسجيل الدخول مع جوجل
                    </button>
                </div>
            )}
        </div>
    )
}

const BackupManager: React.FC = () => {
    const { createBackup, restoreBackup, wipeData } = useApp();
    const [restoreFile, setRestoreFile] = useState<File | null>(null);

    const handleBackup = async () => {
        const data = await createBackup();
        exportToJson(JSON.parse(data), `Rentrix_Backup_${new Date().toISOString().slice(0,10)}.json`);
        toast.success("تم تنزيل نسخة احتياطية بنجاح.");
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setRestoreFile(e.target.files[0]);
        }
    };

    const handleRestore = async () => {
        if (!restoreFile) {
            toast.error("الرجاء اختيار ملف نسخة احتياطية أولاً.");
            return;
        }

        if (!window.confirm("تحذير خطير!\n\nسيتم حذف جميع البيانات الحالية بشكل نهائي واستبدالها بالبيانات من الملف الذي اخترته.\n\nهل أنت متأكد تماماً من المتابعة؟")) {
            return;
        }

        if (!window.confirm("هذا هو تحذيرك الأخير. لا يمكن التراجع عن هذا الإجراء.\n\nللمتابعة، اضغط 'موافق'.")) {
            return;
        }

        try {
            const fileContent = await restoreFile.text();
            await restoreBackup(fileContent);
        } catch (error) {
            toast.error("فشل استعادة النسخة الاحتياطية. تأكد من أن الملف صحيح.");
            console.error(error);
        }
    };

    const handleWipe = async () => {
        if (!window.confirm("تحذير خطير جداً!\n\nهل أنت متأكد من رغبتك في حذف جميع بيانات النظام نهائياً؟ سيتم إعادة النظام إلى حالته الأولية كما لو تم تثبيته لأول مرة.")) {
            return;
        }
        if (!window.confirm("تأكيد نهائي: سيتم مسح كل شيء. اضغط 'موافق' للحذف.")) {
            return;
        }
        await wipeData();
    };

    return (
        <Card>
            <h2 className="text-xl font-bold mb-4">إدارة بيانات النظام</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <CloudBackupManager />
                <div className="space-y-4 p-4 bg-background rounded-lg border border-border">
                    <h3 className="font-bold flex items-center gap-2"><Download size={18} /> النسخ الاحتياطي المحلي</h3>
                    <p className="text-sm text-text-muted">تنزيل نسخة من البيانات على جهازك.</p>
                    <button onClick={handleBackup} className="btn btn-primary w-full">تنزيل نسخة احتياطية الآن</button>
                </div>
                <div className="space-y-4 p-4 bg-background rounded-lg border border-border md:col-span-2">
                     <h3 className="font-bold flex items-center gap-2"><Upload size={18} /> استعادة من ملف محلي</h3>
                     <div className="flex items-center gap-4">
                        <input type="file" accept=".json" onChange={handleFileSelect} className="flex-grow w-full text-sm text-text-muted file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 cursor-pointer"/>
                        <button onClick={handleRestore} disabled={!restoreFile} className="btn btn-warning flex-shrink-0">
                            بدء الاستعادة
                        </button>
                     </div>
                     {restoreFile && <p className="text-sm text-center text-text-muted">الملف المختار: {restoreFile.name}</p>}
                </div>
            </div>
            <div className="mt-8 p-4 border-2 border-dashed border-red-500 rounded-lg">
                <h3 className="text-lg font-black text-red-600 flex items-center gap-2"><AlertTriangle /> منطقة الخطر</h3>
                <p className="text-sm text-text-muted mt-2 mb-4">
                    الإجراءات في هذا القسم لا يمكن التراجع عنها وتؤدي إلى فقدان دائم للبيانات. استخدمها بحذر شديد.
                </p>
                <button onClick={handleWipe} className="btn btn-danger w-full md:w-auto flex items-center justify-center gap-2">
                    <Trash2 size={16} /> إعادة تعيين النظام بالكامل (حذف كل البيانات)
                </button>
            </div>
        </Card>
    );
}

export default BackupManager;
