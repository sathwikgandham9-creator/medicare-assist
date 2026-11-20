import React, { useState } from 'react';
import { CaregiverNav } from '../../components/CaregiverNav';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { Users, UserPlus, PhoneCall, Calendar, Check, ExternalLink } from 'lucide-react';

export const CaregiverPatients: React.FC = () => {
  const { user, activePatientId, setActivePatientId, refreshUser } = useAuth();
  const [patientsList, setPatientsList] = useState<any[]>([]);
  const [code, setCode] = useState('');
  const [linking, setLinking] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  const loadPatients = async () => {
    try {
      const res = await api.request<{ patients: any[] }>('/auth/patients');
      if (res.patients) {
        setPatientsList(res.patients);
        if (!activePatientId && res.patients.length > 0) {
          setActivePatientId(res.patients[0].id);
        }
      }
    } catch {}
  };

  React.useEffect(() => {
    loadPatients();
  }, []);

  const handleLinkPatient = async (e: React.FormEvent) => {
    e.preventDefault();
    setLinking(true);
    setMsg('');
    setError('');

    try {
      const res = await api.request<any>('/auth/link/enter', {
        method: 'POST',
        body: JSON.stringify({ code }),
      });
      setMsg(res.message || 'Patient linked successfully!');
      setCode('');
      await refreshUser();
      await loadPatients();
    } catch (err: any) {
      setError(err.message || 'Failed to link patient');
    } finally {
      setLinking(false);
    }
  };

  const displayList = (user?.linkedPatients && user.linkedPatients.length > 0)
    ? user.linkedPatients
    : patientsList;

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      <CaregiverNav />

      {/* Header */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200">
        <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
          Linked Elderly Patients
        </h2>
        <p className="text-base sm:text-lg font-semibold text-slate-600 mt-1">
          Manage and monitor multiple elderly profiles from your caregiver dashboard
        </p>
      </div>

      {/* Caregiver Link Code and Add Patient Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Share your code */}
        <div className="bg-gradient-to-br from-blue-900 to-indigo-900 text-white rounded-3xl p-6 sm:p-8 shadow-md flex flex-col justify-between space-y-4">
          <div>
            <span className="text-xs font-black uppercase tracking-wider text-blue-300">
              Caregiver Connection
            </span>
            <h3 className="text-2xl font-black mt-1">Your Caregiver Link Code</h3>
            <p className="text-sm text-blue-200 mt-1">
              Give this 6-digit code to an elderly person. When they enter it in their Help screen, their account links instantly.
            </p>
          </div>

          <div className="p-4 bg-white/10 backdrop-blur rounded-2xl border border-white/20 text-center">
            <span className="text-4xl sm:text-5xl font-mono font-black tracking-widest text-white">
              {user?.link_code || '123456'}
            </span>
          </div>
        </div>

        {/* Enter elderly code */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200 flex flex-col justify-between space-y-4">
          <div>
            <h3 className="text-2xl font-black text-slate-900">Link Patient with Code</h3>
            <p className="text-sm font-semibold text-slate-600 mt-1">
              Enter the 6-digit code displayed on the elderly user's app:
            </p>
          </div>

          {msg && <div className="p-3 rounded-xl bg-green-50 border border-green-300 text-green-800 font-bold text-sm">{msg}</div>}
          {error && <div className="p-3 rounded-xl bg-red-50 border border-red-300 text-red-800 font-bold text-sm">{error}</div>}

          <form onSubmit={handleLinkPatient} className="flex gap-2">
            <input
              type="text"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="e.g. 654321"
              className="flex-1 text-2xl font-mono font-black p-3.5 rounded-2xl border-2 border-slate-300 text-center outline-none focus:border-blue-600 tracking-wider"
            />
            <button
              type="submit"
              disabled={linking || code.length !== 6}
              className="px-6 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-base shadow transition disabled:opacity-50 flex items-center gap-1.5"
            >
              <UserPlus className="w-5 h-5" />
              <span>{linking ? 'Linking...' : 'Link'}</span>
            </button>
          </form>
        </div>
      </div>

      {/* Patient Cards List */}
      <div className="space-y-4">
        <h3 className="text-xl sm:text-2xl font-black text-slate-900">Active Patients</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {displayList.map((patient: any) => {
            const isSelected = activePatientId === patient.id;

            return (
              <div
                key={patient.id}
                className={`bg-white rounded-3xl p-6 border-2 transition-all shadow-sm ${
                  isSelected
                    ? 'border-blue-600 ring-2 ring-blue-200'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-blue-100 text-blue-700 font-black text-2xl flex items-center justify-center">
                      {patient.full_name.charAt(0)}
                    </div>
                    <div>
                      <h4 className="text-2xl font-black text-slate-900">{patient.full_name}</h4>
                      <p className="text-sm font-semibold text-slate-500">{patient.email}</p>
                      {patient.phone_number && (
                        <p className="text-sm font-bold text-slate-700 flex items-center gap-1 mt-1">
                          <PhoneCall className="w-4 h-4 text-slate-500" />
                          <span>{patient.phone_number}</span>
                        </p>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => setActivePatientId(patient.id)}
                    className={`px-4 py-2 rounded-xl text-sm font-black transition ${
                      isSelected
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    {isSelected ? 'Active Profile' : 'Select Patient'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

