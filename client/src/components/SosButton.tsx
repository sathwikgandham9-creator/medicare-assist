import React, { useState } from 'react';
import { PhoneCall, AlertTriangle, CheckCircle, ShieldAlert } from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useAccessibility } from '../context/AccessibilityContext';

export const SosButton: React.FC = () => {
  const { user } = useAuth();
  const { t } = useAccessibility();
  const [isOpen, setIsOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [alertSent, setAlertSent] = useState(false);

  const caregiverPhone = user?.emergency_contact_phone || user?.linkedCaregiver?.phone_number || '+1 (555) 234-5678';
  const caregiverName = user?.emergency_contact_name || user?.linkedCaregiver?.full_name || 'Caregiver';

  const handleTriggerSos = async () => {
    setSending(true);
    try {
      await api.request('/alerts/sos', { method: 'POST' });
      setAlertSent(true);
    } catch (err) {
      console.error('Failed to trigger SOS:', err);
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      {/* Persistent Big Red Button */}
      <button
        onClick={() => {
          setIsOpen(true);
          setAlertSent(false);
        }}
        className="w-full min-h-[68px] py-4 px-6 rounded-2xl bg-red-600 hover:bg-red-700 active:scale-[0.98] text-white font-black text-xl sm:text-2xl shadow-xl shadow-red-600/30 flex items-center justify-center gap-3 transition-all border-2 border-red-700 focus:outline-none focus:ring-4 focus:ring-red-400"
      >
        <PhoneCall className="w-8 h-8 animate-pulse" />
        <span>{t('sosButton')}</span>
      </button>

      {/* SOS Modal Dialog */}
      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
        >
          <div className="w-full max-w-lg bg-white rounded-3xl p-6 sm:p-8 text-center shadow-2xl border-4 border-red-600 flex flex-col items-center">
            <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center mb-4 text-red-600">
              <ShieldAlert className="w-12 h-12 stroke-[2.5]" />
            </div>

            <h3 className="text-3xl font-black text-slate-900">Emergency Assistance</h3>
            <p className="text-xl text-slate-600 mt-2 font-medium">
              Caregiver: <span className="font-bold text-slate-900">{caregiverName}</span>
            </p>

            {alertSent ? (
              <div className="w-full mt-5 p-4 rounded-2xl bg-green-50 border-2 border-green-300 text-green-900 flex items-center justify-center gap-3">
                <CheckCircle className="w-7 h-7 text-green-600 flex-shrink-0" />
                <span className="text-lg font-bold">SOS Alert sent to caregiver's dashboard!</span>
              </div>
            ) : (
              <button
                onClick={handleTriggerSos}
                disabled={sending}
                className="w-full mt-6 py-4 px-6 rounded-2xl bg-red-600 hover:bg-red-700 active:scale-[0.98] text-white font-extrabold text-xl shadow-lg flex items-center justify-center gap-2 transition"
              >
                <AlertTriangle className="w-6 h-6" />
                <span>{sending ? 'Sending Alert...' : 'Send Instant SOS Alert to Caregiver'}</span>
              </button>
            )}

            {/* Direct Phone Call Button */}
            <a
              href={`tel:${caregiverPhone}`}
              className="w-full mt-4 py-4 px-6 rounded-2xl bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white font-black text-xl shadow-lg flex items-center justify-center gap-3 transition no-underline"
            >
              <PhoneCall className="w-7 h-7" />
              <span>Call {caregiverPhone}</span>
            </a>

            <button
              onClick={() => setIsOpen(false)}
              className="mt-6 text-slate-600 hover:text-slate-900 text-lg font-bold py-2 px-6 rounded-xl bg-slate-100 hover:bg-slate-200 transition"
            >
              Cancel / Close
            </button>
          </div>
        </div>
      )}
    </>
  );
};

