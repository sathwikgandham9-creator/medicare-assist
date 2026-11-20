import { Router, Response } from 'express';
import { db } from '../db/db.js';
import { authenticateToken, AuthRequest, canAccessElderly } from '../middleware/auth.js';
import { generateTodayDoses, checkStockAlerts } from '../services/adaptiveEngine.js';
import { sseManager } from '../sse.js';

export const medicinesRouter = Router();

// Get medicines for current elderly user or specified patient for caregiver
medicinesRouter.get('/', authenticateToken, (req: AuthRequest, res: Response) => {
  try {
    let targetUserId = req.user!.id;
    if (req.user!.role === 'caregiver') {
      const patientId = req.query.patient_id ? parseInt(req.query.patient_id as string, 10) : null;
      if (!patientId) {
        // Return first linked patient if any
        const firstPatient = db.prepare(`
          SELECT elderly_id FROM caregiver_links WHERE caregiver_id = ? AND status = 'active' LIMIT 1
        `).get(req.user!.id) as any;
        if (!firstPatient) {
          return res.json({ medicines: [] });
        }
        targetUserId = firstPatient.elderly_id;
      } else {
        if (!canAccessElderly(req.user!.id, patientId)) {
          return res.status(403).json({ error: 'You do not have access to this patient' });
        }
        targetUserId = patientId;
      }
    }

    const medicines = db.prepare(`
      SELECT * FROM medicines 
      WHERE user_id = ? 
      ORDER BY is_critical DESC, name ASC
    `).all(targetUserId) as any[];

    // Parse JSON fields
    const parsed = medicines.map((m) => ({
      ...m,
      time_slots: JSON.parse(m.time_slots || '[]'),
      frequency_details: m.frequency_details ? JSON.parse(m.frequency_details) : null,
    }));

    return res.json({ medicines: parsed });
  } catch (error) {
    console.error('Get medicines error:', error);
    return res.status(500).json({ error: 'Failed to fetch medicines' });
  }
});

// Create medicine
medicinesRouter.post('/', authenticateToken, (req: AuthRequest, res: Response) => {
  const {
    patient_id,
    name,
    generic_name,
    pill_shape,
    pill_color,
    pill_color2,
    pill_image_url,
    strength,
    quantity_per_dose,
    instructions,
    time_slots,
    frequency,
    frequency_details,
    duration_type,
    duration_value,
    is_critical,
    current_stock,
    refill_threshold,
    notes,
  } = req.body;

  let targetUserId = req.user!.id;
  if (req.user!.role === 'caregiver') {
    if (!patient_id) {
      return res.status(400).json({ error: 'Patient ID is required when caregiver adds medicine' });
    }
    if (!canAccessElderly(req.user!.id, patient_id)) {
      return res.status(403).json({ error: 'You do not have permission for this patient' });
    }
    targetUserId = patient_id;
  }

  if (!name || !pill_shape || !pill_color || !strength || !quantity_per_dose || !instructions) {
    return res.status(400).json({ error: 'Missing required medicine details' });
  }

  try {
    const formattedSlots = typeof time_slots === 'string' ? time_slots : JSON.stringify(time_slots || [{ time: '08:00', label: 'Morning' }]);
    const formattedFreqDetails = frequency_details ? (typeof frequency_details === 'string' ? frequency_details : JSON.stringify(frequency_details)) : null;

    const result = db.prepare(`
      INSERT INTO medicines (
        user_id, name, generic_name, pill_shape, pill_color, pill_color2, pill_image_url,
        strength, quantity_per_dose, instructions, time_slots, frequency, frequency_details,
        duration_type, duration_value, is_critical, current_stock, refill_threshold, notes, is_paused,
        created_at, updated_at
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?, 0,
        datetime('now'), datetime('now')
      )
    `).run(
      targetUserId,
      name.trim(),
      generic_name ? generic_name.trim() : null,
      pill_shape,
      pill_color,
      pill_color2 || null,
      pill_image_url || null,
      strength.trim(),
      quantity_per_dose.trim(),
      instructions,
      formattedSlots,
      frequency || 'every_day',
      formattedFreqDetails,
      duration_type || 'ongoing',
      duration_value || null,
      is_critical ? 1 : 0,
      current_stock !== undefined ? parseInt(current_stock, 10) : 30,
      refill_threshold !== undefined ? parseInt(refill_threshold, 10) : 5,
      notes ? notes.trim() : null
    );

    const newId = Number(result.lastInsertRowid);

    // Automatically generate today's doses for this medicine
    generateTodayDoses(targetUserId);
    checkStockAlerts(targetUserId);

    const created = db.prepare(`SELECT * FROM medicines WHERE id = ?`).get(newId) as any;
    return res.status(201).json({
      message: 'Medicine added successfully',
      medicine: {
        ...created,
        time_slots: JSON.parse(created.time_slots),
        frequency_details: created.frequency_details ? JSON.parse(created.frequency_details) : null,
      },
    });
  } catch (error) {
    console.error('Create medicine error:', error);
    return res.status(500).json({ error: 'Failed to add medicine' });
  }
});

// Update medicine
medicinesRouter.put('/:id', authenticateToken, (req: AuthRequest, res: Response) => {
  const medicineId = parseInt(req.params.id, 10);
  const med = db.prepare(`SELECT * FROM medicines WHERE id = ?`).get(medicineId) as any;
  if (!med) {
    return res.status(404).json({ error: 'Medicine not found' });
  }

  if (req.user!.role === 'caregiver') {
    if (!canAccessElderly(req.user!.id, med.user_id)) {
      return res.status(403).json({ error: 'Access denied' });
    }
  } else if (med.user_id !== req.user!.id) {
    return res.status(403).json({ error: 'Access denied' });
  }

  const {
    name,
    generic_name,
    pill_shape,
    pill_color,
    pill_color2,
    pill_image_url,
    strength,
    quantity_per_dose,
    instructions,
    time_slots,
    frequency,
    frequency_details,
    duration_type,
    duration_value,
    is_critical,
    current_stock,
    refill_threshold,
    notes,
  } = req.body;

  try {
    const formattedSlots = typeof time_slots === 'string' ? time_slots : JSON.stringify(time_slots || [{ time: '08:00', label: 'Morning' }]);
    const formattedFreqDetails = frequency_details ? (typeof frequency_details === 'string' ? frequency_details : JSON.stringify(frequency_details)) : null;

    db.prepare(`
      UPDATE medicines SET
        name = COALESCE(?, name),
        generic_name = COALESCE(?, generic_name),
        pill_shape = COALESCE(?, pill_shape),
        pill_color = COALESCE(?, pill_color),
        pill_color2 = COALESCE(?, pill_color2),
        pill_image_url = COALESCE(?, pill_image_url),
        strength = COALESCE(?, strength),
        quantity_per_dose = COALESCE(?, quantity_per_dose),
        instructions = COALESCE(?, instructions),
        time_slots = COALESCE(?, time_slots),
        frequency = COALESCE(?, frequency),
        frequency_details = COALESCE(?, frequency_details),
        duration_type = COALESCE(?, duration_type),
        duration_value = COALESCE(?, duration_value),
        is_critical = COALESCE(?, is_critical),
        current_stock = COALESCE(?, current_stock),
        refill_threshold = COALESCE(?, refill_threshold),
        notes = COALESCE(?, notes),
        updated_at = datetime('now')
      WHERE id = ?
    `).run(
      name,
      generic_name,
      pill_shape,
      pill_color,
      pill_color2,
      pill_image_url,
      strength,
      quantity_per_dose,
      instructions,
      formattedSlots,
      frequency,
      formattedFreqDetails,
      duration_type,
      duration_value,
      is_critical !== undefined ? (is_critical ? 1 : 0) : null,
      current_stock !== undefined ? parseInt(current_stock, 10) : null,
      refill_threshold !== undefined ? parseInt(refill_threshold, 10) : null,
      notes,
      medicineId
    );

    generateTodayDoses(med.user_id);
    checkStockAlerts(med.user_id);

    const updated = db.prepare(`SELECT * FROM medicines WHERE id = ?`).get(medicineId) as any;
    return res.json({
      message: 'Medicine updated successfully',
      medicine: {
        ...updated,
        time_slots: JSON.parse(updated.time_slots),
        frequency_details: updated.frequency_details ? JSON.parse(updated.frequency_details) : null,
      },
    });
  } catch (error) {
    console.error('Update medicine error:', error);
    return res.status(500).json({ error: 'Failed to update medicine' });
  }
});

// Toggle pause/resume
medicinesRouter.patch('/:id/pause', authenticateToken, (req: AuthRequest, res: Response) => {
  const medicineId = parseInt(req.params.id, 10);
  const med = db.prepare(`SELECT * FROM medicines WHERE id = ?`).get(medicineId) as any;
  if (!med) return res.status(404).json({ error: 'Medicine not found' });

  if (req.user!.role === 'caregiver') {
    if (!canAccessElderly(req.user!.id, med.user_id)) return res.status(403).json({ error: 'Access denied' });
  } else if (med.user_id !== req.user!.id) {
    return res.status(403).json({ error: 'Access denied' });
  }

  const nextPaused = med.is_paused === 1 ? 0 : 1;
  db.prepare(`UPDATE medicines SET is_paused = ?, updated_at = datetime('now') WHERE id = ?`).run(nextPaused, medicineId);

  return res.json({ message: nextPaused ? 'Medicine paused' : 'Medicine resumed', is_paused: nextPaused });
});

// Refill stock
medicinesRouter.patch('/:id/stock', authenticateToken, (req: AuthRequest, res: Response) => {
  const medicineId = parseInt(req.params.id, 10);
  const { amount } = req.body;
  const countToAdd = parseInt(amount, 10) || 30;

  const med = db.prepare(`SELECT * FROM medicines WHERE id = ?`).get(medicineId) as any;
  if (!med) return res.status(404).json({ error: 'Medicine not found' });

  if (req.user!.role === 'caregiver') {
    if (!canAccessElderly(req.user!.id, med.user_id)) return res.status(403).json({ error: 'Access denied' });
  } else if (med.user_id !== req.user!.id) {
    return res.status(403).json({ error: 'Access denied' });
  }

  const newStock = Math.max(0, med.current_stock + countToAdd);
  db.prepare(`UPDATE medicines SET current_stock = ?, updated_at = datetime('now') WHERE id = ?`).run(newStock, medicineId);

  // Clear unacknowledged low stock alert for this medicine
  db.prepare(`
    UPDATE alerts 
    SET is_acknowledged = 1, acknowledged_at = datetime('now') 
    WHERE medicine_id = ? AND alert_type = 'low_stock' AND is_acknowledged = 0
  `).run(medicineId);

  // Send reminder/notification to the elderly patient
  const caregiverName = req.user!.role === 'caregiver' ? req.user!.full_name : 'Caregiver';
  const title = `Prescription Refilled: ${med.name} (${med.strength})`;
  const message = `${caregiverName} has arranged a refill of ${countToAdd} tablets for ${med.name}. New total supply: ${newStock} doses.`;

  const alertResult = db.prepare(`
    INSERT INTO alerts (user_id, caregiver_id, medicine_id, alert_type, severity, title, message, is_acknowledged, created_at)
    VALUES (?, ?, ?, 'refill_reminder', 'info', ?, ?, 0, datetime('now'))
  `).run(med.user_id, req.user!.id, med.id, title, message);

  const refillPayload = {
    id: Number(alertResult.lastInsertRowid),
    medicine_id: med.id,
    medicine_name: med.name,
    strength: med.strength,
    pill_shape: med.pill_shape,
    pill_color: med.pill_color,
    pill_color2: med.pill_color2,
    added_amount: countToAdd,
    new_stock: newStock,
    caregiver_name: caregiverName,
    title,
    message,
    created_at: new Date().toISOString(),
  };

  // Broadcast real-time SSE event to patient
  sseManager.broadcastToPatient(med.user_id, 'refill_reminder', refillPayload);

  // Broadcast update to caregivers
  sseManager.broadcastToCaregiversOf(med.user_id, 'refill_update', refillPayload);

  return res.json({
    message: `Stock updated to ${newStock}. Reminder sent to patient.`,
    current_stock: newStock,
    patient_alerted: true,
    alert: refillPayload,
  });
});

// Delete medicine
medicinesRouter.delete('/:id', authenticateToken, (req: AuthRequest, res: Response) => {
  const medicineId = parseInt(req.params.id, 10);
  const med = db.prepare(`SELECT * FROM medicines WHERE id = ?`).get(medicineId) as any;
  if (!med) return res.status(404).json({ error: 'Medicine not found' });

  if (req.user!.role === 'caregiver') {
    if (!canAccessElderly(req.user!.id, med.user_id)) return res.status(403).json({ error: 'Access denied' });
  } else if (med.user_id !== req.user!.id) {
    return res.status(403).json({ error: 'Access denied' });
  }

  db.prepare(`DELETE FROM medicines WHERE id = ?`).run(medicineId);
  return res.json({ message: 'Medicine deleted successfully' });
});

