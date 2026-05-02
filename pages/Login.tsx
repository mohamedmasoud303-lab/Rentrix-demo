
import React, { useState } from 'react';
import { useApp } from '../contexts/AppContext';
import { User, Lock, ShieldCheck, ArrowLeft } from 'lucide-react';

const Login: React.FC = () => {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { auth, db } = useApp();
  const settings = db.settings;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    try {
      const res = await auth.login(username, password);
      if (!res.ok) {
        setError(res.msg);
      }
      // On success, App component will redirect automatically
    } catch (err) {
      console.error("Login error:", err);
      setError('حدث خطأ غير متوقع أثناء تسجيل الدخول.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md mx-auto bg-card rounded-2xl shadow-brand-lg border border-border">
        
        <div className="p-8 md:p-12">
            <div className="mb-10 text-center">
                <div className="w-16 h-16 bg-primary-light rounded-2xl flex items-center justify-center mb-6 mx-auto">
                    <ShieldCheck className="w-10 h-10 text-primary" />
                </div>
                <h1 className="text-3xl font-black text-heading mb-2">تسجيل الدخول للنظام</h1>
                <p className="text-muted-foreground font-medium">{settings?.company?.name || 'أدخل بياناتك للوصول للوحة التحكم'}</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-6">
                <div className="space-y-2">
                    <label htmlFor="username-field" className="text-sm font-bold text-muted-foreground mr-1">اسم المستخدم</label>
                    <div className="relative group">
                        <User className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                        <input
                            id="username-field"
                            name="username"
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="input-field pr-12 pl-4 py-3"
                            placeholder="اسم المستخدم"
                            autoComplete="username"
                            required
                        />
                    </div>
                </div>
                
                <div className="space-y-2">
                    <label htmlFor="password-field" className="text-sm font-bold text-muted-foreground mr-1">كلمة المرور</label>
                    <div className="relative group">
                        <Lock className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                        <input
                            id="password-field"
                            name="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="input-field pr-12 pl-4 py-3 dir-ltr text-right"
                            placeholder="••••••••"
                            autoComplete="current-password"
                            required
                        />
                    </div>
                </div>
                
                {error && (
                    <div className="bg-danger-foreground text-danger text-sm font-bold p-3 rounded-md flex items-center justify-center gap-3">
                        {error}
                    </div>
                )}
                
                <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full btn bg-primary text-primary-foreground hover:bg-primary/90 py-3.5 text-base flex items-center justify-center gap-3"
                >
                    {isLoading ? (
                        <>
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            جاري التحقق...
                        </>
                    ) : (
                        <>
                            تسجيل الدخول الآمن
                            <ArrowLeft className="w-5 h-5" />
                        </>
                    )}
                </button>
            </form>
        </div>
        <div className="text-center text-xs text-muted-foreground p-4 border-t border-border">
             <p dir="ltr">© 2024 Rentrix ERP | Masoud Apps</p>
        </div>
      </div>
    </div>
  );
};

export default Login;
