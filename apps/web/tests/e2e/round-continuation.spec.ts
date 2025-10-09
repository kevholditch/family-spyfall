import { test, expect } from '@playwright/test';
import { PlayerBuilder, HostBuilder, TestSetup } from './helpers/TestBuilders';

test.describe('Spyfall Round Continuation', () => {
  test('continues to next question round when nobody wins', async ({ browser }) => {
    console.log('🚀 Starting test: continues to next question round when nobody wins');
    
    const playerBuilder = new PlayerBuilder(browser);
    const hostBuilder = new HostBuilder(browser);
    const setup = new TestSetup(playerBuilder, hostBuilder);

    try {
      console.log('✅ Server should be started by Playwright config');
      
      // Given: Host creates game and 3 players join
      const host = await setup.createHost();
      await host.goToHome();
      const gameId = await host.createGame();
      expect(gameId).toBeTruthy();

      const playerA = await setup.createPlayer('player a');
      const playerB = await setup.createPlayer('player b');
      const playerC = await setup.createPlayer('player c');

      await playerA.joinGame(gameId);
      await playerB.joinGame(gameId);
      await playerC.joinGame(gameId);

      // Given: Round has started
      console.log('🎮 Starting round 1...');
      await host.startRound();
      console.log('✅ Round 1 started!');

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

      // Collect initial role information
      const playerARoleInfo = await playerA.getRoleInfo();
      const playerBRoleInfo = await playerB.getRoleInfo();
      const playerCRoleInfo = await playerC.getRoleInfo();

      // All players acknowledge roles
      await playerA.acknowledgeRole();
      await playerB.acknowledgeRole();
      await playerC.acknowledgeRole();

      const players = [
        { player: playerA, ...playerARoleInfo },
        { player: playerB, ...playerBRoleInfo },
        { player: playerC, ...playerCRoleInfo },
      ];

      const spy = players.find(p => p.isSpy)!;
      const civilians = players.filter(p => !p.isSpy);
      const originalLocation = civilians[0].location;

      console.log(`🕵️  Spy is: ${spy.player.name}`);
      console.log(`🗺️  Location is: ${originalLocation}`);

      // Given: Each player asks their question
      console.log('❓ Each player asking their question...');
      await players[0].player.clickNext();
      await players[1].player.clickNext();
      await players[2].player.clickNext();

      // Wait for accuse mode to start
      console.log('⏳ Waiting for accusation phase...');
      await playerA.waitForAccusationPhase();
      console.log('✅ Accusation phase started!');

      // When: Spy guesses incorrect location
      console.log(`🕵️  Spy (${spy.player.name}) guessing incorrect location...`);
      const wrongLocation = civilians[0].location === 'Bank' ? 'Beach' : 'Bank';
      await spy.player.guessLocation(wrongLocation);
      console.log(`✅ Spy guessed: ${wrongLocation} (incorrect)`);

      // When: Each civilian guesses a different player (not the spy)
      console.log('👥 Civilians voting for different players...');
      await civilians[0].player.voteForPlayer(civilians[1].player.name);
      console.log(`✅ ${civilians[0].player.name} voted for ${civilians[1].player.name}`);
      
      await civilians[1].player.voteForPlayer(civilians[0].player.name);
      console.log(`✅ ${civilians[1].player.name} voted for ${civilians[0].player.name}`);

      // Wait a moment for the round to process
      await host.page.waitForTimeout(1000);

      // Then: Another round should start with the first player asking a question again
      console.log('⏳ Waiting for new question round to start...');
      await players[0].player.waitForQuestionRound();
      console.log('✅ New question round started!');

      // Verify first player should be asking again
      const currentTurnText = await players[0].player.page.locator('text=Current Turn:').isVisible();
      expect(currentTurnText).toBe(true);
      console.log('✅ First player is asking questions again');

      // Then: The spy should still be the same player
      console.log('🔍 Verifying spy is still the same...');
      const newPlayerARoleInfo = await playerA.getRoleInfo();
      const newPlayerBRoleInfo = await playerB.getRoleInfo();
      const newPlayerCRoleInfo = await playerC.getRoleInfo();

      const newPlayers = [
        { name: 'player a', ...newPlayerARoleInfo },
        { name: 'player b', ...newPlayerBRoleInfo },
        { name: 'player c', ...newPlayerCRoleInfo },
      ];

      const newSpy = newPlayers.find(p => p.isSpy)!;
      expect(newSpy.name).toBe(spy.player.name);
      console.log(`✅ Spy is still: ${newSpy.name}`);

      // Then: The location should still be the same
      console.log('🗺️  Verifying location is still the same...');
      const newCivilians = newPlayers.filter(p => !p.isSpy);
      expect(newCivilians[0].location).toBe(originalLocation);
      expect(newCivilians[1].location).toBe(originalLocation);
      console.log(`✅ Location is still: ${originalLocation}`);

      console.log('🎉 Test completed successfully!');

    } finally {
      await setup.cleanup();
    }
  });
});
