import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useApp } from '../../contexts/AppContext';
import { Sparkles, Bot, User, X, Send } from 'lucide-react';
import { queryAssistant } from '../../services/geminiService';
import { ContractBalance } from '../../types';

interface Message {
    sender: 'user' | 'ai' | 'error';
    text: string;
}

const SmartAssistant: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-6 left-6 bg-primary text-white w-14 h-14 rounded-full shadow-lg flex items-center justify-center z-50 hover:scale-110 active:scale-95 transition-transform"
                aria-label="افتح المساعد الذكي"
            >
                <Sparkles size={24} />
            </button>
            {isOpen && <AssistantModal onClose={() => setIsOpen(false)} />}
        </>
    );
};

const AssistantModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    const { db } = useApp();
    const [messages, setMessages] = useState<Message[]>([
        { sender: 'ai', text: 'أهلاً بك! أنا مساعدك الذكي. كيف يمكنني مساعدتك في تحليل بياناتك اليوم؟' }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(scrollToBottom, [messages]);

    const contextData = useMemo(() => {
        if (!db.tenants.length) return null;

        const { tenants, units, contracts, properties, receipts, contractBalances } = db;

        const totalCollected = receipts.filter(r => r.status === 'POSTED').reduce((s, r) => s + r.amount, 0);
        const rentedUnitsCount = new Set(contracts.filter(c => c.status === 'ACTIVE').map(c => c.unitId)).size;

        return {
            tenants: tenants.slice(0, 50).map(t => ({ id: t.id, name: t.name, status: t.status })),
            units: units.slice(0, 50).map(u => ({ id: u.id, name: u.name, isRented: contracts.some(c => c.unitId === u.id && c.status === 'ACTIVE') })),
            kpis: {
                totalProperties: properties.length,
                occupancyRate: units.length > 0 ? (rentedUnitsCount / units.length) * 100 : 0,
                totalCollected,
                // FIX: Use db.contractBalances (an array) directly to avoid type inference issues with Object.values.
                totalArrears: contractBalances.reduce((s, c) => s + (c.balance > 0 ? c.balance : 0), 0),
            },
        };
    }, [db]);


    const handleSend = async () => {
        if (!input.trim() || isLoading || !contextData) return;

        const userMessage: Message = { sender: 'user', text: input };
        setMessages(prev => [...prev, userMessage]);
        const currentInput = input;
        setInput('');
        setIsLoading(true);

        try {
            const responseText = await queryAssistant(currentInput, JSON.stringify(contextData));
            setMessages(prev => [...prev, { sender: 'ai', text: responseText }]);
        } catch (error) {
            setMessages(prev => [...prev, { sender: 'error', text: "حدث خطأ في الاتصال بالمساعد الذكي." }]);
        } finally {
            setIsLoading(false);
        }
    };
    
    return (
        <div className="fixed bottom-0 left-0 right-0 sm:bottom-24 sm:left-6 sm:right-auto w-full sm:w-96 h-[80vh] sm:h-[60vh] bg-card shadow-2xl rounded-t-2xl sm:rounded-lg z-[100] flex flex-col border border-border">
            <header className="flex justify-between items-center p-4 border-b border-border bg-primary text-white rounded-t-2xl sm:rounded-t-lg">
                <div className="flex items-center gap-2">
                    <Bot size={20} />
                    <h3 className="font-bold">المساعد الذكي</h3>
                </div>
                <button onClick={onClose} className="hover:bg-white/20 p-1 rounded-full"><X size={20} /></button>
            </header>
            <main className="flex-1 overflow-y-auto p-4 space-y-4 bg-background/50">
                {messages.map((msg, index) => (
                    <div key={index} className={`flex items-start gap-2.5 ${msg.sender === 'user' ? 'justify-end' : ''}`}>
                         {msg.sender !== 'user' && <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0 text-white"><Bot size={16}/></div>}
                        <div className={`p-3 rounded-2xl max-w-[85%] text-sm shadow-sm ${
                            msg.sender === 'ai' ? 'bg-card text-text border border-border rounded-tr-none' :
                            msg.sender === 'user' ? 'bg-primary text-white rounded-tl-none' :
                            'bg-danger/10 text-danger border border-danger/20'
                        }`}>
                            <p>{msg.text}</p>
                        </div>
                    </div>
                ))}
                 {isLoading && (
                    <div className="flex items-start gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white"><Bot size={16}/></div>
                        <div className="p-3 bg-card border border-border rounded-2xl rounded-tr-none">
                           <div className="flex gap-1">
                                <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce"></div>
                                <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce [animation-delay:0.2s]"></div>
                                <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce [animation-delay:0.4s]"></div>
                           </div>
                        </div>
                    </div>
                 )}
                <div ref={messagesEndRef} />
            </main>
            <footer className="p-4 border-t border-border bg-card">
                <div className="relative flex gap-2">
                    <input
                        type="text"
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyPress={e => e.key === 'Enter' && handleSend()}
                        placeholder="اسأل عن أي شيء..."
                        className="flex-1 rounded-full border border-border bg-background py-2 px-4 focus:ring-2 focus:ring-primary outline-none"
                    />
                    <button 
                        onClick={handleSend} 
                        disabled={isLoading || !input.trim()} 
                        className="bg-primary text-white p-2 rounded-full disabled:opacity-50"
                    >
                        <Send size={18} />
                    </button>
                </div>
            </footer>
        </div>
    );
};

export default SmartAssistant;