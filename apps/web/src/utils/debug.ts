// Debug logging utility
// Set VITE_DEBUG=true in .env to enable debug logs
const DEBUG = import.meta.env.VITE_DEBUG === 'true';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function debugLog(...args: any[]) {
  if (DEBUG) {
    console.log(...args);
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function debugError(...args: any[]) {
  if (DEBUG) {
    console.error(...args);
  }
}

// Always log these regardless of debug mode
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function infoLog(...args: any[]) {
  console.log(...args);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function errorLog(...args: any[]) {
  console.error(...args);
}

