# Debug Logging

## Overview

Debug logging can be enabled/disabled via environment variables without changing code.

## Usage

### Server (Node.js)

Enable debug logs:
```bash
cd apps/server
DEBUG=true npm run dev
```

Or add to `.env` file:
```
DEBUG=true
```

### Client (Vite/React)

Enable debug logs:
```bash
cd apps/web
VITE_DEBUG=true npm run dev
```

Or add to `.env` file:
```
VITE_DEBUG=true
```

## Code Usage

### Server
```typescript
import { debugLog, debugError, infoLog, errorLog } from './utils/debug';

// Debug only (hidden by default)
debugLog('🎮 Starting round...', gameData);
debugError('❌ Validation failed:', error);

// Always shown (important info/errors)
infoLog('Server started on port', PORT);
errorLog('Critical error:', error);
```

### Client
```typescript
import { debugLog, debugError, infoLog, errorLog } from '../utils/debug';

// Debug only (hidden by default)
debugLog('📡 Received update:', update);

// Always shown (important info/errors)
infoLog('Game created:', gameId);
errorLog('Connection failed:', error);
```

## Migration Status

**TODO**: Replace all debug `console.log()` statements with `debugLog()`:
- [x] Created debug utilities (server & client)
- [ ] apps/server/src/index.ts (many statements)
- [ ] apps/web/src/hooks/useSocket.ts
- [ ] apps/web/src/hooks/useGameState.ts  
- [ ] apps/web/src/pages/HomePage.tsx
- [ ] apps/web/src/pages/JoinPage.tsx
- [ ] apps/web/src/pages/GamePage.tsx

## Quick Replace Pattern

For files with many debug logs, use search & replace:
- Find: `console.log('🎮` → Replace: `debugLog('🎮`
- Find: `console.log('📡` → Replace: `debugLog('📡`
- Find: `console.log('🔍` → Replace: `debugLog('🔍`
- etc. for other emoji prefixes

Keep using `console.error()` for actual errors that should always be shown, or use `errorLog()`.

