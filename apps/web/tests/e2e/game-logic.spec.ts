import { test, expect, Page } from '@playwright/test';

test.describe('Spyfall Game Logic', () => {
  test('verifies game logic with three players', async ({ browser }) => {
    console.log('🚀 Starting test: verifies game logic with three players');
    
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
      // Given: Server is started (handled by Playwright config)
      console.log('✅ Server should be started by Playwright config');
      
      // Host creates a game
      console.log('🏠 Host navigating to home page...');
      await hostPage.goto('/');
      
      console.log('⏳ Waiting for Create New Game button...');
      await hostPage.waitForSelector('button:has-text("Create New Game")');
      
      console.log('🖱️  Clicking Create New Game button...');
      await hostPage.click('button:has-text("Create New Game")');
      
      // Wait for game to be created and extract game ID
      console.log('⏳ Waiting for Game ID to appear...');
      await hostPage.waitForSelector('text=Game ID:', { timeout: 10000 });
      
      console.log('🔍 Extracting game ID...');
      const gameIdElement = await hostPage.locator('strong.text-yellow-400').first();
      const gameId = await gameIdElement.textContent();
      expect(gameId).toBeTruthy();
      
      console.log(`✅ Game created with ID: ${gameId}`);

      // And: Player A joins with name "player a"
      await joinGame(playerAPage, gameId!, 'player a');
      
      // And: Player B joins with name "player b"
      await joinGame(playerBPage, gameId!, 'player b');
      
      // And: Player C joins with name "player c"
      await joinGame(playerCPage, gameId!, 'player c');

      // Verify all players are visible on the host page
      console.log('⏳ Verifying all players are visible on host page...');
      await hostPage.waitForSelector('text=player a', { timeout: 5000 });
      console.log('✅ Player A visible on host page');
      await hostPage.waitForSelector('text=player b', { timeout: 5000 });
      console.log('✅ Player B visible on host page');
      await hostPage.waitForSelector('text=player c', { timeout: 5000 });
      console.log('✅ Player C visible on host page');

      // When: The host clicks "start round 1"
      console.log('⏳ Waiting for Start Round 1 button...');
      await hostPage.waitForSelector('button:has-text("Start Round 1")', { timeout: 5000 });
      console.log('🖱️  Clicking Start Round 1 button...');
      await hostPage.click('button:has-text("Start Round 1")');

      // Wait for round to start
      console.log('⏳ Waiting for round to start...');
      await hostPage.waitForSelector('text=Round 1', { timeout: 5000 });
      console.log('✅ Round 1 started!');

      // Wait for players to be redirected to game page
      console.log('⏳ Waiting for players to redirect to game page...');
      await playerAPage.waitForURL(/\/game\//, { timeout: 10000 });
      console.log('✅ Player A redirected to game page');
      await playerBPage.waitForURL(/\/game\//, { timeout: 10000 });
      console.log('✅ Player B redirected to game page');
      await playerCPage.waitForURL(/\/game\//, { timeout: 10000 });
      console.log('✅ Player C redirected to game page');

      // Then: Verify all players received their roles
      console.log('⏳ Verifying all players received their roles...');
      // Check for either spy or civilian role display
      await Promise.race([
        playerAPage.waitForSelector('text=YOU ARE THE SPY!', { timeout: 10000 }),
        playerAPage.waitForSelector('text=YOUR LOCATION', { timeout: 10000 })
      ]);
      console.log('✅ Player A received role');
      
      await Promise.race([
        playerBPage.waitForSelector('text=YOU ARE THE SPY!', { timeout: 10000 }),
        playerBPage.waitForSelector('text=YOUR LOCATION', { timeout: 10000 })
      ]);
      console.log('✅ Player B received role');
      
      await Promise.race([
        playerCPage.waitForSelector('text=YOU ARE THE SPY!', { timeout: 10000 }),
        playerCPage.waitForSelector('text=YOUR LOCATION', { timeout: 10000 })
      ]);
      console.log('✅ Player C received role');

      // Collect role information from all players
      console.log('🔍 Collecting role information from all players...');
      const playerARoleInfo = await getRoleInfo(playerAPage);
      console.log('📊 Player A role info:', playerARoleInfo);
      const playerBRoleInfo = await getRoleInfo(playerBPage);
      console.log('📊 Player B role info:', playerBRoleInfo);
      const playerCRoleInfo = await getRoleInfo(playerCPage);
      console.log('📊 Player C role info:', playerCRoleInfo);

      const players = [
        { name: 'player a', ...playerARoleInfo },
        { name: 'player b', ...playerBRoleInfo },
        { name: 'player c', ...playerCRoleInfo },
      ];

      console.log('👥 Player roles:', players);

      // Then: The player called "player a" should be in the round
      console.log('✔️  Verifying player a is in the round...');
      expect(players.find(p => p.name === 'player a')).toBeDefined();
      console.log('✅ Player a is in the round');
      
      // Then: The player called "player b" should be in the round
      console.log('✔️  Verifying player b is in the round...');
      expect(players.find(p => p.name === 'player b')).toBeDefined();
      console.log('✅ Player b is in the round');
      
      // Then: The player called "player c" should be in the round
      console.log('✔️  Verifying player c is in the round...');
      expect(players.find(p => p.name === 'player c')).toBeDefined();
      console.log('✅ Player c is in the round');

      // Then: Exactly one player should be the spy
      console.log('🕵️  Counting spies...');
      const spies = players.filter(p => p.isSpy);
      console.log(`Found ${spies.length} spy/spies`);
      expect(spies.length).toBe(1);
      console.log(`✅ The spy is: ${spies[0].name}`);

      // Then: Exactly two players should be civilians and know the location
      console.log('👤 Counting civilians...');
      const civilians = players.filter(p => !p.isSpy);
      console.log(`Found ${civilians.length} civilian(s)`);
      expect(civilians.length).toBe(2);
      console.log('✅ Exactly 2 civilians found');
      
      // Verify both civilians have the same location
      console.log('🗺️  Verifying civilians know the location...');
      expect(civilians[0].location).toBeTruthy();
      expect(civilians[1].location).toBeTruthy();
      expect(civilians[0].location).toBe(civilians[1].location);
      console.log(`✅ The location is: ${civilians[0].location}`);
      
      // Verify spy doesn't know the location
      console.log('🔒 Verifying spy does NOT know the location...');
      expect(spies[0].location).toBeUndefined();
      console.log('✅ Spy does not know the location');

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
  
  // Wait for the join page to load
  console.log(`👤 [${playerName}] Waiting for player name input...`);
  await page.waitForSelector('input#playerName', { timeout: 5000 });
  
  // Enter player name
  console.log(`👤 [${playerName}] Entering player name...`);
  await page.fill('input#playerName', playerName);
  
  // Click join button
  console.log(`👤 [${playerName}] Clicking Join Game button...`);
  await page.click('button:has-text("Join Game")');
  
  // Wait for successful join
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
