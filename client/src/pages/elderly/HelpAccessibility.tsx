import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useAccessibility } from '../../context/AccessibilityContext';
import { Language } from '../../utils/translations';
import { api } from '../../services/api';
import { Type, Moon, Volume2, Globe, Shield, PhoneCall, Check, UserCheck } from 'lucide-react';
import { SosButton } from '../../components/SosButton';

export const HelpAccessibility: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const {
    language,
    setLanguage,
    textSize,
    setTextSize,
    highContrast,
    setHighContrast,
    voiceEnabled,
    setVoiceEnabled,
    t,
  } = useAccessibility();

  const [linkCodeInput, setLinkCodeInput] = useState('');
  const [linking, setLinking] = useState(false);
  const [linkMessage, setLinkMessage] = useState('');
  const [linkError, setLinkError] = useState('');

  const handleLinkCaregiver = async (e: React.FormEvent) => {
    e.preventDefault();
    setLinking(true);
    setLinkMessage('');
    setLinkError('');

    try {
      await api.request('/auth/link/enter', {
        method: 'POST',
        body: JSON.stringify({ code: linkCodeInput }),
      });
      setLinkMessage('Caregiver linked successfully!');
      setLinkCodeInput('');
      await refreshUser();
    } catch (err: any) {
      setLinkError(err.message || 'Failed to link caregiver');
    } finally {
      setLinking(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 pb-28 space-y-6">
      <SosButton />

      <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200">
        <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
          {t('helpTab')}
        </h2>
        <p className="text-lg sm:text-xl font-bold text-slate-600 mt-1">
          Adjust visual comfort, voice assistance, and caregiver connection
        </p>
      </div>

      {/* ACCESSIBILITY CONTROLS */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200 space-y-6">
        <h3 className="text-2xl sm:text-3xl font-black text-slate-900">Accessibility Controls</h3>

        {/* Text Size */}
        <div>
          <label className="flex items-center gap-2 text-xl font-bold text-slate-800 mb-3">
            <Type className="w-6 h-6 text-blue-600" />
            <span>{t('textSize')}</span>
          </label>
          <div className="grid grid-cols-3 gap-3">
            {[
              { id: 'normal', label: t('normal'), preview: 'Aa' },
              { id: 'large', label: t('large'), preview: 'Aa' },
              { id: 'xlarge', label: t('extraLarge'), preview: 'Aa' },
            ].map((s) => (
              <button
                key={s.id}
                onClick={() => setTextSize(s.id as any)}
                className={`min-h-[64px] p-4 rounded-2xl border-3 flex flex-col items-center justify-center gap-1 transition ${
                  textSize === s.id
                    ? 'border-blue-600 bg-blue-50 text-blue-950 font-black ring-2 ring-blue-300'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700 font-bold'
                }`}
              >
                <span className={`font-black ${s.id === 'xlarge' ? 'text-3xl' : s.id === 'large' ? 'text-2xl' : 'text-xl'}`}>
                  {s.preview}
                </span>
                <span className="text-base">{s.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* High Contrast Mode Toggle */}
        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-200">
          <div className="flex items-center gap-3">
            <Moon className="w-7 h-7 text-amber-500" />
            <div>
              <h4 className="text-xl font-bold text-slate-900">{t('highContrast')}</h4>
              <p className="text-sm font-semibold text-slate-500">Maximum contrast dark mode for clarity</p>
            </div>
          </div>
          <button
            onClick={() => setHighContrast(!highContrast)}
            className={`min-h-[50px] px-6 rounded-xl font-black text-lg transition ${
              highContrast ? 'bg-yellow-400 text-black border-2 border-yellow-500 shadow-sm' : 'bg-slate-200 text-slate-700'
            }`}
          >
            {highContrast ? t('on') : t('off')}
          </button>
        </div>

        {/* Voice Read-Aloud Toggle */}
        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-200">
          <div className="flex items-center gap-3">
            <Volume2 className="w-7 h-7 text-blue-600" />
            <div>
              <h4 className="text-xl font-bold text-slate-900">{t('voiceReadAloud')}</h4>
              <p className="text-sm font-semibold text-slate-500">Speaks reminder pills and instructions aloud</p>
            </div>
          </div>
          <button
            onClick={() => setVoiceEnabled(!voiceEnabled)}
            className={`min-h-[50px] px-6 rounded-xl font-black text-lg transition ${
              voiceEnabled ? 'bg-blue-600 text-white shadow-sm' : 'bg-slate-200 text-slate-700'
            }`}
          >
            {voiceEnabled ? t('on') : t('off')}
          </button>
        </div>

        {/* Language Selection */}
        <div>
          <label className="flex items-center gap-2 text-xl font-bold text-slate-800 mb-3">
            <Globe className="w-6 h-6 text-blue-600" />
            <span>{t('language')}</span>
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { id: 'en', label: 'English' },
              { id: 'hi', label: 'हिंदी (Hindi)' },
              { id: 'te', label: 'తెలుగు (Telugu)' },
            ].map((l) => (
              <button
                key={l.id}
                onClick={() => setLanguage(l.id as Language)}
                className={`min-h-[60px] p-3 rounded-2xl border-3 font-bold text-lg transition ${
                  language === l.id
                    ? 'border-blue-600 bg-blue-50 text-blue-950 font-black ring-2 ring-blue-300'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                {l.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* CAREGIVER LINKING SECTION */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200 space-y-6">
        <h3 className="text-2xl sm:text-3xl font-black text-slate-900 flex items-center gap-2">
          <Shield className="w-8 h-8 text-blue-600" />
          <span>Caregiver Connection</span>
        </h3>

        {user?.linkedCaregiver ? (
          <div className="p-6 bg-green-50 rounded-2xl border-2 border-green-300 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center text-green-700">
                <UserCheck className="w-8 h-8" />
              </div>
              <div>
                <h4 className="text-2xl font-black text-green-950">
                  {user.linkedCaregiver.full_name}
                </h4>
                <p className="text-base font-bold text-green-800">
                  {user.linkedCaregiver.email} • {user.linkedCaregiver.phone_number || 'Phone saved'}
                </p>
                <span className="inline-block mt-1 px-3 py-0.5 rounded-full bg-green-200 text-green-900 text-xs font-black uppercase">
                  Connected & Monitoring
                </span>
              </div>
            </div>

            {user.linkedCaregiver.phone_number && (
              <a
                href={`tel:${user.linkedCaregiver.phone_number}`}
                className="px-5 py-3 rounded-xl bg-green-600 text-white font-bold text-lg flex items-center gap-2 shadow no-underline"
              >
                <PhoneCall className="w-5 h-5" />
                <span>Call Caregiver</span>
              </a>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-5 bg-amber-50 rounded-2xl border border-amber-200">
              <h4 className="text-lg font-bold text-amber-900">Your 6-Digit Link Code</h4>
              <p className="text-sm text-amber-800 mt-0.5">Share this code with your caregiver:</p>
              <div className="mt-2 text-3xl sm:text-4xl font-mono font-black text-blue-700 tracking-wider">
                {user?.link_code || '654321'}
              </div>
            </div>

            {linkMessage && (
              <div className="p-4 bg-green-50 border border-green-300 text-green-800 font-bold rounded-xl">
                {linkMessage}
              </div>
            )}
            {linkError && (
              <div className="p-4 bg-red-50 border border-red-300 text-red-800 font-bold rounded-xl">
                {linkError}
              </div>
            )}

            <form onSubmit={handleLinkCaregiver} className="space-y-3">
              <label className="block text-slate-800 text-lg font-bold">
                Or enter caregiver's 6-digit code:
              </label>
              <div className="flex gap-3">
                <input
                  type="text"
                  maxLength={6}
                  value={linkCodeInput}
                  onChange={(e) => setLinkCodeInput(e.target.value)}
                  placeholder="e.g. 123456"
                  className="flex-1 text-2xl font-mono font-bold p-3.5 rounded-2xl border-2 border-slate-300 focus:border-blue-600 outline-none text-center tracking-widest"
                />
                <button
                  type="submit"
                  disabled={linking || linkCodeInput.length !== 6}
                  className="px-6 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-lg shadow-md transition disabled:opacity-50"
                >
                  {linking ? 'Linking...' : t('linkAccount')}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

