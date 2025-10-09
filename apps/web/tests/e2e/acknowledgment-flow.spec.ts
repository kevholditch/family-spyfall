import { test, expect } from '@playwright/test';
import { PlayerBuilder, HostBuilder, TestSetup } from './helpers/TestBuilders';

test.describe('Role Acknowledgment Flow', () => {
  test('should show role info and wait for acknowledgment before starting question round', async ({ browser }) => {
    console.log('🚀 Starting test: role acknowledgment flow');
    
    const playerBuilder = new PlayerBuilder(browser);
    const hostBuilder = new HostBuilder(browser);
    const setup = new TestSetup(playerBuilder, hostBuilder);

    try {
      // Create host and start game
      const host = await setup.createHost();
      await host.goToHome();
      const gameId = await host.createGame();
      expect(gameId).toBeTruthy();

      // Create and join players
      const playerA = await setup.createPlayer('player a');
      const playerB = await setup.createPlayer('player b');
      const playerC = await setup.createPlayer('player c');

      await playerA.joinGame(gameId);
      await playerB.joinGame(gameId);
      await playerC.joinGame(gameId);

      // Verify all players are visible on host page
      await host.waitForPlayersVisible(['player a', 'player b', 'player c']);

      // When: The host starts round 1
      await host.startRound();

      // Wait for players to be redirected to game page
      console.log('⏳ Waiting for players to redirect to game page...');
      await playerA.waitForGamePage();
      await playerB.waitForGamePage();
      await playerC.waitForGamePage();
      console.log('✅ All players redirected to game page');

      // Wait for role assignments
      await playerA.waitForRole();
      await playerB.waitForRole();
      await playerC.waitForRole();
      console.log('✅ All players received roles');

      // Then: All players should see their role/location and an acknowledgment button
      console.log('🔍 Verifying acknowledgment UI is visible...');
      
      // Check that "I Understand" button is visible for all players
      const playerAAckButton = playerA.page.locator('button:has-text("I Understand")');
      const playerBAckButton = playerB.page.locator('button:has-text("I Understand")');
      const playerCAckButton = playerC.page.locator('button:has-text("I Understand")');
      
      await expect(playerAAckButton).toBeVisible({ timeout: 5000 });
      await expect(playerBAckButton).toBeVisible({ timeout: 5000 });
      await expect(playerCAckButton).toBeVisible({ timeout: 5000 });
      console.log('✅ All players see the "I Understand" button');

      // Verify that role info is showing (either spy or location)
      const playerAHasSpy = await playerA.page.locator('text=YOU ARE THE SPY!').isVisible();
      const playerBHasSpy = await playerB.page.locator('text=YOU ARE THE SPY!').isVisible();
      const playerCHasSpy = await playerC.page.locator('text=YOU ARE THE SPY!').isVisible();
      
      const playerAHasLocation = await playerA.page.locator('text=YOUR LOCATION').isVisible();
      const playerBHasLocation = await playerB.page.locator('text=YOUR LOCATION').isVisible();
      const playerCHasLocation = await playerC.page.locator('text=YOUR LOCATION').isVisible();
      
      // Each player should have either spy or location info
      expect(playerAHasSpy || playerAHasLocation).toBeTruthy();
      expect(playerBHasSpy || playerBHasLocation).toBeTruthy();
      expect(playerCHasSpy || playerCHasLocation).toBeTruthy();
      console.log('✅ All players see their role information');

      // When: Only player A acknowledges
      console.log('🎯 Player A acknowledging...');
      await playerAAckButton.click();
      
      // Then: Player A should see waiting message
      await expect(playerA.page.locator('text=Waiting for other players...')).toBeVisible({ timeout: 3000 });
      console.log('✅ Player A sees waiting message');
      
      // And: Players B and C should still see their acknowledgment buttons
      await expect(playerBAckButton).toBeVisible();
      await expect(playerCAckButton).toBeVisible();
      console.log('✅ Other players still see acknowledgment button');

      // When: Player B also acknowledges
      console.log('🎯 Player B acknowledging...');
      await playerBAckButton.click();
      
      // Then: Player B should also see waiting message
      await expect(playerB.page.locator('text=Waiting for other players...')).toBeVisible({ timeout: 3000 });
      console.log('✅ Player B sees waiting message');

      // And: Player C should still see acknowledgment button
      await expect(playerCAckButton).toBeVisible();

      // When: Player C acknowledges (last player)
      console.log('🎯 Player C acknowledging (last player)...');
      await playerCAckButton.click();

      // Then: The question round should start
      console.log('⏳ Waiting for question round to start...');
      await expect(playerA.page.locator('text=Question Round')).toBeVisible({ timeout: 5000 });
      await expect(playerB.page.locator('text=Question Round')).toBeVisible({ timeout: 5000 });
      await expect(playerC.page.locator('text=Question Round')).toBeVisible({ timeout: 5000 });
      console.log('✅ Question round started');

      // And: The "I Understand" buttons should no longer be visible
      await expect(playerAAckButton).not.toBeVisible();
      await expect(playerBAckButton).not.toBeVisible();
      await expect(playerCAckButton).not.toBeVisible();
      console.log('✅ Acknowledgment buttons hidden after round starts');

      console.log('🎉 Test completed successfully!');

    } finally {
      await setup.cleanup();
    }
  });

  test('should hide role info after acknowledgment', async ({ browser }) => {
    console.log('🚀 Starting test: role info hiding after acknowledgment');
    
    const playerBuilder = new PlayerBuilder(browser);
    const hostBuilder = new HostBuilder(browser);
    const setup = new TestSetup(playerBuilder, hostBuilder);

    try {
      // Create host and start game
      const host = await setup.createHost();
      await host.goToHome();
      const gameId = await host.createGame();

      // Create and join a single player for simplicity
      const player = await setup.createPlayer('test player');
      await player.joinGame(gameId);
      await host.waitForPlayersVisible(['test player']);

      // Start round
      await host.startRound();
      await player.waitForGamePage();
      await player.waitForRole();

      // Check if player sees role info
      const isSpy = await player.page.locator('text=YOU ARE THE SPY!').isVisible();
      const hasLocation = await player.page.locator('text=YOUR LOCATION').isVisible();
      expect(isSpy || hasLocation).toBeTruthy();
      console.log('✅ Player sees role information');

      // Click acknowledge button
      const ackButton = player.page.locator('button:has-text("I Understand")');
      await ackButton.click();

      // Role info should be hidden (replaced by waiting message)
      if (isSpy) {
        // Spy message should not be visible in the large format anymore
        await expect(player.page.locator('.text-4xl.font-bold.text-red-400:has-text("YOU ARE THE SPY!")')).not.toBeVisible({ timeout: 3000 });
      } else {
        // Location should not be visible in the large format anymore
        await expect(player.page.locator('.text-4xl.font-bold.text-green-400')).not.toBeVisible({ timeout: 3000 });
      }
      console.log('✅ Role info hidden after acknowledgment');

      console.log('🎉 Test completed successfully!');

    } finally {
      await setup.cleanup();
    }
  });
});

