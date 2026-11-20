import React from 'react';
import { useReminder } from '../context/ReminderContext';
import { useAccessibility } from '../context/AccessibilityContext';
import { PillIllustration } from './PillIllustration';
import { Volume2, BellRing, Clock, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { speechService } from '../services/speech';

export const ReminderModal: React.FC = () => {
  const { activeDose, takeDose, snoozeDose, skipDose, dismissReminder } = useReminder();
  const { language, t } = useAccessibility();

  if (!activeDose) return null;

  const level = activeDose.escalation_level || 1;
  const timeStr = new Date(activeDose.scheduled_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const getEscalationBadge = () => {
    if (level === 1) {
      return (
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-100 text-blue-800 font-semibold border-2 border-blue-300">
          <BellRing className="w-6 h-6 animate-pulse" />
          <span>{t('level1Desc')}</span>
        </div>
      );
    }
    if (level === 2) {
      return (
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-100 text-amber-900 font-semibold border-2 border-amber-400">
          <Clock className="w-6 h-6 animate-bounce" />
          <span>{t('level2Desc')}</span>
        </div>
      );
    }
    if (level === 3) {
      return (
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-red-100 text-red-800 font-bold border-2 border-red-500 animate-pulse">
          <AlertTriangle className="w-6 h-6 text-red-600" />
          <span>{t('level3Desc')}</span>
        </div>
      );
    }
    return (
      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-red-600 text-white font-black shadow-lg">
        <AlertTriangle className="w-6 h-6" />
        <span>{t('level4Desc')}</span>
      </div>
    );
  };

  const handleRepeatVoice = () => {
    const text = speechService.buildReminderSpeech(
      timeStr,
      activeDose.pill_color,
      activeDose.pill_shape,
      activeDose.name,
      activeDose.strength,
      activeDose.instructions,
      language
    );
    speechService.speak(text, language);
  };

  const formattedInstructions = () => {
    switch (activeDose.instructions) {
      case 'before_food':
        return t('beforeFood');
      case 'with_food':
        return t('withFood');
      case 'after_food':
        return t('afterFood');
      case 'empty_stomach':
        return t('emptyStomach');
      default:
        return activeDose.instructions;
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn"
    >
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border-4 border-blue-600 overflow-hidden flex flex-col max-h-[95vh]">
        {/* Urgent header bar */}
        <div className={`p-4 text-center font-bold text-white text-xl sm:text-2xl flex items-center justify-between ${
          level >= 3 ? 'bg-red-600 animate-pulse' : level === 2 ? 'bg-amber-600' : 'bg-blue-600'
        }`}>
          <div className="flex items-center gap-2 mx-auto">
            <BellRing className="w-8 h-8" />
            <span>{t('dueNow')} • {timeStr}</span>
          </div>
          <button
            onClick={dismissReminder}
            aria-label="Close"
            className="text-white hover:text-slate-200 p-2 text-2xl font-bold leading-none"
          >
            ✕
          </button>
        </div>

        {/* Content body */}
        <div className="p-6 sm:p-8 flex-1 overflow-y-auto text-center flex flex-col items-center">
          {/* Escalation Level Badge */}
          <div className="mb-4">{getEscalationBadge()}</div>

          {/* Large Pill Illustration */}
          <div className="my-3 p-4 bg-slate-50 rounded-3xl border-2 border-slate-200 shadow-inner flex items-center justify-center">
            <PillIllustration
              shape={activeDose.pill_shape}
              color={activeDose.pill_color}
              color2={activeDose.pill_color2}
              imageUrl={activeDose.pill_image_url}
              size={180}
            />
          </div>

          {/* Medicine Name and Strength */}
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight mt-1">
            {activeDose.name}
          </h2>
          <p className="text-2xl sm:text-3xl font-bold text-blue-700 mt-1">
            {activeDose.strength} • {activeDose.quantity_per_dose}
          </p>

          {/* Food and usage instruction */}
          <div className="mt-4 px-6 py-3 rounded-2xl bg-blue-50 border-2 border-blue-200 text-blue-900 text-xl font-bold flex items-center gap-2">
            <span>🍽️</span>
            <span>{formattedInstructions()}</span>
          </div>

          {/* Voice read-aloud button */}
          <button
            onClick={handleRepeatVoice}
            className="mt-4 flex items-center gap-2 text-slate-700 bg-slate-100 hover:bg-slate-200 px-5 py-2.5 rounded-full font-semibold border border-slate-300 text-lg transition"
          >
            <Volume2 className="w-6 h-6 text-blue-600" />
            <span>{t('voiceReadAloud')}</span>
          </button>
        </div>

        {/* 3 HUGE ACTION BUTTONS */}
        <div className="p-6 bg-slate-50 border-t-2 border-slate-200 flex flex-col gap-3">
          {/* 1. TAKEN (HUGE GREEN) */}
          <button
            onClick={() => takeDose(activeDose.id)}
            className="w-full min-h-[72px] py-4 px-6 rounded-2xl bg-green-600 hover:bg-green-700 active:scale-[0.98] text-white font-black text-2xl sm:text-3xl shadow-lg shadow-green-600/30 flex items-center justify-center gap-3 transition-all"
          >
            <CheckCircle className="w-10 h-10 stroke-[2.5]" />
            <span>{t('taken')}</span>
          </button>

          {/* 2. SNOOZE 10 MIN (AMBER) */}
          <button
            onClick={() => snoozeDose(activeDose.id)}
            className="w-full min-h-[64px] py-3.5 px-6 rounded-2xl bg-amber-500 hover:bg-amber-600 active:scale-[0.98] text-slate-950 font-bold text-xl sm:text-2xl shadow-md shadow-amber-500/20 flex items-center justify-center gap-3 transition-all"
          >
            <Clock className="w-8 h-8" />
            <span>{t('snooze')}</span>
          </button>

          {/* 3. SKIP / CANNOT TAKE (GREY) */}
          <button
            onClick={() => skipDose(activeDose.id, 'User skipped from reminder')}
            className="w-full min-h-[56px] py-3 px-6 rounded-2xl bg-slate-200 hover:bg-slate-300 active:scale-[0.98] text-slate-700 font-semibold text-lg sm:text-xl flex items-center justify-center gap-2 transition-all"
          >
            <XCircle className="w-6 h-6" />
            <span>{t('skip')}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

