import React, { useState, useEffect } from 'react';
import { CaregiverNav } from '../../components/CaregiverNav';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { CaregiverSettings } from '../../types';
import {
  Settings,
  Sparkles,
  Zap,
  RotateCcw,
  Save,
  CheckCircle,
  AlertTriangle,
  Sliders,
  BellRing,
} from 'lucide-react';

export const CaregiverSettingsPage: React.FC = () => {
  const { activePatientId } = useAuth();
  const [settings, setSettings] = useState<CaregiverSettings>({
    grace_period_minutes: 30,
    level2_minutes: 5,
    level3_minutes: 10,
    level4_minutes: 20,
    critical_level4_minutes: 10,
    max_snoozes: 3,
    pre_remind_miss_prone: 1,
    time_acceleration: 1,
  });

  const [acceleration, setAcceleration] = useState<number>(1);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [demoMsg, setDemoMsg] = useState('');

  const fetchSettings = async () => {
    try {
      const url = activePatientId
        ? `/caregiver/settings?patient_id=${activePatientId}`
        : '/caregiver/settings';
      const res = await api.request<{ settings: CaregiverSettings }>(url);
      setSettings(res.settings);
      setAcceleration(res.settings.time_acceleration || 1);
    } catch (err) {
      console.error('Failed to load settings:', err);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, [activePatientId]);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveMsg('');

    try {
      const url = activePatientId
        ? `/caregiver/settings?patient_id=${activePatientId}`
        : '/caregiver/settings';
      await api.request(url, {
        method: 'PUT',
        body: JSON.stringify(settings),
      });
      setSaveMsg('Settings saved successfully!');
    } catch (err) {
      console.error('Failed to save settings:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleSetAcceleration = async (multiplier: number) => {
    try {
      await api.request('/demo/acceleration', {
        method: 'POST',
        body: JSON.stringify({ multiplier }),
      });
      setAcceleration(multiplier);
      setDemoMsg(`Time acceleration set to ${multiplier}x!`);
    } catch (err) {
      console.error('Failed to set acceleration:', err);
    }
  };

  const handleSimulateMissedDose = async () => {
    setDemoMsg('Simulating missed dose escalation ladder...');
    try {
      const res = await api.request<any>('/demo/simulate-missed-dose', { method: 'POST' });
      setDemoMsg(res.message);
    } catch (err: any) {
      setDemoMsg(err.message || 'Simulation failed');
    }
  };

  const handleSimulateDueDose = async (level = 1) => {
    setDemoMsg(`Triggering Level ${level} due dose reminder...`);
    try {
      const res = await api.request<any>('/demo/simulate-due-dose', {
        method: 'POST',
        body: JSON.stringify({ level }),
      });
      setDemoMsg(res.message);
    } catch (err: any) {
      setDemoMsg(err.message || 'Simulation failed');
    }
  };

  const handleResetData = async () => {
    if (!window.confirm('Reset database to clean 3-week seed demo data?')) return;
    setDemoMsg('Resetting and re-seeding database...');
    try {
      const res = await api.request<any>('/demo/reset-data', { method: 'POST' });
      setDemoMsg(res.message);
      await fetchSettings();
    } catch (err: any) {
      setDemoMsg(err.message || 'Reset failed');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      <CaregiverNav />

      {/* Header */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200">
        <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
          Caregiver Settings & Demo Controls
        </h2>
        <p className="text-base sm:text-lg font-semibold text-slate-600 mt-1">
          Configure escalation ladder thresholds and test realistic simulations in Demo Mode
        </p>
      </div>

      {/* DEMO MODE CONTROL PANEL */}
      <div className="bg-gradient-to-br from-indigo-950 via-slate-900 to-blue-950 rounded-3xl p-6 sm:p-8 text-white shadow-xl space-y-6 border-2 border-indigo-500/30">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center">
            <Sparkles className="w-7 h-7 text-amber-400" />
          </div>
          <div>
            <span className="text-xs font-black uppercase tracking-widest text-amber-400">
              Project Review & Presentation Mode
            </span>
            <h3 className="text-2xl sm:text-3xl font-black">Demo Mode Acceleration & Simulator</h3>
          </div>
        </div>

        {demoMsg && (
          <div className="p-4 bg-indigo-500/20 border border-indigo-400 rounded-2xl text-indigo-200 font-bold text-sm sm:text-base flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-indigo-400 flex-shrink-0" />
            <span>{demoMsg}</span>
          </div>
        )}

        {/* 1. Time Acceleration Buttons */}
        <div className="space-y-2">
          <span className="text-sm font-bold uppercase tracking-wider text-slate-300">
            Time Speed Multiplier:
          </span>
          <div className="grid grid-cols-3 gap-3">
            {[
              { val: 1, label: '1x (Normal)' },
              { val: 60, label: '60x (1m = 1s)' },
              { val: 600, label: '600x (10m = 1s)' },
            ].map((speed) => (
              <button
                key={speed.val}
                type="button"
                onClick={() => handleSetAcceleration(speed.val)}
                className={`min-h-[56px] rounded-2xl font-black text-base sm:text-lg transition flex items-center justify-center gap-2 ${
                  acceleration === speed.val
                    ? 'bg-amber-400 text-slate-950 shadow-lg scale-102 ring-2 ring-amber-300'
                    : 'bg-white/10 hover:bg-white/20 text-white'
                }`}
              >
                <Zap className="w-5 h-5" />
                <span>{speed.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 2. Simulation Action Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          <button
            type="button"
            onClick={handleSimulateMissedDose}
            className="p-4 rounded-2xl bg-red-600 hover:bg-red-500 active:scale-98 text-white font-black text-base shadow-lg flex items-center justify-center gap-2 transition"
          >
            <AlertTriangle className="w-5 h-5" />
            <span>Simulate Missed Dose</span>
          </button>

          <button
            type="button"
            onClick={() => handleSimulateDueDose(1)}
            className="p-4 rounded-2xl bg-blue-600 hover:bg-blue-500 active:scale-98 text-white font-black text-base shadow-lg flex items-center justify-center gap-2 transition"
          >
            <BellRing className="w-5 h-5" />
            <span>Trigger Due Reminder</span>
          </button>

          <button
            type="button"
            onClick={handleResetData}
            className="p-4 rounded-2xl bg-slate-800 hover:bg-slate-700 active:scale-98 text-slate-200 font-extrabold text-base border border-slate-600 flex items-center justify-center gap-2 transition"
          >
            <RotateCcw className="w-5 h-5 text-slate-400" />
            <span>Reset Demo Data (3 Weeks)</span>
          </button>
        </div>
      </div>

      {/* ESCALATION LADDER THRESHOLDS CONFIGURATION */}
      <form onSubmit={handleSaveSettings} className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Sliders className="w-7 h-7 text-blue-600" />
            <h3 className="text-2xl font-black text-slate-900">
              Escalation Ladder & Grace Window Thresholds
            </h3>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="px-6 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-base flex items-center gap-2 shadow-md transition disabled:opacity-50"
          >
            <Save className="w-5 h-5" />
            <span>{saving ? 'Saving...' : 'Save Settings'}</span>
          </button>
        </div>

        {saveMsg && (
          <div className="p-4 rounded-xl bg-green-50 border border-green-300 text-green-800 font-bold text-sm">
            {saveMsg}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Grace Window */}
          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
            <label className="block text-slate-900 font-bold text-base">
              Grace Period Window (Minutes)
            </label>
            <p className="text-xs text-slate-500">
              Time before an unconfirmed dose is officially marked MISSED and reported to caregiver.
            </p>
            <input
              type="number"
              min={5}
              max={120}
              value={settings.grace_period_minutes}
              onChange={(e) =>
                setSettings({ ...settings, grace_period_minutes: parseInt(e.target.value, 10) })
              }
              className="w-full text-xl font-black p-3 rounded-xl border border-slate-300"
            />
          </div>

          {/* Level 2 Timing */}
          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
            <label className="block text-slate-900 font-bold text-base">
              Level 2 Escalation (+Minutes)
            </label>
            <p className="text-xs text-slate-500">
              Minutes after scheduled time to escalate to louder tone and device vibration.
            </p>
            <input
              type="number"
              min={1}
              max={30}
              value={settings.level2_minutes}
              onChange={(e) =>
                setSettings({ ...settings, level2_minutes: parseInt(e.target.value, 10) })
              }
              className="w-full text-xl font-black p-3 rounded-xl border border-slate-300"
            />
          </div>

          {/* Level 3 Timing */}
          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
            <label className="block text-slate-900 font-bold text-base">
              Level 3 Escalation (+Minutes)
            </label>
            <p className="text-xs text-slate-500">
              Minutes after scheduled time to trigger urgent alarm and repeating voice announcement.
            </p>
            <input
              type="number"
              min={2}
              max={45}
              value={settings.level3_minutes}
              onChange={(e) =>
                setSettings({ ...settings, level3_minutes: parseInt(e.target.value, 10) })
              }
              className="w-full text-xl font-black p-3 rounded-xl border border-slate-300"
            />
          </div>

          {/* Level 4 Caregiver Alert Timing */}
          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
            <label className="block text-slate-900 font-bold text-base">
              Level 4 Standard Caregiver Alert (+Minutes)
            </label>
            <p className="text-xs text-slate-500">
              Minutes before dispatching real-time SSE alert to caregiver dashboard for standard doses.
            </p>
            <input
              type="number"
              min={5}
              max={60}
              value={settings.level4_minutes}
              onChange={(e) =>
                setSettings({ ...settings, level4_minutes: parseInt(e.target.value, 10) })
              }
              className="w-full text-xl font-black p-3 rounded-xl border border-slate-300"
            />
          </div>

          {/* Level 4 Critical Medicine Alert Timing */}
          <div className="p-5 rounded-2xl bg-red-50/50 border border-red-200 space-y-2">
            <label className="block text-red-950 font-bold text-base">
              Level 4 Critical Medicine Fast Alert (+Minutes)
            </label>
            <p className="text-xs text-red-700">
              Faster escalation threshold for critical life-supporting medications (heart, BP, insulin).
            </p>
            <input
              type="number"
              min={3}
              max={30}
              value={settings.critical_level4_minutes}
              onChange={(e) =>
                setSettings({ ...settings, critical_level4_minutes: parseInt(e.target.value, 10) })
              }
              className="w-full text-xl font-black p-3 rounded-xl border border-red-300"
            />
          </div>

          {/* Max Snoozes Limit */}
          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
            <label className="block text-slate-900 font-bold text-base">
              Maximum Consecutive Snoozes Allowed
            </label>
            <p className="text-xs text-slate-500">
              After reaching this limit (e.g. 3 snoozes), reminder auto-escalates to urgent alarm.
            </p>
            <input
              type="number"
              min={1}
              max={10}
              value={settings.max_snoozes}
              onChange={(e) =>
                setSettings({ ...settings, max_snoozes: parseInt(e.target.value, 10) })
              }
              className="w-full text-xl font-black p-3 rounded-xl border border-slate-300"
            />
          </div>
        </div>
      </form>
    </div>
  );
};

