import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { UserPlus, UserCheck, Shield } from 'lucide-react';
import { UserRole } from '../types';

export const Register: React.FC = () => {
  const [role, setRole] = useState<UserRole>('elderly');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [emergencyContactName, setEmergencyContactName] = useState('');
  const [emergencyContactPhone, setEmergencyContactPhone] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const user = await register({
        email,
        password,
        full_name: fullName,
        role,
        phone_number: phone,
        emergency_contact_name: emergencyContactName,
        emergency_contact_phone: emergencyContactPhone,
      });

      if (user.role === 'caregiver') {
        navigate('/caregiver/dashboard');
      } else {
        navigate('/elderly/today');
      }
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center p-4">
      <div className="w-full max-w-xl bg-white rounded-3xl p-6 sm:p-10 shadow-2xl border border-slate-200">
        <div className="text-center mb-8">
          <img src="/pill-logo.svg" alt="MediCare Logo" className="w-16 h-16 mx-auto mb-2" />
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">Create Account</h2>
          <p className="text-lg text-slate-600 mt-1 font-medium">Join MediCare Assist</p>
        </div>

        {/* Role Selector Tabs */}
        <div className="grid grid-cols-2 gap-3 mb-6 p-1.5 bg-slate-100 rounded-2xl">
          <button
            type="button"
            onClick={() => setRole('elderly')}
            className={`min-h-[56px] py-3 px-4 rounded-xl font-extrabold text-base sm:text-lg flex items-center justify-center gap-2 transition ${
              role === 'elderly'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-700 hover:bg-slate-200'
            }`}
          >
            <UserCheck className="w-6 h-6" />
            <span>Elderly User</span>
          </button>

          <button
            type="button"
            onClick={() => setRole('caregiver')}
            className={`min-h-[56px] py-3 px-4 rounded-xl font-extrabold text-base sm:text-lg flex items-center justify-center gap-2 transition ${
              role === 'caregiver'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Shield className="w-6 h-6" />
            <span>Caregiver</span>
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 border-2 border-red-300 text-red-800 font-bold text-base">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-slate-800 text-base font-bold mb-1">Full Name</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. Margaret Miller"
              required
              className="w-full text-lg p-3.5 rounded-2xl border-2 border-slate-300 focus:border-blue-600 focus:ring-4 focus:ring-blue-100 outline-none transition font-medium"
            />
          </div>

          <div>
            <label className="block text-slate-800 text-base font-bold mb-1">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. name@example.com"
              required
              className="w-full text-lg p-3.5 rounded-2xl border-2 border-slate-300 focus:border-blue-600 focus:ring-4 focus:ring-blue-100 outline-none transition font-medium"
            />
          </div>

          <div>
            <label className="block text-slate-800 text-base font-bold mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
              required
              minLength={6}
              className="w-full text-lg p-3.5 rounded-2xl border-2 border-slate-300 focus:border-blue-600 focus:ring-4 focus:ring-blue-100 outline-none transition font-medium"
            />
          </div>

          <div>
            <label className="block text-slate-800 text-base font-bold mb-1">Phone Number</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. +1 (555) 000-0000"
              className="w-full text-lg p-3.5 rounded-2xl border-2 border-slate-300 focus:border-blue-600 focus:ring-4 focus:ring-blue-100 outline-none transition font-medium"
            />
          </div>

          {role === 'elderly' && (
            <div className="pt-2 border-t border-slate-200">
              <h4 className="text-base font-bold text-slate-900 mb-2">Emergency Contact / Caregiver Phone</h4>
              <div className="space-y-3">
                <input
                  type="text"
                  value={emergencyContactName}
                  onChange={(e) => setEmergencyContactName(e.target.value)}
                  placeholder="Contact Name (e.g. Dr. Priya / Daughter)"
                  className="w-full text-base p-3 rounded-xl border border-slate-300 font-medium"
                />
                <input
                  type="tel"
                  value={emergencyContactPhone}
                  onChange={(e) => setEmergencyContactPhone(e.target.value)}
                  placeholder="Emergency Phone Number"
                  className="w-full text-base p-3 rounded-xl border border-slate-300 font-medium"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full min-h-[64px] mt-4 py-4 px-6 rounded-2xl bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white font-extrabold text-xl shadow-xl shadow-blue-600/30 flex items-center justify-center gap-2 transition disabled:opacity-60"
          >
            <UserPlus className="w-6 h-6" />
            <span>{loading ? 'Creating Account...' : 'Register Account'}</span>
          </button>
        </form>

        <div className="mt-6 text-center text-slate-600 text-base font-semibold">
          Already registered?{' '}
          <Link to="/login" className="text-blue-600 hover:underline font-bold">
            Sign In Here
          </Link>
        </div>
      </div>
    </div>
  );
};

