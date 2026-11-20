import React, { useState, useEffect } from 'react';
import { PillIllustration } from '../../components/PillIllustration';
import { DoseLog } from '../../types';
import { api } from '../../services/api';
import { useAccessibility } from '../../context/AccessibilityContext';
import { CheckCircle2, AlertTriangle, Clock, Calendar } from 'lucide-react';
import { SosButton } from '../../components/SosButton';

export const ElderlyHistory: React.FC = () => {
  const { t } = useAccessibility();
  const [history, setHistory] = useState<DoseLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        setLoading(true);
        const res = await api.request<{ history: DoseLog[] }>('/doses/history?limit=50');
        setHistory(res.history);
      } catch (err) {
        console.error('Failed to load history:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, []);

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 pb-28 space-y-6">
      <SosButton />

      <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200">
        <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
          {t('historyTab')}
        </h2>
        <p className="text-lg sm:text-xl font-bold text-slate-600 mt-1">
          Recent doses and activity
        </p>
      </div>

      {loading ? (
        <div className="text-center py-16 text-slate-500 text-2xl font-bold">
          Loading history...
        </div>
      ) : history.length === 0 ? (
        <div className="bg-white rounded-3xl p-10 text-center border border-slate-200">
          <p className="text-2xl font-bold text-slate-700">No dose records yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {history.map((dose) => {
            const dateObj = new Date(dose.scheduled_time);
            const dateStr = dateObj.toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
            });
            const timeStr = dateObj.toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            });

            return (
              <div
                key={dose.id}
                className={`bg-white rounded-2xl p-5 shadow-sm border-2 flex items-center justify-between gap-4 transition ${
                  dose.status === 'taken'
                    ? 'border-green-200'
                    : dose.status === 'missed'
                    ? 'border-red-200'
                    : 'border-slate-200'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-slate-50 rounded-xl border border-slate-200 flex-shrink-0">
                    <PillIllustration
                      shape={dose.pill_shape}
                      color={dose.pill_color}
                      color2={dose.pill_color2}
                      imageUrl={dose.pill_image_url}
                      size={56}
                    />
                  </div>

                  <div>
                    <h4 className="text-xl sm:text-2xl font-extrabold text-slate-900">
                      {dose.name}
                    </h4>
                    <p className="text-base font-bold text-blue-700">
                      {dose.strength} • {dose.quantity_per_dose}
                    </p>
                    <p className="text-sm font-semibold text-slate-500 flex items-center gap-1 mt-0.5">
                      <Calendar className="w-4 h-4" />
                      <span>
                        {dateStr} at {timeStr}
                      </span>
                    </p>
                  </div>
                </div>

                <div>
                  {dose.status === 'taken' ? (
                    <span className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-full bg-green-100 text-green-800 text-base font-extrabold border border-green-300">
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                      <span>{t('taken')}</span>
                    </span>
                  ) : dose.status === 'missed' ? (
                    <span className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-full bg-red-100 text-red-800 text-base font-extrabold border border-red-300">
                      <AlertTriangle className="w-5 h-5 text-red-600" />
                      <span>{t('missed')}</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-full bg-amber-100 text-amber-900 text-base font-bold border border-amber-300">
                      <Clock className="w-5 h-5 text-amber-600" />
                      <span className="capitalize">{dose.status}</span>
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

