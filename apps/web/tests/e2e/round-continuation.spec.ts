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

      // When nobody wins, the game automatically continues to next question round
      // (no round_summary status, no "Start Next Round" button needed)
      console.log('⏳ Waiting for new question round to start automatically...');
      // Wait for the first player's turn to start again by checking for either "Ask a question" or "asking question" text
      await Promise.race([
        players[0].player.page.waitForSelector('text=Ask a question', { timeout: 10000 }),
        players[0].player.page.waitForSelector('text=asking question', { timeout: 10000 })
      ]);
      console.log('✅ New question round started automatically!');

      // Verify first player should be asking again by checking for the round indicator
      const roundIndicator = await players[0].player.page.locator('text=R1').isVisible();
      expect(roundIndicator).toBe(true);
      console.log('✅ First player is asking questions again');
      console.log('✅ Still in Round 1 (same spy and location)');

      // Note: We cannot re-read role info from UI because roles are not displayed again
      // during question rounds. Players already acknowledged their roles and the game
      // continues with the same spy and location. This is verified by checking we're
      // still in Round 1 and the question round has started again.

      console.log('🎉 Test completed successfully!');

    } finally {
      await setup.cleanup();
    }
  });
});
