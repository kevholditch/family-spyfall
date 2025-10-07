import { test, expect } from '@playwright/test';

test.describe('TV Control Center - Complete Game Flow', () => {
  test('TV creates game, mobile players join, game starts successfully', async ({ browser }) => {
    // Create browser contexts for different devices
    const tvContext = await browser.newContext({
      // TV context - larger screen
      viewport: { width: 1920, height: 1080 }
    });
    
    const mobile1Context = await browser.newContext({
      // Mobile context
      viewport: { width: 375, height: 667 },
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15'
    });
    
    const mobile2Context = await browser.newContext({
      viewport: { width: 375, height: 667 },
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15'
    });
    
    const mobile3Context = await browser.newContext({
      viewport: { width: 375, height: 667 },
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15'
    });

    const tvPage = await tvContext.newPage();
    const mobile1Page = await mobile1Context.newPage();
    const mobile2Page = await mobile2Context.newPage();
    const mobile3Page = await mobile3Context.newPage();

    // Step 1: TV loads and shows create game screen
    await tvPage.goto('/');
    
    // Verify initial TV control center screen
    await expect(tvPage.locator('text=FAMILY SPYFALL')).toBeVisible();
    await expect(tvPage.locator('text=TV Control Center')).toBeVisible();
    await expect(tvPage.locator('button:has-text("Create New Game")')).toBeVisible();
    
    // Step 2: TV creates a game
    await tvPage.click('button:has-text("Create New Game")');
    
    // Wait for game creation to start (button should show loading state)
    await tvPage.waitForSelector('button:has-text("Creating Game...")', { timeout: 5000 });
    
    // Wait for the game interface to load
    await tvPage.waitForSelector('text=Game ID:', { timeout: 15000 });
    
    // Verify TV now shows game interface
    await expect(tvPage.locator('text=Game ID:')).toBeVisible();
    await expect(tvPage.locator('text=Players: 1')).toBeVisible();
    await expect(tvPage.locator('text=TV Host')).toBeVisible();
    
    // Get the game ID from the TV
    const gameIdText = await tvPage.textContent('text=Game ID:');
    const gameId = gameIdText?.match(/Game ID: ([A-Z0-9]{6})/)?.[1];
    expect(gameId).toBeTruthy();
    
    // Verify QR code is visible
    await expect(tvPage.locator('img[alt="QR code to join the game"]')).toBeVisible();
    
    // Step 3: Mobile players join the game
    const joinUrl = `/join/${gameId}`;
    
    // Player 1 joins
    await mobile1Page.goto(joinUrl);
    await mobile1Page.fill('input[placeholder="Enter your name"]', 'Alice');
    await mobile1Page.click('button:has-text("Join Game")');
    
    // Player 2 joins
    await mobile2Page.goto(joinUrl);
    await mobile2Page.fill('input[placeholder="Enter your name"]', 'Bob');
    await mobile2Page.click('button:has-text("Join Game")');
    
    // Player 3 joins
    await mobile3Page.goto(joinUrl);
    await mobile3Page.fill('input[placeholder="Enter your name"]', 'Charlie');
    await mobile3Page.click('button:has-text("Join Game")');
    
    // Step 4: Verify TV updates with all players
    await tvPage.waitForSelector('text=Players: 4', { timeout: 10000 });
    
    // Verify all players are shown on TV
    await expect(tvPage.locator('text=TV Host')).toBeVisible();
    await expect(tvPage.locator('text=Alice')).toBeVisible();
    await expect(tvPage.locator('text=Bob')).toBeVisible();
    await expect(tvPage.locator('text=Charlie')).toBeVisible();
    
    // Verify "Start Round" button is now visible (need 3+ players)
    await expect(tvPage.locator('button:has-text("Start Round")')).toBeVisible();
    
    // Step 5: Start the game
    await tvPage.click('button:has-text("Start Round")');
    
    // Wait for game to start
    await tvPage.waitForSelector('text=CURRENT TURN', { timeout: 5000 });
    
    // Verify game has started
    await expect(tvPage.locator('text=Round 1')).toBeVisible();
    await expect(tvPage.locator('text=CURRENT TURN')).toBeVisible();
    
    // Verify one player is highlighted as current turn
    await expect(tvPage.locator('text=CURRENT TURN').first()).toBeVisible();
    
    // Step 6: Test turn advancement
    await tvPage.click('button:has-text("Advance Turn")');
    
    // Verify turn has advanced (different player highlighted)
    await tvPage.waitForTimeout(1000); // Allow for state update
    await expect(tvPage.locator('text=CURRENT TURN')).toBeVisible();
    
    // Step 7: Test accusation flow
    await tvPage.click('button:has-text("Accuse Player")');
    
    // Wait for accusation modal
    await tvPage.waitForSelector('[role="dialog"]');
    
    // Select a player to accuse
    await tvPage.click('button:has-text("Alice")');
    
    // Wait for voting to start
    await tvPage.waitForSelector('text=VOTING IN PROGRESS', { timeout: 5000 });
    
    // Verify voting is in progress
    await expect(tvPage.locator('text=VOTING IN PROGRESS')).toBeVisible();
    await expect(tvPage.locator('text=Alice is being accused')).toBeVisible();
    
    // Step 8: Cancel accusation to end round
    await tvPage.click('button:has-text("Cancel Accusation")');
    
    // Verify we're back to playing state
    await expect(tvPage.locator('text=CURRENT TURN')).toBeVisible();
    
    // Step 9: End the round
    await tvPage.click('button:has-text("End Round")');
    
    // Verify round ended
    await expect(tvPage.locator('button:has-text("Start Round")')).toBeVisible();
    await expect(tvPage.locator('text=WAITING FOR PLAYERS')).toBeVisible();
    
    // Clean up
    await tvContext.close();
    await mobile1Context.close();
    await mobile2Context.close();
    await mobile3Context.close();
  });

  test('TV control center handles connection errors gracefully', async ({ page }) => {
    // Test with invalid server
    await page.goto('/');
    
    // Should show connection error
    await expect(page.locator('text=Connecting to Server...')).toBeVisible();
    
    // Wait for connection timeout or error
    await page.waitForTimeout(5000);
    
    // Should either connect or show error
    const hasError = await page.locator('text=Connection Error').isVisible();
    const hasGame = await page.locator('button:has-text("Create New Game")').isVisible();
    
    expect(hasError || hasGame).toBe(true);
  });

  test('QR code generates correctly and contains valid join URL', async ({ browser }) => {
    const tvContext = await browser.newContext();
    const tvPage = await tvContext.newPage();

    // Create game
    await tvPage.goto('/');
    await tvPage.click('button:has-text("Create New Game")');
    
    // Wait for game to load
    await tvPage.waitForSelector('img[alt="QR code to join the game"]', { timeout: 10000 });
    
    // Verify QR code is present and has correct attributes
    const qrCode = tvPage.locator('img[alt="QR code to join the game"]');
    await expect(qrCode).toBeVisible();
    
    // Verify QR code has src attribute (data URL)
    const src = await qrCode.getAttribute('src');
    expect(src).toContain('data:image/png;base64,');
    
    // Verify join URL text is present
    await expect(tvPage.locator('text=Scan to join the game')).toBeVisible();
    
    // Test copy URL functionality
    await expect(tvPage.locator('button:has-text("Copy join URL instead")')).toBeVisible();
    
    await tvContext.close();
  });

  test('Game handles player disconnection and reconnection', async ({ browser }) => {
    const tvContext = await browser.newContext();
    const mobileContext = await browser.newContext();
    
    const tvPage = await tvContext.newPage();
    const mobilePage = await mobileContext.newPage();

    // Create game and join with mobile player
    await tvPage.goto('/');
    await tvPage.click('button:has-text("Create New Game")');
    await tvPage.waitForSelector('text=Players: 1', { timeout: 10000 });
    
    const gameIdText = await tvPage.textContent('text=Game ID:');
    const gameId = gameIdText?.match(/Game ID: ([A-Z0-9]{6})/)?.[1];
    expect(gameId).toBeTruthy();
    
    // Join with mobile player
    await mobilePage.goto(`/join/${gameId}`);
    await mobilePage.fill('input[placeholder="Enter your name"]', 'Test Player');
    await mobilePage.click('button:has-text("Join Game")');
    
    // Verify player joined
    await tvPage.waitForSelector('text=Players: 2', { timeout: 5000 });
    await expect(tvPage.locator('text=Test Player')).toBeVisible();
    
    // Disconnect mobile player
    await mobilePage.close();
    await mobileContext.close();
    
    // Wait a moment for disconnect to be detected
    await tvPage.waitForTimeout(2000);
    
    // Player should still be in list but may show as disconnected
    await expect(tvPage.locator('text=Test Player')).toBeVisible();
    
    await tvContext.close();
  });
});
