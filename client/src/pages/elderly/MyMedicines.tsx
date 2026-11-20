import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PillIllustration } from '../../components/PillIllustration';
import { Medicine } from '../../types';
import { api } from '../../services/api';
import { useAccessibility } from '../../context/AccessibilityContext';
import { Plus, Pause, Play, AlertTriangle, Package, RefreshCw } from 'lucide-react';
import { SosButton } from '../../components/SosButton';

export const MyMedicines: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useAccessibility();
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMedicines = async () => {
    try {
      setLoading(true);
      const res = await api.request<{ medicines: Medicine[] }>('/medicines');
      setMedicines(res.medicines);
    } catch (err) {
      console.error('Failed to load medicines:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMedicines();
  }, []);

  const handleTogglePause = async (medId: number) => {
    try {
      await api.request(`/medicines/${medId}/pause`, { method: 'PATCH' });
      await fetchMedicines();
    } catch (err) {
      console.error('Failed to toggle pause:', err);
    }
  };

  const handleRefill = async (medId: number) => {
    try {
      await api.request(`/medicines/${medId}/stock`, {
        method: 'PATCH',
        body: JSON.stringify({ amount: 30 }),
      });
      await fetchMedicines();
    } catch (err) {
      console.error('Failed to refill stock:', err);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 pb-28 space-y-6">
      <SosButton />

      {/* Header with Add Button */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200">
        <div>
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
            {t('medicinesTab')}
          </h2>
          <p className="text-lg sm:text-xl font-bold text-slate-600 mt-1">
            {medicines.length} registered medications
          </p>
        </div>

        <button
          onClick={() => navigate('/elderly/medicines/new')}
          className="min-h-[64px] px-6 py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white font-extrabold text-xl shadow-lg shadow-blue-600/30 flex items-center gap-2 transition"
        >
          <Plus className="w-7 h-7 stroke-[3]" />
          <span>{t('addMedicine')}</span>
        </button>
      </div>

      {loading ? (
        <div className="text-center py-16 text-slate-500 text-2xl font-bold">
          Loading your medicines...
        </div>
      ) : medicines.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 space-y-4">
          <p className="text-2xl font-bold text-slate-700">No medicines added yet.</p>
          <button
            onClick={() => navigate('/elderly/medicines/new')}
            className="px-8 py-4 rounded-2xl bg-blue-600 text-white font-bold text-xl inline-flex items-center gap-2 shadow-lg"
          >
            <Plus className="w-6 h-6" />
            <span>Add Your First Medicine</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {medicines.map((med) => {
            const isLowStock = med.current_stock <= med.refill_threshold;

            return (
              <div
                key={med.id}
                className={`bg-white rounded-3xl p-6 shadow-sm border-2 transition-all ${
                  med.is_paused ? 'opacity-60 border-slate-200 bg-slate-50' : 'border-slate-200 hover:border-blue-300'
                }`}
              >
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  {/* Left: Pill SVG + Info */}
                  <div className="flex items-center gap-4 sm:gap-6">
                    <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 flex-shrink-0">
                      <PillIllustration
                        shape={med.pill_shape}
                        color={med.pill_color}
                        color2={med.pill_color2}
                        imageUrl={med.pill_image_url}
                        size={80}
                      />
                    </div>

                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
                          {med.name}
                        </h3>
                        {med.is_critical === 1 && (
                          <span className="px-2.5 py-0.5 rounded-full bg-red-100 text-red-700 text-xs sm:text-sm font-extrabold uppercase">
                            Critical
                          </span>
                        )}
                        {med.is_paused === 1 && (
                          <span className="px-2.5 py-0.5 rounded-full bg-slate-200 text-slate-700 text-xs sm:text-sm font-bold">
                            Paused
                          </span>
                        )}
                      </div>

                      <p className="text-xl font-bold text-blue-700 mt-0.5">
                        {med.strength} • {med.quantity_per_dose}
                      </p>

                      {/* Schedule info */}
                      <p className="text-base font-semibold text-slate-600 mt-1">
                        ⏰ Schedule:{' '}
                        {med.time_slots.map((s) => `${s.label || ''} ${s.time}`).join(', ')}
                      </p>

                      {/* Stock Pill */}
                      <div className="flex items-center gap-2 mt-2">
                        <span
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-bold ${
                            isLowStock
                              ? 'bg-amber-100 text-amber-900 border border-amber-300'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          <Package className="w-4 h-4" />
                          <span>Stock: {med.current_stock} remaining</span>
                        </span>
                        {isLowStock && (
                          <span className="text-sm font-bold text-amber-700 flex items-center gap-1">
                            <AlertTriangle className="w-4 h-4" />
                            Refill needed!
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <button
                      onClick={() => handleRefill(med.id)}
                      className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-sm sm:text-base flex items-center gap-1.5 transition"
                      title="Refill 30 tablets"
                    >
                      <RefreshCw className="w-4 h-4" />
                      <span>+30 Refill</span>
                    </button>

                    <button
                      onClick={() => handleTogglePause(med.id)}
                      className={`px-4 py-2.5 rounded-xl font-bold text-sm sm:text-base flex items-center gap-1.5 transition ${
                        med.is_paused
                          ? 'bg-green-100 text-green-800 hover:bg-green-200'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {med.is_paused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                      <span>{med.is_paused ? 'Resume' : 'Pause'}</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

