// Debug logging utility
// Set VITE_DEBUG=true in .env to enable debug logs
const DEBUG = import.meta.env.VITE_DEBUG === 'true';

export function debugLog(...args: any[]) {
  if (DEBUG) {
    console.log(...args);
  }
}

export function debugError(...args: any[]) {
  if (DEBUG) {
    console.error(...args);
  }
}

// Always log these regardless of debug mode
export function infoLog(...args: any[]) {
  console.log(...args);
}

export function errorLog(...args: any[]) {
  console.error(...args);
}

