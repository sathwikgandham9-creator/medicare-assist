import { Router, Response } from 'express';
import { db } from '../db/db.js';
import { authenticateToken, AuthRequest, canAccessElderly } from '../middleware/auth.js';
import { generateTodayDoses, getCaregiverSettings, checkStockAlerts, checkConsecutiveMisses, computeAdaptiveAnalytics } from '../services/adaptiveEngine.js';
import { sseManager } from '../sse.js';

export const dosesRouter = Router();

// Get today's doses for current user (or caregiver viewing patient)
dosesRouter.get('/today', authenticateToken, (req: AuthRequest, res: Response) => {
  try {
    let targetUserId = req.user!.id;
    if (req.user!.role === 'caregiver') {
      const patientId = req.query.patient_id ? parseInt(req.query.patient_id as string, 10) : null;
      if (!patientId) {
        const firstPatient = db.prepare(`
          SELECT elderly_id FROM caregiver_links WHERE caregiver_id = ? AND status = 'active' LIMIT 1
        `).get(req.user!.id) as any;
        if (!firstPatient) return res.json({ doses: [] });
        targetUserId = firstPatient.elderly_id;
      } else {
        if (!canAccessElderly(req.user!.id, patientId)) {
          return res.status(403).json({ error: 'Access denied' });
        }
        targetUserId = patientId;
      }
    }

    // Ensure today's doses exist
    generateTodayDoses(targetUserId);

    const todayStr = new Date().toISOString().split('T')[0];

    const doses = db.prepare(`
      SELECT d.*, 
             m.name, m.generic_name, m.pill_shape, m.pill_color, m.pill_color2, m.pill_image_url,
             m.strength, m.quantity_per_dose, m.instructions, m.is_critical, m.current_stock, m.refill_threshold
      FROM dose_logs d
      JOIN medicines m ON d.medicine_id = m.id
      WHERE d.user_id = ? AND d.scheduled_time LIKE ?
      ORDER BY d.scheduled_time ASC
    `).all(targetUserId, `${todayStr}%`) as any[];

    // Classify into slots: Morning (05:00 - 11:59), Afternoon (12:00 - 16:59), Evening (17:00 - 20:59), Night (21:00 - 04:59)
    const categorized = doses.map((d) => {
      const hour = new Date(d.scheduled_time).getHours();
      let slot = 'Morning';
      if (hour >= 12 && hour < 17) slot = 'Afternoon';
      else if (hour >= 17 && hour < 21) slot = 'Evening';
      else if (hour >= 21 || hour < 5) slot = 'Night';

      return {
        ...d,
        time_slot_category: slot,
      };
    });

    return res.json({ doses: categorized, date: todayStr });
  } catch (error) {
    console.error('Get today doses error:', error);
    return res.status(500).json({ error: 'Failed to fetch today doses' });
  }
});

// Respond to a dose: taken, snoozed, skipped
dosesRouter.post('/:id/respond', authenticateToken, (req: AuthRequest, res: Response) => {
  const doseId = parseInt(req.params.id, 10);
  const { status, notes } = req.body;

  if (!['taken', 'snoozed', 'skipped'].includes(status)) {
    return res.status(400).json({ error: 'Status must be taken, snoozed, or skipped' });
  }

  try {
    const dose = db.prepare(`
      SELECT d.*, m.name, m.strength, m.is_critical, m.current_stock, m.refill_threshold
      FROM dose_logs d
      JOIN medicines m ON d.medicine_id = m.id
      WHERE d.id = ?
    `).get(doseId) as any;

    if (!dose) {
      return res.status(404).json({ error: 'Dose record not found' });
    }

    // Check permission
    if (req.user!.role === 'caregiver') {
      if (!canAccessElderly(req.user!.id, dose.user_id)) {
        return res.status(403).json({ error: 'Access denied' });
      }
    } else if (dose.user_id !== req.user!.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const now = new Date();
    const scheduled = new Date(dose.scheduled_time);
    const diffMinutes = Math.max(0, Math.floor((now.getTime() - scheduled.getTime()) / (1000 * 60)));

    if (status === 'taken') {
      db.prepare(`
        UPDATE dose_logs 
        SET status = 'taken',
            actual_time = datetime('now'),
            minutes_late = ?,
            notes = COALESCE(?, notes),
            updated_at = datetime('now')
        WHERE id = ?
      `).run(diffMinutes, notes || null, doseId);

      // Decrement medicine stock
      const newStock = Math.max(0, dose.current_stock - 1);
      db.prepare(`UPDATE medicines SET current_stock = ?, updated_at = datetime('now') WHERE id = ?`).run(newStock, dose.medicine_id);

      // Check stock alert
      checkStockAlerts(dose.user_id);
      computeAdaptiveAnalytics(dose.user_id);

      sseManager.broadcastToCaregiversOf(dose.user_id, 'dose_update', {
        doseId,
        status: 'taken',
        medicine_id: dose.medicine_id,
        actual_time: now.toISOString(),
        minutes_late: diffMinutes,
      });

      return res.json({
        message: 'Dose marked as TAKEN',
        dose: { id: doseId, status: 'taken', minutes_late: diffMinutes, actual_time: now.toISOString() },
        new_stock: newStock,
      });
    }

    if (status === 'snoozed') {
      const settings = getCaregiverSettings(dose.user_id);
      const newSnoozeCount = (dose.snooze_count || 0) + 1;
      let newLevel = dose.escalation_level;

      // If snoozed 3 or more times, escalate!
      if (newSnoozeCount >= settings.max_snoozes) {
        newLevel = Math.max(newLevel, 3);
      }

      db.prepare(`
        UPDATE dose_logs 
        SET status = 'snoozed',
            snooze_count = ?,
            escalation_level = ?,
            updated_at = datetime('now')
        WHERE id = ?
      `).run(newSnoozeCount, newLevel, doseId);

      // If max snoozes reached, send caregiver warning
      if (newSnoozeCount >= settings.max_snoozes) {
        const title = `Multiple Snoozes Alert: ${dose.name}`;
        const msg = `${dose.name} (${dose.strength}) was snoozed ${newSnoozeCount} times. System escalated reminder.`;
        db.prepare(`
          INSERT INTO alerts (user_id, medicine_id, dose_log_id, alert_type, severity, title, message, created_at)
          VALUES (?, ?, ?, 'adherence_drop', 'warning', ?, ?, datetime('now'))
        `).run(dose.user_id, dose.medicine_id, doseId, title, msg);

        sseManager.broadcastToCaregiversOf(dose.user_id, 'alert', {
          user_id: dose.user_id,
          medicine_id: dose.medicine_id,
          alert_type: 'adherence_drop',
          severity: 'warning',
          title,
          message: msg,
          created_at: new Date().toISOString(),
        });
      }

      sseManager.broadcastToCaregiversOf(dose.user_id, 'dose_update', {
        doseId,
        status: 'snoozed',
        snooze_count: newSnoozeCount,
        escalation_level: newLevel,
      });

      return res.json({
        message: `Dose snoozed for 10 minutes (${newSnoozeCount}/${settings.max_snoozes})`,
        dose: { id: doseId, status: 'snoozed', snooze_count: newSnoozeCount, escalation_level: newLevel },
      });
    }

    if (status === 'skipped') {
      db.prepare(`
        UPDATE dose_logs 
        SET status = 'skipped',
            actual_time = datetime('now'),
            notes = COALESCE(?, notes),
            updated_at = datetime('now')
        WHERE id = ?
      `).run(notes || 'User skipped dose', doseId);

      sseManager.broadcastToCaregiversOf(dose.user_id, 'dose_update', {
        doseId,
        status: 'skipped',
        notes: notes || 'User skipped dose',
      });

      return res.json({
        message: 'Dose skipped',
        dose: { id: doseId, status: 'skipped' },
      });
    }
  } catch (error) {
    console.error('Respond dose error:', error);
    return res.status(500).json({ error: 'Failed to record response' });
  }
});

// Medication history with filters
dosesRouter.get('/history', authenticateToken, (req: AuthRequest, res: Response) => {
  try {
    let targetUserId = req.user!.id;
    if (req.user!.role === 'caregiver') {
      const patientId = req.query.patient_id ? parseInt(req.query.patient_id as string, 10) : null;
      if (!patientId) {
        const firstPatient = db.prepare(`
          SELECT elderly_id FROM caregiver_links WHERE caregiver_id = ? AND status = 'active' LIMIT 1
        `).get(req.user!.id) as any;
        if (!firstPatient) return res.json({ history: [] });
        targetUserId = firstPatient.elderly_id;
      } else {
        if (!canAccessElderly(req.user!.id, patientId)) return res.status(403).json({ error: 'Access denied' });
        targetUserId = patientId;
      }
    }

    const { medicine_id, status, start_date, end_date, limit } = req.query;

    let query = `
      SELECT d.*, m.name, m.generic_name, m.pill_shape, m.pill_color, m.pill_color2, m.pill_image_url,
             m.strength, m.quantity_per_dose, m.instructions, m.is_critical
      FROM dose_logs d
      JOIN medicines m ON d.medicine_id = m.id
      WHERE d.user_id = ?
    `;
    const params: any[] = [targetUserId];

    if (medicine_id) {
      query += ` AND d.medicine_id = ?`;
      params.push(parseInt(medicine_id as string, 10));
    }
    if (status && status !== 'all') {
      query += ` AND d.status = ?`;
      params.push(status);
    }
    if (start_date) {
      query += ` AND d.scheduled_time >= ?`;
      params.push(`${start_date}T00:00:00`);
    }
    if (end_date) {
      query += ` AND d.scheduled_time <= ?`;
      params.push(`${end_date}T23:59:59`);
    }

    query += ` ORDER BY d.scheduled_time DESC LIMIT ?`;
    params.push(limit ? parseInt(limit as string, 10) : 200);

    const history = db.prepare(query).all(...params);
    return res.json({ history });
  } catch (error) {
    console.error('Get history error:', error);
    return res.status(500).json({ error: 'Failed to fetch history' });
  }
});

