
/// <reference types="vite/client" />
import { GoogleGenAI } from '@google/genai';

export async function queryAssistant(query: string, context: string): Promise<string> {
    try {
        const apiKey = process.env.GEMINI_API_KEY || import.meta.env.VITE_GEMINI_API_KEY;
        if (!apiKey) {
            return 'مفتاح API الخاص بـ Gemini غير متوفر. يرجى إعداده في المتغيرات البيئية.';
        }
        
        const ai = new GoogleGenAI({ apiKey });
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `أنت مساعد ذكي لنظام إدارة عقارات (Rentrix). أجب عن سؤال المستخدم بناءً على هذا السياق (البيانات الحالية للنظام):\n\nالسياق:\n${context}\n\nسؤال المستخدم:\n${query}`,
            config: {
                systemInstruction: 'أنت مساعد ذكي محترف وموجز. أجب باللغة العربية دائماً.',
            }
        });
        
        return response.text || 'عذراً، لم أتمكن من توليد إجابة.';
    } catch (error) {
        console.error('Gemini API Error:', error);
        return 'حدث خطأ أثناء الاتصال بالمساعد الذكي.';
    }
}

export async function analyzeText(text: string, task: 'summarize' | 'improve'): Promise<string> {
    try {
        const apiKey = process.env.GEMINI_API_KEY || import.meta.env.VITE_GEMINI_API_KEY;
        if (!apiKey) {
            return text;
        }
        
        const ai = new GoogleGenAI({ apiKey });
        const prompt = task === 'summarize' 
            ? `قم بتلخيص النص التالي بإيجاز:\n\n${text}`
            : `قم بتحسين صياغة النص التالي ليكون احترافياً:\n\n${text}`;
            
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: {
                systemInstruction: 'أنت مساعد ذكي محترف. أجب باللغة العربية دائماً.',
            }
        });
        
        return response.text || text;
    } catch (error) {
        console.error('Gemini API Error:', error);
        return text;
    }
}
