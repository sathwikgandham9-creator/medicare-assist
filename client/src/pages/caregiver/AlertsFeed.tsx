import React, { useState, useEffect } from 'react';
import { CaregiverNav } from '../../components/CaregiverNav';
import { PillIllustration } from '../../components/PillIllustration';
import { Alert } from '../../types';
import { api } from '../../services/api';
import { soundService } from '../../services/sound';
import {
  Bell,
  CheckCircle,
  AlertTriangle,
  ShieldAlert,
  Clock,
  Package,
  Volume2,
  Filter,
} from 'lucide-react';

export const AlertsFeed: React.FC = () => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unacknowledged' | 'critical'>('all');
  const [sseConnected, setSseConnected] = useState(false);

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      const res = await api.request<{ alerts: Alert[] }>('/alerts');
      setAlerts(res.alerts);
    } catch (err) {
      console.error('Failed to load alerts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();

    // Setup Server-Sent Events (SSE) connection
    const token = api.getToken();
    if (!token) return;

    const eventSource = new EventSource(`/api/alerts/stream?token=${encodeURIComponent(token)}`);

    eventSource.onopen = () => {
      setSseConnected(true);
    };

    eventSource.addEventListener('alert', (event: MessageEvent) => {
      try {
        const newAlert = JSON.parse(event.data) as Alert;
        setAlerts((prev) => [newAlert, ...prev]);

        // Play sound for critical alerts
        if (newAlert.severity === 'critical') {
          soundService.playCaregiverCriticalAlert();
        }
      } catch (err) {
        console.error('Error handling SSE alert event:', err);
      }
    });

    eventSource.addEventListener('sos', (event: MessageEvent) => {
      try {
        const newAlert = JSON.parse(event.data) as Alert;
        setAlerts((prev) => [newAlert, ...prev]);
        soundService.playCaregiverCriticalAlert();
      } catch (err) {
        console.error('Error handling SSE sos event:', err);
      }
    });

    eventSource.addEventListener('alert_acknowledged', (event: MessageEvent) => {
      try {
        const { alertId } = JSON.parse(event.data);
        setAlerts((prev) =>
          prev.map((a) => (a.id === alertId ? { ...a, is_acknowledged: 1 } : a))
        );
      } catch (err) {
        console.error('Error handling alert_acknowledged event:', err);
      }
    });

    eventSource.onerror = () => {
      setSseConnected(false);
    };

    return () => {
      eventSource.close();
    };
  }, []);

  const handleAcknowledge = async (alertId: number) => {
    try {
      await api.request(`/alerts/${alertId}/acknowledge`, { method: 'POST' });
      setAlerts((prev) =>
        prev.map((a) => (a.id === alertId ? { ...a, is_acknowledged: 1 } : a))
      );
    } catch (err) {
      console.error('Failed to acknowledge alert:', err);
    }
  };

  const filteredAlerts = alerts.filter((a) => {
    if (filter === 'unacknowledged') return a.is_acknowledged === 0;
    if (filter === 'critical') return a.severity === 'critical';
    return true;
  });

  const getAlertIcon = (type: string, severity: string) => {
    if (type === 'sos') {
      return <ShieldAlert className="w-8 h-8 text-red-600 animate-pulse" />;
    }
    if (type === 'low_stock') {
      return <Package className="w-8 h-8 text-amber-600" />;
    }
    if (severity === 'critical') {
      return <AlertTriangle className="w-8 h-8 text-red-600" />;
    }
    return <Bell className="w-8 h-8 text-blue-600" />;
  };

  const unreadCount = alerts.filter((a) => a.is_acknowledged === 0).length;

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      <CaregiverNav unreadAlertCount={unreadCount} />

      {/* Header and SSE status */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
              Live Alerts Feed
            </h2>
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-800">
              <span className={`w-2.5 h-2.5 rounded-full ${sseConnected ? 'bg-green-500 animate-ping' : 'bg-slate-400'}`} />
              <span>{sseConnected ? 'Live SSE Connected' : 'Connecting...'}</span>
            </div>
          </div>
          <p className="text-base sm:text-lg font-semibold text-slate-600 mt-1">
            Real-time notifications for missed doses, SOS emergencies, and stock alerts
          </p>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-2xl border border-slate-200">
          {(['all', 'unacknowledged', 'critical'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-xl text-sm font-bold capitalize transition ${
                filter === f
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {f} {f === 'unacknowledged' && unreadCount > 0 ? `(${unreadCount})` : ''}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-20 text-slate-500 text-2xl font-bold">
          Loading alerts stream...
        </div>
      ) : filteredAlerts.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 space-y-3">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
          <h3 className="text-2xl font-black text-slate-800">All Clear!</h3>
          <p className="text-lg text-slate-600">No active alerts match this filter.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredAlerts.map((alert) => {
            const isUnread = alert.is_acknowledged === 0;

            return (
              <div
                key={alert.id}
                className={`p-6 rounded-3xl border-2 transition-all shadow-sm ${
                  alert.severity === 'critical'
                    ? isUnread
                      ? 'bg-red-50/80 border-red-400 ring-2 ring-red-200'
                      : 'bg-white border-red-200'
                    : alert.severity === 'warning'
                    ? isUnread
                      ? 'bg-amber-50/80 border-amber-300'
                      : 'bg-white border-amber-200'
                    : 'bg-white border-slate-200'
                }`}
              >
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-white rounded-2xl border border-slate-200 shadow-xs flex-shrink-0">
                      {getAlertIcon(alert.alert_type, alert.severity)}
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`px-3 py-0.5 rounded-full text-xs font-black uppercase tracking-wider ${
                            alert.severity === 'critical'
                              ? 'bg-red-600 text-white'
                              : alert.severity === 'warning'
                              ? 'bg-amber-500 text-slate-950'
                              : 'bg-blue-600 text-white'
                          }`}
                        >
                          {alert.severity}
                        </span>

                        {alert.patient_name && (
                          <span className="text-sm font-bold text-slate-600">
                            Patient: <span className="text-slate-900">{alert.patient_name}</span>
                          </span>
                        )}

                        <span className="text-xs font-semibold text-slate-400">
                          {new Date(alert.created_at).toLocaleString()}
                        </span>
                      </div>

                      <h4 className="text-xl sm:text-2xl font-black text-slate-900">
                        {alert.title}
                      </h4>

                      <p className="text-base sm:text-lg font-medium text-slate-700">
                        {alert.message}
                      </p>
                    </div>
                  </div>

                  {/* Acknowledge Button */}
                  <div className="self-end sm:self-center flex-shrink-0">
                    {isUnread ? (
                      <button
                        onClick={() => handleAcknowledge(alert.id)}
                        className="px-5 py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-base shadow-md flex items-center gap-2 transition active:scale-95"
                      >
                        <CheckCircle className="w-5 h-5 text-green-400" />
                        <span>Acknowledge</span>
                      </button>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-sm font-bold text-slate-400 px-3 py-1.5 rounded-xl bg-slate-100">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <span>Acknowledged</span>
                      </span>
                    )}
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

