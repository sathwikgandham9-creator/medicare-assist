import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { CaregiverNav } from '../../components/CaregiverNav';
import { PillIllustration } from '../../components/PillIllustration';
import { api } from '../../services/api';
import {
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  TrendingUp,
  Package,
  Plus,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';

export const CaregiverDashboard: React.FC = () => {
  const { user, activePatientId, setActivePatientId } = useAuth();
  const navigate = useNavigate();

  const [overview, setOverview] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchOverview = async () => {
    try {
      setLoading(true);
      const url = activePatientId
        ? `/caregiver/overview?patient_id=${activePatientId}`
        : '/caregiver/overview';
      const data = await api.request<any>(url);
      setOverview(data);
      if (data?.patient?.id && !activePatientId) {
        setActivePatientId(data.patient.id);
      }
    } catch (err) {
      console.error('Failed to load overview:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, [activePatientId]);

  const patientList =
    user?.linkedPatients && user.linkedPatients.length > 0
      ? user.linkedPatients
      : overview?.patient
      ? [overview.patient]
      : [];

  const [refillToast, setRefillToast] = useState('');

  const handleRefill = async (medId: number) => {
    try {
      const res = await api.request<any>(`/medicines/${medId}/stock`, {
        method: 'PATCH',
        body: JSON.stringify({ amount: 30 }),
      });
      setRefillToast(res.message || 'Prescription refilled! Reminder sent to patient.');
      setTimeout(() => setRefillToast(''), 5000);
      await fetchOverview();
    } catch (err) {
      console.error('Failed to refill:', err);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Caregiver Navigation Header */}
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

      {/* Patient Switcher Bar */}
      <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-blue-100 flex items-center justify-center text-blue-700">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-bold uppercase text-slate-500 tracking-wider">
              Monitoring Patient
            </span>
            <div className="flex items-center gap-2">
              <select
                value={activePatientId || (patientList[0]?.id || '')}
                onChange={(e) => setActivePatientId(Number(e.target.value))}
                className="text-xl sm:text-2xl font-black text-slate-900 bg-transparent cursor-pointer focus:outline-none"
              >
                {patientList.map((p: any) => (
                  <option key={p.id} value={p.id}>
                    {p.full_name}
                  </option>
                ))}
                {patientList.length === 0 && (
                  <option value="">No linked patients</option>
                )}
              </select>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate(`/elderly/medicines/new?patient_id=${activePatientId || ''}`)}
            className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm sm:text-base flex items-center gap-1.5 shadow transition"
          >
            <Plus className="w-5 h-5" />
            <span>Add Medicine</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-20 text-slate-500 text-2xl font-bold">
          Loading patient dashboard...
        </div>
      ) : !overview?.hasPatient ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 space-y-4">
          <Users className="w-16 h-16 text-slate-400 mx-auto" />
          <h3 className="text-2xl font-black text-slate-800">No Patient Linked Yet</h3>
          <p className="text-lg text-slate-600 max-w-md mx-auto">
            {overview?.message || 'Link an elderly user using their 6-digit link code to begin monitoring.'}
          </p>
          <button
            onClick={() => navigate('/caregiver/patients')}
            className="px-6 py-3 bg-blue-600 text-white font-bold rounded-2xl shadow-lg"
          >
            Go to Patients Page
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Daily Summary Banner */}
          <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div>
              <span className="text-xs sm:text-sm uppercase font-extrabold tracking-widest text-blue-300">
                Caregiver Daily Briefing
              </span>
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight mt-1">
                {overview.dailySummary}
              </h2>
              <p className="text-base text-slate-300 mt-1">
                Adherence behavior analysis: <span className="font-bold text-white">{overview.riskReason}</span>
              </p>
            </div>

            <div className="flex items-center gap-4">
              {/* Adherence Gauge */}
              <div className="flex flex-col items-center bg-white/10 backdrop-blur px-5 py-3 rounded-2xl border border-white/20">
                <span className="text-xs font-bold uppercase text-slate-300">Adherence Score</span>
                <span className="text-3xl sm:text-4xl font-black text-green-400">
                  {overview.adherenceScore}%
                </span>
              </div>

              {/* Risk Level Badge */}
              <div className="flex flex-col items-center bg-white/10 backdrop-blur px-5 py-3 rounded-2xl border border-white/20">
                <span className="text-xs font-bold uppercase text-slate-300">Risk Level</span>
                <span
                  className={`text-2xl sm:text-3xl font-black ${
                    overview.riskLevel === 'High'
                      ? 'text-red-400'
                      : overview.riskLevel === 'Medium'
                      ? 'text-amber-400'
                      : 'text-green-400'
                  }`}
                >
                  {overview.riskLevel}
                </span>
              </div>
            </div>
          </div>

          {/* Low Stock Warning Banner if any */}
          {overview.lowStockWarnings?.length > 0 && (
            <div className="bg-amber-50 border-2 border-amber-300 rounded-3xl p-5 shadow-sm space-y-3">
              <div className="flex items-center gap-2 text-amber-900 font-black text-lg">
                <Package className="w-6 h-6 text-amber-600" />
                <span>Low Stock Warnings ({overview.lowStockWarnings.length})</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {overview.lowStockWarnings.map((item: any) => (
                  <div
                    key={item.id}
                    className="bg-white p-4 rounded-2xl border border-amber-200 flex items-center justify-between shadow-xs"
                  >
                    <div className="flex items-center gap-3">
                      <PillIllustration
                        shape={item.pill_shape}
                        color={item.pill_color}
                        size={40}
                        showShadow={false}
                      />
                      <div>
                        <h4 className="font-bold text-slate-900 text-base">{item.name}</h4>
                        <p className="text-xs text-amber-700 font-semibold">
                          Only {item.current_stock} tablets left (threshold: {item.refill_threshold})
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRefill(item.id)}
                      className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-xl shadow-xs"
                    >
                      +30 Refill
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Stat Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
              <span className="text-slate-500 font-bold text-sm">Total Today</span>
              <div className="text-3xl font-black text-slate-900 mt-1">
                {overview.counts.total}
              </div>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-green-200 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-green-700 font-bold text-sm">Taken</span>
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              </div>
              <div className="text-3xl font-black text-green-700 mt-1">
                {overview.counts.taken}
              </div>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-red-200 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-red-700 font-bold text-sm">Missed</span>
                <XCircle className="w-5 h-5 text-red-600" />
              </div>
              <div className="text-3xl font-black text-red-700 mt-1">
                {overview.counts.missed}
              </div>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-blue-200 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-blue-700 font-bold text-sm">Pending</span>
                <Clock className="w-5 h-5 text-blue-600" />
              </div>
              <div className="text-3xl font-black text-blue-700 mt-1">
                {overview.counts.pending}
              </div>
            </div>
          </div>

          {/* Today's Schedule Table */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xl sm:text-2xl font-black text-slate-900">
                Today's Medication Activity
              </h3>
              <button
                onClick={() => navigate('/caregiver/history')}
                className="text-blue-600 hover:text-blue-800 font-bold text-sm flex items-center gap-1"
              >
                <span>Full History</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              {overview.todayDoses?.map((dose: any) => (
                <div
                  key={dose.id}
                  className="p-4 rounded-2xl border border-slate-200 flex items-center justify-between gap-4 hover:bg-slate-50 transition"
                >
                  <div className="flex items-center gap-3">
                    <PillIllustration
                      shape={dose.pill_shape}
                      color={dose.pill_color}
                      size={52}
                      showShadow={false}
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-slate-900 text-lg">{dose.name}</span>
                        {dose.is_critical === 1 && (
                          <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-xs font-bold uppercase">
                            Critical
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-semibold text-slate-600">
                        {dose.strength} • Scheduled:{' '}
                        {new Date(dose.scheduled_time).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>

                  <div>
                    {dose.status === 'taken' ? (
                      <span className="px-3 py-1 rounded-full bg-green-100 text-green-800 font-extrabold text-sm flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                        <span>Taken</span>
                      </span>
                    ) : dose.status === 'missed' ? (
                      <span className="px-3 py-1 rounded-full bg-red-100 text-red-800 font-extrabold text-sm flex items-center gap-1">
                        <XCircle className="w-4 h-4 text-red-600" />
                        <span>Missed</span>
                      </span>
                    ) : dose.status === 'snoozed' ? (
                      <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-900 font-bold text-sm flex items-center gap-1">
                        <Clock className="w-4 h-4 text-amber-600" />
                        <span>Snoozed ({dose.snooze_count}x)</span>
                      </span>
                    ) : (
                      <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-700 font-bold text-sm">
                        Upcoming
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

