import React, { useState, useEffect } from 'react';
import { CaregiverNav } from '../../components/CaregiverNav';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { DoseLog } from '../../types';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  Calendar as CalendarIcon,
  Download,
  FileSpreadsheet,
  FileText,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

export const CaregiverHistory: React.FC = () => {
  const { activePatientId, user } = useAuth();
  const [history, setHistory] = useState<DoseLog[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const url = activePatientId
        ? `/doses/history?patient_id=${activePatientId}&limit=300`
        : '/doses/history?limit=300';
      const res = await api.request<{ history: DoseLog[] }>(url);
      setHistory(res.history);
    } catch (err) {
      console.error('Failed to load history:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [activePatientId]);

  // Calendar day calculation
  const getDaysInMonth = (month: number, year: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfWeek = (month: number, year: number) => {
    return new Date(year, month, 1).getDay();
  };

  const daysInCurrentMonth = getDaysInMonth(selectedMonth, selectedYear);
  const firstDay = getFirstDayOfWeek(selectedMonth, selectedYear);

  // Map history logs by date: YYYY-MM-DD
  const logsByDate: Record<string, { taken: number; missed: number; snoozed: number }> = {};
  for (const log of history) {
    const d = log.scheduled_time.split('T')[0];
    if (!logsByDate[d]) {
      logsByDate[d] = { taken: 0, missed: 0, snoozed: 0 };
    }
    if (log.status === 'taken') logsByDate[d].taken++;
    else if (log.status === 'missed') logsByDate[d].missed++;
    logsByDate[d].snoozed += log.snooze_count || 0;
  }

  const getDayStatusColor = (dayNumber: number) => {
    const mStr = String(selectedMonth + 1).padStart(2, '0');
    const dStr = String(dayNumber).padStart(2, '0');
    const dateKey = `${selectedYear}-${mStr}-${dStr}`;

    const data = logsByDate[dateKey];
    if (!data) return 'bg-slate-50 text-slate-400 border-slate-100';

    if (data.missed > 0) {
      return 'bg-red-100 text-red-900 border-red-300 font-black';
    }
    if (data.snoozed > 0) {
      return 'bg-amber-100 text-amber-900 border-amber-300 font-black';
    }
    if (data.taken > 0) {
      return 'bg-green-100 text-green-900 border-green-300 font-black';
    }
    return 'bg-slate-100 text-slate-600 border-slate-200';
  };

  // Filtered table rows
  const filteredLogs = history.filter((log) => {
    if (statusFilter !== 'all' && log.status !== statusFilter) return false;
    if (searchQuery && !log.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  // Export CSV
  const handleExportCSV = () => {
    const headers = ['Date', 'Time', 'Medicine Name', 'Strength', 'Status', 'Minutes Late', 'Snooze Count', 'Escalation Level'];
    const rows = filteredLogs.map((l) => [
      l.scheduled_time.split('T')[0],
      new Date(l.scheduled_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      `"${l.name}"`,
      `"${l.strength}"`,
      l.status.toUpperCase(),
      l.minutes_late || 0,
      l.snooze_count || 0,
      l.escalation_level || 1,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `medicare_adherence_report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export PDF Report for Doctor
  const handleExportPDF = () => {
    const doc = new jsPDF();
    const patientName = user?.linkedPatients?.find((p) => p.id === activePatientId)?.full_name || 'Patient';

    // Title & Header
    doc.setFontSize(20);
    doc.setTextColor(29, 78, 216); // Blue
    doc.text('MediCare Assist - Medication Adherence Report', 14, 20);

    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text(`Generated on: ${new Date().toLocaleString()} | Caregiver: ${user?.full_name || 'Caregiver'}`, 14, 28);
    doc.text(`Patient: ${patientName}`, 14, 34);

    // Summary calculation
    const total = filteredLogs.length;
    const taken = filteredLogs.filter((l) => l.status === 'taken').length;
    const missed = filteredLogs.filter((l) => l.status === 'missed').length;
    const complianceRate = total > 0 ? Math.round((taken / total) * 100) : 100;

    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    doc.text(`Summary: ${total} Total Scheduled Doses | ${taken} Taken (${complianceRate}%) | ${missed} Missed`, 14, 44);

    // AutoTable
    const tableData = filteredLogs.slice(0, 45).map((l) => [
      l.scheduled_time.split('T')[0],
      new Date(l.scheduled_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      l.name,
      l.strength,
      l.status.toUpperCase(),
      `${l.minutes_late || 0} min`,
      l.snooze_count || 0,
    ]);

    autoTable(doc, {
      startY: 50,
      head: [['Date', 'Time', 'Medicine', 'Strength', 'Status', 'Delay', 'Snoozes']],
      body: tableData,
      headStyles: { fillColor: [29, 78, 216] },
      alternateRowStyles: { fillColor: [248, 250, 252] },
    });

    doc.save(`medicare_doctor_report_${patientName.replace(/\s+/g, '_')}.pdf`);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      <CaregiverNav />

      {/* Header and Export buttons */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
            History & Compliance Calendar
          </h2>
          <p className="text-base sm:text-lg font-semibold text-slate-600 mt-1">
            Visual adherence calendar, searchable records, and exportable doctor reports
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleExportCSV}
            className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-extrabold text-sm flex items-center gap-2 transition"
          >
            <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={handleExportPDF}
            className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-sm flex items-center gap-2 shadow-md transition"
          >
            <FileText className="w-5 h-5" />
            <span>Export Doctor PDF</span>
          </button>
        </div>
      </div>

      {/* CALENDAR VIEW */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarIcon className="w-6 h-6 text-blue-600" />
            <h3 className="text-xl sm:text-2xl font-black text-slate-900">
              {new Date(selectedYear, selectedMonth).toLocaleDateString('en-US', {
                month: 'long',
                year: 'numeric',
              })}
            </h3>
          </div>

          {/* Month Navigation */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                if (selectedMonth === 0) {
                  setSelectedMonth(11);
                  setSelectedYear(selectedYear - 1);
                } else {
                  setSelectedMonth(selectedMonth - 1);
                }
              }}
              className="p-2 rounded-xl hover:bg-slate-100 text-slate-600"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <button
              onClick={() => {
                if (selectedMonth === 11) {
                  setSelectedMonth(0);
                  setSelectedYear(selectedYear + 1);
                } else {
                  setSelectedMonth(selectedMonth + 1);
                }
              }}
              className="p-2 rounded-xl hover:bg-slate-100 text-slate-600"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-xs font-bold text-slate-600 flex-wrap">
          <span className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded-full bg-green-500" /> All Taken
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded-full bg-amber-500" /> Snoozed / Delayed
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded-full bg-red-500" /> Missed Doses
          </span>
        </div>

        {/* Day Grid */}
        <div className="grid grid-cols-7 gap-2 text-center">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
            <span key={d} className="font-extrabold text-xs text-slate-400 py-1 uppercase">
              {d}
            </span>
          ))}

          {/* Empty cells before 1st of month */}
          {Array.from({ length: firstDay }).map((_, idx) => (
            <div key={`empty-${idx}`} className="h-14 sm:h-16 rounded-2xl bg-slate-50/50" />
          ))}

          {/* Days */}
          {Array.from({ length: daysInCurrentMonth }).map((_, idx) => {
            const dayNum = idx + 1;
            const colorClass = getDayStatusColor(dayNum);

            return (
              <div
                key={`day-${dayNum}`}
                className={`h-14 sm:h-16 rounded-2xl border-2 flex flex-col items-center justify-center p-1 transition shadow-xs ${colorClass}`}
              >
                <span className="text-base sm:text-lg font-black">{dayNum}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* SEARCHABLE TABLE VIEW */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search bar */}
          <div className="relative flex-1">
            <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by medicine name..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold outline-none focus:border-blue-600"
            />
          </div>

          {/* Status filter pills */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            {['all', 'taken', 'missed', 'snoozed'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-lg text-xs font-black capitalize transition ${
                  statusFilter === st ? 'bg-blue-600 text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600 font-black border-b border-slate-200 uppercase text-xs">
              <tr>
                <th className="py-3 px-4">Date & Time</th>
                <th className="py-3 px-4">Medicine</th>
                <th className="py-3 px-4">Dosage</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Delay</th>
                <th className="py-3 px-4">Snoozes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredLogs.map((log) => {
                const dateObj = new Date(log.scheduled_time);
                return (
                  <tr key={log.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3 px-4 font-bold text-slate-900">
                      {dateObj.toLocaleDateString()} at{' '}
                      {dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="py-3 px-4 font-black text-slate-900">{log.name}</td>
                    <td className="py-3 px-4 text-slate-600">{log.strength}</td>
                    <td className="py-3 px-4">
                      {log.status === 'taken' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-green-100 text-green-800 text-xs font-bold">
                          <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                          Taken
                        </span>
                      ) : log.status === 'missed' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-red-100 text-red-800 text-xs font-bold">
                          <XCircle className="w-3.5 h-3.5 text-red-600" />
                          Missed
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 text-xs font-bold">
                          <Clock className="w-3.5 h-3.5 text-amber-600" />
                          Snoozed
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {log.minutes_late ? `${log.minutes_late} min` : 'On time'}
                    </td>
                    <td className="py-3 px-4 text-slate-600">{log.snooze_count || 0}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

