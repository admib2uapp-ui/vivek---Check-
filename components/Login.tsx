import React, { useState } from 'react';
import { User, UserRole } from '../types';
import { Shield, Mail, Lock, Loader2, ChevronRight, AlertCircle } from 'lucide-react';
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../services/firebase';

interface LoginProps {
  onLogin: (user: User) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isResetMode, setIsResetMode] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;
      
      // The actual role will be fetched in App.tsx from Firestore after this callback
      onLogin({
        uid: firebaseUser.uid,
        name: firebaseUser.displayName || email.split('@')[0],
        email: firebaseUser.email || '',
        role: 'COLLECTOR' // Default, will be updated by App.tsx observer
      });
    } catch (err: any) {
      setError(err.message || 'Invalid email or password');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setMessage(null);
    try {
      await sendPasswordResetEmail(auth, email);
      setMessage('Password reset link has been sent to your email.');
      setTimeout(() => setIsResetMode(false), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to send reset email');
    } finally {
      setIsLoading(false);
    }
  };

  const inputClass = "w-full pl-10 pr-4 py-3 rounded-xl border-2 border-brand-100 dark:border-slate-700 bg-brand-50 dark:bg-slate-800 text-brand-900 dark:text-slate-100 outline-none focus:border-brand-500 transition-all";

  return (
    <div className="min-h-screen flex items-center justify-center bg-brand-50 dark:bg-slate-950 p-4 transition-colors">
      <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-3xl shadow-2xl p-8 border border-brand-100 dark:border-slate-800">
        <div className="text-center mb-10">
          <div className="inline-flex p-4 bg-brand-100 dark:bg-brand-900/30 rounded-2xl mb-4">
            <Shield className="text-brand-600 dark:text-brand-400" size={32} />
          </div>
          <h1 className="text-4xl font-extrabold text-brand-900 dark:text-slate-100 tracking-tight">DistriFin</h1>
          <p className="text-brand-500 dark:text-slate-400 mt-2 font-medium">
            {isResetMode ? 'Reset your account password' : 'Secure distribution finance management'}
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl flex items-center text-sm border border-red-100 dark:border-red-900/30">
            <AlertCircle size={18} className="mr-2 shrink-0" />
            {error}
          </div>
        )}

        {message && (
          <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-xl flex items-center text-sm border border-green-100 dark:border-green-900/30">
            <AlertCircle size={18} className="mr-2 shrink-0" />
            {message}
          </div>
        )}

        <form onSubmit={isResetMode ? handleResetPassword : handleLogin} className="space-y-5">
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-400" size={20} />
            <input 
              required 
              type="email" 
              placeholder="Email Address" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
            />
          </div>

          {!isResetMode && (
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-400" size={20} />
              <input 
                required 
                type="password" 
                placeholder="Password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputClass}
              />
            </div>
          )}

          <button
            disabled={isLoading}
            type="submit"
            className="w-full flex items-center justify-center py-4 bg-brand-600 text-white rounded-xl font-bold shadow-lg shadow-brand-500/30 hover:bg-brand-700 active:scale-95 transition-all disabled:opacity-50 disabled:active:scale-100"
          >
            {isLoading ? (
              <Loader2 className="animate-spin mr-2" />
            ) : isResetMode ? (
              'Send Reset Link'
            ) : (
              <>Sign In <ChevronRight size={18} className="ml-1" /></>
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button 
            onClick={() => setIsResetMode(!isResetMode)}
            className="text-sm font-bold text-brand-600 dark:text-brand-400 hover:underline"
          >
            {isResetMode ? 'Back to Login' : 'Forgot your password?'}
          </button>
        </div>
        
        <div className="mt-12 text-center text-[10px] text-gray-300 dark:text-slate-600">
          Powered by Firebase Authentication
        </div>
      </div>
    </div>
  );
};

export default Login;