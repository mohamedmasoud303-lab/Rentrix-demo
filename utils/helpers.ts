
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const ARABIC_INDIC_DIGITS: { [key: string]: string } = {
  '0': '٠', '1': '١', '2': '٢', '3': '٣', '4': '٤',
  '5': '٥', '6': '٦', '7': '٧', '8': '٨', '9': '٩'
};

export function toArabicDigits(input: string | number): string {
  return String(input).replace(/[0-9]/g, (d) => ARABIC_INDIC_DIGITS[d]);
}

export function formatCurrency(amount: number, currency: 'OMR' | 'SAR' | 'EGP' = 'OMR'): string {
  const n = Number(amount) || 0;
  const decimals = currency === 'EGP' ? 2 : 3;
  const symbol = currency === 'OMR' ? 'ر.ع.' : currency === 'SAR' ? 'ر.س.' : 'ج.م.';
  
  const formattedNumber = n.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  return `${toArabicDigits(formattedNumber)} ${symbol}`;
}

export function formatDate(dateString: string): string {
  if (!dateString) return '—';
  try {
    const date = new Date(dateString);
    const day = toArabicDigits(date.getDate());
    const month = toArabicDigits(date.getMonth() + 1);
    const year = toArabicDigits(date.getFullYear());
    return `${year}/${month}/${day}`;
  } catch {
    return dateString;
  }
}

export function formatDateTime(dateTimeString: string): string {
    if (!dateTimeString) return '—';
    try {
        const date = new Date(dateTimeString);
        const formattedDate = formatDate(dateTimeString);
        const time = date.toLocaleTimeString('ar-EG', { hour: 'numeric', minute: 'numeric', hour12: true });
        return `${formattedDate} ${time}`;
    } catch {
        return dateTimeString;
    }
}

export function sanitizePhoneNumber(phone: string): string {
  if (!phone) return '';
  // Removes +, -, spaces, parentheses and any non-digit characters
  return phone.replace(/[\s+()-]/g, '');
}

export function getLocalISODate(date: Date = new Date()): string {
    return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

export function getLocalISOMonth(date: Date = new Date()): string {
    return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 7);
}

export const safeLabel = (map: {[key: string]: string}, key: string, fallback: string) => map[key] || fallback;

export const getStatusBadgeClass = (status: string): string => {
    switch (status) {
        // Success states
        case 'ACTIVE':
        case 'POSTED':
        case 'COMPLETED':
        case 'PAID':
        case 'AVAILABLE':
        case 'SENT':
            return 'bg-success-foreground text-success';
        
        // Warning states
        case 'INACTIVE':
        case 'PENDING':
        case 'IN_PROGRESS':
        case 'PARTIALLY_PAID':
        case 'RESERVED':
            return 'bg-warning-foreground text-warning';

        // Danger states
        case 'ENDED':
        case 'SUSPENDED':
        case 'VOID':
        case 'BLACKLIST':
        case 'CLOSED':
        case 'OVERDUE':
        case 'CANCELLED':
        case 'NOT_INTERESTED':
            return 'bg-danger-foreground text-danger';
        
        // Primary/Info states
        case 'NEW':
        case 'CONTACTED':
        case 'INTERESTED':
        case 'PLANNED':
             return 'bg-primary-light text-primary';
        
        // Neutral states
        case 'UNPAID':
        case 'DRAFT':
        default:
            return 'bg-neutral text-neutral-foreground';
    }
};

export const hexToHsl = (hex: string): string => {
    hex = hex.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16) / 255;
    const g = parseInt(hex.substring(2, 4), 16) / 255;
    const b = parseInt(hex.substring(4, 6), 16) / 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0, s = 0, l = (max + min) / 2;
    if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }
    return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
};
