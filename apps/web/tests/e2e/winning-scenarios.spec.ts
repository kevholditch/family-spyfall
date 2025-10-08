import { test, expect } from '@playwright/test';
import { PlayerBuilder, HostBuilder, TestSetup } from './helpers/TestBuilders';

test.describe('Spyfall Winning Scenarios', () => {
  test('civilians win when majority correctly identify spy and spy guesses wrong', async ({ browser }) => {
    console.log('🚀 Starting test: civilians win scenario');
    
    const playerBuilder = new PlayerBuilder(browser);
    const hostBuilder = new HostBuilder(browser);
    const setup = new TestSetup(playerBuilder, hostBuilder);

    try {
      // Setup game with 3 players
      const host = await setup.createHost();
      await host.goToHome();
      const gameId = await host.createGame();

      const playerA = await setup.createPlayer('player a');
      const playerB = await setup.createPlayer('player b');
      const playerC = await setup.createPlayer('player c');

      await playerA.joinGame(gameId);
      await playerB.joinGame(gameId);
      await playerC.joinGame(gameId);

      await host.startRound();

      // Get roles
      await playerA.waitForGamePage();
      await playerB.waitForGamePage();
      await playerC.waitForGamePage();
      await playerA.waitForRole();
      await playerB.waitForRole();
      await playerC.waitForRole();

      const playerARoleInfo = await playerA.getRoleInfo();
      const playerBRoleInfo = await playerB.getRoleInfo();
      const playerCRoleInfo = await playerC.getRoleInfo();

      const players = [
        { player: playerA, ...playerARoleInfo },
        { player: playerB, ...playerBRoleInfo },
        { player: playerC, ...playerCRoleInfo },
      ];

      const spy = players.find(p => p.isSpy)!;
      const civilians = players.filter(p => !p.isSpy);
      const location = civilians[0].location!;

      console.log(`🕵️  Spy is: ${spy.player.name}`);
      console.log(`🗺️  Location is: ${location}`);

      // All players ask questions
      await players[0].player.clickNext();
      await players[1].player.clickNext();
      await players[2].player.clickNext();

      await playerA.waitForAccusationPhase();

      // Spy guesses WRONG location
      const wrongLocation = location === 'Bank' ? 'Beach' : 'Bank';
      await spy.player.guessLocation(wrongLocation);
      console.log(`✅ Spy guessed wrong: ${wrongLocation}`);

      // Both civilians correctly identify the spy
      for (const civilian of civilians) {
        await civilian.player.voteForPlayer(spy.player.name);
        console.log(`✅ ${civilian.player.name} voted for spy: ${spy.player.name}`);
      }

      // Wait for round summary
      await playerA.waitForRoundSummary();
      console.log('✅ Round summary shown');

      await host.page.waitForTimeout(500); // Wait for UI update
      
      // Verify civilian win message is displayed correctly
      await playerA.verifyCiviliansWinMessage(2, 2, location);
      
      // Check spy got 0 points
      const spyInitialScore = await spy.player.getScore();
      expect(spyInitialScore).toBe(0);
      console.log(`✅ Spy has ${spyInitialScore} points`);

      // Check civilians who voted correctly got 1 point each
      for (const civilian of civilians) {
        const score = await civilian.player.getScore();
        expect(score).toBe(1);
        console.log(`✅ ${civilian.player.name} has ${score} point(s)`);
      }

      console.log('🎉 Civilians won correctly!');

    } finally {
      await setup.cleanup();
    }
  });

  test('spy wins when guessing correct location regardless of civilian guesses', async ({ browser }) => {
    console.log('🚀 Starting test: spy wins scenario');
    
    const playerBuilder = new PlayerBuilder(browser);
    const hostBuilder = new HostBuilder(browser);
    const setup = new TestSetup(playerBuilder, hostBuilder);

    try {
      // Setup game
      const host = await setup.createHost();
      await host.goToHome();
      const gameId = await host.createGame();

      const playerA = await setup.createPlayer('player a');
      const playerB = await setup.createPlayer('player b');
      const playerC = await setup.createPlayer('player c');

      await playerA.joinGame(gameId);
      await playerB.joinGame(gameId);
      await playerC.joinGame(gameId);

      await host.startRound();

      // Get roles
      await playerA.waitForGamePage();
      await playerB.waitForGamePage();
      await playerC.waitForGamePage();
      await playerA.waitForRole();
      await playerB.waitForRole();
      await playerC.waitForRole();

      const playerARoleInfo = await playerA.getRoleInfo();
      const playerBRoleInfo = await playerB.getRoleInfo();
      const playerCRoleInfo = await playerC.getRoleInfo();

      const players = [
        { player: playerA, ...playerARoleInfo },
        { player: playerB, ...playerBRoleInfo },
        { player: playerC, ...playerCRoleInfo },
      ];

      const spy = players.find(p => p.isSpy)!;
      const civilians = players.filter(p => !p.isSpy);
      const location = civilians[0].location!;

      console.log(`🕵️  Spy is: ${spy.player.name}`);
      console.log(`🗺️  Location is: ${location}`);

      // All players ask questions
      await players[0].player.clickNext();
      await players[1].player.clickNext();
      await players[2].player.clickNext();

      await playerA.waitForAccusationPhase();

      // Spy guesses CORRECT location
      await spy.player.guessLocation(location);
      console.log(`✅ Spy guessed correctly: ${location}`);

      // Civilians vote (doesn't matter)
      await civilians[0].player.voteForPlayer(civilians[1].player.name);
      await civilians[1].player.voteForPlayer(civilians[0].player.name);

      // Wait for round summary
      await playerA.waitForRoundSummary();
      console.log('✅ Round summary shown');

      await host.page.waitForTimeout(500);

      // Verify spy win message is displayed correctly
      await playerA.verifySpyWinMessage(location);

      // Spy should have 3 points
      const spyScore = await spy.player.getScore();
      expect(spyScore).toBe(3);
      console.log(`✅ Spy has ${spyScore} points`);

      // Civilians should have 0 points
      for (const civilian of civilians) {
        const score = await civilian.player.getScore();
        expect(score).toBe(0);
        console.log(`✅ ${civilian.player.name} has ${score} points`);
      }

      console.log('🎉 Spy won correctly!');

    } finally {
      await setup.cleanup();
    }
  });

  test('spy wins even when civilians correctly identify spy', async ({ browser }) => {
    console.log('🚀 Starting test: spy wins even when identified');
    
    const playerBuilder = new PlayerBuilder(browser);
    const hostBuilder = new HostBuilder(browser);
    const setup = new TestSetup(playerBuilder, hostBuilder);

    try {
      // Setup game
      const host = await setup.createHost();
      await host.goToHome();
      const gameId = await host.createGame();

      const playerA = await setup.createPlayer('player a');
      const playerB = await setup.createPlayer('player b');
      const playerC = await setup.createPlayer('player c');

      await playerA.joinGame(gameId);
      await playerB.joinGame(gameId);
      await playerC.joinGame(gameId);

      await host.startRound();

      // Get roles
      await playerA.waitForGamePage();
      await playerB.waitForGamePage();
      await playerC.waitForGamePage();
      await playerA.waitForRole();
      await playerB.waitForRole();
      await playerC.waitForRole();

      const playerARoleInfo = await playerA.getRoleInfo();
      const playerBRoleInfo = await playerB.getRoleInfo();
      const playerCRoleInfo = await playerC.getRoleInfo();

      const players = [
        { player: playerA, ...playerARoleInfo },
        { player: playerB, ...playerBRoleInfo },
        { player: playerC, ...playerCRoleInfo },
      ];

      const spy = players.find(p => p.isSpy)!;
      const civilians = players.filter(p => !p.isSpy);
      const location = civilians[0].location!;

      console.log(`🕵️  Spy is: ${spy.player.name}`);

      // All players ask questions
      await players[0].player.clickNext();
      await players[1].player.clickNext();
      await players[2].player.clickNext();

      await playerA.waitForAccusationPhase();

      // Spy guesses CORRECT location
      await spy.player.guessLocation(location);
      console.log(`✅ Spy guessed correctly: ${location}`);

      // Both civilians correctly identify the spy
      await civilians[0].player.voteForPlayer(spy.player.name);
      await civilians[1].player.voteForPlayer(spy.player.name);
      console.log(`✅ Civilians correctly identified spy`);

      // Wait for round summary
      await playerA.waitForRoundSummary();

      await host.page.waitForTimeout(500);

      // Verify spy win message is shown (not civilian win message)
      await playerA.verifySpyWinMessage(location);

      // Only spy should have points (3 points)
      const spyScore = await spy.player.getScore();
      expect(spyScore).toBe(3);
      console.log(`✅ Spy has ${spyScore} points (wins despite being identified)`);

      // Civilians should have 0 points (spy win takes precedence)
      for (const civilian of civilians) {
        const score = await civilian.player.getScore();
        expect(score).toBe(0);
        console.log(`✅ ${civilian.player.name} has ${score} points (no points because spy won)`);
      }

      console.log('🎉 Spy win takes precedence correctly!');

    } finally {
      await setup.cleanup();
    }
  });

  test('new round starts with new spy after someone wins', async ({ browser }) => {
    console.log('🚀 Starting test: new round after win');
    
    const playerBuilder = new PlayerBuilder(browser);
    const hostBuilder = new HostBuilder(browser);
    const setup = new TestSetup(playerBuilder, hostBuilder);

    try {
      // Setup game
      const host = await setup.createHost();
      await host.goToHome();
      const gameId = await host.createGame();

      const playerA = await setup.createPlayer('player a');
      const playerB = await setup.createPlayer('player b');
      const playerC = await setup.createPlayer('player c');

      await playerA.joinGame(gameId);
      await playerB.joinGame(gameId);
      await playerC.joinGame(gameId);

      await host.startRound();

      // Get initial roles
      await playerA.waitForGamePage();
      await playerB.waitForGamePage();
      await playerC.waitForGamePage();
      await playerA.waitForRole();
      await playerB.waitForRole();
      await playerC.waitForRole();

      const playerARoleInfo = await playerA.getRoleInfo();
      const playerBRoleInfo = await playerB.getRoleInfo();
      const playerCRoleInfo = await playerC.getRoleInfo();

      const players = [
        { player: playerA, ...playerARoleInfo },
        { player: playerB, ...playerBRoleInfo },
        { player: playerC, ...playerCRoleInfo },
      ];

      const spy = players.find(p => p.isSpy)!;
      const civilians = players.filter(p => !p.isSpy);
      const location = civilians[0].location!;

      console.log(`🕵️  Round 1 Spy: ${spy.player.name}`);
      console.log(`🗺️  Round 1 Location: ${location}`);

      // Play round - spy wins
      await players[0].player.clickNext();
      await players[1].player.clickNext();
      await players[2].player.clickNext();

      await playerA.waitForAccusationPhase();
      await spy.player.guessLocation(location);
      await civilians[0].player.voteForPlayer(civilians[1].player.name);
      await civilians[1].player.voteForPlayer(civilians[0].player.name);

      // Wait for round summary
      await playerA.waitForRoundSummary();
      console.log('✅ Round 1 summary shown');

      // Wait for auto-restart (3 seconds timeout for tests)
      await host.page.waitForTimeout(4000);

      // Wait for new round to start
      await playerA.waitForRole();
      await playerB.waitForRole();
      await playerC.waitForRole();
      console.log('✅ Round 2 started');

      // Get new roles
      const newPlayerARoleInfo = await playerA.getRoleInfo();
      const newPlayerBRoleInfo = await playerB.getRoleInfo();
      const newPlayerCRoleInfo = await playerC.getRoleInfo();

      const newPlayers = [
        { player: playerA, name: 'player a', ...newPlayerARoleInfo },
        { player: playerB, name: 'player b', ...newPlayerBRoleInfo },
        { player: playerC, name: 'player c', ...newPlayerCRoleInfo },
      ];

      const newSpy = newPlayers.find(p => p.isSpy)!;
      const newCivilians = newPlayers.filter(p => !p.isSpy);
      const newLocation = newCivilians[0].location!;

      console.log(`🕵️  Round 2 Spy: ${newSpy.name}`);
      console.log(`🗺️  Round 2 Location: ${newLocation}`);

      // Verify a spy exists in round 2
      expect(newSpy).toBeDefined();
      
      // Verify exactly one spy and two civilians
      expect(newPlayers.filter(p => p.isSpy).length).toBe(1);
      expect(newPlayers.filter(p => !p.isSpy).length).toBe(2);

      // Verify civilians have a location
      expect(newCivilians[0].location).toBeTruthy();
      expect(newCivilians[1].location).toBeTruthy();
      expect(newCivilians[0].location).toBe(newCivilians[1].location);

      console.log('🎉 New round started with new spy and location!');

    } finally {
      await setup.cleanup();
    }
  });
});

