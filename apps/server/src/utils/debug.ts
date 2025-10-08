// Debug logging utility
// Set DEBUG=true in environment to enable debug logs
const DEBUG = process.env.DEBUG === 'true';

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

