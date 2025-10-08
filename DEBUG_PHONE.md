# Debugging Phone Connection Issues

## Quick Checklist

1. **Get your laptop's IP address:**
   ```bash
   # On macOS
   ifconfig | grep "inet " | grep -v 127.0.0.1
   
   # Or use this simpler command
   ipconfig getifaddr en0
   ```

2. **Verify servers are running and accessible:**
   ```bash
   # Check if backend is accessible from network
   curl http://YOUR_IP:4000/health
   
   # Should return: {"status":"ok","timestamp":"..."}
   ```

3. **Access from phone:**
   - Open browser on phone
   - Navigate to: `http://YOUR_IP:5173`
   - You should see the join page

4. **Check browser console on phone:**
   - Open developer tools on phone browser
   - Check for any CORS errors or connection errors
   - Look for WebSocket connection status

## Common Issues

### Issue: Can't access website from phone

**Solution:** Make sure both devices are on the same WiFi network

### Issue: Website loads but can't connect to backend

**Check backend is listening on all interfaces:**
```bash
lsof -i:4000
# Should show IPv6 *:terabase (LISTEN) or similar
```

### Issue: CORS errors

**Current CORS config allows:**
- `http://localhost:5173`
- `http://192.168.x.x:5173` (any IP in 192.168 range)
- `http://10.x.x.x:5173` (any IP in 10 range)
- `http://172.16-31.x.x:5173` (private range)

If your network uses a different range, you may need to update CORS in `apps/server/src/index.ts`

### Issue: Game doesn't start after joining

**Debug steps:**
1. Check browser console on phone for errors
2. Check server logs for socket events
3. Verify roleAssignment event is being sent
4. Check if redirect to /game/:id is happening

## Testing Connection from Phone

1. **Start the development servers:**
   ```bash
   pnpm dev
   ```

2. **Find your IP:**
   ```bash
   ipconfig getifaddr en0
   # Example output: 192.168.1.100
   ```

3. **On your phone, navigate to:**
   ```
   http://192.168.1.100:5173/join/[GAME_ID]
   ```

4. **Watch the server console for:**
   - Socket connection events
   - Join game events  
   - Role assignment events

## Added Debug Logging

The app now has extensive debug logging. Check the browser console on your phone to see:
- Socket connection status
- Game state updates
- Role assignments
- Errors

### On JoinPage (when joining):
Look for:
- `🔌 useSocket - Creating new socket connection to:` - Should show your IP, not localhost
- `👤 [YourName] Successfully joined the game`
- When round starts: `🎮 JoinPage - Game started, redirecting to game page`

### On GamePage (after redirect):
Look for:
- `🔄 GamePage - Rejoin effect triggered:` - Check serverUrl is your IP
- `📡 GamePage - Emitting join_game for reconnection...`
- `📡 GamePage - Socket connected to:` - Should be `http://YOUR_IP:4000`
- `🎭 useSocket - Received role_assignment event:` - **THIS IS THE KEY!**
  - If you see this, role assignment is working
  - If you DON'T see this, the server isn't sending it or socket isn't receiving

### If GamePage stays on "Waiting for Game to Start...":

Check the debug indicator on the screen:
- `gameState=✓` means game state was loaded
- `roleAssignment=✗` means role assignment not received (THIS IS THE PROBLEM)

Then check console for:
- Did you see `🎭 useSocket - Received role_assignment event:`?
- Did you see `📡 GamePage - Emitting join_game for reconnection...`?
- Are there any errors?

### Server Console

Watch for when phone player rejoins on GamePage:
- Should see: `📤 Server - Sending role assignment to player [Name]`
- Check the sockets in room - should not be "NONE"

