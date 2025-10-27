import { test, expect } from '@playwright/test';
import { PlayerBuilder, HostBuilder, TestSetup } from './helpers/TestBuilders';

test.describe('View Role Feature', () => {
  test('player can view and hide their role during playing phase', async ({ browser }) => {
    console.log('🚀 Starting test: player can view and hide their role during playing phase');
    
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

      // Create and join players
      const playerA = await setup.createPlayer('player a');
      const playerB = await setup.createPlayer('player b');

      await playerA.joinGame(gameId);
      await playerB.joinGame(gameId);

      // Verify all players are visible on host page
      await host.waitForPlayersVisible(['player a', 'player b']);

      // When: The host starts round 1
      await host.startRound();

      // Wait for players to be redirected and receive roles
      console.log('⏳ Waiting for players to redirect to game page...');
      await playerA.waitForGamePage();
      await playerB.waitForGamePage();
      console.log('✅ All players redirected to game page');

      await playerA.waitForRole();
      await playerB.waitForRole();
      console.log('✅ All players received roles');

      // Collect role information from all players BEFORE acknowledging
      console.log('🔍 Collecting role information from all players...');
      const playerARoleInfo = await playerA.getRoleInfo();
      const playerBRoleInfo = await playerB.getRoleInfo();

      // Players acknowledge their roles
      console.log('🎯 Players acknowledging their roles...');
      await playerA.acknowledgeRole();
      await playerB.acknowledgeRole();
      console.log('✅ All players acknowledged');

      // Wait for playing phase to begin
      console.log('⏳ Waiting for playing phase to begin...');
      await playerA.waitForQuestionRound();
      await playerB.waitForQuestionRound();
      console.log('✅ Playing phase started');

      const players = [
        { name: 'player a', ...playerARoleInfo },
        { name: 'player b', ...playerBRoleInfo },
      ];

      console.log('👥 Player roles:', players);

      // Test View/Hide Role functionality for player A
      console.log('🧪 Testing View/Hide Role functionality for player A...');
      
      // Initially role should not be visible
      await playerA.verifyRoleNotVisible();
      console.log('✅ Role initially not visible for player A');

      // Click View Role button
      await playerA.clickViewRole();
      await playerA.verifyRoleVisible();
      console.log('✅ Role visible after clicking View Role for player A');

      // Verify the role matches what was assigned
      const playerARoleAfterView = await playerA.getRoleInfo();
      expect(playerARoleAfterView.isSpy).toBe(playerARoleInfo.isSpy);
      if (!playerARoleAfterView.isSpy) {
        expect(playerARoleAfterView.location).toBe(playerARoleInfo.location);
      }
      console.log('✅ Role matches assignment for player A');

      // Click Hide Role button
      await playerA.clickHideRole();
      await playerA.verifyRoleNotVisible();
      console.log('✅ Role hidden after clicking Hide Role for player A');

      // Test multiple toggles
      await playerA.clickViewRole();
      await playerA.verifyRoleVisible();
      await playerA.clickHideRole();
      await playerA.verifyRoleNotVisible();
      console.log('✅ Multiple toggles work correctly for player A');

      // Test View/Hide Role functionality for player B
      console.log('🧪 Testing View/Hide Role functionality for player B...');
      
      // Initially role should not be visible
      await playerB.verifyRoleNotVisible();
      console.log('✅ Role initially not visible for player B');

      // Click View Role button
      await playerB.clickViewRole();
      await playerB.verifyRoleVisible();
      console.log('✅ Role visible after clicking View Role for player B');

      // Verify the role matches what was assigned
      const playerBRoleAfterView = await playerB.getRoleInfo();
      expect(playerBRoleAfterView.isSpy).toBe(playerBRoleInfo.isSpy);
      if (!playerBRoleAfterView.isSpy) {
        expect(playerBRoleAfterView.location).toBe(playerBRoleInfo.location);
      }
      console.log('✅ Role matches assignment for player B');

      // Click Hide Role button
      await playerB.clickHideRole();
      await playerB.verifyRoleNotVisible();
      console.log('✅ Role hidden after clicking Hide Role for player B');

      // Test that both players can view their roles simultaneously
      console.log('🧪 Testing simultaneous role viewing...');
      await playerA.clickViewRole();
      await playerB.clickViewRole();
      await playerA.verifyRoleVisible();
      await playerB.verifyRoleVisible();
      console.log('✅ Both players can view their roles simultaneously');

      // Clean up - hide both roles
      await playerA.clickHideRole();
      await playerB.clickHideRole();
      await playerA.verifyRoleNotVisible();
      await playerB.verifyRoleNotVisible();
      console.log('✅ Both roles hidden successfully');

      console.log('🎉 All tests passed! View/Hide Role functionality works correctly');

    } catch (error) {
      console.error('❌ Test failed:', error);
      throw error;
    } finally {
      // Clean up
      await setup.cleanup();
    }
  });
});
