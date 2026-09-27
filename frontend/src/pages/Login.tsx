import React, { useState } from 'react';
import { MapPin, AlertCircle, Eye, EyeOff, RefreshCw } from 'lucide-react';
import { apiClient } from '../api/client';

interface LoginProps {
  onLoginSuccess: (user: any, token: string) => void;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !EMAIL_REGEX.test(trimmedEmail) || !password) {
      setErrorMessage('Enter a valid email and password.');
      return;
    }

    setLoading(true);
    try {
      const res = await apiClient.login(trimmedEmail, password);
      if (res && res.success && res.token && res.user) {
        localStorage.setItem('cadastral_auth_token', res.token);
        localStorage.setItem('cadastral_auth_user', JSON.stringify(res.user));
        onLoginSuccess(res.user, res.token);
      } else {
        setErrorMessage(res?.message || 'Enter a valid email and password.');
      }
    } catch (err: any) {
      if (
        err.detail === 'Unable to connect to authentication server.' || 
        err.message === 'Unable to connect to authentication server.'
      ) {
        setErrorMessage('Unable to connect to authentication server.');
      } else {
        setErrorMessage(err.detail || err.message || 'Enter a valid email and password.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const res = await apiClient.loginGoogle();
      if (res && res.token && res.user) {
        localStorage.setItem('cadastral_auth_token', res.token);
        localStorage.setItem('cadastral_auth_user', JSON.stringify(res.user));
        onLoginSuccess(res.user, res.token);
      } else {
        setErrorMessage('Google authentication failed.');
      }
    } catch (err: any) {
      if (
        err.detail === 'Unable to connect to authentication server.' || 
        err.message === 'Unable to connect to authentication server.'
      ) {
        setErrorMessage('Unable to connect to authentication server.');
      } else {
        setErrorMessage(err.detail || err.message || 'Google authentication failed.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center px-4 select-none">
      <div className="w-full max-w-md bg-transparent p-6 sm:p-8 flex flex-col items-center">
        {/* Blue Pin Logo */}
        <div className="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/30 mb-5">
          <MapPin className="w-8 h-8 fill-white" />
        </div>

        {/* Title and Subtitle */}
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-1 text-center">
          UrbanCadastral
        </h1>
        <p className="text-sm font-medium text-slate-500 mb-6 text-center">
          AI-Powered Land Intelligence
        </p>

        {/* Error Message */}
        {errorMessage && (
          <div className="w-full mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold rounded-xl flex items-center justify-between animate-in fade-in">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <button
              type="button"
              onClick={() => setErrorMessage(null)}
              className="text-rose-500 hover:text-rose-800 ml-2 font-bold cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {/* Info Message */}
        {infoMessage && (
          <div className="w-full mb-4 p-3 bg-blue-50 border border-blue-200 text-blue-800 text-xs font-semibold rounded-xl flex items-center justify-between animate-in fade-in">
            <span>{infoMessage}</span>
            <button onClick={() => setInfoMessage(null)} className="text-blue-500 hover:text-blue-800 ml-2 cursor-pointer">✕</button>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="w-full space-y-4">
          {/* Email Address */}
          <div>
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
              EMAIL ADDRESS
            </label>
            <div className="relative">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="user@example.com"
                className="w-full px-3.5 py-3 rounded-xl border border-slate-200 bg-white text-slate-800 text-sm font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-300"
              />
            </div>
          </div>

          {/* Password with Forgot & Show/Hide */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                PASSWORD
              </label>
              <button
                type="button"
                onClick={() => setInfoMessage('Password reset link sent to registered institutional email.')}
                className="text-[11px] font-bold text-blue-600 uppercase hover:underline tracking-wider cursor-pointer"
              >
                FORGOT?
              </button>
            </div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="Enter your password"
                className="w-full pl-3.5 pr-10 py-3 rounded-xl border border-slate-200 bg-white text-slate-800 text-sm font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-300"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none p-1 cursor-pointer"
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Sign In Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-md shadow-blue-500/25 transition-all flex items-center justify-center space-x-2 active:scale-[0.99] disabled:opacity-60 cursor-pointer"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                  <span>Authenticating...</span>
                </>
              ) : (
                <span>Sign In</span>
              )}
            </button>
          </div>
        </form>

        {/* OR Divider */}
        <div className="w-full flex items-center my-6">
          <div className="flex-1 border-t border-slate-200"></div>
          <span className="px-3 text-xs font-semibold text-slate-400 uppercase tracking-widest">OR</span>
          <div className="flex-1 border-t border-slate-200"></div>
        </div>

        {/* Continue with Google */}
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full py-3 px-4 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium rounded-xl shadow-sm transition-all flex items-center justify-center space-x-3 active:scale-[0.99] disabled:opacity-60 cursor-pointer"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          <span className="text-sm font-semibold text-slate-700">Continue with Google</span>
        </button>

        {/* Footer link */}
        <div className="mt-8 text-center text-xs text-slate-500">
          <span>Don't have an account? </span>
          <button
            onClick={() => setInfoMessage('Access request submitted for institutional cadastre deployment review.')}
            className="font-bold text-blue-600 hover:underline cursor-pointer"
          >
            Request Access
          </button>
        </div>
      </div>
    </div>
  );
};
