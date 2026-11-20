import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../db/db.js';
import { generateToken, authenticateToken, AuthRequest } from '../middleware/auth.js';
import { getCaregiverSettings } from '../services/adaptiveEngine.js';

export const authRouter = Router();

function generate6DigitCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function getUserWithLinks(user: any) {
  let linkedCaregiver = null;
  let linkedPatients: any[] = [];

  if (user.role === 'elderly') {
    const link = db.prepare(`
      SELECT u.id, u.full_name, u.email, u.phone_number
      FROM caregiver_links cl
      JOIN users u ON cl.caregiver_id = u.id
      WHERE cl.elderly_id = ? AND cl.status = 'active'
      LIMIT 1
    `).get(user.id);
    linkedCaregiver = link || null;
  } else {
    linkedPatients = db.prepare(`
      SELECT u.id, u.full_name, u.email, u.phone_number, u.emergency_contact_name, u.emergency_contact_phone, cl.created_at as linked_at
      FROM caregiver_links cl
      JOIN users u ON cl.elderly_id = u.id
      WHERE cl.caregiver_id = ? AND cl.status = 'active'
      ORDER BY u.full_name ASC
    `).all(user.id) as any[];
  }

  return {
    id: user.id,
    email: user.email,
    full_name: user.full_name,
    role: user.role,
    link_code: user.link_code,
    phone_number: user.phone_number,
    emergency_contact_name: user.emergency_contact_name,
    emergency_contact_phone: user.emergency_contact_phone,
    preferred_language: user.preferred_language || 'en',
    text_size: user.text_size || 'normal',
    high_contrast: user.high_contrast || 0,
    voice_enabled: user.voice_enabled ?? 1,
    linkedCaregiver,
    linkedPatients,
  };
}

// Register
authRouter.post('/register', async (req, res) => {
  const { email, password, full_name, role, phone_number, emergency_contact_name, emergency_contact_phone } = req.body;

  if (!email || !password || !full_name || !role) {
    return res.status(400).json({ error: 'Please provide email, password, full name, and role' });
  }

  if (!['elderly', 'caregiver'].includes(role)) {
    return res.status(400).json({ error: 'Role must be either "elderly" or "caregiver"' });
  }

  try {
    const existing = db.prepare(`SELECT id FROM users WHERE email = ?`).get(email);
    if (existing) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const password_hash = await bcrypt.hash(password, 10);
    const link_code = generate6DigitCode();

    const insert = db.prepare(`
      INSERT INTO users (email, password_hash, full_name, role, phone_number, link_code, emergency_contact_name, emergency_contact_phone, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `);

    const result = insert.run(
      email.toLowerCase().trim(),
      password_hash,
      full_name.trim(),
      role,
      phone_number || null,
      link_code,
      emergency_contact_name || null,
      emergency_contact_phone || null
    );

    const userId = Number(result.lastInsertRowid);
    if (role === 'elderly') {
      getCaregiverSettings(userId);
    }

    const token = generateToken({ id: userId, email, role, full_name });
    return res.status(201).json({
      message: 'Registration successful',
      token,
      user: {
        id: userId,
        email,
        full_name,
        role,
        link_code,
        phone_number,
        emergency_contact_name,
        emergency_contact_phone,
        preferred_language: 'en',
        text_size: 'normal',
        high_contrast: 0,
        voice_enabled: 1,
      },
    });
  } catch (error: any) {
    console.error('Registration error:', error);
    return res.status(500).json({ error: 'Failed to register account' });
  }
});

// Login
authRouter.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Please provide email and password' });
  }

  try {
    const user = db.prepare(`SELECT * FROM users WHERE email = ?`).get(email.toLowerCase().trim()) as any;
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = generateToken({
      id: user.id,
      email: user.email,
      role: user.role,
      full_name: user.full_name,
    });

    return res.json({
      message: 'Login successful',
      token,
      user: getUserWithLinks(user),
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Failed to login' });
  }
});

// Get current user profile
authRouter.get('/me', authenticateToken, (req: AuthRequest, res: Response) => {
  try {
    const user = db.prepare(`SELECT * FROM users WHERE id = ?`).get(req.user!.id) as any;
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.json({
      user: getUserWithLinks(user),
    });
  } catch (error) {
    console.error('Get /me error:', error);
    return res.status(500).json({ error: 'Failed to fetch user profile' });
  }
});

// Update accessibility settings
authRouter.patch('/settings', authenticateToken, (req: AuthRequest, res: Response) => {
  const { preferred_language, text_size, high_contrast, voice_enabled, phone_number, emergency_contact_name, emergency_contact_phone } = req.body;
  try {
    db.prepare(`
      UPDATE users SET
        preferred_language = COALESCE(?, preferred_language),
        text_size = COALESCE(?, text_size),
        high_contrast = COALESCE(?, high_contrast),
        voice_enabled = COALESCE(?, voice_enabled),
        phone_number = COALESCE(?, phone_number),
        emergency_contact_name = COALESCE(?, emergency_contact_name),
        emergency_contact_phone = COALESCE(?, emergency_contact_phone)
      WHERE id = ?
    `).run(
      preferred_language,
      text_size,
      high_contrast !== undefined ? (high_contrast ? 1 : 0) : null,
      voice_enabled !== undefined ? (voice_enabled ? 1 : 0) : null,
      phone_number,
      emergency_contact_name,
      emergency_contact_phone,
      req.user!.id
    );

    return res.json({ message: 'Settings updated successfully' });
  } catch (error) {
    console.error('Update settings error:', error);
    return res.status(500).json({ error: 'Failed to update settings' });
  }
});

// Generate/Refresh link code
authRouter.post('/link/generate', authenticateToken, (req: AuthRequest, res: Response) => {
  try {
    const newCode = generate6DigitCode();
    db.prepare(`UPDATE users SET link_code = ? WHERE id = ?`).run(newCode, req.user!.id);
    return res.json({ link_code: newCode });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to generate link code' });
  }
});

// Link account with 6-digit code
authRouter.post('/link/enter', authenticateToken, (req: AuthRequest, res: Response) => {
  const { code } = req.body;
  if (!code || code.toString().trim().length !== 6) {
    return res.status(400).json({ error: 'Please enter a valid 6-digit code' });
  }

  const cleanCode = code.toString().trim();
  const currentUserId = req.user!.id;
  const currentRole = req.user!.role;

  try {
    const targetUser = db.prepare(`SELECT * FROM users WHERE link_code = ?`).get(cleanCode) as any;
    if (!targetUser) {
      return res.status(404).json({ error: 'No account found with this 6-digit code' });
    }

    if (targetUser.id === currentUserId) {
      return res.status(400).json({ error: 'Cannot link to your own account' });
    }

    let caregiverId: number;
    let elderlyId: number;

    if (currentRole === 'elderly') {
      if (targetUser.role !== 'caregiver') {
        return res.status(400).json({ error: 'Code must belong to a caregiver account' });
      }
      caregiverId = targetUser.id;
      elderlyId = currentUserId;
    } else {
      if (targetUser.role !== 'elderly') {
        return res.status(400).json({ error: 'Code must belong to an elderly user account' });
      }
      caregiverId = currentUserId;
      elderlyId = targetUser.id;
    }

    // Check existing link
    const existingLink = db.prepare(`
      SELECT id FROM caregiver_links 
      WHERE caregiver_id = ? AND elderly_id = ?
    `).get(caregiverId, elderlyId);

    if (existingLink) {
      return res.status(409).json({ error: 'Accounts are already linked' });
    }

    db.prepare(`
      INSERT INTO caregiver_links (caregiver_id, elderly_id, status, created_at)
      VALUES (?, ?, 'active', datetime('now'))
    `).run(caregiverId, elderlyId);

    return res.json({
      message: 'Account linked successfully!',
      linkedUser: {
        id: targetUser.id,
        full_name: targetUser.full_name,
        role: targetUser.role,
        email: targetUser.email,
      },
    });
  } catch (error) {
    console.error('Linking error:', error);
    return res.status(500).json({ error: 'Failed to link accounts' });
  }
});

// Caregiver: List all linked patients
authRouter.get('/patients', authenticateToken, (req: AuthRequest, res: Response) => {
  if (req.user!.role !== 'caregiver') {
    return res.status(403).json({ error: 'Caregiver access only' });
  }

  try {
    const patients = db.prepare(`
      SELECT u.id, u.full_name, u.email, u.phone_number, u.emergency_contact_name, u.emergency_contact_phone, cl.created_at as linked_at
      FROM caregiver_links cl
      JOIN users u ON cl.elderly_id = u.id
      WHERE cl.caregiver_id = ? AND cl.status = 'active'
      ORDER BY u.full_name ASC
    `).all(req.user!.id);

    return res.json({ patients });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch patients' });
  }
});

