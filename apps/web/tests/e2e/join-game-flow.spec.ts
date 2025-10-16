import { test, expect } from '@playwright/test';
import { PlayerBuilder, HostBuilder, TestSetup } from './helpers/TestBuilders';

test.describe('Join Game Flow', () => {
  test('verifies join game flow from home page', async ({ browser }) => {
    console.log('🚀 Starting test: verifies join game flow from home page');
    
    const playerBuilder = new PlayerBuilder(browser);
    const hostBuilder = new HostBuilder(browser);
    const setup = new TestSetup(playerBuilder, hostBuilder);

    try {
      console.log('✅ Server should be started by Playwright config');
      
      // Create host and start game
      const host = await setup.createHost();
      await host.goToHome();
      const gameId = await host.createGame();
      expect(gameId).toBeTruthy();
      console.log(`🎮 Game created with ID: ${gameId}`);

      // Create a player to test the join flow
      const player = await setup.createPlayer('test player');
      
      // Navigate to home page
      console.log('🏠 Navigating to home page...');
      await player.page.goto('/');
      
      // Wait for the page to load
      await player.page.waitForSelector('text=SPYFALL', { timeout: 5000 });
      console.log('✅ Home page loaded');
      
      // Click the "Join Game" button
      console.log('🔘 Clicking Join Game button...');
      await player.page.click('button:has-text("Join Game")');
      
      // Wait for the input field to appear
      console.log('⏳ Waiting for game ID input field...');
      await player.page.waitForSelector('input[placeholder="Enter Game ID"]', { timeout: 5000 });
      console.log('✅ Game ID input field appeared');
      
      // Enter the game ID
      console.log(`📝 Entering game ID: ${gameId}`);
      await player.page.fill('input[placeholder="Enter Game ID"]', gameId);
      
      // Click the Join button
      console.log('🔘 Clicking Join button...');
      await player.page.click('button:has-text("Join")');
      
      // Wait for redirect to join page
      console.log('⏳ Waiting for redirect to join page...');
      await player.page.waitForURL(/\/join\//, { timeout: 5000 });
      console.log('✅ Redirected to join page');
      
      // Wait for player name input on join page
      console.log('⏳ Waiting for player name input...');
      await player.page.waitForSelector('input#playerName', { timeout: 5000 });
      
      // Enter player name
      console.log('📝 Entering player name...');
      await player.page.fill('input#playerName', player.name);
      
      // Click Join Game button on join page
      console.log('🔘 Clicking Join Game button on join page...');
      await player.page.click('button:has-text("Join Game")');
      
      // Wait for welcome message
      console.log('⏳ Waiting for welcome message...');
      await player.page.waitForSelector(`text=Welcome to the game, ${player.name}!`, { timeout: 5000 });
      console.log('✅ Successfully joined the game');
      
      // Verify the player appears on the host page
      console.log('⏳ Waiting for player to appear on host page...');
      await host.waitForPlayersVisible([player.name]);
      console.log('✅ Player visible on host page');

    } finally {
      await setup.cleanup();
    }
  });

  test('verifies join game flow with invalid game ID', async ({ browser }) => {
    console.log('🚀 Starting test: verifies join game flow with invalid game ID');
    
    const playerBuilder = new PlayerBuilder(browser);
    const setup = new TestSetup(playerBuilder, new HostBuilder(browser));

    try {
      // Create a player to test the join flow
      const player = await setup.createPlayer('test player');
      
      // Navigate to home page
      console.log('🏠 Navigating to home page...');
      await player.page.goto('/');
      
      // Wait for the page to load
      await player.page.waitForSelector('text=SPYFALL', { timeout: 5000 });
      console.log('✅ Home page loaded');
      
      // Click the "Join Game" button
      console.log('🔘 Clicking Join Game button...');
      await player.page.click('button:has-text("Join Game")');
      
      // Wait for the input field to appear
      console.log('⏳ Waiting for game ID input field...');
      await player.page.waitForSelector('input[placeholder="Enter Game ID"]', { timeout: 5000 });
      console.log('✅ Game ID input field appeared');
      
      // Enter an invalid game ID
      console.log('📝 Entering invalid game ID...');
      await player.page.fill('input[placeholder="Enter Game ID"]', 'INVALID123');
      
      // Click the Join button
      console.log('🔘 Clicking Join button...');
      await player.page.click('button:has-text("Join")');
      
      // Wait for redirect to join page (should still redirect)
      console.log('⏳ Waiting for redirect to join page...');
      await player.page.waitForURL(/\/join\/INVALID123/, { timeout: 5000 });
      console.log('✅ Redirected to join page with invalid game ID');
      
      // The join page should handle the invalid game ID gracefully
      // (This would be handled by the existing join page logic)

    } finally {
      await setup.cleanup();
    }
  });

  test('verifies cancel functionality in join game flow', async ({ browser }) => {
    console.log('🚀 Starting test: verifies cancel functionality in join game flow');
    
    const playerBuilder = new PlayerBuilder(browser);
    const setup = new TestSetup(playerBuilder, new HostBuilder(browser));

    try {
      // Create a player to test the join flow
      const player = await setup.createPlayer('test player');
      
      // Navigate to home page
      console.log('🏠 Navigating to home page...');
      await player.page.goto('/');
      
      // Wait for the page to load
      await player.page.waitForSelector('text=SPYFALL', { timeout: 5000 });
      console.log('✅ Home page loaded');
      
      // Click the "Join Game" button
      console.log('🔘 Clicking Join Game button...');
      await player.page.click('button:has-text("Join Game")');
      
      // Wait for the input field to appear
      console.log('⏳ Waiting for game ID input field...');
      await player.page.waitForSelector('input[placeholder="Enter Game ID"]', { timeout: 5000 });
      console.log('✅ Game ID input field appeared');
      
      // Enter some text
      console.log('📝 Entering some text...');
      await player.page.fill('input[placeholder="Enter Game ID"]', 'TEST123');
      
      // Click the Cancel button
      console.log('🔘 Clicking Cancel button...');
      await player.page.click('button:has-text("Cancel")');
      
      // Verify we're back to the original state (Join Game button should be visible)
      console.log('⏳ Waiting for Join Game button to reappear...');
      await player.page.waitForSelector('button:has-text("Join Game")', { timeout: 5000 });
      console.log('✅ Successfully cancelled and returned to original state');

    } finally {
      await setup.cleanup();
    }
  });
});
