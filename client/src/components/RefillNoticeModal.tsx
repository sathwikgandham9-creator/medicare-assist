import React from 'react';
import { useReminder } from '../context/ReminderContext';
import { useAccessibility } from '../context/AccessibilityContext';
import { PillIllustration } from './PillIllustration';
import { PackageCheck, Check, Sparkles, Heart } from 'lucide-react';

export const RefillNoticeModal: React.FC = () => {
  const { refillNotice, dismissRefillNotice } = useReminder();
  const { t } = useAccessibility();

  if (!refillNotice) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn"
    >
      <div className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl border-4 border-emerald-500 overflow-hidden flex flex-col text-center">
        {/* Header Banner */}
        <div className="bg-emerald-600 text-white p-5 flex items-center justify-center gap-2">
          <PackageCheck className="w-8 h-8 animate-bounce" />
          <h3 className="text-2xl sm:text-3xl font-black tracking-tight">
            Prescription Refill Received!
          </h3>
        </div>

        {/* Content Body */}
        <div className="p-6 sm:p-8 flex flex-col items-center space-y-4">
          <div className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-emerald-100 text-emerald-800 text-base font-extrabold border border-emerald-300">
            <Heart className="w-5 h-5 text-emerald-600 fill-emerald-600" />
            <span>Arranged by your caregiver: {refillNotice.caregiver_name}</span>
          </div>

          {/* Pill Visual Preview */}
          <div className="p-4 bg-slate-50 rounded-3xl border-2 border-slate-200 shadow-inner flex items-center justify-center">
            <PillIllustration
              shape={refillNotice.pill_shape || 'round'}
              color={refillNotice.pill_color || 'white'}
              color2={refillNotice.pill_color2}
              size={120}
            />
          </div>

          <div>
            <h4 className="text-3xl font-extrabold text-slate-900">
              {refillNotice.medicine_name}
            </h4>
            <p className="text-2xl font-bold text-blue-700 mt-0.5">
              {refillNotice.strength}
            </p>
          </div>

          <div className="w-full p-4 rounded-2xl bg-emerald-50 border-2 border-emerald-200 text-emerald-950 space-y-1">
            <div className="flex items-center justify-center gap-2 text-xl font-black text-emerald-800">
              <Sparkles className="w-6 h-6 text-amber-500 fill-amber-400" />
              <span>+{refillNotice.added_amount} New Tablets Added!</span>
            </div>
            <p className="text-lg font-bold text-slate-700">
              Your new total supply is <span className="text-emerald-800 font-extrabold">{refillNotice.new_stock} doses</span>.
            </p>
          </div>
        </div>

        {/* Big Action Button */}
        <div className="p-6 bg-slate-50 border-t-2 border-slate-200">
          <button
            onClick={dismissRefillNotice}
            className="w-full min-h-[64px] py-4 px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-black text-2xl shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-3 transition"
          >
            <Check className="w-8 h-8 stroke-[3]" />
            <span>Thank You, Got It!</span>
          </button>
        </div>
      </div>
    </div>
  );
};

