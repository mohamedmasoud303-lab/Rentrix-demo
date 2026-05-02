import React from 'react';
import { toArabicDigits } from '../../utils/helpers';

const Footer: React.FC = () => {
    const currentYear = toArabicDigits(new Date().getFullYear());
    return (
        <footer className="w-full py-3 px-6 border-t border-border bg-card text-center">
            <p className="text-sm text-text-muted">
                © {currentYear} Rentrix | تطوير: Mohamed Masoud |
                <span dir="ltr"> +968 9192 8186 / +20 121 210 1073</span>
            </p>
        </footer>
    );
};

export default Footer;
