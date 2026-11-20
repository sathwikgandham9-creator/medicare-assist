import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { db } from '../db/db.js';

export interface AuthRequest extends Request {
  user?: {
    id: number;
    email: string;
    role: 'elderly' | 'caregiver';
    full_name: string;
  };
}

export function generateToken(user: { id: number; email: string; role: string; full_name: string }) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role, full_name: user.full_name },
    config.jwtSecret,
    { expiresIn: '30d' }
  );
}

export function authenticateToken(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  let token = authHeader && authHeader.split(' ')[1];

  // Also support query param for SSE (EventSource in browsers doesn't easily support custom headers)
  if (!token && typeof req.query.token === 'string') {
    token = req.query.token;
  }

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, config.jwtSecret, (err, decoded: any) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = decoded;
    next();
  });
}

export function requireRole(role: 'elderly' | 'caregiver') {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || req.user.role !== role) {
      return res.status(403).json({ error: `Requires ${role} role` });
    }
    next();
  };
}

export function canAccessElderly(caregiverId: number, elderlyId: number): boolean {
  if (caregiverId === elderlyId) return true;
  const link = db.prepare(`
    SELECT id FROM caregiver_links 
    WHERE caregiver_id = ? AND elderly_id = ? AND status = 'active'
  `).get(caregiverId, elderlyId);
  return !!link;
}

