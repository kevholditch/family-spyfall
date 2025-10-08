import { test, expect, Page } from '@playwright/test';

test.describe('Spyfall Round Continuation', () => {
  test('continues to next question round when nobody wins', async ({ browser }) => {
    console.log('🚀 Starting test: continues to next question round when nobody wins');
    
    // Create contexts for host (TV) and three players
    console.log('📱 Creating browser contexts...');
    const hostContext = await browser.newContext();
    const playerAContext = await browser.newContext();
    const playerBContext = await browser.newContext();
    const playerCContext = await browser.newContext();

    console.log('📄 Creating pages...');
    const hostPage = await hostContext.newPage();
    const playerAPage = await playerAContext.newPage();
    const playerBPage = await playerBContext.newPage();
    const playerCPage = await playerCContext.newPage();

    try {
      console.log('✅ Server should be started by Playwright config');
      
      // Given: 3 players have joined a game
      console.log('🏠 Host creating game...');
      await hostPage.goto('/');
      await hostPage.waitForSelector('button:has-text("Create New Game")');
      await hostPage.click('button:has-text("Create New Game")');
      
      await hostPage.waitForSelector('text=Game ID:', { timeout: 10000 });
      const gameIdElement = await hostPage.locator('strong.text-yellow-400').first();
      const gameId = await gameIdElement.textContent();
      expect(gameId).toBeTruthy();
      console.log(`✅ Game created with ID: ${gameId}`);

      // Players join
      await joinGame(playerAPage, gameId!, 'player a');
      await joinGame(playerBPage, gameId!, 'player b');
      await joinGame(playerCPage, gameId!, 'player c');

      // Given: Round has started
      console.log('🎮 Starting round 1...');
      await hostPage.waitForSelector('button:has-text("Start Round 1")', { timeout: 5000 });
      await hostPage.click('button:has-text("Start Round 1")');
      await hostPage.waitForSelector('text=Round 1', { timeout: 5000 });
      console.log('✅ Round 1 started!');

      // Wait for players to be redirected to game page
      console.log('⏳ Waiting for players to redirect to game page...');
      await playerAPage.waitForURL(/\/game\//, { timeout: 10000 });
      await playerBPage.waitForURL(/\/game\//, { timeout: 10000 });
      await playerCPage.waitForURL(/\/game\//, { timeout: 10000 });
      console.log('✅ All players redirected to game page');

      // Wait for role assignments
      await Promise.race([
        playerAPage.waitForSelector('text=YOU ARE THE SPY!', { timeout: 10000 }),
        playerAPage.waitForSelector('text=YOUR LOCATION', { timeout: 10000 })
      ]);
      await Promise.race([
        playerBPage.waitForSelector('text=YOU ARE THE SPY!', { timeout: 10000 }),
        playerBPage.waitForSelector('text=YOUR LOCATION', { timeout: 10000 })
      ]);
      await Promise.race([
        playerCPage.waitForSelector('text=YOU ARE THE SPY!', { timeout: 10000 }),
        playerCPage.waitForSelector('text=YOUR LOCATION', { timeout: 10000 })
      ]);
      console.log('✅ All players received roles');

      // Collect initial role information
      const playerARoleInfo = await getRoleInfo(playerAPage);
      const playerBRoleInfo = await getRoleInfo(playerBPage);
      const playerCRoleInfo = await getRoleInfo(playerCPage);

      const players = [
        { name: 'player a', page: playerAPage, ...playerARoleInfo },
        { name: 'player b', page: playerBPage, ...playerBRoleInfo },
        { name: 'player c', page: playerCPage, ...playerCRoleInfo },
      ];

      const spy = players.find(p => p.isSpy)!;
      const civilians = players.filter(p => !p.isSpy);
      const originalLocation = civilians[0].location;

      console.log(`🕵️  Spy is: ${spy.name}`);
      console.log(`🗺️  Location is: ${originalLocation}`);

      // Given: Each player has asked their question
      console.log('❓ Each player asking their question...');
      
      // Player 1 asks question
      await players[0].page.waitForSelector('button:has-text("Next")', { timeout: 5000 });
      await players[0].page.click('button:has-text("Next")');
      console.log(`✅ ${players[0].name} asked their question`);
      
      // Player 2 asks question
      await players[1].page.waitForSelector('button:has-text("Next")', { timeout: 5000 });
      await players[1].page.click('button:has-text("Next")');
      console.log(`✅ ${players[1].name} asked their question`);
      
      // Player 3 asks question (triggers accuse mode)
      await players[2].page.waitForSelector('button:has-text("Next")', { timeout: 5000 });
      await players[2].page.click('button:has-text("Next")');
      console.log(`✅ ${players[2].name} asked their question`);

      // Wait for accuse mode to start
      console.log('⏳ Waiting for accusation phase...');
      await Promise.race([
        playerAPage.waitForSelector('text=Accusation Phase!', { timeout: 10000 }),
        playerAPage.waitForSelector('text=Guess the location', { timeout: 10000 })
      ]);
      console.log('✅ Accusation phase started!');

      // When: Spy guesses incorrect location
      console.log(`🕵️  Spy (${spy.name}) guessing incorrect location...`);
      const wrongLocation = civilians[0].location === 'Bank' ? 'Beach' : 'Bank';
      const locationButtons = await spy.page.locator('button').filter({ hasText: wrongLocation });
      await locationButtons.first().click();
      console.log(`✅ Spy guessed: ${wrongLocation} (incorrect)`);

      // When: Each civilian guesses a different player (not the spy)
      console.log('👥 Civilians voting for different players...');
      
      // First civilian votes for second civilian
      const civilianVoteButtons1 = await civilians[0].page.locator('button').filter({ hasText: civilians[1].name });
      await civilianVoteButtons1.first().click();
      console.log(`✅ ${civilians[0].name} voted for ${civilians[1].name}`);
      
      // Second civilian votes for first civilian
      const civilianVoteButtons2 = await civilians[1].page.locator('button').filter({ hasText: civilians[0].name });
      await civilianVoteButtons2.first().click();
      console.log(`✅ ${civilians[1].name} voted for ${civilians[0].name}`);

      // Wait a moment for the round to process
      await hostPage.waitForTimeout(1000);

      // Then: Another round should start with the first player asking a question again
      console.log('⏳ Waiting for new question round to start...');
      
      // Check that we're back in question round (status should be 'playing')
      await players[0].page.waitForSelector('text=Question Round', { timeout: 10000 });
      console.log('✅ New question round started!');

      // Verify first player should be asking again
      const currentTurnText = await players[0].page.locator('text=Current Turn:').isVisible();
      expect(currentTurnText).toBe(true);
      console.log('✅ First player is asking questions again');

      // Then: The spy should still be the same player
      console.log('🔍 Verifying spy is still the same...');
      const newPlayerARoleInfo = await getRoleInfo(playerAPage);
      const newPlayerBRoleInfo = await getRoleInfo(playerBPage);
      const newPlayerCRoleInfo = await getRoleInfo(playerCPage);

      const newPlayers = [
        { name: 'player a', ...newPlayerARoleInfo },
        { name: 'player b', ...newPlayerBRoleInfo },
        { name: 'player c', ...newPlayerCRoleInfo },
      ];

      const newSpy = newPlayers.find(p => p.isSpy)!;
      expect(newSpy.name).toBe(spy.name);
      console.log(`✅ Spy is still: ${newSpy.name}`);

      // Then: The location should still be the same
      console.log('🗺️  Verifying location is still the same...');
      const newCivilians = newPlayers.filter(p => !p.isSpy);
      expect(newCivilians[0].location).toBe(originalLocation);
      expect(newCivilians[1].location).toBe(originalLocation);
      console.log(`✅ Location is still: ${originalLocation}`);

      console.log('🎉 Test completed successfully!');

    } finally {
      // Cleanup
      console.log('🧹 Cleaning up browser contexts and pages...');
      await hostPage.close();
      await playerAPage.close();
      await playerBPage.close();
      await playerCPage.close();
      await hostContext.close();
      await playerAContext.close();
      await playerBContext.close();
      await playerCContext.close();
      console.log('✅ Cleanup complete');
    }
  });
});

// Helper function to join a game
async function joinGame(page: Page, gameId: string, playerName: string) {
  console.log(`👤 [${playerName}] Navigating to join page...`);
  await page.goto(`/join/${gameId}`);
  
  console.log(`👤 [${playerName}] Waiting for player name input...`);
  await page.waitForSelector('input#playerName', { timeout: 5000 });
  
  console.log(`👤 [${playerName}] Entering player name...`);
  await page.fill('input#playerName', playerName);
  
  console.log(`👤 [${playerName}] Clicking Join Game button...`);
  await page.click('button:has-text("Join Game")');
  
  console.log(`👤 [${playerName}] Waiting for welcome message...`);
  await page.waitForSelector(`text=Welcome to the game, ${playerName}!`, { timeout: 5000 });
  
  console.log(`✅ [${playerName}] Successfully joined the game`);
}

// Helper function to get role information from a player page
async function getRoleInfo(page: Page): Promise<{ isSpy: boolean; location?: string }> {
  console.log('🔍 Getting role info from player page...');
  
  // Check if player is spy
  console.log('🕵️  Checking if player is spy...');
  const isSpy = await page.locator('text=YOU ARE THE SPY!').isVisible();
  
  if (isSpy) {
    console.log('✅ Player is a SPY');
    return { isSpy: true };
  }
  
  // If not spy, get the location
  console.log('👤 Player is a CIVILIAN, getting location...');
  const locationElement = await page.locator('.text-4xl.font-bold.text-green-400').first();
  const location = await locationElement.textContent();
  console.log(`✅ Location retrieved: ${location?.trim()}`);
  
  return { 
    isSpy: false, 
    location: location?.trim() 
  };
}

