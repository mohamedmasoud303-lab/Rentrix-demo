export const templates = {
    latePayment: (name: string, amount: number, dueDate: string) => 
        `عزيزي المستأجر ${name}، نود تذكيركم بأن إيجاركم المستحق وقدره ${amount} كان موعده في ${dueDate}. يرجى السداد في أقرب وقت. شكراً لكم.`,
    
    welcome: (name: string, unit: string) => 
        `مرحباً بك سيد ${name} في عقاراتنا. تم تفعيل عقدك للوحدة ${unit}. نحن هنا لخدمتكم.`,
        
    receipt: (no: string, amount: number) => 
        `تم استلام مبلغ ${amount} بنجاح. رقم السند: ${no}. شكراً لثقتكم.`
};