import React from 'react';

const PageLoader: React.FC = () => (
    <div className="w-full h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            <p className="text-sm font-semibold text-muted-foreground">جاري تحميل نظام Rentrix...</p>
        </div>
    </div>
);

export default PageLoader;
