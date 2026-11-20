import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CaregiverNav } from '../../components/CaregiverNav';
import { useAuth } from '../../context/AuthContext';
import { PillIllustration } from '../../components/PillIllustration';
import { Medicine } from '../../types';
import { api } from '../../services/api';
import { Plus, Trash2, Pause, Play, Package, RefreshCw, AlertTriangle } from 'lucide-react';

export const CaregiverMedicines: React.FC = () => {
  const { activePatientId } = useAuth();
  const navigate = useNavigate();
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [loading, setLoading] = useState(true);
  const [refillToast, setRefillToast] = useState('');

  const fetchMedicines = async () => {
    try {
      setLoading(true);
      const url = activePatientId
        ? `/medicines?patient_id=${activePatientId}`
        : '/medicines';
      const res = await api.request<{ medicines: Medicine[] }>(url);
      setMedicines(res.medicines);
    } catch (err) {
      console.error('Failed to load medicines:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMedicines();
  }, [activePatientId]);

  const handleTogglePause = async (medId: number) => {
    try {
      await api.request(`/medicines/${medId}/pause`, { method: 'PATCH' });
      await fetchMedicines();
    } catch (err) {
      console.error('Failed to pause/resume:', err);
    }
  };

  const handleRefill = async (medId: number) => {
    try {
      const res = await api.request<any>(`/medicines/${medId}/stock`, {
        method: 'PATCH',
        body: JSON.stringify({ amount: 30 }),
      });
      setRefillToast(res.message || 'Prescription refilled! Reminder sent to patient.');
      setTimeout(() => setRefillToast(''), 5000);
      await fetchMedicines();
    } catch (err) {
      console.error('Failed to refill:', err);
    }
  };

  const handleDelete = async (medId: number, medName: string) => {
    if (!window.confirm(`Are you sure you want to delete ${medName}?`)) return;
    try {
      await api.request(`/medicines/${medId}`, { method: 'DELETE' });
      await fetchMedicines();
    } catch (err) {
      console.error('Failed to delete:', err);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      <CaregiverNav />

      {refillToast && (
        <div className="p-4 bg-emerald-50 border-2 border-emerald-400 text-emerald-900 rounded-2xl font-black text-base flex items-center justify-between shadow-sm animate-fadeIn">
          <div className="flex items-center gap-2">
            <span className="text-xl">✅</span>
            <span>{refillToast}</span>
          </div>
          <button
            onClick={() => setRefillToast('')}
            className="text-emerald-700 hover:text-emerald-950 font-bold px-2"
          >
            ✕
          </button>
        </div>
      )}

      {/* Header */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
            Manage Patient Prescriptions
          </h2>
          <p className="text-base sm:text-lg font-semibold text-slate-600 mt-1">
            Create, pause, refill, and configure medications remotely for your linked patient
          </p>
        </div>

        <button
          onClick={() => navigate(`/elderly/medicines/new?patient_id=${activePatientId || ''}`)}
          className="px-6 py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-base flex items-center gap-2 shadow-lg transition"
        >
          <Plus className="w-5 h-5 stroke-[3]" />
          <span>Add New Prescription</span>
        </button>
      </div>

      {loading ? (
        <div className="text-center py-20 text-slate-500 text-2xl font-bold">
          Loading prescriptions...
        </div>
      ) : medicines.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 space-y-4">
          <p className="text-xl font-bold text-slate-700">No prescriptions added for this patient.</p>
          <button
            onClick={() => navigate(`/elderly/medicines/new?patient_id=${activePatientId || ''}`)}
            className="px-6 py-3 bg-blue-600 text-white font-bold rounded-2xl"
          >
            Add Prescription
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {medicines.map((med) => {
            const isLowStock = med.current_stock <= med.refill_threshold;

            return (
              <div
                key={med.id}
                className={`bg-white rounded-3xl p-6 border-2 transition-all shadow-sm flex flex-col justify-between ${
                  med.is_paused ? 'opacity-60 border-slate-200 bg-slate-50' : 'border-slate-200 hover:border-blue-300'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-slate-50 rounded-2xl border border-slate-200 flex-shrink-0">
                        <PillIllustration
                          shape={med.pill_shape}
                          color={med.pill_color}
                          color2={med.pill_color2}
                          imageUrl={med.pill_image_url}
                          size={64}
                        />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-xl font-black text-slate-900">{med.name}</h3>
                          {med.is_critical === 1 && (
                            <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-xs font-black uppercase">
                              Critical
                            </span>
                          )}
                        </div>
                        <p className="text-base font-bold text-blue-700">
                          {med.strength} • {med.quantity_per_dose}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => handleDelete(med.id, med.name)}
                      className="p-2 text-slate-400 hover:text-red-600 rounded-xl hover:bg-red-50 transition"
                      title="Delete prescription"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="mt-4 space-y-1.5 text-sm font-semibold text-slate-600">
                    <p>⏰ Times: {med.time_slots.map((s) => `${s.label || ''} (${s.time})`).join(', ')}</p>
                    <p>🍽️ Instructions: {med.instructions.replace('_', ' ')}</p>
                    {med.notes && <p className="text-xs text-slate-500 italic">"{med.notes}"</p>}
                  </div>
                </div>

                <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 ${
                        isLowStock
                          ? 'bg-amber-100 text-amber-900 border border-amber-300'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      <Package className="w-3.5 h-3.5" />
                      <span>{med.current_stock} tablets left</span>
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleRefill(med.id)}
                      className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold flex items-center gap-1 transition"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>+30 Refill</span>
                    </button>

                    <button
                      onClick={() => handleTogglePause(med.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 transition ${
                        med.is_paused ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {med.is_paused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
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

