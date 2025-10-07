// Simple HTML sanitization to prevent XSS attacks
export function sanitizeHtml(input: string): string {
  if (typeof input !== 'string') {
    return '';
  }

  return input
    // Remove HTML tags
    .replace(/<[^>]*>/g, '')
    // Decode HTML entities
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, '/')
    .replace(/&#96;/g, '`')
    .replace(/&nbsp;/g, ' ')
    // Remove any remaining HTML entities
    .replace(/&[a-zA-Z0-9#]+;/g, '')
    // Trim whitespace
    .trim();
}

export function sanitizeText(input: string): string {
  const sanitized = sanitizeHtml(input);
  
  // Remove any control characters except newlines and tabs
  return sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
}
