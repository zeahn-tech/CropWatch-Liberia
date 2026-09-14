import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Request, Response } from 'express';
import { User } from '../src/types.js';

export const JWT_SECRET = process.env.JWT_SECRET || 'cropwatch-liberia-secure-jwt-secret-2026';
export const SESSION_COOKIE_NAME = 'cropwatch_session';

export interface TokenPayload {
  userId: string;
  email: string;
  role: string;
}

/**
 * Hash plaintext password using bcrypt with standard 10 salt rounds.
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

/**
 * Synchronous hash helper for seeds and database bootstrap.
 */
export function hashPasswordSync(password: string): string {
  return bcrypt.hashSync(password, 10);
}

/**
 * Verify a plaintext password against a stored bcrypt hash.
 */
export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Generate signed JWT session token valid for 7 days.
 */
export function createSessionToken(user: User): string {
  const payload: TokenPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
  };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

/**
 * Verify and decode a JWT session token.
 */
export function verifySessionToken(token: string): TokenPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as TokenPayload;
    if (decoded && decoded.userId) {
      return decoded;
    }
    return null;
  } catch (err) {
    return null;
  }
}

/**
 * Extracts session token from HTTP request (checks httpOnly cookie, fallback to Authorization header).
 */
export function extractTokenFromRequest(req: Request): string | null {
  // 1. Authorization: Bearer <token>
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7).trim();
  }

  // 2. Cookie: cropwatch_session or token
  if (req.cookies) {
    if (req.cookies[SESSION_COOKIE_NAME]) {
      return req.cookies[SESSION_COOKIE_NAME];
    }
    if (req.cookies.token) {
      return req.cookies.token;
    }
  }

  return null;
}

/**
 * Sets secure httpOnly cookie with signed session token.
 */
export function setSessionCookie(res: Response, token: string): void {
  const isProd = process.env.NODE_ENV === 'production';
  res.cookie(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/',
  });
}

/**
 * Clears session cookie.
 */
export function clearSessionCookie(res: Response): void {
  const isProd = process.env.NODE_ENV === 'production';
  res.clearCookie(SESSION_COOKIE_NAME, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    path: '/',
  });
}

/**
 * Checks if DEMO_MODE is enabled.
 * DEMO_MODE must be explicitly set to 'true' and is strictly forbidden in production.
 */
export function isDemoModeEnabled(): boolean {
  if (process.env.NODE_ENV === 'production') {
    return false;
  }
  return process.env.DEMO_MODE === 'true';
}
