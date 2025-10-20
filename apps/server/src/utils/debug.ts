// Debug logging utility
// Set DEBUG=true in environment to enable debug logs
const DEBUG = process.env.DEBUG === 'true';

export function debugLog(...args: unknown[]) {
  if (DEBUG) {
    console.log(...args);
  }
}

export function debugError(...args: unknown[]) {
  if (DEBUG) {
    console.error(...args);
  }
}

// Always log these regardless of debug mode
export function infoLog(...args: unknown[]) {
  console.log(...args);
}

export function errorLog(...args: unknown[]) {
  console.error(...args);
}

