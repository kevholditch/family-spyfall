import { sanitizeHtml } from './sanitization';

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

export function validatePlayerName(name: string): ValidationResult {
  if (!name || typeof name !== 'string') {
    return { isValid: false, error: 'Player name is required' };
  }

  const trimmed = name.trim();
  
  if (trimmed.length === 0) {
    return { isValid: false, error: 'Player name cannot be empty' };
  }

  if (trimmed.length > 20) {
    return { isValid: false, error: 'Player name must be 20 characters or less' };
  }

  // Check for valid characters (letters, numbers, spaces, basic punctuation)
  if (!/^[a-zA-Z0-9\s\-_.,!?]+$/.test(trimmed)) {
    return { isValid: false, error: 'Player name contains invalid characters' };
  }

  return { isValid: true };
}

export function validateGameId(gameId: string): ValidationResult {
  if (!gameId || typeof gameId !== 'string') {
    return { isValid: false, error: 'Game ID is required' };
  }

  // Game IDs should be 6-character alphanumeric codes
  if (!/^[A-Z0-9]{6}$/.test(gameId)) {
    return { isValid: false, error: 'Invalid game ID format' };
  }

  return { isValid: true };
}

export function validatePlayerId(playerId: string): ValidationResult {
  if (!playerId || typeof playerId !== 'string') {
    return { isValid: false, error: 'Player ID is required' };
  }

  // Player IDs should be UUIDs
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(playerId)) {
    return { isValid: false, error: 'Invalid player ID format' };
  }

  return { isValid: true };
}

export function validateSecret(secret: string): ValidationResult {
  if (!secret || typeof secret !== 'string') {
    return { isValid: false, error: 'Secret is required' };
  }

  // Secrets should be UUIDs
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(secret)) {
    return { isValid: false, error: 'Invalid secret format' };
  }

  return { isValid: true };
}

export function sanitizePlayerName(name: string): string {
  const sanitized = sanitizeHtml(name.trim());
  return sanitized.substring(0, 20); // Enforce length limit after sanitization
}
