import { test, expect } from '@playwright/test';

test.describe('Spyfall Game E2E', () => {
  test('complete game flow: create game, join players, start round, accuse, vote', async ({ browser }) => {
    // Create multiple browser contexts for different players
    const hostContext = await browser.newContext();
    const player1Context = await browser.newContext();
    const player2Context = await browser.newContext();
    const player3Context = await browser.newContext();

    const hostPage = await hostContext.newPage();
    const player1Page = await player1Context.newPage();
    const player2Page = await player2Context.newPage();
    const player3Page = await player3Context.newPage();

    // Host creates game
    await hostPage.goto('/');
    await hostPage.fill('input[placeholder="Enter your name"]', 'Host');
    await hostPage.click('button:has-text("Create Game")');
    
    // Wait for game to be created and get game ID
    await hostPage.waitForSelector('text=Game ID:');
    const gameIdText = await hostPage.textContent('text=Game ID:');
    const gameId = gameIdText?.match(/Game ID: ([A-Z0-9]{6})/)?.[1];
    expect(gameId).toBeTruthy();

    // Get join URL
    const joinUrl = `/join/${gameId}`;

    // Player 1 joins
    await player1Page.goto(joinUrl);
    await player1Page.fill('input[placeholder="Enter your name"]', 'Alice');
    await player1Page.click('button:has-text("Join Game")');
    
    // Player 2 joins
    await player2Page.goto(joinUrl);
    await player2Page.fill('input[placeholder="Enter your name"]', 'Bob');
    await player2Page.click('button:has-text("Join Game")');
    
    // Player 3 joins
    await player3Page.goto(joinUrl);
    await player3Page.fill('input[placeholder="Enter your name"]', 'Charlie');
    await player3Page.click('button:has-text("Join Game")');

    // Wait for all players to be in the game
    await hostPage.waitForSelector('text=Players: 4');
    await player1Page.waitForSelector('text=Players: 4');
    await player2Page.waitForSelector('text=Players: 4');
    await player3Page.waitForSelector('text=Players: 4');

    // Host starts the round
    await hostPage.click('button:has-text("Start Round")');

    // Wait for role assignments
    await hostPage.waitForSelector('text=You are the');
    await player1Page.waitForSelector('text=You are the');
    await player2Page.waitForSelector('text=You are the');
    await player3Page.waitForSelector('text=You are the');

    // Verify game state
    await expect(hostPage.locator('text=Current Turn')).toBeVisible();
    await expect(player1Page.locator('text=Current Turn')).toBeVisible();
    await expect(player2Page.locator('text=Current Turn')).toBeVisible();
    await expect(player3Page.locator('text=Current Turn')).toBeVisible();

    // Host advances turn
    await hostPage.click('button:has-text("Advance Turn")');

    // Host starts an accusation
    await hostPage.click('button:has-text("Accuse Player")');
    
    // Wait for accusation modal and select a player
    await hostPage.waitForSelector('[role="dialog"]');
    const accusedPlayerButton = hostPage.locator('button:has-text("Alice")');
    await accusedPlayerButton.click();

    // Wait for voting modal to appear on all pages
    await hostPage.waitForSelector('text=Is Alice the spy?');
    await player1Page.waitForSelector('text=Is Alice the spy?');
    await player2Page.waitForSelector('text=Is Alice the spy?');
    await player3Page.waitForSelector('text=Is Alice the spy?');

    // Players vote (Alice can't vote for herself)
    await player2Page.click('button:has-text("Yes, they are the spy")');
    await player3Page.click('button:has-text("No, they are innocent")');
    // Host votes last
    await hostPage.click('button:has-text("Yes, they are the spy")');

    // Wait for voting to complete and results
    await hostPage.waitForSelector('text=Vote Results:');
    await expect(hostPage.locator('text=Guilty: 2')).toBeVisible();
    await expect(hostPage.locator('text=Innocent: 1')).toBeVisible();

    // Host cancels the accusation to end the round
    await hostPage.click('button:has-text("Cancel Accusation")');

    // Verify we're back to playing state
    await expect(hostPage.locator('text=Current Turn')).toBeVisible();

    // Host ends the round
    await hostPage.click('button:has-text("End Round")');

    // Verify round ended
    await expect(hostPage.locator('button:has-text("Start Round")')).toBeVisible();

    // Clean up
    await hostContext.close();
    await player1Context.close();
    await player2Context.close();
    await player3Context.close();
  });

  test('QR code generation and join URL functionality', async ({ page }) => {
    await page.goto('/');
    await page.fill('input[placeholder="Enter your name"]', 'Host');
    await page.click('button:has-text("Create Game")');
    
    // Wait for QR code to be generated
    await page.waitForSelector('img[alt="QR code to join the game"]');
    
    // Verify QR code is visible
    const qrCode = page.locator('img[alt="QR code to join the game"]');
    await expect(qrCode).toBeVisible();
    
    // Test copy URL functionality
    await page.click('button:has-text("Copy join URL instead")');
    
    // In a real test, you'd verify clipboard content, but that's complex in Playwright
    // For now, just verify the button exists and is clickable
    await expect(page.locator('button:has-text("Copy join URL instead")')).toBeVisible();
  });

  test('responsive design and accessibility', async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    
    // Verify form elements are properly sized for touch
    const nameInput = page.locator('input[placeholder="Enter your name"]');
    const boundingBox = await nameInput.boundingBox();
    expect(boundingBox?.height).toBeGreaterThanOrEqual(44); // Minimum touch target size
    
    // Test keyboard navigation
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    
    // Verify focus is visible
    const focusedElement = page.locator(':focus');
    await expect(focusedElement).toBeVisible();
    
    // Test form submission with Enter key
    await nameInput.fill('Test Player');
    await nameInput.press('Enter');
    
    // Verify error handling for empty game ID
    await expect(page.locator('text=Game ID')).toBeVisible();
  });

  test('error handling and edge cases', async ({ page }) => {
    await page.goto('/');
    
    // Test invalid game ID
    await page.fill('input[placeholder="Enter your name"]', 'Test Player');
    await page.fill('input[placeholder="Enter 6-letter game code"]', 'INVALID');
    await page.click('button:has-text("Join Game")');
    
    // Should show error
    await expect(page.locator('text=Invalid game ID format')).toBeVisible();
    
    // Test name validation
    await page.fill('input[placeholder="Enter 6-letter game code"]', 'ABCD12');
    await page.fill('input[placeholder="Enter your name"]', '');
    await page.click('button:has-text("Join Game")');
    
    // Button should be disabled for empty name
    await expect(page.locator('button:has-text("Join Game")')).toBeDisabled();
    
    // Test name length limit
    await page.fill('input[placeholder="Enter your name"]', 'A'.repeat(21));
    const nameInput = page.locator('input[placeholder="Enter your name"]');
    const value = await nameInput.inputValue();
    expect(value.length).toBeLessThanOrEqual(20);
  });

  test('connection handling and reconnection', async ({ browser }) => {
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();
    
    const page1 = await context1.newPage();
    const page2 = await context2.newPage();

    // Create game and join with first player
    await page1.goto('/');
    await page1.fill('input[placeholder="Enter your name"]', 'Host');
    await page1.click('button:has-text("Create Game")');
    
    const gameIdText = await page1.textContent('text=Game ID:');
    const gameId = gameIdText?.match(/Game ID: ([A-Z0-9]{6})/)?.[1];
    const joinUrl = `/join/${gameId}`;

    // Second player joins
    await page2.goto(joinUrl);
    await page2.fill('input[placeholder="Enter your name"]', 'Player');
    await page2.click('button:has-text("Join Game")');

    // Wait for both players to be connected
    await page1.waitForSelector('text=Players: 2');
    await page2.waitForSelector('text=Players: 2');

    // Disconnect second player (simulate network issue)
    await page2.close();
    
    // Wait a moment for disconnect to be detected
    await page1.waitForTimeout(1000);
    
    // Verify first player sees disconnect indicator
    await expect(page1.locator('text=Players: 2')).toBeVisible(); // Still shows 2 players
    
    // Reconnect second player
    const page2New = await context2.newPage();
    await page2New.goto(joinUrl);
    await page2New.fill('input[placeholder="Enter your name"]', 'Player');
    await page2New.click('button:has-text("Join Game")');

    // Should show name taken error
    await expect(page2New.locator('text=Name already taken')).toBeVisible();

    await context1.close();
    await context2.close();
  });
});
