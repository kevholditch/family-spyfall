import { test, expect } from '@playwright/test';
import { HostBuilder, TestSetup, PlayerBuilder } from './helpers/TestBuilders';

test.describe('Host Reconnection', () => {
  test('should automatically reconnect when host refreshes browser', async ({ browser }) => {
    console.log('🚀 Starting test: host should reconnect on refresh');
    
    const playerBuilder = new PlayerBuilder(browser);
    const hostBuilder = new HostBuilder(browser);
    const setup = new TestSetup(playerBuilder, hostBuilder);

    try {
      // Create host and start game
      const host = await setup.createHost();
      await host.goToHome();
      const gameId = await host.createGame();
      expect(gameId).toBeTruthy();
      console.log(`✅ Game created with ID: ${gameId}`);

      // Create and join a player to make the game active
      const player = await setup.createPlayer('Alice');
      await player.joinGame(gameId);
      console.log('✅ Player Alice joined the game');

      // Verify player is visible on host page
      await host.waitForPlayersVisible(['Alice']);
      console.log('✅ Player Alice visible on host page');

      // Refresh the host's browser
      console.log('🔄 Refreshing host browser...');
      await host.page.reload();
      console.log('✅ Host browser refreshed');

      // Host should automatically reconnect and see the game state
      // Should NOT see the "Create New Game" button
      console.log('🔍 Verifying host did not return to home screen...');
      const createGameButton = host.page.locator('button:has-text("Create New Game")');
      await expect(createGameButton).not.toBeVisible({ timeout: 5000 });
      console.log('✅ Create New Game button is not visible');

      // Should see the joined players
      console.log('🔍 Verifying host can see joined players after refresh...');
      await host.waitForPlayersVisible(['Alice']);
      console.log('✅ Host successfully reconnected and can see joined players');

      // Should see the QR code
      console.log('🔍 Verifying QR code is visible...');
      await host.page.waitForSelector('[data-testid="qr-code-container"]', { timeout: 5000 });
      console.log('✅ QR code is visible');

      console.log('🎉 Test completed successfully!');

    } finally {
      await setup.cleanup();
    }
  });

  test('should reconnect to in-progress game when host refreshes', async ({ browser }) => {
    console.log('🚀 Starting test: host should reconnect to in-progress game on refresh');
    
    const playerBuilder = new PlayerBuilder(browser);
    const hostBuilder = new HostBuilder(browser);
    const setup = new TestSetup(playerBuilder, hostBuilder);

    try {
      // Create host and start game
      const host = await setup.createHost();
      await host.goToHome();
      const gameId = await host.createGame();
      expect(gameId).toBeTruthy();
      console.log(`✅ Game created with ID: ${gameId}`);

      // Create and join players
      const playerA = await setup.createPlayer('Alice');
      const playerB = await setup.createPlayer('Bob');
      const playerC = await setup.createPlayer('Charlie');
      
      await playerA.joinGame(gameId);
      await playerB.joinGame(gameId);
      await playerC.joinGame(gameId);
      console.log('✅ All players joined the game');

      // Verify all players are visible on host page
      await host.waitForPlayersVisible(['Alice', 'Bob', 'Charlie']);

      // Start the game
      await host.startRound();
      console.log('✅ Game round started');

      // Wait for game to be in progress
      await host.waitForGameInProgress();
      console.log('✅ Game is in progress state');

      // Refresh the host's browser
      console.log('🔄 Refreshing host browser during active game...');
      await host.page.reload();
      console.log('✅ Host browser refreshed');

      // Host should automatically reconnect and see the game in progress
      console.log('🔍 Verifying host reconnected to game in progress...');
      await host.waitForGameInProgress();
      console.log('✅ Host successfully reconnected to game in progress');

      // Should NOT see the "Create New Game" button
      const createGameButton = host.page.locator('button:has-text("Create New Game")');
      await expect(createGameButton).not.toBeVisible({ timeout: 2000 });
      console.log('✅ Create New Game button is not visible');

      console.log('🎉 Test completed successfully!');

    } finally {
      await setup.cleanup();
    }
  });
});

