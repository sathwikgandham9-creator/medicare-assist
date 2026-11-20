import bcrypt from 'bcryptjs';
import { db, initDb } from './db.js';
import { computeAdaptiveAnalytics, getCaregiverSettings } from '../services/adaptiveEngine.js';

export async function seedDatabase() {
  console.log('[Seed] Initializing database schema...');
  initDb();

  // Clear existing data cleanly
  db.exec(`
    DELETE FROM adaptive_insights;
    DELETE FROM alerts;
    DELETE FROM dose_logs;
    DELETE FROM medicines;
    DELETE FROM caregiver_links;
    DELETE FROM caregiver_settings;
    DELETE FROM users;
  `);

  console.log('[Seed] Seeding users...');
  const passwordHash = await bcrypt.hash('password123', 10);

  // 1. Caregiver User
  const caregiverInsert = db.prepare(`
    INSERT INTO users (email, password_hash, full_name, role, phone_number, link_code, created_at)
    VALUES (?, ?, ?, 'caregiver', ?, '123456', datetime('now'))
  `).run(
    'caregiver@medicare.com',
    passwordHash,
    'Dr. Priya Sharma (Caregiver)',
    '+1 (555) 234-5678'
  );
  const caregiverId = Number(caregiverInsert.lastInsertRowid);

  // 2. Elderly User
  const elderlyInsert = db.prepare(`
    INSERT INTO users (email, password_hash, full_name, role, phone_number, link_code, emergency_contact_name, emergency_contact_phone, preferred_language, text_size, high_contrast, voice_enabled, created_at)
    VALUES (?, ?, ?, 'elderly', ?, '654321', ?, ?, 'en', 'large', 0, 1, datetime('now'))
  `).run(
    'grandma@medicare.com',
    passwordHash,
    'Margaret Miller (Grandma)',
    '+1 (555) 876-5432',
    'Dr. Priya Sharma',
    '+1 (555) 234-5678'
  );
  const elderlyId = Number(elderlyInsert.lastInsertRowid);

  // Link accounts
  db.prepare(`
    INSERT INTO caregiver_links (caregiver_id, elderly_id, status, created_at)
    VALUES (?, ?, 'active', datetime('now'))
  `).run(caregiverId, elderlyId);

  // Caregiver Settings
  getCaregiverSettings(elderlyId);

  console.log('[Seed] Seeding 6 realistic medicines...');
  // Medicine 1: Metformin 500 mg (Diabetes, Critical)
  const med1 = db.prepare(`
    INSERT INTO medicines (user_id, name, generic_name, pill_shape, pill_color, pill_color2, strength, quantity_per_dose, instructions, time_slots, frequency, duration_type, is_critical, current_stock, refill_threshold, notes, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'every_day', 'ongoing', 1, 45, 10, 'Take with breakfast and dinner to control blood sugar.', datetime('now'), datetime('now'))
  `).run(
    elderlyId,
    'Metformin',
    'Metformin Hydrochloride',
    'round',
    'white',
    null,
    '500 mg',
    '1 tablet',
    'with_food',
    JSON.stringify([
      { time: '08:00', label: 'Morning' },
      { time: '18:00', label: 'Evening' }
    ])
  );
  const med1Id = Number(med1.lastInsertRowid);

  // Medicine 2: Amlodipine 5 mg (Blood Pressure, Critical - LOW STOCK!)
  const med2 = db.prepare(`
    INSERT INTO medicines (user_id, name, generic_name, pill_shape, pill_color, pill_color2, strength, quantity_per_dose, instructions, time_slots, frequency, duration_type, is_critical, current_stock, refill_threshold, notes, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'every_day', 'ongoing', 1, 4, 8, 'Crucial for morning blood pressure control. Refill needed!', datetime('now'), datetime('now'))
  `).run(
    elderlyId,
    'Amlodipine',
    'Amlodipine Besylate',
    'oval',
    'yellow',
    null,
    '5 mg',
    '1 tablet',
    'after_food',
    JSON.stringify([{ time: '08:00', label: 'Morning' }])
  );
  const med2Id = Number(med2.lastInsertRowid);

  // Medicine 3: Telmisartan 40 mg (Heart, Critical)
  const med3 = db.prepare(`
    INSERT INTO medicines (user_id, name, generic_name, pill_shape, pill_color, pill_color2, strength, quantity_per_dose, instructions, time_slots, frequency, duration_type, is_critical, current_stock, refill_threshold, notes, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'every_day', 'ongoing', 1, 24, 6, 'Night heart and vascular protection.', datetime('now'), datetime('now'))
  `).run(
    elderlyId,
    'Telmisartan',
    'Telmisartan',
    'two_tone_capsule',
    'pink',
    'white',
    '40 mg',
    '1 capsule',
    'after_food',
    JSON.stringify([{ time: '21:00', label: 'Night' }])
  );
  const med3Id = Number(med3.lastInsertRowid);

  // Medicine 4: Atorvastatin 20 mg (Cholesterol)
  const med4 = db.prepare(`
    INSERT INTO medicines (user_id, name, generic_name, pill_shape, pill_color, pill_color2, strength, quantity_per_dose, instructions, time_slots, frequency, duration_type, is_critical, current_stock, refill_threshold, notes, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'every_day', 'ongoing', 0, 28, 7, 'Take before bedtime for cholesterol regulation.', datetime('now'), datetime('now'))
  `).run(
    elderlyId,
    'Atorvastatin',
    'Atorvastatin Calcium',
    'half_moon',
    'blue',
    null,
    '20 mg',
    '1 tablet',
    'after_food',
    JSON.stringify([{ time: '21:00', label: 'Night' }])
  );
  const med4Id = Number(med4.lastInsertRowid);

  // Medicine 5: Paracetamol 650 mg (Pain, PRN)
  const med5 = db.prepare(`
    INSERT INTO medicines (user_id, name, generic_name, pill_shape, pill_color, pill_color2, strength, quantity_per_dose, instructions, time_slots, frequency, duration_type, is_critical, current_stock, refill_threshold, notes, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'every_day', 'ongoing', 0, 18, 5, 'Joint pain relief after lunch.', datetime('now'), datetime('now'))
  `).run(
    elderlyId,
    'Paracetamol',
    'Acetaminophen',
    'diamond',
    'orange',
    null,
    '650 mg',
    '1 tablet',
    'after_food',
    JSON.stringify([{ time: '13:00', label: 'Afternoon' }])
  );
  const med5Id = Number(med5.lastInsertRowid);

  // Medicine 6: Benadryl Cough Syrup (Syrup bottle)
  const med6 = db.prepare(`
    INSERT INTO medicines (user_id, name, generic_name, pill_shape, pill_color, pill_color2, strength, quantity_per_dose, instructions, time_slots, frequency, duration_type, is_critical, current_stock, refill_threshold, notes, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'every_day', 'days', 0, 85, 20, 'Soothes persistent cough.', datetime('now'), datetime('now'))
  `).run(
    elderlyId,
    'Benadryl Cough Syrup',
    'Diphenhydramine HCl',
    'syrup',
    'red',
    null,
    '100 ml',
    '5 ml',
    'after_food',
    JSON.stringify([{ time: '13:00', label: 'Afternoon' }])
  );
  const med6Id = Number(med6.lastInsertRowid);

  console.log('[Seed] Generating 3 weeks of realistic history...');
  const now = new Date();

  // Generate history for the last 21 days
  for (let i = 21; i >= 1; i--) {
    const dayDate = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    const dateStr = dayDate.toISOString().split('T')[0];

    // Day schedule:
    // 08:00 - Metformin (med1)
    // 08:00 - Amlodipine (med2)
    // 13:00 - Paracetamol (med5)
    // 13:00 - Benadryl (med6)
    // 18:00 - Metformin (med1)
    // 21:00 - Telmisartan (med3)
    // 21:00 - Atorvastatin (med4)

    // Morning: 95% taken on time
    db.prepare(`
      INSERT INTO dose_logs (medicine_id, user_id, scheduled_time, status, actual_time, minutes_late, snooze_count, escalation_level, caregiver_alerted, created_at, updated_at)
      VALUES (?, ?, ?, 'taken', ?, ?, 0, 1, 0, ?, ?)
    `).run(med1Id, elderlyId, `${dateStr}T08:00:00`, `${dateStr}T08:05:00`, 5, `${dateStr}T08:05:00`, `${dateStr}T08:05:00`);

    db.prepare(`
      INSERT INTO dose_logs (medicine_id, user_id, scheduled_time, status, actual_time, minutes_late, snooze_count, escalation_level, caregiver_alerted, created_at, updated_at)
      VALUES (?, ?, ?, 'taken', ?, ?, 0, 1, 0, ?, ?)
    `).run(med2Id, elderlyId, `${dateStr}T08:00:00`, `${dateStr}T08:08:00`, 8, `${dateStr}T08:08:00`, `${dateStr}T08:08:00`);

    // Afternoon: taken or occasional snooze
    const aftDelay = (i % 3 === 0) ? 22 : 5;
    const aftSnooze = (i % 3 === 0) ? 1 : 0;
    db.prepare(`
      INSERT INTO dose_logs (medicine_id, user_id, scheduled_time, status, actual_time, minutes_late, snooze_count, escalation_level, caregiver_alerted, created_at, updated_at)
      VALUES (?, ?, ?, 'taken', ?, ?, ?, 1, 0, ?, ?)
    `).run(med5Id, elderlyId, `${dateStr}T13:00:00`, `${dateStr}T13:${aftDelay}:00`, aftDelay, aftSnooze, `${dateStr}T13:30:00`, `${dateStr}T13:30:00`);

    db.prepare(`
      INSERT INTO dose_logs (medicine_id, user_id, scheduled_time, status, actual_time, minutes_late, snooze_count, escalation_level, caregiver_alerted, created_at, updated_at)
      VALUES (?, ?, ?, 'taken', ?, ?, 0, 1, 0, ?, ?)
    `).run(med6Id, elderlyId, `${dateStr}T13:00:00`, `${dateStr}T13:04:00`, 4, `${dateStr}T13:04:00`, `${dateStr}T13:04:00`);

    // Evening Metformin: intentionally misses or delayed in days 1..7 (past week) to form clear behavioral pattern!
    const isRecentMiss = (i <= 6 && (i === 1 || i === 3 || i === 4 || i === 6));
    if (isRecentMiss) {
      db.prepare(`
        INSERT INTO dose_logs (medicine_id, user_id, scheduled_time, status, actual_time, minutes_late, snooze_count, escalation_level, caregiver_alerted, created_at, updated_at)
        VALUES (?, ?, ?, 'missed', NULL, 35, 2, 4, 1, ?, ?)
      `).run(med1Id, elderlyId, `${dateStr}T18:00:00`, `${dateStr}T18:35:00`, `${dateStr}T18:35:00`);
    } else {
      const eveningDelay = 28 + (i % 7); // consistent 30min delay!
      db.prepare(`
        INSERT INTO dose_logs (medicine_id, user_id, scheduled_time, status, actual_time, minutes_late, snooze_count, escalation_level, caregiver_alerted, created_at, updated_at)
        VALUES (?, ?, ?, 'taken', ?, ?, 1, 2, 0, ?, ?)
      `).run(med1Id, elderlyId, `${dateStr}T18:00:00`, `${dateStr}T18:${eveningDelay}:00`, eveningDelay, `${dateStr}T18:30:00`, `${dateStr}T18:30:00`);
    }

    // Night doses: mostly taken, 2 missed in past 3 weeks
    const isNightMiss = (i === 8 || i === 15);
    db.prepare(`
      INSERT INTO dose_logs (medicine_id, user_id, scheduled_time, status, actual_time, minutes_late, snooze_count, escalation_level, caregiver_alerted, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, 0, 1, 0, ?, ?)
    `).run(
      med3Id,
      elderlyId,
      `${dateStr}T21:00:00`,
      isNightMiss ? 'missed' : 'taken',
      isNightMiss ? null : `${dateStr}T21:10:00`,
      isNightMiss ? 35 : 10,
      `${dateStr}T21:10:00`,
      `${dateStr}T21:10:00`
    );

    db.prepare(`
      INSERT INTO dose_logs (medicine_id, user_id, scheduled_time, status, actual_time, minutes_late, snooze_count, escalation_level, caregiver_alerted, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, 0, 1, 0, ?, ?)
    `).run(
      med4Id,
      elderlyId,
      `${dateStr}T21:00:00`,
      isNightMiss ? 'missed' : 'taken',
      isNightMiss ? null : `${dateStr}T21:12:00`,
      isNightMiss ? 35 : 12,
      `${dateStr}T21:12:00`,
      `${dateStr}T21:12:00`
    );
  }

  // Today's schedule
  const todayStr = now.toISOString().split('T')[0];

  // Morning doses: Taken!
  db.prepare(`
    INSERT INTO dose_logs (medicine_id, user_id, scheduled_time, status, actual_time, minutes_late, snooze_count, escalation_level, caregiver_alerted, created_at, updated_at)
    VALUES (?, ?, ?, 'taken', datetime('now', '-2 hours'), 3, 0, 1, 0, datetime('now'), datetime('now'))
  `).run(med1Id, elderlyId, `${todayStr}T08:00:00`);

  db.prepare(`
    INSERT INTO dose_logs (medicine_id, user_id, scheduled_time, status, actual_time, minutes_late, snooze_count, escalation_level, caregiver_alerted, created_at, updated_at)
    VALUES (?, ?, ?, 'taken', datetime('now', '-2 hours'), 5, 0, 1, 0, datetime('now'), datetime('now'))
  `).run(med2Id, elderlyId, `${todayStr}T08:00:00`);

  // Afternoon doses: Upcoming / Due
  db.prepare(`
    INSERT INTO dose_logs (medicine_id, user_id, scheduled_time, status, escalation_level, snooze_count, caregiver_alerted, created_at, updated_at)
    VALUES (?, ?, ?, 'scheduled', 1, 0, 0, datetime('now'), datetime('now'))
  `).run(med5Id, elderlyId, `${todayStr}T13:00:00`);

  db.prepare(`
    INSERT INTO dose_logs (medicine_id, user_id, scheduled_time, status, escalation_level, snooze_count, caregiver_alerted, created_at, updated_at)
    VALUES (?, ?, ?, 'scheduled', 1, 0, 0, datetime('now'), datetime('now'))
  `).run(med6Id, elderlyId, `${todayStr}T13:00:00`);

  // Evening & Night doses: Upcoming
  db.prepare(`
    INSERT INTO dose_logs (medicine_id, user_id, scheduled_time, status, escalation_level, snooze_count, caregiver_alerted, created_at, updated_at)
    VALUES (?, ?, ?, 'scheduled', 1, 0, 0, datetime('now'), datetime('now'))
  `).run(med1Id, elderlyId, `${todayStr}T18:00:00`);

  db.prepare(`
    INSERT INTO dose_logs (medicine_id, user_id, scheduled_time, status, escalation_level, snooze_count, caregiver_alerted, created_at, updated_at)
    VALUES (?, ?, ?, 'scheduled', 1, 0, 0, datetime('now'), datetime('now'))
  `).run(med3Id, elderlyId, `${todayStr}T21:00:00`);

  db.prepare(`
    INSERT INTO dose_logs (medicine_id, user_id, scheduled_time, status, escalation_level, snooze_count, caregiver_alerted, created_at, updated_at)
    VALUES (?, ?, ?, 'scheduled', 1, 0, 0, datetime('now'), datetime('now'))
  `).run(med4Id, elderlyId, `${todayStr}T21:00:00`);

  console.log('[Seed] Seeding sample alerts...');
  // 1. Low stock alert for Amlodipine
  db.prepare(`
    INSERT INTO alerts (user_id, medicine_id, alert_type, severity, title, message, is_acknowledged, created_at)
    VALUES (?, ?, 'low_stock', 'warning', 'Low Stock Warning: Amlodipine', 'Only 4 tablets remaining (threshold: 8). Prescription refill recommended this week.', 0, datetime('now', '-3 hours'))
  `).run(elderlyId, med2Id);

  // 2. Missed dose alert from yesterday evening
  db.prepare(`
    INSERT INTO alerts (user_id, medicine_id, alert_type, severity, title, message, is_acknowledged, created_at)
    VALUES (?, ?, 'missed_dose', 'critical', 'CRITICAL DOSE MISSED: Metformin (500 mg)', 'Metformin scheduled for 18:00 yesterday was unconfirmed after 30 minutes grace period.', 0, datetime('now', '-14 hours'))
  `).run(elderlyId, med1Id);

  // 3. SOS Alert from last week (acknowledged)
  db.prepare(`
    INSERT INTO alerts (user_id, alert_type, severity, title, message, is_acknowledged, acknowledged_at, created_at)
    VALUES (?, 'sos', 'critical', '🚨 EMERGENCY SOS PRESSED: Margaret Miller', 'Margaret Miller pressed Emergency SOS button. Contacted caregiver.', 1, datetime('now', '-5 days', '+20 minutes'), datetime('now', '-5 days'))
  `).run(elderlyId);

  console.log('[Seed] Computing adaptive insights...');
  computeAdaptiveAnalytics(elderlyId);

  console.log('[Seed] Seed completed successfully!');
  console.log('---------------------------------------------------------');
  console.log('DEMO LOGINS:');
  console.log('Caregiver: caregiver@medicare.com / password123');
  console.log('Elderly:   grandma@medicare.com   / password123');
  console.log('---------------------------------------------------------');
}

// Allow direct execution
if (process.argv[1]?.endsWith('seed.ts') || process.argv[1]?.endsWith('seed.js')) {
  seedDatabase().then(() => process.exit(0)).catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

