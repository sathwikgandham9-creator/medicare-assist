import { db } from '../db/db.js';
import { sseManager } from '../sse.js';

export interface DoseWithDetails {
  id: number;
  medicine_id: number;
  user_id: number;
  scheduled_time: string;
  status: 'scheduled' | 'taken' | 'snoozed' | 'missed' | 'skipped';
  actual_time: string | null;
  minutes_late: number;
  snooze_count: number;
  escalation_level: number;
  caregiver_alerted: number;
  notes: string | null;
  name: string;
  generic_name: string | null;
  pill_shape: string;
  pill_color: string;
  pill_color2: string | null;
  pill_image_url: string | null;
  strength: string;
  quantity_per_dose: string;
  instructions: string;
  is_critical: number;
  current_stock: number;
  refill_threshold: number;
}

export interface CaregiverSettings {
  grace_period_minutes: number;
  level2_minutes: number;
  level3_minutes: number;
  level4_minutes: number;
  critical_level4_minutes: number;
  max_snoozes: number;
  pre_remind_miss_prone: number;
  time_acceleration: number;
}

export function getCaregiverSettings(userId: number): CaregiverSettings {
  const row = db.prepare(`SELECT * FROM caregiver_settings WHERE user_id = ?`).get(userId) as any;
  if (!row) {
    const defaultSettings: CaregiverSettings = {
      grace_period_minutes: 30,
      level2_minutes: 5,
      level3_minutes: 10,
      level4_minutes: 20,
      critical_level4_minutes: 10,
      max_snoozes: 3,
      pre_remind_miss_prone: 1,
      time_acceleration: 1,
    };
    db.prepare(`
      INSERT INTO caregiver_settings (user_id, grace_period_minutes, level2_minutes, level3_minutes, level4_minutes, critical_level4_minutes, max_snoozes, pre_remind_miss_prone, time_acceleration, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `).run(
      userId,
      defaultSettings.grace_period_minutes,
      defaultSettings.level2_minutes,
      defaultSettings.level3_minutes,
      defaultSettings.level4_minutes,
      defaultSettings.critical_level4_minutes,
      defaultSettings.max_snoozes,
      defaultSettings.pre_remind_miss_prone,
      defaultSettings.time_acceleration
    );
    return defaultSettings;
  }
  return {
    grace_period_minutes: row.grace_period_minutes,
    level2_minutes: row.level2_minutes,
    level3_minutes: row.level3_minutes,
    level4_minutes: row.level4_minutes,
    critical_level4_minutes: row.critical_level4_minutes,
    max_snoozes: row.max_snoozes,
    pre_remind_miss_prone: row.pre_remind_miss_prone,
    time_acceleration: row.time_acceleration,
  };
}

// Generate today's doses for an elderly user if they haven't been created yet
export function generateTodayDoses(userId?: number) {
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
  const dayOfWeek = now.toLocaleDateString('en-US', { weekday: 'short' }); // Mon, Tue...

  const userQuery = userId
    ? db.prepare(`SELECT id FROM users WHERE role = 'elderly' AND id = ?`).all(userId)
    : db.prepare(`SELECT id FROM users WHERE role = 'elderly'`).all();

  for (const user of userQuery as any[]) {
    const medicines = db.prepare(`SELECT * FROM medicines WHERE user_id = ? AND is_paused = 0`).all(user.id) as any[];

    for (const med of medicines) {
      // Check frequency
      let shouldScheduleToday = false;
      if (med.frequency === 'every_day') {
        shouldScheduleToday = true;
      } else if (med.frequency === 'specific_days') {
        const details = med.frequency_details ? JSON.parse(med.frequency_details) : [];
        if (Array.isArray(details) && details.includes(dayOfWeek)) {
          shouldScheduleToday = true;
        }
      } else if (med.frequency === 'every_other_day') {
        const dayDiff = Math.floor(now.getTime() / (1000 * 60 * 60 * 24));
        shouldScheduleToday = dayDiff % 2 === 0;
      } else if (med.frequency === 'prn') {
        // As needed: do not auto-generate scheduled slots
        shouldScheduleToday = false;
      } else {
        shouldScheduleToday = true;
      }

      if (!shouldScheduleToday) continue;

      let slots: { time: string; label?: string }[] = [];
      try {
        slots = JSON.parse(med.time_slots);
      } catch (e) {
        slots = [{ time: '08:00', label: 'Morning' }];
      }

      for (const slot of slots) {
        const scheduledTime = `${todayStr}T${slot.time}:00`;
        // Check if already created
        const existing = db.prepare(`
          SELECT id FROM dose_logs 
          WHERE medicine_id = ? AND user_id = ? AND scheduled_time = ?
        `).get(med.id, user.id, scheduledTime);

        if (!existing) {
          db.prepare(`
            INSERT INTO dose_logs (medicine_id, user_id, scheduled_time, status, escalation_level, snooze_count, caregiver_alerted, created_at, updated_at)
            VALUES (?, ?, ?, 'scheduled', 1, 0, 0, datetime('now'), datetime('now'))
          `).run(med.id, user.id, scheduledTime);
        }
      }
    }
  }
}

// Process escalation ladder for unconfirmed doses
export function processEscalations() {
  const now = new Date();
  const unconfirmedDoses = db.prepare(`
    SELECT d.*, m.name, m.generic_name, m.pill_shape, m.pill_color, m.pill_color2, m.pill_image_url,
           m.strength, m.quantity_per_dose, m.instructions, m.is_critical, m.current_stock, m.refill_threshold
    FROM dose_logs d
    JOIN medicines m ON d.medicine_id = m.id
    WHERE d.status IN ('scheduled', 'snoozed')
  `).all() as unknown as DoseWithDetails[];

  for (const dose of unconfirmedDoses) {
    const scheduledDate = new Date(dose.scheduled_time);
    const diffMs = now.getTime() - scheduledDate.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));

    // Dose not yet due
    if (diffMinutes < 0) continue;

    const settings = getCaregiverSettings(dose.user_id);
    const isCritical = dose.is_critical === 1;

    // Grace period check -> Mark MISSED
    if (diffMinutes >= settings.grace_period_minutes) {
      db.prepare(`
        UPDATE dose_logs 
        SET status = 'missed', minutes_late = ?, updated_at = datetime('now')
        WHERE id = ?
      `).run(diffMinutes, dose.id);

      // Create alert
      const alertTitle = isCritical
        ? `CRITICAL DOSE MISSED: ${dose.name} (${dose.strength})`
        : `Dose Missed: ${dose.name} (${dose.strength})`;
      const alertMsg = `${dose.name} scheduled for ${new Date(dose.scheduled_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} was missed (${diffMinutes} min grace period expired).`;

      const res = db.prepare(`
        INSERT INTO alerts (user_id, medicine_id, dose_log_id, alert_type, severity, title, message, created_at)
        VALUES (?, ?, ?, 'missed_dose', ?, ?, ?, datetime('now'))
      `).run(dose.user_id, dose.medicine_id, dose.id, isCritical ? 'critical' : 'warning', alertTitle, alertMsg);

      const alertPayload = {
        id: Number(res.lastInsertRowid),
        user_id: dose.user_id,
        medicine_id: dose.medicine_id,
        dose_log_id: dose.id,
        alert_type: 'missed_dose',
        severity: isCritical ? 'critical' : 'warning',
        title: alertTitle,
        message: alertMsg,
        created_at: new Date().toISOString(),
      };
      sseManager.broadcastToCaregiversOf(dose.user_id, 'alert', alertPayload);
      sseManager.broadcastToCaregiversOf(dose.user_id, 'dose_update', { doseId: dose.id, status: 'missed' });

      // Check for consecutive misses of this medicine
      checkConsecutiveMisses(dose.user_id, dose.medicine_id, dose.name);
      continue;
    }

    // Escalation ladder check
    let newLevel = 1;
    const l4Threshold = isCritical ? settings.critical_level4_minutes : settings.level4_minutes;

    if (diffMinutes >= l4Threshold) {
      newLevel = 4;
    } else if (diffMinutes >= settings.level3_minutes) {
      newLevel = 3;
    } else if (diffMinutes >= settings.level2_minutes) {
      newLevel = 2;
    } else {
      newLevel = 1;
    }

    // Update level if increased
    if (newLevel > dose.escalation_level) {
      db.prepare(`
        UPDATE dose_logs 
        SET escalation_level = ?, updated_at = datetime('now')
        WHERE id = ?
      `).run(newLevel, dose.id);

      // If reached Level 4 and caregiver hasn't been alerted yet
      if (newLevel === 4 && dose.caregiver_alerted === 0) {
        db.prepare(`UPDATE dose_logs SET caregiver_alerted = 1 WHERE id = ?`).run(dose.id);

        const alertTitle = isCritical
          ? `URGENT: Critical Medicine Unconfirmed - ${dose.name}`
          : `Caregiver Alert: Unconfirmed Dose - ${dose.name}`;
        const alertMsg = `${dose.name} (${dose.strength}) was scheduled at ${new Date(dose.scheduled_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} and is ${diffMinutes} minutes overdue with no response.`;

        const res = db.prepare(`
          INSERT INTO alerts (user_id, medicine_id, dose_log_id, alert_type, severity, title, message, created_at)
          VALUES (?, ?, ?, 'critical_unconfirmed', ?, ?, ?, datetime('now'))
        `).run(dose.user_id, dose.medicine_id, dose.id, isCritical ? 'critical' : 'warning', alertTitle, alertMsg);

        sseManager.broadcastToCaregiversOf(dose.user_id, 'alert', {
          id: Number(res.lastInsertRowid),
          user_id: dose.user_id,
          medicine_id: dose.medicine_id,
          dose_log_id: dose.id,
          alert_type: 'critical_unconfirmed',
          severity: isCritical ? 'critical' : 'warning',
          title: alertTitle,
          message: alertMsg,
          created_at: new Date().toISOString(),
        });
      }

      sseManager.broadcastToCaregiversOf(dose.user_id, 'dose_update', {
        doseId: dose.id,
        escalation_level: newLevel,
        minutes_late: diffMinutes,
      });
    }
  }
}

// Check if 2 consecutive doses of the same medicine are missed
export function checkConsecutiveMisses(userId: number, medicineId: number, medicineName: string) {
  const lastDoses = db.prepare(`
    SELECT status FROM dose_logs 
    WHERE user_id = ? AND medicine_id = ? AND status IN ('taken', 'missed')
    ORDER BY scheduled_time DESC LIMIT 2
  `).all(userId, medicineId) as { status: string }[];

  if (lastDoses.length === 2 && lastDoses[0].status === 'missed' && lastDoses[1].status === 'missed') {
    // Check if an unacknowledged repeated_misses alert already exists today
    const existing = db.prepare(`
      SELECT id FROM alerts 
      WHERE user_id = ? AND medicine_id = ? AND alert_type = 'repeated_misses' AND is_acknowledged = 0
    `).get(userId, medicineId);

    if (!existing) {
      const alertTitle = `Repeated Missed Dose: ${medicineName}`;
      const alertMsg = `2 consecutive scheduled doses of ${medicineName} have been missed. Immediate caregiver intervention recommended.`;

      const res = db.prepare(`
        INSERT INTO alerts (user_id, medicine_id, alert_type, severity, title, message, created_at)
        VALUES (?, ?, 'repeated_misses', 'critical', ?, ?, datetime('now'))
      `).run(userId, medicineId, alertTitle, alertMsg);

      sseManager.broadcastToCaregiversOf(userId, 'alert', {
        id: Number(res.lastInsertRowid),
        user_id: userId,
        medicine_id: medicineId,
        alert_type: 'repeated_misses',
        severity: 'critical',
        title: alertTitle,
        message: alertMsg,
        created_at: new Date().toISOString(),
      });
    }
  }
}

// Check low stock and alert
export function checkStockAlerts(userId: number) {
  const lowStockMeds = db.prepare(`
    SELECT * FROM medicines 
    WHERE user_id = ? AND current_stock <= refill_threshold AND is_paused = 0
  `).all(userId) as any[];

  for (const med of lowStockMeds) {
    const existing = db.prepare(`
      SELECT id FROM alerts 
      WHERE user_id = ? AND medicine_id = ? AND alert_type = 'low_stock' AND is_acknowledged = 0
    `).get(userId, med.id);

    if (!existing) {
      const title = `Low Stock Refill Warning: ${med.name}`;
      const message = `Only ${med.current_stock} doses remaining (threshold: ${med.refill_threshold}). Please refill prescription soon.`;

      const res = db.prepare(`
        INSERT INTO alerts (user_id, medicine_id, alert_type, severity, title, message, created_at)
        VALUES (?, ?, 'low_stock', 'warning', ?, ?, datetime('now'))
      `).run(userId, med.id, title, message);

      sseManager.broadcastToCaregiversOf(userId, 'alert', {
        id: Number(res.lastInsertRowid),
        user_id: userId,
        medicine_id: med.id,
        alert_type: 'low_stock',
        severity: 'warning',
        title,
        message,
        created_at: new Date().toISOString(),
      });
    }
  }
}

// Compute 14-day behavior-based adaptation and insights
export function computeAdaptiveAnalytics(userId: number) {
  const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  // 1. Overall adherence score (0-100)
  const all14Doses = db.prepare(`
    SELECT * FROM dose_logs
    WHERE user_id = ? AND scheduled_time >= ? AND status IN ('taken', 'missed', 'skipped')
  `).all(userId, fourteenDaysAgo) as any[];

  const totalDoses = all14Doses.length;
  const takenDoses = all14Doses.filter((d) => d.status === 'taken').length;
  const missedDoses = all14Doses.filter((d) => d.status === 'missed').length;
  const snoozedCount = all14Doses.reduce((acc, d) => acc + (d.snooze_count || 0), 0);

  let adherenceScore = 100;
  if (totalDoses > 0) {
    // Penalty: -1.0 for missed, -0.2 for late/snooze
    adherenceScore = Math.max(0, Math.min(100, Math.round((takenDoses / totalDoses) * 100)));
  }

  // 2. Risk level determination
  let riskLevel: 'Low' | 'Medium' | 'High' = 'Low';
  let riskReason = 'Taking medicines regularly on schedule.';

  if (adherenceScore < 70 || missedDoses >= 5) {
    riskLevel = 'High';
    riskReason = `Critical adherence drop: ${missedDoses} missed doses in the last 14 days.`;
  } else if (adherenceScore < 85 || missedDoses >= 2 || snoozedCount >= 5) {
    riskLevel = 'Medium';
    riskReason = `Moderate delay patterns: ${missedDoses} missed doses and frequent snoozes.`;
  }

  // 3. Time-slot pattern analysis (e.g. Evening BP misses)
  const timeSlotMisses: Record<string, number> = { Morning: 0, Afternoon: 0, Evening: 0, Night: 0 };
  const all7Doses = db.prepare(`
    SELECT * FROM dose_logs
    WHERE user_id = ? AND scheduled_time >= ?
  `).all(userId, sevenDaysAgo) as any[];

  for (const dose of all7Doses) {
    const hour = new Date(dose.scheduled_time).getHours();
    let slot = 'Morning';
    if (hour >= 11 && hour < 16) slot = 'Afternoon';
    else if (hour >= 16 && hour < 20) slot = 'Evening';
    else if (hour >= 20 || hour < 6) slot = 'Night';

    if (dose.status === 'missed') {
      timeSlotMisses[slot] = (timeSlotMisses[slot] || 0) + 1;
    }
  }

  // 4. Generate Adaptive Insights
  // A. Check for 3+ misses in 7 days in a slot
  for (const [slot, misses] of Object.entries(timeSlotMisses)) {
    if (misses >= 3) {
      riskReason = `Misses most ${slot.toLowerCase()} doses (${misses} times this week).`;
      const existing = db.prepare(`
        SELECT id FROM adaptive_insights 
        WHERE user_id = ? AND insight_type = 'miss_prone_slot' AND title LIKE ?
      `).get(userId, `%${slot}%`);

      if (!existing) {
        db.prepare(`
          INSERT INTO adaptive_insights (user_id, insight_type, title, description, action_suggested, is_applied, created_at)
          VALUES (?, 'miss_prone_slot', ?, ?, ?, 1, datetime('now'))
        `).run(
          userId,
          `Adapted: Earlier Pre-Reminder for ${slot} Doses`,
          `${slot} medicines had ${misses} misses over the past 7 days. The system automatically shifted reminder start 15 minutes earlier and begins at Escalation Level 2 (louder chime).`,
          JSON.stringify({ slot, action: 'pre_remind_15m', level: 2 })
        );
      }
    }
  }

  // B. Check for consistent delay pattern (e.g., usually taken 30+ minutes late)
  const lateTaken = all14Doses.filter((d) => d.status === 'taken' && d.minutes_late >= 25);
  if (lateTaken.length >= 4) {
    const avgLate = Math.round(lateTaken.reduce((sum, d) => sum + d.minutes_late, 0) / lateTaken.length);
    const existing = db.prepare(`
      SELECT id FROM adaptive_insights 
      WHERE user_id = ? AND insight_type = 'timing_shift'
    `).get(userId);

    if (!existing) {
      db.prepare(`
        INSERT INTO adaptive_insights (user_id, insight_type, title, description, action_suggested, is_applied, created_at)
        VALUES (?, 'timing_shift', ?, ?, ?, 0, datetime('now'))
      `).run(
        userId,
        `Timing Pattern Detected: Doses taken ~${avgLate} mins late`,
        `Patient consistently confirms evening doses about ${avgLate} minutes after the scheduled alert. We suggest adjusting the default schedule time to match their natural routine.`,
        JSON.stringify({ action: 'shift_schedule_time', shiftMinutes: avgLate })
      );
    }
  }

  // C. High compliance reward/reset (95%+ adherence for 7 days)
  const last7Taken = all7Doses.filter((d) => d.status === 'taken').length;
  const last7Total = all7Doses.filter((d) => ['taken', 'missed'].includes(d.status)).length;
  if (last7Total >= 7 && (last7Taken / last7Total) >= 0.95) {
    const existing = db.prepare(`
      SELECT id FROM adaptive_insights 
      WHERE user_id = ? AND insight_type = 'compliance_high'
    `).get(userId);

    if (!existing) {
      db.prepare(`
        INSERT INTO adaptive_insights (user_id, insight_type, title, description, action_suggested, is_applied, created_at)
        VALUES (?, 'compliance_high', ?, ?, ?, 1, datetime('now'))
      `).run(
        userId,
        `Optimal Adherence: Gentle Mode Active`,
        `Excellent compliance (${Math.round((last7Taken / last7Total) * 100)}% over 7 days). Escalation alerts relaxed to gentle chimes to prevent alarm fatigue.`,
        JSON.stringify({ action: 'gentle_mode' })
      );
    }
  }

  return {
    adherenceScore,
    riskLevel,
    riskReason,
    stats: {
      total14Days: totalDoses,
      taken14Days: takenDoses,
      missed14Days: missedDoses,
      snoozed14Days: snoozedCount,
      timeSlotMisses,
    },
  };
}
