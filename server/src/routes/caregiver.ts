import { Router, Response } from 'express';
import { db } from '../db/db.js';
import { authenticateToken, AuthRequest, canAccessElderly } from '../middleware/auth.js';
import { computeAdaptiveAnalytics, getCaregiverSettings, generateTodayDoses } from '../services/adaptiveEngine.js';

export const caregiverRouter = Router();

// Helper to resolve patientId
function resolvePatientId(req: AuthRequest, res: Response): number | null {
  const patientIdParam = req.query.patient_id ? parseInt(req.query.patient_id as string, 10) : null;
  if (patientIdParam) {
    if (!canAccessElderly(req.user!.id, patientIdParam)) {
      res.status(403).json({ error: 'Access denied to this patient' });
      return null;
    }
    return patientIdParam;
  }

  const firstLink = db.prepare(`
    SELECT elderly_id FROM caregiver_links WHERE caregiver_id = ? AND status = 'active' LIMIT 1
  `).get(req.user!.id) as any;

  if (!firstLink) {
    return null;
  }
  return firstLink.elderly_id;
}

// Overview endpoint
caregiverRouter.get('/overview', authenticateToken, (req: AuthRequest, res: Response) => {
  const patientId = resolvePatientId(req, res);
  if (!patientId) {
    return res.json({
      hasPatient: false,
      message: 'No elderly patient linked yet. Share your 6-digit link code to connect.',
    });
  }

  try {
    generateTodayDoses(patientId);
    const todayStr = new Date().toISOString().split('T')[0];

    const todayDoses = db.prepare(`
      SELECT d.*, m.name, m.strength, m.pill_shape, m.pill_color, m.is_critical
      FROM dose_logs d
      JOIN medicines m ON d.medicine_id = m.id
      WHERE d.user_id = ? AND d.scheduled_time LIKE ?
      ORDER BY d.scheduled_time ASC
    `).all(patientId, `${todayStr}%`) as any[];

    const totalToday = todayDoses.length;
    const takenToday = todayDoses.filter((d) => d.status === 'taken').length;
    const missedToday = todayDoses.filter((d) => d.status === 'missed').length;
    const pendingToday = todayDoses.filter((d) => ['scheduled', 'snoozed'].includes(d.status)).length;

    const patient = db.prepare(`SELECT id, full_name, email, phone_number, link_code FROM users WHERE id = ?`).get(patientId) as any;
    const adaptive = computeAdaptiveAnalytics(patientId);

    // Low stock warnings
    const lowStock = db.prepare(`
      SELECT id, name, strength, current_stock, refill_threshold, pill_shape, pill_color
      FROM medicines
      WHERE user_id = ? AND current_stock <= refill_threshold AND is_paused = 0
    `).all(patientId);

    const dailySummary = `Today: ${takenToday} of ${totalToday} taken${missedToday > 0 ? `, ${missedToday} missed` : ''}.`;

    return res.json({
      hasPatient: true,
      patient,
      counts: {
        total: totalToday,
        taken: takenToday,
        missed: missedToday,
        pending: pendingToday,
      },
      adherenceScore: adaptive.adherenceScore,
      riskLevel: adaptive.riskLevel,
      riskReason: adaptive.riskReason,
      lowStockWarnings: lowStock,
      dailySummary,
      todayDoses,
    });
  } catch (error) {
    console.error('Caregiver overview error:', error);
    return res.status(500).json({ error: 'Failed to fetch overview data' });
  }
});

// Analytics & Charts endpoint
caregiverRouter.get('/analytics', authenticateToken, (req: AuthRequest, res: Response) => {
  const patientId = resolvePatientId(req, res);
  if (!patientId) {
    return res.status(404).json({ error: 'No patient selected' });
  }

  try {
    const daysCount = req.query.days === '30' ? 30 : 14;
    const startDate = new Date(Date.now() - daysCount * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const logs = db.prepare(`
      SELECT d.*, m.name as medicine_name
      FROM dose_logs d
      JOIN medicines m ON d.medicine_id = m.id
      WHERE d.user_id = ? AND d.scheduled_time >= ?
      ORDER BY d.scheduled_time ASC
    `).all(patientId, `${startDate}T00:00:00`) as any[];

    // 1. Daily trend
    const dateMap: Record<string, { date: string; taken: number; missed: number; snoozed: number; rate: number }> = {};
    for (let i = daysCount - 1; i >= 0; i--) {
      const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const shortDay = new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      dateMap[d] = { date: shortDay, taken: 0, missed: 0, snoozed: 0, rate: 100 };
    }

    for (const log of logs) {
      const d = log.scheduled_time.split('T')[0];
      if (dateMap[d]) {
        if (log.status === 'taken') dateMap[d].taken++;
        else if (log.status === 'missed') dateMap[d].missed++;
        dateMap[d].snoozed += log.snooze_count || 0;
      }
    }

    const trend = Object.values(dateMap).map((item) => {
      const total = item.taken + item.missed;
      const rate = total > 0 ? Math.round((item.taken / total) * 100) : 100;
      return { ...item, rate };
    });

    // 2. Missed by time of day (Heatmap / Bar)
    const slotStats: Record<string, { slot: string; missed: number; taken: number; snoozed: number }> = {
      Morning: { slot: 'Morning (6am-12pm)', missed: 0, taken: 0, snoozed: 0 },
      Afternoon: { slot: 'Afternoon (12pm-5pm)', missed: 0, taken: 0, snoozed: 0 },
      Evening: { slot: 'Evening (5pm-9pm)', missed: 0, taken: 0, snoozed: 0 },
      Night: { slot: 'Night (9pm-6am)', missed: 0, taken: 0, snoozed: 0 },
    };

    for (const log of logs) {
      const hour = new Date(log.scheduled_time).getHours();
      let key = 'Morning';
      if (hour >= 12 && hour < 17) key = 'Afternoon';
      else if (hour >= 17 && hour < 21) key = 'Evening';
      else if (hour >= 21 || hour < 6) key = 'Night';

      if (log.status === 'missed') slotStats[key].missed++;
      if (log.status === 'taken') slotStats[key].taken++;
      slotStats[key].snoozed += log.snooze_count || 0;
    }

    // 3. Per-medicine compliance
    const medStats: Record<string, { name: string; taken: number; missed: number; total: number; adherence: number }> = {};
    for (const log of logs) {
      const name = log.medicine_name;
      if (!medStats[name]) {
        medStats[name] = { name, taken: 0, missed: 0, total: 0, adherence: 100 };
      }
      if (log.status === 'taken') {
        medStats[name].taken++;
        medStats[name].total++;
      } else if (log.status === 'missed') {
        medStats[name].missed++;
        medStats[name].total++;
      }
    }

    const perMedicine = Object.values(medStats).map((m) => ({
      ...m,
      adherence: m.total > 0 ? Math.round((m.taken / m.total) * 100) : 100,
    }));

    // 4. Overall Pie Chart: Taken vs Snoozed vs Missed
    const totalTaken = logs.filter((l) => l.status === 'taken').length;
    const totalMissed = logs.filter((l) => l.status === 'missed').length;
    const totalSnoozed = logs.reduce((acc, l) => acc + (l.snooze_count || 0), 0);

    const pieData = [
      { name: 'Taken on Time', value: totalTaken, color: '#16a34a' },
      { name: 'Snoozed', value: totalSnoozed, color: '#d97706' },
      { name: 'Missed', value: totalMissed, color: '#dc2626' },
    ];

    // 5. Missed-dose patterns
    const patterns: string[] = [];
    if (slotStats['Evening'].missed >= 3) {
      patterns.push(`Evening medicines missed ${slotStats['Evening'].missed} times in the analyzed period. Consider shifting reminders 15-30 minutes earlier.`);
    }
    if (slotStats['Night'].missed >= 2) {
      patterns.push(`Night medicines missed ${slotStats['Night'].missed} times. User may be sleeping before taking medication.`);
    }
    for (const m of perMedicine) {
      if (m.missed >= 3) {
        patterns.push(`Medicine "${m.name}" has a low adherence of ${m.adherence}% (${m.missed} missed doses).`);
      }
    }
    if (patterns.length === 0) {
      patterns.push('No critical missed-dose patterns identified. Patient shows reliable compliance across all time slots.');
    }

    // 6. Adaptive Insights
    const insights = db.prepare(`
      SELECT * FROM adaptive_insights
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT 10
    `).all(patientId);

    return res.json({
      trend,
      byTimeOfDay: Object.values(slotStats),
      perMedicine,
      pieData,
      patterns,
      insights,
    });
  } catch (error) {
    console.error('Caregiver analytics error:', error);
    return res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

// Apply an adaptive insight suggestion (e.g. shift schedule)
caregiverRouter.post('/insights/:id/apply', authenticateToken, (req: AuthRequest, res: Response) => {
  const insightId = parseInt(req.params.id, 10);
  try {
    const insight = db.prepare(`SELECT * FROM adaptive_insights WHERE id = ?`).get(insightId) as any;
    if (!insight) return res.status(404).json({ error: 'Insight not found' });

    if (!canAccessElderly(req.user!.id, insight.user_id)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    db.prepare(`UPDATE adaptive_insights SET is_applied = 1 WHERE id = ?`).run(insightId);

    return res.json({ message: 'Insight recommendation applied successfully!' });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to apply insight' });
  }
});

// Get caregiver settings for patient
caregiverRouter.get('/settings', authenticateToken, (req: AuthRequest, res: Response) => {
  const patientId = resolvePatientId(req, res);
  if (!patientId) return res.status(404).json({ error: 'No patient selected' });

  const settings = getCaregiverSettings(patientId);
  return res.json({ settings });
});

// Update caregiver settings
caregiverRouter.put('/settings', authenticateToken, (req: AuthRequest, res: Response) => {
  const patientId = resolvePatientId(req, res);
  if (!patientId) return res.status(404).json({ error: 'No patient selected' });

  const {
    grace_period_minutes,
    level2_minutes,
    level3_minutes,
    level4_minutes,
    critical_level4_minutes,
    max_snoozes,
    pre_remind_miss_prone,
    time_acceleration,
  } = req.body;

  try {
    db.prepare(`
      UPDATE caregiver_settings SET
        grace_period_minutes = COALESCE(?, grace_period_minutes),
        level2_minutes = COALESCE(?, level2_minutes),
        level3_minutes = COALESCE(?, level3_minutes),
        level4_minutes = COALESCE(?, level4_minutes),
        critical_level4_minutes = COALESCE(?, critical_level4_minutes),
        max_snoozes = COALESCE(?, max_snoozes),
        pre_remind_miss_prone = COALESCE(?, pre_remind_miss_prone),
        time_acceleration = COALESCE(?, time_acceleration),
        updated_at = datetime('now')
      WHERE user_id = ?
    `).run(
      grace_period_minutes,
      level2_minutes,
      level3_minutes,
      level4_minutes,
      critical_level4_minutes,
      max_snoozes,
      pre_remind_miss_prone !== undefined ? (pre_remind_miss_prone ? 1 : 0) : null,
      time_acceleration,
      patientId
    );

    const updated = getCaregiverSettings(patientId);
    return res.json({ message: 'Caregiver settings updated', settings: updated });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to update settings' });
  }
});

