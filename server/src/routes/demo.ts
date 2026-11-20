import { Router, Response } from 'express';
import { db } from '../db/db.js';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';
import { setTimeAcceleration, getAcceleration } from '../services/scheduler.js';
import { processEscalations, generateTodayDoses, computeAdaptiveAnalytics } from '../services/adaptiveEngine.js';
import { sseManager } from '../sse.js';
import { seedDatabase } from '../db/seed.js';

export const demoRouter = Router();

// Get demo mode status
demoRouter.get('/status', (req, res) => {
  res.json({
    acceleration: getAcceleration(),
    demoReady: true,
  });
});

// Set time acceleration
demoRouter.post('/acceleration', authenticateToken, (req: AuthRequest, res: Response) => {
  const { multiplier } = req.body;
  const mult = parseInt(multiplier, 10) || 1;
  setTimeAcceleration(mult);
  return res.json({ message: `Time acceleration set to ${mult}x`, acceleration: mult });
});

// Simulate Missed Dose
demoRouter.post('/simulate-missed-dose', authenticateToken, (req: AuthRequest, res: Response) => {
  try {
    // Find elderly user (req.user or linked patient)
    let elderlyId = req.user!.id;
    if (req.user!.role === 'caregiver') {
      const firstPatient = db.prepare(`SELECT elderly_id FROM caregiver_links WHERE caregiver_id = ? LIMIT 1`).get(req.user!.id) as any;
      if (firstPatient) elderlyId = firstPatient.elderly_id;
    }

    // Pick first active critical medicine or any medicine
    const med = db.prepare(`SELECT * FROM medicines WHERE user_id = ? ORDER BY is_critical DESC LIMIT 1`).get(elderlyId) as any;
    if (!med) {
      return res.status(400).json({ error: 'No medicine available to simulate. Please create one first.' });
    }

    // Schedule it 35 minutes in the past
    const pastTime = new Date(Date.now() - 35 * 60 * 1000).toISOString();
    const result = db.prepare(`
      INSERT INTO dose_logs (medicine_id, user_id, scheduled_time, status, escalation_level, snooze_count, caregiver_alerted, created_at, updated_at)
      VALUES (?, ?, ?, 'scheduled', 3, 1, 0, datetime('now'), datetime('now'))
    `).run(med.id, elderlyId, pastTime);

    // Trigger escalation check immediately
    processEscalations();

    return res.json({
      message: `Simulated missed dose for ${med.name}! Escalation ladder ran, dose marked as MISSED, and caregiver alert dispatched.`,
      medicine: med.name,
    });
  } catch (error) {
    console.error('Simulate missed dose error:', error);
    return res.status(500).json({ error: 'Failed to simulate missed dose' });
  }
});

// Simulate Due Dose Right Now (triggers reminder screen immediately)
demoRouter.post('/simulate-due-dose', authenticateToken, (req: AuthRequest, res: Response) => {
  try {
    let elderlyId = req.user!.id;
    if (req.user!.role === 'caregiver') {
      const firstPatient = db.prepare(`SELECT elderly_id FROM caregiver_links WHERE caregiver_id = ? LIMIT 1`).get(req.user!.id) as any;
      if (firstPatient) elderlyId = firstPatient.elderly_id;
    }

    const med = db.prepare(`SELECT * FROM medicines WHERE user_id = ? ORDER BY is_critical DESC LIMIT 1`).get(elderlyId) as any;
    if (!med) {
      return res.status(400).json({ error: 'No medicine found. Please add a medicine first.' });
    }

    const level = req.body.level ? parseInt(req.body.level, 10) : 1;
    // Set scheduled_time to 1 minute ago
    const pastTime = new Date(Date.now() - (level === 1 ? 1 : level === 2 ? 6 : level === 3 ? 12 : 22) * 60 * 1000).toISOString();

    const result = db.prepare(`
      INSERT INTO dose_logs (medicine_id, user_id, scheduled_time, status, escalation_level, snooze_count, caregiver_alerted, created_at, updated_at)
      VALUES (?, ?, ?, 'scheduled', ?, 0, ?, datetime('now'), datetime('now'))
    `).run(med.id, elderlyId, pastTime, level, level === 4 ? 1 : 0);

    const doseId = Number(result.lastInsertRowid);

    // Broadcast SSE
    sseManager.broadcastToCaregiversOf(elderlyId, 'dose_update', {
      doseId,
      status: 'scheduled',
      escalation_level: level,
      medicine_id: med.id,
    });

    return res.json({
      message: `Simulated dose due for ${med.name} at Level ${level}!`,
      doseId,
      medicine: med.name,
      level,
    });
  } catch (error) {
    console.error('Simulate due dose error:', error);
    return res.status(500).json({ error: 'Failed to simulate due dose' });
  }
});

// Reset database and re-seed
demoRouter.post('/reset-data', async (req, res) => {
  try {
    await seedDatabase();
    return res.json({ message: 'Database reset to demo state with 3 weeks of realistic data!' });
  } catch (error) {
    console.error('Reset error:', error);
    return res.status(500).json({ error: 'Failed to reset demo data' });
  }
});

