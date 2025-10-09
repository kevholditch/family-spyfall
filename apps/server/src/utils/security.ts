import { Request, Response, NextFunction } from 'express';
import { Socket } from 'socket.io';

// IP-based rate limiting storage
const ipAttempts = new Map<string, { count: number; resetTime: number }>();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes

export function ipRateLimit() {
  return (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    const now = Date.now();
    
    // Clean up expired entries
    for (const [key, value] of ipAttempts.entries()) {
      if (now > value.resetTime) {
        ipAttempts.delete(key);
      }
    }
    
    const attempts = ipAttempts.get(ip);
    
    if (!attempts) {
      ipAttempts.set(ip, { count: 1, resetTime: now + WINDOW_MS });
      return next();
    }
    
    if (attempts.count >= MAX_ATTEMPTS) {
      return res.status(429).json({
        error: 'Too many requests from this IP address',
        retryAfter: Math.ceil((attempts.resetTime - now) / 1000)
      });
    }
    
    attempts.count++;
    next();
  };
}

export function socketRateLimit(socket: Socket, eventName: string, maxPerMinute: number = 30) {
  const key = `${socket.id}:${eventName}`;
  const now = Date.now();
  const windowStart = now - 60000; // 1 minute window
  
  if (!socket.data.rateLimit) {
    socket.data.rateLimit = new Map();
  }
  
  const events = socket.data.rateLimit.get(key) || [];
  const recentEvents = events.filter((timestamp: number) => timestamp > windowStart);
  
  if (recentEvents.length >= maxPerMinute) {
    socket.emit('error', { 
      message: `Rate limit exceeded for ${eventName}. Please slow down.` 
    });
    return false;
  }
  
  recentEvents.push(now);
  socket.data.rateLimit.set(key, recentEvents);
  return true;
}

export function sanitizeGameId(gameId: string): string {
  return gameId.toUpperCase().replace(/[^A-Z0-9]/g, '').substring(0, 6);
}

export function sanitizePlayerName(name: string): string {
  return name
    .trim()
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/[<>"'&]/g, '') // Remove potentially dangerous characters
    .substring(0, 20); // Limit length
}

export function validateSocketOrigin(origin: string, allowedOrigins: string[]): boolean {
  if (!origin) return false;
  
  return allowedOrigins.some(allowed => {
    if (allowed === '*') return true;
    if (allowed.endsWith('*')) {
      const prefix = allowed.slice(0, -1);
      return origin.startsWith(prefix);
    }
    return origin === allowed;
  });
}

export function generateSecureToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

export function hashPlayerSecret(secret: string): string {
  // Simple hash for demo - in production, use proper hashing like bcrypt
  let hash = 0;
  for (let i = 0; i < secret.length; i++) {
    const char = secret.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(16);
}

export function isGameIdValid(gameId: string): boolean {
  return /^[A-Z0-9]{6}$/.test(gameId);
}

export function isPlayerIdValid(playerId: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(playerId);
}

export function isSecretValid(secret: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(secret);
}

// Content Security Policy
export const CSP_DIRECTIVES = {
  'default-src': ["'self'"],
  'script-src': ["'self'", "'unsafe-inline'", "'unsafe-eval'"], // Required for Vite dev
  'style-src': ["'self'", "'unsafe-inline'"],
  'img-src': ["'self'", 'data:', 'blob:'],
  'connect-src': ["'self'", 'ws:', 'wss:'],
  'font-src': ["'self'"],
  'object-src': ["'none'"],
  'base-uri': ["'self'"],
  'form-action': ["'self'"],
  'frame-ancestors': ["'none'"],
  'upgrade-insecure-requests': []
};

export function getCSPHeader(): string {
  return Object.entries(CSP_DIRECTIVES)
    .map(([directive, sources]) => {
      if (sources.length === 0) {
        return directive;
      }
      return `${directive} ${sources.join(' ')}`;
    })
    .join('; ');
}
