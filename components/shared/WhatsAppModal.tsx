import React, { useState } from 'react';
import Modal from '../ui/Modal';
import { MessageCircle, Send, Phone, X } from 'lucide-react';
import { cn } from '../../utils/helpers';

interface WhatsAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  phoneNumber: string;
  customerName: string;
  defaultMessage?: string;
}

const WhatsAppModal: React.FC<WhatsAppModalProps> = ({
  isOpen,
  onClose,
  phoneNumber,
  customerName,
  defaultMessage = ''
}) => {
  const [message, setMessage] = useState(defaultMessage);

  const handleSend = () => {
    // Format phone number (remove 0 at start if exists, add country code if missing)
    let formattedPhone = phoneNumber.replace(/\D/g, '');
    if (formattedPhone.startsWith('0')) {
      formattedPhone = '966' + formattedPhone.substring(1); // Default to KSA
    } else if (!formattedPhone.startsWith('966')) {
      formattedPhone = '966' + formattedPhone;
    }

    const encodedMessage = encodeURIComponent(message);
    const url = `https://wa.me/${formattedPhone}?text=${encodedMessage}`;
    window.open(url, '_blank');
    onClose();
  };

  const templates = [
    "مرحباً، نود تذكيركم بموعد سداد الإيجار المستحق.",
    "عزيزي العميل، تم استلام دفعتكم بنجاح. شكراً لكم.",
    "نرجو التواصل معنا بخصوص طلب الصيانة المقدم.",
    "تم تجديد العقد الإلكتروني، يرجى الاطلاع عليه."
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="مراسلة عبر واتساب">
      <div className="space-y-4">
        <div className="bg-green-50 p-4 rounded-xl border border-green-100 flex items-center gap-3">
          <div className="bg-green-500 text-white p-2 rounded-full">
            <MessageCircle size={24} />
          </div>
          <div>
            <p className="font-bold text-green-900">{customerName}</p>
            <p className="text-sm text-green-700 font-mono" dir="ltr">{phoneNumber}</p>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">الرسالة</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="w-full p-3 rounded-xl border min-h-[120px] focus:ring-2 focus:ring-green-500/20 focus:border-green-500"
            placeholder="اكتب رسالتك هنا..."
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold text-muted-foreground uppercase">قوالب جاهزة</label>
          <div className="grid grid-cols-1 gap-2">
            {templates.map((template, i) => (
              <button
                key={i}
                onClick={() => setMessage(template)}
                className="text-right text-xs p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors truncate"
              >
                {template}
              </button>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground">
            إلغاء
          </button>
          <button
            onClick={handleSend}
            disabled={!message.trim()}
            className="flex items-center gap-2 px-6 py-2 bg-[#25D366] text-white rounded-xl hover:bg-[#128C7E] transition-colors font-bold shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send size={16} />
            إرسال
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default WhatsAppModal;
