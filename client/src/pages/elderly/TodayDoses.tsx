import React from 'react';
import { useReminder } from '../../context/ReminderContext';
import { useAccessibility } from '../../context/AccessibilityContext';
import { PillIllustration } from '../../components/PillIllustration';
import { SosButton } from '../../components/SosButton';
import { OfflineBanner } from '../../components/OfflineBanner';
import { CheckCircle2, Clock, AlertTriangle, PlayCircle, Sparkles, AlertCircle } from 'lucide-react';
import { DoseLog } from '../../types';

export const TodayDoses: React.FC = () => {
  const { todayDoses, loadingToday, takeDose, snoozeDose, skipDose, simulateDueDose } = useReminder();
  const { t } = useAccessibility();

  const formattedDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  const slots = ['Morning', 'Afternoon', 'Evening', 'Night'] as const;

  const getSlotIcon = (slot: string) => {
    switch (slot) {
      case 'Morning':
        return '🌅';
      case 'Afternoon':
        return '☀️';
      case 'Evening':
        return '🌆';
      case 'Night':
        return '🌙';
      default:
        return '⏰';
    }
  };

  const getStatusBadge = (dose: DoseLog) => {
    switch (dose.status) {
      case 'taken':
        return (
          <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-green-100 text-green-800 text-lg font-extrabold border border-green-300">
            <CheckCircle2 className="w-6 h-6 text-green-600" />
            <span>{t('taken')}</span>
            {dose.actual_time && (
              <span className="text-sm font-semibold text-green-700 ml-1">
                ({new Date(dose.actual_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})
              </span>
            )}
          </span>
        );
      case 'snoozed':
        return (
          <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-amber-100 text-amber-900 text-lg font-extrabold border border-amber-300">
            <Clock className="w-6 h-6 text-amber-600" />
            <span>{t('snoozed')}</span>
            <span className="text-xs bg-amber-200 px-2 py-0.5 rounded-full font-bold ml-1">
              {dose.snooze_count}x
            </span>
          </span>
        );
      case 'missed':
        return (
          <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-red-100 text-red-800 text-lg font-extrabold border border-red-300">
            <AlertTriangle className="w-6 h-6 text-red-600" />
            <span>{t('missed')}</span>
          </span>
        );
      default: {
        const scheduled = new Date(dose.scheduled_time);
        const isPast = new Date().getTime() >= scheduled.getTime();
        if (isPast) {
          return (
            <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-blue-100 text-blue-900 text-lg font-black border-2 border-blue-400 animate-pulse">
              <AlertCircle className="w-6 h-6 text-blue-600" />
              <span>{t('dueNow')}</span>
            </span>
          );
        }
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-slate-100 text-slate-700 text-base font-bold">
            <Clock className="w-5 h-5 text-slate-500" />
            <span>{t('upcoming')}</span>
          </span>
        );
      }
    }
  };

  const getFoodInstructionText = (inst: string) => {
    switch (inst) {
      case 'before_food':
        return t('beforeFood');
      case 'with_food':
        return t('withFood');
      case 'after_food':
        return t('afterFood');
      case 'empty_stomach':
        return t('emptyStomach');
      default:
        return inst;
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 pb-28 space-y-6">
      {/* Offline and notifications banner */}
      <OfflineBanner />

      {/* Persistent SOS Button */}
      <SosButton />

      {/* Header card with date and quick demo trigger */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
            {t('todayTab')}
          </h2>
          <p className="text-xl sm:text-2xl font-bold text-blue-700 mt-1">
            {formattedDate}
          </p>
        </div>

        {/* Demo trigger button */}
        <button
          onClick={() => simulateDueDose(1)}
          className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border-2 border-indigo-200 font-extrabold text-base transition active:scale-95 shadow-sm"
          title="Demo shortcut: Immediately triggers a reminder alarm"
        >
          <Sparkles className="w-5 h-5 text-indigo-600" />
          <span>Simulate Due Reminder</span>
        </button>
      </div>

      {loadingToday && todayDoses.length === 0 ? (
        <div className="text-center py-16 text-slate-500 text-2xl font-bold">
          Loading your medicines...
        </div>
      ) : todayDoses.length === 0 ? (
        <div className="bg-white rounded-3xl p-10 text-center border border-slate-200">
          <p className="text-2xl font-bold text-slate-700">No medicines scheduled for today.</p>
          <p className="text-lg text-slate-500 mt-2">You can add your medicines in the "My Medicines" tab.</p>
        </div>
      ) : (
        /* Doses grouped by slot */
        <div className="space-y-8">
          {slots.map((slot) => {
            const slotDoses = todayDoses.filter((d) => (d.time_slot_category || 'Morning') === slot);
            if (slotDoses.length === 0) return null;

            return (
              <div key={slot} className="space-y-4">
                {/* Slot heading */}
                <div className="flex items-center gap-3 px-2">
                  <span className="text-3xl">{getSlotIcon(slot)}</span>
                  <h3 className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tight">
                    {t(slot.toLowerCase())}
                  </h3>
                  <span className="text-lg font-bold text-slate-500">
                    ({slotDoses.filter((d) => d.status === 'taken').length}/{slotDoses.length} taken)
                  </span>
                </div>

                {/* Cards */}
                <div className="space-y-4">
                  {slotDoses.map((dose) => {
                    const timeFormatted = new Date(dose.scheduled_time).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    });
                    const isDue = ['scheduled', 'snoozed'].includes(dose.status);

                    return (
                      <div
                        key={dose.id}
                        className={`bg-white rounded-3xl p-5 sm:p-7 shadow-md border-3 transition-all ${
                          dose.status === 'taken'
                            ? 'border-green-200 bg-green-50/20'
                            : dose.status === 'missed'
                            ? 'border-red-300 bg-red-50/20'
                            : 'border-blue-300 ring-2 ring-blue-100'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                          {/* Left: Pill SVG + Info */}
                          <div className="flex items-center gap-4 sm:gap-6">
                            <div className="p-3 bg-slate-50 rounded-2xl border-2 border-slate-200 shadow-inner flex-shrink-0">
                              <PillIllustration
                                shape={dose.pill_shape}
                                color={dose.pill_color}
                                color2={dose.pill_color2}
                                imageUrl={dose.pill_image_url}
                                size={80}
                              />
                            </div>

                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xl sm:text-2xl font-black text-slate-700">
                                  {timeFormatted}
                                </span>
                                {dose.is_critical === 1 && (
                                  <span className="px-2.5 py-0.5 rounded-full bg-red-100 text-red-700 text-xs sm:text-sm font-extrabold uppercase tracking-wide">
                                    Critical
                                  </span>
                                )}
                              </div>

                              <h4 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">
                                {dose.name}
                              </h4>

                              <p className="text-xl sm:text-2xl font-bold text-blue-700 mt-0.5">
                                {dose.strength} • {dose.quantity_per_dose}
                              </p>

                              <p className="text-base sm:text-lg font-semibold text-slate-600 mt-1 flex items-center gap-1.5">
                                <span>🍽️</span>
                                <span>{getFoodInstructionText(dose.instructions)}</span>
                              </p>
                            </div>
                          </div>

                          {/* Right: Status badge */}
                          <div className="self-end sm:self-center">
                            {getStatusBadge(dose)}
                          </div>
                        </div>

                        {/* Quick action buttons if dose is unconfirmed */}
                        {isDue && (
                          <div className="mt-5 pt-4 border-t-2 border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <button
                              onClick={() => takeDose(dose.id)}
                              className="min-h-[64px] py-3.5 px-4 rounded-2xl bg-green-600 hover:bg-green-700 active:scale-[0.98] text-white font-extrabold text-xl shadow-md flex items-center justify-center gap-2 transition"
                            >
                              <CheckCircle2 className="w-7 h-7" />
                              <span>{t('taken')}</span>
                            </button>

                            <button
                              onClick={() => snoozeDose(dose.id)}
                              className="min-h-[56px] py-3 px-4 rounded-2xl bg-amber-500 hover:bg-amber-600 active:scale-[0.98] text-slate-950 font-bold text-lg shadow-sm flex items-center justify-center gap-2 transition"
                            >
                              <Clock className="w-6 h-6" />
                              <span>{t('snooze')}</span>
                            </button>

                            <button
                              onClick={() => skipDose(dose.id)}
                              className="min-h-[56px] py-3 px-4 rounded-2xl bg-slate-200 hover:bg-slate-300 active:scale-[0.98] text-slate-700 font-semibold text-lg flex items-center justify-center gap-1.5 transition"
                            >
                              <span>{t('skip')}</span>
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

