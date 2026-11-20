import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { config } from './config.js';
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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Initialize database schema
initDb();

// Seed if no users exist
const userCount = (db.prepare(`SELECT COUNT(*) as count FROM users`).get() as any)?.count || 0;
if (userCount === 0) {
  console.log('[Server] No users detected. Automatically running seed script...');
  seedDatabase();
}

// SSE real-time stream endpoint
app.get('/api/alerts/stream', authenticateToken, (req: AuthRequest, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  const clientId = `client_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const patientId = req.query.patient_id ? parseInt(req.query.patient_id as string, 10) : undefined;

  sseManager.addClient(clientId, req.user!.id, req.user!.role, res, patientId);
});

// API Routes
app.use('/api/auth', authRouter);
app.use('/api/medicines', medicinesRouter);
app.use('/api/doses', dosesRouter);
app.use('/api/alerts', alertsRouter);
app.use('/api/caregiver', caregiverRouter);
app.use('/api/demo', demoRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    app: 'MediCare Assist Server',
    timestamp: new Date().toISOString(),
  });
});

// Serve frontend in production if built
const clientDist = path.resolve(__dirname, '../../client/dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get('*', (req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

// Start background cron scheduler
initScheduler();

// Start Express
app.listen(config.port, () => {
  console.log(`====================================================`);
  console.log(` MediCare Assist Server running on port ${config.port}`);
  console.log(` SSE Alert Stream ready at http://localhost:${config.port}/api/alerts/stream`);
  console.log(`====================================================`);
});

