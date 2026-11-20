import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useAccessibility } from '../context/AccessibilityContext';
import { Language } from '../utils/translations';
import { LogOut, Sun, Moon, Volume2, Globe } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const Header: React.FC = () => {
  const { user, logout } = useAuth();
  const { language, setLanguage, highContrast, setHighContrast, t } = useAccessibility();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-200 shadow-sm px-4 sm:px-6 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* App Logo & Title */}
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
          <img src="/pill-logo.svg" alt="MediCare Logo" className="w-10 h-10 sm:w-12 sm:h-12 flex-shrink-0" />
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-blue-900 leading-tight tracking-tight">
              {t('appName')}
            </h1>
            <p className="hidden sm:block text-xs font-semibold text-slate-500">
              {user?.role === 'caregiver' ? 'Caregiver Dashboard' : 'Senior Portal'}
            </p>
          </div>
        </div>

        {/* Right side controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Language Switcher */}
          <div className="flex items-center bg-slate-100 rounded-xl p-1 border border-slate-200">
            <Globe className="w-5 h-5 text-slate-500 ml-1 mr-1 hidden sm:block" />
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as Language)}
              aria-label="Select Language"
              className="bg-transparent font-bold text-slate-700 text-sm sm:text-base py-1 px-1 sm:px-2 rounded-lg cursor-pointer focus:outline-none"
            >
              <option value="en">English</option>
              <option value="hi">हिंदी (Hindi)</option>
              <option value="te">తెలుగు (Telugu)</option>
            </select>
          </div>

          {/* High Contrast Toggle */}
          <button
            onClick={() => setHighContrast(!highContrast)}
            aria-label="Toggle High Contrast"
            title="Toggle High Contrast"
            className={`p-2 sm:p-2.5 rounded-xl border font-bold text-sm flex items-center gap-1 transition ${
              highContrast
                ? 'bg-yellow-400 text-black border-yellow-500'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
            }`}
          >
            {highContrast ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>

          {/* User info & Logout */}
          {user && (
            <div className="flex items-center gap-2">
              <span className="hidden md:inline-block text-base font-semibold text-slate-700 max-w-[140px] truncate">
                {user.full_name}
              </span>
              <button
                onClick={handleLogout}
                className="p-2 sm:py-2 sm:px-3 rounded-xl bg-slate-100 hover:bg-red-50 hover:text-red-600 text-slate-600 font-bold border border-slate-200 text-sm flex items-center gap-1 transition"
                title="Log Out"
              >
                <LogOut className="w-5 h-5" />
                <span className="hidden sm:inline">{t('logout')}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

