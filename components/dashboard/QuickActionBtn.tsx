import React from 'react';

interface QuickActionBtnProps {
    icon: React.ReactNode;
    label: string;
    onClick: () => void;
}

const QuickActionBtn: React.FC<QuickActionBtnProps> = ({ icon, label, onClick }) => (
    <button 
        onClick={onClick}
        className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl bg-muted/50 hover:bg-primary hover:text-primary-foreground transition-all group"
    >
        <div className="p-2 rounded-xl bg-card group-hover:bg-white/20 transition-colors">
            {icon}
        </div>
        <span className="text-[10px] font-black uppercase tracking-wider">{label}</span>
    </button>
);

export default QuickActionBtn;
