
import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

const Card: React.FC<CardProps> = ({ children, className = '' }) => {
  return (
    <div className={`bg-card border border-border rounded-xl p-6 shadow-brand-lg ${className}`}>
      {children}
    </div>
  );
};

export default Card;
