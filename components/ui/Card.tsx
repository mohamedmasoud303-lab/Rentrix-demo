
import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

const Card: React.FC<CardProps> = ({ children, className = '' }) => {
  return (
    <div className={`bg-card border border-border/50 rounded-2xl p-6 shadow-sm ${className}`}>
      {children}
    </div>
  );
};

export default Card;
