
import React, { useState, useRef, useEffect } from 'react';
import { MoreVertical, Edit, Trash2, Printer, XCircle } from 'lucide-react';

export interface ActionItem {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  isDestructive?: boolean;
}

interface ActionsMenuProps {
  items: ActionItem[];
}

const ActionsMenu: React.FC<ActionsMenuProps> = ({ items }) => {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [wrapperRef]);
  
  const handleButtonClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsOpen(prev => !prev);
  }

  return (
    <div className="relative inline-block text-left" ref={wrapperRef}>
      <div>
        <button
          type="button"
          className="inline-flex justify-center w-8 h-8 items-center rounded-md border border-transparent bg-transparent text-muted-foreground hover:bg-background focus:outline-none"
          onClick={handleButtonClick}
        >
          <MoreVertical className="h-4 w-4" />
        </button>
      </div>

      {isOpen && (
        <div className="origin-top-left absolute left-0 mt-2 w-48 rounded-md shadow-lg bg-card ring-1 ring-black ring-opacity-5 z-20 border border-border">
          <div className="py-1" role="menu" aria-orientation="vertical">
            {items.map((item, index) => (
              <button
                key={index}
                onClick={(e) => {
                  e.stopPropagation();
                  item.onClick();
                  setIsOpen(false);
                }}
                className={`w-full text-right flex items-center gap-3 px-4 py-2 text-sm font-semibold ${
                  item.isDestructive
                    ? 'text-danger hover:bg-danger-foreground'
                    : 'text-heading hover:bg-background'
                }`}
                role="menuitem"
              >
                {item.icon}
                {item.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ActionsMenu;

export const EditAction = (onClick: () => void): ActionItem => ({
    label: 'تعديل',
    icon: <Edit size={16} />,
    onClick,
});

export const DeleteAction = (onClick: () => void): ActionItem => ({
    label: 'حذف',
    icon: <Trash2 size={16} />,
    onClick,
    isDestructive: true,
});

export const PrintAction = (onClick: () => void): ActionItem => ({
    label: 'طباعة',
    icon: <Printer size={16} />,
    onClick,
});

export const VoidAction = (onClick: () => void): ActionItem => ({
    label: 'إلغاء',
    icon: <XCircle size={16} />,
    onClick,
    isDestructive: true,
});
