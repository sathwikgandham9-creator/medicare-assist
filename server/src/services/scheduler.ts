import cron from 'node-cron';
import { generateTodayDoses, processEscalations, computeAdaptiveAnalytics, checkStockAlerts } from './adaptiveEngine.js';
import { db } from '../db/db.js';

let cronTask: any = null;
let fastInterval: NodeJS.Timeout | null = null;
let currentAcceleration = 1;

export function initScheduler() {
  console.log('[Scheduler] Initializing MediCare scheduler...');

  // Generate today's doses on start
  try {
    generateTodayDoses();
  } catch (err) {
    console.error('[Scheduler] Error generating doses on startup:', err);
  }

  // Standard cron running every minute
  cronTask = cron.schedule('* * * * *', () => {
    try {
      generateTodayDoses();
      processEscalations();

      // Check stock alerts for all elderly users
      const elderlyUsers = db.prepare(`SELECT id FROM users WHERE role = 'elderly'`).all() as { id: number }[];
      for (const u of elderlyUsers) {
        checkStockAlerts(u.id);
        computeAdaptiveAnalytics(u.id);
      }
    } catch (err) {
      console.error('[Scheduler] Error in minute job:', err);
    }
  });

  // Run initial escalation check immediately
  try {
    processEscalations();
  } catch (err) {
    console.error('[Scheduler] Initial escalation error:', err);
  }
}

export function setTimeAcceleration(multiplier: number) {
  currentAcceleration = multiplier;
  if (fastInterval) {
    clearInterval(fastInterval);
    fastInterval = null;
  }

  if (multiplier > 1) {
    // If multiplier is 60x, 1 minute simulated = 1 real second
    // If multiplier is 600x, 10 minutes simulated = 1 real second
    const intervalMs = Math.max(500, Math.floor(60000 / multiplier));
    console.log(`[Scheduler] Fast demo mode enabled: ${multiplier}x (tick every ${intervalMs}ms)`);

    fastInterval = setInterval(() => {
      try {
        processEscalations();
      } catch (err) {
        console.error('[Scheduler] Error in accelerated tick:', err);
      }
    }, intervalMs);
  } else {
    console.log('[Scheduler] Reset to normal 1x time speed');
  }
}

export function getAcceleration() {
  return currentAcceleration;
}

