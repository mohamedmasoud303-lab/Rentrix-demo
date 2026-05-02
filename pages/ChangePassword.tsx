
import React, { useState } from 'react';
import { useApp } from '../contexts/AppContext';

const ChangePassword: React.FC = () => {
// FIX: Destructure currentUser directly from useApp context.
  const { auth, currentUser } = useApp();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError('كلمتا المرور غير متطابقتين.');
      return;
    }
    if (newPassword.length < 3) {
      setError('يجب أن تكون كلمة المرور ٣ أحرف على الأقل.');
      return;
    }
    // Simple check to prevent using the default password again
    if (newPassword === '123') {
      setError('لا يمكن استخدام كلمة المرور الافتراضية.');
      return;
    }

    setIsLoading(true);
    setError('');

// FIX: Use currentUser from context, not from auth object.
    if (currentUser) {
// FIX: Use currentUser from context, not from auth object.
      const result = await auth.changePassword(currentUser.id, newPassword);
      if (!result.ok) {
        setError('حدث خطأ أثناء تغيير كلمة المرور.');
        setIsLoading(false);
      }
      // On success, App.tsx will automatically re-render and navigate to the dashboard
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/10 p-4">
      <div className="max-w-md w-full bg-card shadow-lg rounded-2xl p-8 border border-border/50 animate-in zoom-in-95 duration-500">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-black text-heading">تغيير كلمة المرور</h1>
          <p className="text-muted-foreground mt-2 text-sm">
            لأسباب أمنية، يجب عليك تغيير كلمة المرور الافتراضية قبل المتابعة.
          </p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-heading mb-2" htmlFor="newPassword">
              كلمة المرور الجديدة
            </label>
            <input
              id="newPassword"
              type="password"
              className="input-field dir-ltr text-right"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-heading mb-2" htmlFor="confirmPassword">
              تأكيد كلمة المرور الجديدة
            </label>
            <input
              id="confirmPassword"
              type="password"
              className="input-field dir-ltr text-right"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>
          {error && <p className="text-danger text-sm text-center font-bold">{error}</p>}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full btn bg-primary text-primary-foreground hover:bg-primary/90 mt-6"
          >
            {isLoading ? 'جاري الحفظ...' : 'حفظ وتأكيد'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChangePassword;
