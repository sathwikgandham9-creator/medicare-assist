import React, { useState, useEffect } from 'react';
import { CaregiverNav } from '../../components/CaregiverNav';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import {
  TrendingUp,
  BrainCircuit,
  Clock,
  CheckCircle,
  AlertTriangle,
  Lightbulb,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';

export const CaregiverAnalytics: React.FC = () => {
  const { activePatientId } = useAuth();
  const [days, setDays] = useState<'14' | '30'>('14');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [applyingInsightId, setApplyingInsightId] = useState<number | null>(null);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const url = activePatientId
        ? `/caregiver/analytics?patient_id=${activePatientId}&days=${days}`
        : `/caregiver/analytics?days=${days}`;
      const res = await api.request<any>(url);
      setData(res);
    } catch (err) {
      console.error('Failed to load analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [activePatientId, days]);

  const handleApplyInsight = async (insightId: number) => {
    try {
      setApplyingInsightId(insightId);
      await api.request(`/caregiver/insights/${insightId}/apply`, { method: 'POST' });
      await fetchAnalytics();
    } catch (err) {
      console.error('Failed to apply insight:', err);
    } finally {
      setApplyingInsightId(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      <CaregiverNav />

      {/* Header */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
            Adherence Analytics & Adaptive Insights
          </h2>
          <p className="text-base sm:text-lg font-semibold text-slate-600 mt-1">
            Behavior patterns, miss rates across time slots, and automated schedule adaptations
          </p>
        </div>

        {/* 14 / 30 day toggle */}
        <div className="flex items-center gap-1 bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
          <button
            onClick={() => setDays('14')}
            className={`px-4 py-2 rounded-xl text-sm font-extrabold transition ${
              days === '14' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            14 Days
          </button>
          <button
            onClick={() => setDays('30')}
            className={`px-4 py-2 rounded-xl text-sm font-extrabold transition ${
              days === '30' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            30 Days
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-20 text-slate-500 text-2xl font-bold">
          Generating analytics report...
        </div>
      ) : !data ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200">
          <p className="text-xl font-bold text-slate-700">No data available for this patient.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* ADAPTIVE INSIGHTS ENGINE PANEL */}
          <div className="bg-gradient-to-r from-indigo-900 via-blue-900 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/30 flex items-center justify-center border border-indigo-400/40">
                <BrainCircuit className="w-7 h-7 text-indigo-300 animate-pulse" />
              </div>
              <div>
                <span className="text-xs font-black uppercase tracking-widest text-indigo-300">
                  Adaptive Alert Engine
                </span>
                <h3 className="text-2xl sm:text-3xl font-black tracking-tight">
                  Behavior-Based System Adaptations
                </h3>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
              {data.insights?.length === 0 ? (
                <div className="p-4 bg-white/10 rounded-2xl text-slate-300 font-semibold">
                  No adaptations triggered yet. System is monitoring dose confirmation timings.
                </div>
              ) : (
                data.insights.map((ins: any) => (
                  <div
                    key={ins.id}
                    className="bg-white/10 backdrop-blur rounded-2xl p-5 border border-white/20 flex flex-col justify-between space-y-3"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="px-3 py-1 rounded-full bg-indigo-400/20 text-indigo-200 text-xs font-black uppercase">
                          {ins.insight_type.replace('_', ' ')}
                        </span>
                        {ins.is_applied === 1 ? (
                          <span className="text-xs font-bold text-green-400 flex items-center gap-1">
                            <CheckCircle className="w-4 h-4" />
                            Applied Active
                          </span>
                        ) : (
                          <span className="text-xs font-bold text-amber-300 flex items-center gap-1">
                            <Lightbulb className="w-4 h-4" />
                            Recommended
                          </span>
                        )}
                      </div>

                      <h4 className="text-lg font-black text-white mt-2">{ins.title}</h4>
                      <p className="text-sm font-medium text-slate-200 mt-1">{ins.description}</p>
                    </div>

                    {ins.is_applied === 0 && (
                      <button
                        onClick={() => handleApplyInsight(ins.id)}
                        disabled={applyingInsightId === ins.id}
                        className="w-full py-2.5 px-4 rounded-xl bg-blue-500 hover:bg-blue-400 text-white font-extrabold text-sm shadow transition flex items-center justify-center gap-2"
                      >
                        <ShieldCheck className="w-4 h-4" />
                        <span>
                          {applyingInsightId === ins.id ? 'Applying...' : 'Apply Schedule Adjustment'}
                        </span>
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* MISSED DOSE PATTERNS PANEL */}
          <div className="bg-amber-50 rounded-3xl p-6 border-2 border-amber-300 shadow-sm space-y-3">
            <div className="flex items-center gap-2 text-amber-950 font-black text-xl">
              <AlertTriangle className="w-6 h-6 text-amber-600" />
              <span>Detected Behavioral Patterns</span>
            </div>
            <ul className="space-y-2">
              {data.patterns?.map((pat: string, idx: number) => (
                <li key={idx} className="flex items-start gap-2.5 text-base font-bold text-amber-900">
                  <span className="text-amber-600 font-extrabold text-lg">•</span>
                  <span>{pat}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* CHARTS GRID */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 1. 7/30-Day Adherence Trend */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-black text-slate-900">Adherence Trend (%)</h3>
                  <p className="text-xs text-slate-500">Daily dose compliance rate over time</p>
                </div>
                <TrendingUp className="w-6 h-6 text-blue-600" />
              </div>

              <div className="h-72 w-full pt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.trend}>
                    <defs>
                      <linearGradient id="colorRate" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="5%" stopColor="#2563eb" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#2563eb" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="date" stroke="#64748b" fontSize={11} />
                    <YAxis domain={[0, 100]} stroke="#64748b" fontSize={11} unit="%" />
                    <Tooltip
                      formatter={(val: any) => [`${val}%`, 'Adherence']}
                      contentStyle={{ borderRadius: '12px', border: '1px solid #cbd5e1' }}
                    />
                    <Area
                      type="monotone"
                      dataKey="rate"
                      stroke="#2563eb"
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#colorRate)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* 2. Missed Doses by Time of Day (Heatmap / Bar) */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-black text-slate-900">Misses by Time Slot</h3>
                  <p className="text-xs text-slate-500">Distribution of missed doses across the day</p>
                </div>
                <Clock className="w-6 h-6 text-amber-600" />
              </div>

              <div className="h-72 w-full pt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.byTimeOfDay}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="slot" stroke="#64748b" fontSize={11} />
                    <YAxis stroke="#64748b" fontSize={11} />
                    <Tooltip contentStyle={{ borderRadius: '12px' }} />
                    <Legend />
                    <Bar dataKey="missed" name="Missed Doses" fill="#dc2626" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="taken" name="Taken Doses" fill="#16a34a" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* 3. Per-Medicine Compliance */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 space-y-3">
              <div>
                <h3 className="text-xl font-black text-slate-900">Per-Medicine Compliance</h3>
                <p className="text-xs text-slate-500">Compliance percentage per individual prescription</p>
              </div>

              <div className="h-72 w-full pt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.perMedicine} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis type="number" domain={[0, 100]} unit="%" fontSize={11} />
                    <YAxis dataKey="name" type="category" width={110} fontSize={11} stroke="#64748b" />
                    <Tooltip formatter={(v: any) => [`${v}%`, 'Adherence']} />
                    <Bar dataKey="adherence" name="Adherence %" fill="#0284c7" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* 4. Overall Outcome Breakdown (Pie Chart) */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 space-y-3">
              <div>
                <h3 className="text-xl font-black text-slate-900">Outcome Distribution</h3>
                <p className="text-xs text-slate-500">Proportion of taken on time vs snoozed vs missed</p>
              </div>

              <div className="h-72 w-full pt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data.pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={65}
                      outerRadius={95}
                      paddingAngle={5}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {data.pieData?.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

