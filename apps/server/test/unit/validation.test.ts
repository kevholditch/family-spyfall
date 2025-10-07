import { describe, it, expect } from 'vitest';
import { validatePlayerName, validateGameId, validatePlayerId, validateSecret, sanitizePlayerName } from '../../src/utils/validation';

describe('Validation', () => {
  describe('validatePlayerName', () => {
    it('should accept valid player names', () => {
      expect(validatePlayerName('Alice')).toEqual({ isValid: true });
      expect(validatePlayerName('Bob Smith')).toEqual({ isValid: true });
      expect(validatePlayerName('Player123')).toEqual({ isValid: true });
      expect(validatePlayerName('John-Doe')).toEqual({ isValid: true });
      expect(validatePlayerName('Mary, Jane')).toEqual({ isValid: true });
    });

    it('should reject invalid player names', () => {
      expect(validatePlayerName('')).toEqual({ 
        isValid: false, 
        error: 'Player name cannot be empty' 
      });
      expect(validatePlayerName('   ')).toEqual({ 
        isValid: false, 
        error: 'Player name cannot be empty' 
      });
      expect(validatePlayerName('A'.repeat(21))).toEqual({ 
        isValid: false, 
        error: 'Player name must be 20 characters or less' 
      });
      expect(validatePlayerName('Alice<script>')).toEqual({ 
        isValid: false, 
        error: 'Player name contains invalid characters' 
      });
      expect(validatePlayerName('Alice@#$')).toEqual({ 
        isValid: false, 
        error: 'Player name contains invalid characters' 
      });
    });

    it('should handle edge cases', () => {
      expect(validatePlayerName(null as any)).toEqual({ 
        isValid: false, 
        error: 'Player name is required' 
      });
      expect(validatePlayerName(undefined as any)).toEqual({ 
        isValid: false, 
        error: 'Player name is required' 
      });
      expect(validatePlayerName(123 as any)).toEqual({ 
        isValid: false, 
        error: 'Player name is required' 
      });
    });
  });

  describe('validateGameId', () => {
    it('should accept valid game IDs', () => {
      expect(validateGameId('ABCD12')).toEqual({ isValid: true });
      expect(validateGameId('123456')).toEqual({ isValid: true });
      expect(validateGameId('XYZ789')).toEqual({ isValid: true });
    });

    it('should reject invalid game IDs', () => {
      expect(validateGameId('abcd12')).toEqual({ 
        isValid: false, 
        error: 'Invalid game ID format' 
      });
      expect(validateGameId('ABCD1')).toEqual({ 
        isValid: false, 
        error: 'Invalid game ID format' 
      });
      expect(validateGameId('ABCD123')).toEqual({ 
        isValid: false, 
        error: 'Invalid game ID format' 
      });
      expect(validateGameId('ABC-12')).toEqual({ 
        isValid: false, 
        error: 'Invalid game ID format' 
      });
      expect(validateGameId('')).toEqual({ 
        isValid: false, 
        error: 'Game ID is required' 
      });
    });
  });

  describe('validatePlayerId', () => {
    it('should accept valid player IDs (UUIDs)', () => {
      expect(validatePlayerId('123e4567-e89b-12d3-a456-426614174000')).toEqual({ isValid: true });
      expect(validatePlayerId('550e8400-e29b-41d4-a716-446655440000')).toEqual({ isValid: true });
    });

    it('should reject invalid player IDs', () => {
      expect(validatePlayerId('123')).toEqual({ 
        isValid: false, 
        error: 'Invalid player ID format' 
      });
      expect(validatePlayerId('123e4567-e89b-12d3-a456')).toEqual({ 
        isValid: false, 
        error: 'Invalid player ID format' 
      });
      expect(validatePlayerId('')).toEqual({ 
        isValid: false, 
        error: 'Player ID is required' 
      });
    });
  });

  describe('validateSecret', () => {
    it('should accept valid secrets (UUIDs)', () => {
      expect(validateSecret('123e4567-e89b-12d3-a456-426614174000')).toEqual({ isValid: true });
      expect(validateSecret('550e8400-e29b-41d4-a716-446655440000')).toEqual({ isValid: true });
    });

    it('should reject invalid secrets', () => {
      expect(validateSecret('123')).toEqual({ 
        isValid: false, 
        error: 'Invalid secret format' 
      });
      expect(validateSecret('')).toEqual({ 
        isValid: false, 
        error: 'Secret is required' 
      });
    });
  });

  describe('sanitizePlayerName', () => {
    it('should sanitize HTML tags', () => {
      expect(sanitizePlayerName('Alice<script>alert("xss")</script>')).toBe('Alice');
      expect(sanitizePlayerName('<b>Bob</b>')).toBe('Bob');
    });

    it('should decode HTML entities', () => {
      expect(sanitizePlayerName('Alice&amp;Bob')).toBe('Alice&Bob');
      expect(sanitizePlayerName('Mary&lt;Jane&gt;')).toBe('Mary<Jane>');
    });

    it('should trim whitespace', () => {
      expect(sanitizePlayerName('  Alice  ')).toBe('Alice');
      expect(sanitizePlayerName('\tBob\n')).toBe('Bob');
    });

    it('should enforce length limit', () => {
      const longName = 'A'.repeat(25);
      expect(sanitizePlayerName(longName)).toBe('A'.repeat(20));
    });
  });
});
