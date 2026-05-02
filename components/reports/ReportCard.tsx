import React from 'react';

interface ReportCardProps {
    title: string;
    subtitle: string;
    icon: React.ReactNode;
    onClick: () => void;
}

const ReportCard: React.FC<ReportCardProps> = ({ title, subtitle, icon, onClick }) => (
    <div onClick={onClick} className="bg-card border border-border rounded-xl p-6 text-center flex flex-col items-center justify-center cursor-pointer hover:border-primary hover:shadow-brand-lg transition-all group active:scale-95">
        <div className="bg-primary-light text-primary p-4 rounded-2xl mb-4 group-hover:scale-110 transition-transform">{icon}</div>
        <h3 className="font-black text-heading">{title}</h3>
        <p className="text-[10px] text-muted-foreground mt-2 leading-relaxed">{subtitle}</p>
    </div>
);

export default ReportCard;
