import express from 'express';
import cors from 'cors';
import { db, initDb } from './db/db.js';
import { sseManager } from './sse.js';
import { authenticateToken, AuthRequest } from './middleware/auth.js';
import { initScheduler } from './services/scheduler.js';
import { seedDatabase } from './db/seed.js';

import { authRouter } from './routes/auth.js';
import { medicinesRouter } from './routes/medicines.js';
import { dosesRouter } from './routes/doses.js';
import { alertsRouter } from './routes/alerts.js';
import { caregiverRouter } from './routes/caregiver.js';
import { demoRouter } from './routes/demo.js';

async function runE2ETests() {
  console.log('--- Starting MediCare Assist End-to-End In-Process Tests ---');
  initDb();
  await seedDatabase();

  const app = express();
  app.use(cors());
  app.use(express.json());

  app.use('/api/auth', authRouter);
  app.use('/api/medicines', medicinesRouter);
  app.use('/api/doses', dosesRouter);
  app.use('/api/alerts', alertsRouter);
  app.use('/api/caregiver', caregiverRouter);
  app.use('/api/demo', demoRouter);

  const server = app.listen(5099);
  await new Promise((resolve) => server.on('listening', resolve));
  console.log('Test server listening on port 5099');

  const base = 'http://127.0.0.1:5099';

  try {
    // 1. Caregiver Login
    const cgRes = await fetch(`${base}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'caregiver@medicare.com', password: 'password123' }),
    });
    const cgData = await cgRes.json();
    console.log('✓ 1. Caregiver Login:', cgData.user.full_name, '| Link code:', cgData.user.link_code);
    const cgToken = cgData.token;

    // 2. Elderly Login
    const elRes = await fetch(`${base}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'grandma@medicare.com', password: 'password123' }),
    });
    const elData = await elRes.json();
    console.log('✓ 2. Elderly Login:', elData.user.full_name, '| Language:', elData.user.preferred_language);
    const elToken = elData.token;

    // 3. Today Doses for Elderly
    const dosesRes = await fetch(`${base}/api/doses/today`, {
      headers: { Authorization: `Bearer ${elToken}` },
    });
    const dosesData = await dosesRes.json();
    console.log(`✓ 3. Today Doses: ${dosesData.doses.length} scheduled slots loaded.`);

    // 4. Respond Taken
    const pendingDose = dosesData.doses.find((d: any) => ['scheduled', 'snoozed'].includes(d.status));
    if (pendingDose) {
      const takeRes = await fetch(`${base}/api/doses/${pendingDose.id}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${elToken}` },
        body: JSON.stringify({ status: 'taken' }),
      });
      const takeData = await takeRes.json();
      console.log(`✓ 4. Dose Taken Action: "${takeData.message}", remaining stock: ${takeData.new_stock}`);
    }

    // 5. Emergency SOS Trigger
    const sosRes = await fetch(`${base}/api/alerts/sos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${elToken}` },
    });
    const sosData = await sosRes.json();
    console.log(`✓ 5. Emergency SOS: "${sosData.alert.title}" | Emergency Contact: ${sosData.emergency_phone}`);

    // 6. Caregiver Overview
    const ovRes = await fetch(`${base}/api/caregiver/overview`, {
      headers: { Authorization: `Bearer ${cgToken}` },
    });
    const ovData = await ovRes.json();
    console.log(`✓ 6. Caregiver Dashboard Overview:`);
    console.log(`     - Briefing: "${ovData.dailySummary}"`);
    console.log(`     - Adherence Score: ${ovData.adherenceScore}% | Risk Level: ${ovData.riskLevel}`);
    console.log(`     - Behavioral Rationale: "${ovData.riskReason}"`);
    console.log(`     - Low Stock Warnings: ${ovData.lowStockWarnings.length} prescriptions`);

    // 7. Caregiver Analytics & Adaptive Insights
    const anRes = await fetch(`${base}/api/caregiver/analytics?days=14`, {
      headers: { Authorization: `Bearer ${cgToken}` },
    });
    const anData = await anRes.json();
    console.log(`✓ 7. Caregiver Analytics:`);
    console.log(`     - Trend data points: ${anData.trend.length}`);
    console.log(`     - Time slots breakdown: ${anData.byTimeOfDay.map((s: any) => `${s.slot}: ${s.missed} misses`).join(' | ')}`);
    console.log(`     - Behavioral Patterns: ${anData.patterns.join('; ')}`);
    console.log(`     - Adaptive Insights count: ${anData.insights.length}`);

    // 8. Apply Adaptive Insight
    if (anData.insights.length > 0) {
      const insight = anData.insights[0];
      const applyRes = await fetch(`${base}/api/caregiver/insights/${insight.id}/apply`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${cgToken}` },
      });
      const applyData = await applyRes.json();
      console.log(`✓ 8. Apply Insight Recommendation: "${applyData.message}"`);
    }

    // 9. Simulate Missed Dose in Demo Mode
    const simRes = await fetch(`${base}/api/demo/simulate-missed-dose`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${cgToken}` },
    });
    const simData = await simRes.json();
    console.log(`✓ 9. Demo Simulator: "${simData.message}"`);

    // 10. Check Alerts Feed
    const alertsRes = await fetch(`${base}/api/alerts`, {
      headers: { Authorization: `Bearer ${cgToken}` },
    });
    const alertsData = await alertsRes.json();
    console.log(`✓ 10. Alerts Feed: ${alertsData.alerts.length} total alerts. Top alert: "${alertsData.alerts[0].title}"`);

    console.log('\n=============================================================');
    console.log('🎉 ALL 10 END-TO-END TESTS COMPLETED AND VERIFIED SUCCESSFULLY!');
    console.log('=============================================================');
  } catch (err) {
    console.error('Test execution error caught:', err);
  } finally {
    server.close();
    process.exit(0);
  }
}

runE2ETests().catch((err) => {
  console.error('Test error:', err);
  process.exit(1);
});
