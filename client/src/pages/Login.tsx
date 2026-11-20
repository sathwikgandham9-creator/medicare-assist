import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogIn, Sparkles, UserCheck, Shield } from 'lucide-react';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const user = await login(email, password);
      if (user.role === 'caregiver') {
        navigate('/caregiver/dashboard');
      } else {
        navigate('/elderly/today');
      }
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const fillDemoCaregiver = () => {
    setEmail('caregiver@medicare.com');
    setPassword('password123');
  };

  const fillDemoElderly = () => {
    setEmail('grandma@medicare.com');
    setPassword('password123');
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center p-4">
      <div className="w-full max-w-xl bg-white rounded-3xl p-6 sm:p-10 shadow-2xl border border-slate-200">
        {/* Header */}
        <div className="text-center mb-8">
          <img src="/pill-logo.svg" alt="MediCare Logo" className="w-20 h-20 mx-auto mb-3" />
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">Welcome Back</h2>
          <p className="text-lg text-slate-600 mt-2 font-medium">
            Sign in to your MediCare Assist account
          </p>
        </div>

        {/* 1-Click Demo Login Panel */}
        <div className="mb-8 p-5 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border-2 border-blue-200">
          <div className="flex items-center gap-2 text-blue-900 font-extrabold text-lg mb-3">
            <Sparkles className="w-6 h-6 text-amber-500 fill-amber-400" />
            <span>1-Click Demo Logins (Ready to Test):</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={fillDemoCaregiver}
              className="p-3.5 bg-white hover:bg-blue-100/70 border-2 border-blue-300 rounded-xl text-left transition shadow-sm group"
            >
              <div className="flex items-center gap-2 text-blue-900 font-bold text-base">
                <Shield className="w-5 h-5 text-blue-600" />
                <span>Caregiver Account</span>
              </div>
              <div className="text-xs text-slate-500 mt-1">Dr. Priya Sharma</div>
              <div className="text-xs font-mono text-slate-600">caregiver@medicare.com</div>
            </button>

            <button
              type="button"
              onClick={fillDemoElderly}
              className="p-3.5 bg-white hover:bg-emerald-100/70 border-2 border-emerald-300 rounded-xl text-left transition shadow-sm group"
            >
              <div className="flex items-center gap-2 text-emerald-900 font-bold text-base">
                <UserCheck className="w-5 h-5 text-emerald-600" />
                <span>Elderly Patient</span>
              </div>
              <div className="text-xs text-slate-500 mt-1">Margaret (Grandma)</div>
              <div className="text-xs font-mono text-slate-600">grandma@medicare.com</div>
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 border-2 border-red-300 text-red-800 font-bold text-base">
            {error}
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-slate-800 text-lg font-bold mb-2">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. caregiver@medicare.com"
              required
              className="w-full text-lg p-4 rounded-2xl border-2 border-slate-300 focus:border-blue-600 focus:ring-4 focus:ring-blue-100 outline-none transition font-medium"
            />
          </div>

          <div>
            <label className="block text-slate-800 text-lg font-bold mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full text-lg p-4 rounded-2xl border-2 border-slate-300 focus:border-blue-600 focus:ring-4 focus:ring-blue-100 outline-none transition font-medium"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full min-h-[64px] py-4 px-6 rounded-2xl bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white font-extrabold text-xl shadow-xl shadow-blue-600/30 flex items-center justify-center gap-2 transition disabled:opacity-60"
          >
            <LogIn className="w-6 h-6" />
            <span>{loading ? 'Signing in...' : 'Sign In'}</span>
          </button>
        </form>

        <div className="mt-8 text-center text-slate-600 text-base font-semibold">
          Don't have an account yet?{' '}
          <Link to="/register" className="text-blue-600 hover:underline font-bold">
            Create an Account
          </Link>
        </div>
      </div>
    </div>
  );
};

