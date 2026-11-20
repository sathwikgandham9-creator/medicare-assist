import { Router, Response } from 'express';
import { db } from '../db/db.js';
import { authenticateToken, AuthRequest, canAccessElderly } from '../middleware/auth.js';
import { sseManager } from '../sse.js';

export const alertsRouter = Router();

// Get alerts
alertsRouter.get('/', authenticateToken, (req: AuthRequest, res: Response) => {
  try {
    let targetUserId = req.user!.id;
    if (req.user!.role === 'caregiver') {
      const patientId = req.query.patient_id ? parseInt(req.query.patient_id as string, 10) : null;
      if (!patientId) {
        // Return alerts for ALL linked patients for this caregiver
        const alerts = db.prepare(`
          SELECT a.*, u.full_name as patient_name, m.name as medicine_name, m.pill_shape, m.pill_color
          FROM alerts a
          JOIN users u ON a.user_id = u.id
          LEFT JOIN medicines m ON a.medicine_id = m.id
          JOIN caregiver_links cl ON cl.elderly_id = u.id
          WHERE cl.caregiver_id = ? AND cl.status = 'active'
          ORDER BY a.created_at DESC
          LIMIT 100
        `).all(req.user!.id);
        return res.json({ alerts });
      } else {
        if (!canAccessElderly(req.user!.id, patientId)) return res.status(403).json({ error: 'Access denied' });
        targetUserId = patientId;
      }
    }

    const alerts = db.prepare(`
      SELECT a.*, m.name as medicine_name, m.pill_shape, m.pill_color
      FROM alerts a
      LEFT JOIN medicines m ON a.medicine_id = m.id
      WHERE a.user_id = ?
      ORDER BY a.created_at DESC
      LIMIT 100
    `).all(targetUserId);

    return res.json({ alerts });
  } catch (error) {
    console.error('Get alerts error:', error);
    return res.status(500).json({ error: 'Failed to fetch alerts' });
  }
});

// Acknowledge alert
alertsRouter.post('/:id/acknowledge', authenticateToken, (req: AuthRequest, res: Response) => {
  const alertId = parseInt(req.params.id, 10);
  try {
    const alert = db.prepare(`SELECT * FROM alerts WHERE id = ?`).get(alertId) as any;
    if (!alert) return res.status(404).json({ error: 'Alert not found' });

    if (req.user!.role === 'caregiver') {
      if (!canAccessElderly(req.user!.id, alert.user_id)) return res.status(403).json({ error: 'Access denied' });
    } else if (alert.user_id !== req.user!.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    db.prepare(`
      UPDATE alerts 
      SET is_acknowledged = 1, acknowledged_at = datetime('now')
      WHERE id = ?
    `).run(alertId);

    sseManager.broadcastToCaregiversOf(alert.user_id, 'alert_acknowledged', { alertId });

    return res.json({ message: 'Alert acknowledged', alertId });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to acknowledge alert' });
  }
});

// SOS Emergency Button
alertsRouter.post('/sos', authenticateToken, (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  try {
    const user = db.prepare(`SELECT * FROM users WHERE id = ?`).get(userId) as any;
    const title = `🚨 EMERGENCY SOS PRESSED: ${user.full_name}`;
    const message = `${user.full_name} pressed the Emergency SOS button at ${new Date().toLocaleTimeString()}! Phone: ${user.phone_number || 'Not provided'}. Please check on them immediately.`;

    const resDb = db.prepare(`
      INSERT INTO alerts (user_id, alert_type, severity, title, message, created_at)
      VALUES (?, 'sos', 'critical', ?, ?, datetime('now'))
    `).run(userId, title, message);

    const newAlert = {
      id: Number(resDb.lastInsertRowid),
      user_id: userId,
      patient_name: user.full_name,
      alert_type: 'sos',
      severity: 'critical',
      title,
      message,
      created_at: new Date().toISOString(),
      is_acknowledged: 0,
    };

    sseManager.broadcastToCaregiversOf(userId, 'alert', newAlert);
    sseManager.broadcastToCaregiversOf(userId, 'sos', newAlert);

    return res.status(201).json({
      message: 'Emergency SOS alert sent to caregiver',
      alert: newAlert,
      emergency_phone: user.emergency_contact_phone || '911',
    });
  } catch (error) {
    console.error('SOS error:', error);
    return res.status(500).json({ error: 'Failed to send SOS' });
  }
});

