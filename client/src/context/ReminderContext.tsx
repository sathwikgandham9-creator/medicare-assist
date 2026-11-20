import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import confetti from 'canvas-confetti';
import { DoseLog } from '../types';
import { api } from '../services/api';
import { soundService } from '../services/sound';
import { speechService } from '../services/speech';
import { useAuth } from './AuthContext';
import { useAccessibility } from './AccessibilityContext';

export interface RefillNotice {
  id: number;
  medicine_id: number;
  medicine_name: string;
  strength: string;
  pill_shape?: any;
  pill_color?: any;
  pill_color2?: any;
  added_amount: number;
  new_stock: number;
  caregiver_name: string;
  title: string;
  message: string;
}

interface ReminderContextType {
  activeDose: DoseLog | null;
  todayDoses: DoseLog[];
  loadingToday: boolean;
  refillNotice: RefillNotice | null;
  takeDose: (doseId: number) => Promise<void>;
  snoozeDose: (doseId: number) => Promise<void>;
  skipDose: (doseId: number, reason?: string) => Promise<void>;
  dismissReminder: () => void;
  dismissRefillNotice: () => void;
  refreshDoses: () => Promise<void>;
  notificationPermission: NotificationPermission;
  requestNotificationPermission: () => Promise<void>;
  simulateDueDose: (level?: number) => Promise<void>;
}

const ReminderContext = createContext<ReminderContextType | undefined>(undefined);

export const ReminderProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const { language, voiceEnabled } = useAccessibility();

  const [todayDoses, setTodayDoses] = useState<DoseLog[]>([]);
  const [activeDose, setActiveDose] = useState<DoseLog | null>(null);
  const [refillNotice, setRefillNotice] = useState<RefillNotice | null>(null);
  const [loadingToday, setLoadingToday] = useState<boolean>(false);
  const [dismissedDoseIds, setDismissedDoseIds] = useState<number[]>([]);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>(() => {
    return typeof Notification !== 'undefined' ? Notification.permission : 'default';
  });

  const requestNotificationPermission = async () => {
    if (typeof Notification !== 'undefined') {
      try {
        const perm = await Notification.requestPermission();
        setNotificationPermission(perm);
      } catch (err) {
        console.error('Notification permission error:', err);
      }
    }
  };

  const refreshDoses = useCallback(async () => {
    if (!user || user.role !== 'elderly') return;

    try {
      setLoadingToday(true);
      const res = await api.request<{ doses: DoseLog[] }>('/doses/today');
      setTodayDoses(res.doses);

      // Cache offline
      localStorage.setItem('medicare_cached_today_doses', JSON.stringify(res.doses));

      // Check if any dose is due right now
      const now = new Date();
      for (const dose of res.doses) {
        if (['scheduled', 'snoozed'].includes(dose.status)) {
          const scheduled = new Date(dose.scheduled_time);
          const diffMinutes = Math.floor((now.getTime() - scheduled.getTime()) / (1000 * 60));

          // If due or overdue, and not manually dismissed in this session
          if (diffMinutes >= 0 && !dismissedDoseIds.includes(dose.id)) {
            // Trigger reminder
            triggerReminder(dose);
            break;
          }
        }
      }
    } catch (err) {
      console.warn('Failed to fetch today doses, falling back to cache:', err);
      const cached = localStorage.getItem('medicare_cached_today_doses');
      if (cached) {
        setTodayDoses(JSON.parse(cached));
      }
    } finally {
      setLoadingToday(false);
    }
  }, [user, dismissedDoseIds]);

  const triggerReminder = (dose: DoseLog) => {
    setActiveDose(dose);

    // 1. Play sound
    soundService.playAlarmByLevel(dose.escalation_level || 1);

    // 2. Browser notification
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      try {
        const title = `Time to take your ${dose.name} (${dose.strength})`;
        const body = `Scheduled: ${new Date(dose.scheduled_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • ${dose.instructions.replace('_', ' ')}`;
        new Notification(title, {
          body,
          icon: '/pill-logo.svg',
          tag: `med-${dose.id}`,
          requireInteraction: true,
        });
      } catch (e) {
        // Notification API fallback
      }
    }

    // 3. Voice read-aloud if enabled
    if (voiceEnabled) {
      const timeStr = new Date(dose.scheduled_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const speechText = speechService.buildReminderSpeech(
        timeStr,
        dose.pill_color,
        dose.pill_shape,
        dose.name,
        dose.strength,
        dose.instructions,
        language
      );

      if (dose.escalation_level >= 3) {
        speechService.startRepeatingAnnouncement(speechText, language);
      } else {
        speechService.speak(speechText, language);
      }
    }
  };

  // Poll for due doses every 10 seconds for elderly user
  useEffect(() => {
    if (!user || user.role !== 'elderly') return;

    refreshDoses();
    const interval = setInterval(() => {
      refreshDoses();
    }, 10000);

    return () => clearInterval(interval);
  }, [user, refreshDoses]);

  // Real-time SSE listener for elderly patient (e.g. Refill Reminders from Caregiver!)
  useEffect(() => {
    if (!user || user.role !== 'elderly') return;

    const token = api.getToken();
    if (!token) return;

    const es = new EventSource(`/api/alerts/stream?token=${encodeURIComponent(token)}`);

    es.addEventListener('refill_reminder', (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data) as RefillNotice;
        setRefillNotice(data);
        soundService.playLevel1Gentle();

        if (voiceEnabled) {
          const speech =
            language === 'hi'
              ? `आपके केयरगिवर ${data.caregiver_name} ने आपकी ${data.medicine_name} दवा पुनः भर दी है।`
              : language === 'te'
              ? `మీ కేర్‌గివర్ ${data.caregiver_name} మీ ${data.medicine_name} మందును రీఫిల్ చేశారు.`
              : `Your caregiver, ${data.caregiver_name}, has arranged a refill for your ${data.medicine_name}. ${data.added_amount} new tablets added.`;
          speechService.speak(speech, language);
        }

        refreshDoses();
      } catch (err) {
        console.error('Error handling refill_reminder event:', err);
      }
    });

    // Check for any unacknowledged refill alerts on login
    api
      .request<{ alerts: any[] }>('/alerts')
      .then((res) => {
        const unackedRefill = res.alerts?.find(
          (a) => a.alert_type === 'refill_reminder' && a.is_acknowledged === 0
        );
        if (unackedRefill) {
          setRefillNotice({
            id: unackedRefill.id,
            medicine_id: unackedRefill.medicine_id,
            medicine_name: unackedRefill.medicine_name || 'Prescription',
            strength: '',
            pill_shape: unackedRefill.pill_shape,
            pill_color: unackedRefill.pill_color,
            added_amount: 30,
            new_stock: 30,
            caregiver_name: 'Caregiver',
            title: unackedRefill.title,
            message: unackedRefill.message,
          });
        }
      })
      .catch(() => {});

    return () => {
      es.close();
    };
  }, [user, language, voiceEnabled, refreshDoses]);

  const dismissRefillNotice = () => {
    if (refillNotice?.id) {
      api.request(`/alerts/${refillNotice.id}/acknowledge`, { method: 'POST' }).catch(() => {});
    }
    setRefillNotice(null);
  };

  const dismissReminder = () => {
    soundService.stop();
    speechService.cancel();
    if (activeDose) {
      setDismissedDoseIds((prev) => [...prev, activeDose.id]);
    }
    setActiveDose(null);
  };

  const takeDose = async (doseId: number) => {
    soundService.stop();
    speechService.cancel();

    // Trigger celebration confetti!
    confetti({
      particleCount: 120,
      spread: 80,
      origin: { y: 0.6 },
    });
    soundService.playSuccessTune();

    if (voiceEnabled) {
      const praise =
        language === 'hi'
          ? 'शाबाश! दवा दर्ज कर ली गई है।'
          : language === 'te'
          ? 'చాలా బాగుంది! మందు తీసుకున్నారు.'
          : 'Great job! Your medicine has been recorded.';
      speechService.speak(praise, language);
    }

    try {
      await api.request(`/doses/${doseId}/respond`, {
        method: 'POST',
        body: JSON.stringify({ status: 'taken' }),
      });
      setActiveDose(null);
      await refreshDoses();
    } catch (err) {
      console.error('Take dose error:', err);
    }
  };

  const snoozeDose = async (doseId: number) => {
    soundService.stop();
    speechService.cancel();

    if (voiceEnabled) {
      const msg =
        language === 'hi'
          ? '10 मिनट बाद याद दिलाएंगे।'
          : language === 'te'
          ? '10 నిమిషాల తర్వాత గుర్తు చేస్తాము.'
          : 'Snoozed for 10 minutes.';
      speechService.speak(msg, language);
    }

    try {
      await api.request(`/doses/${doseId}/respond`, {
        method: 'POST',
        body: JSON.stringify({ status: 'snoozed' }),
      });
      setActiveDose(null);
      await refreshDoses();
    } catch (err) {
      console.error('Snooze dose error:', err);
    }
  };

  const skipDose = async (doseId: number, reason = 'User skipped dose') => {
    soundService.stop();
    speechService.cancel();

    try {
      await api.request(`/doses/${doseId}/respond`, {
        method: 'POST',
        body: JSON.stringify({ status: 'skipped', notes: reason }),
      });
      setActiveDose(null);
      await refreshDoses();
    } catch (err) {
      console.error('Skip dose error:', err);
    }
  };

  const simulateDueDose = async (level = 1) => {
    try {
      const res = await api.request<{ message: string; doseId: number }>('/demo/simulate-due-dose', {
        method: 'POST',
        body: JSON.stringify({ level }),
      });
      await refreshDoses();
    } catch (err) {
      console.error('Simulate dose error:', err);
    }
  };

  return (
    <ReminderContext.Provider
      value={{
        activeDose,
        todayDoses,
        loadingToday,
        refillNotice,
        takeDose,
        snoozeDose,
        skipDose,
        dismissReminder,
        dismissRefillNotice,
        refreshDoses,
        notificationPermission,
        requestNotificationPermission,
        simulateDueDose,
      }}
    >
      {children}
    </ReminderContext.Provider>
  );
};

export const useReminder = () => {
  const ctx = useContext(ReminderContext);
  if (!ctx) throw new Error('useReminder must be used within ReminderProvider');
  return ctx;
};
