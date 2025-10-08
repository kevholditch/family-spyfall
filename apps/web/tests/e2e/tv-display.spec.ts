import { test, expect } from '@playwright/test';
import { PlayerBuilder, HostBuilder, TestSetup } from './helpers/TestBuilders';

test.describe('HomePage TV Display', () => {
  test('shows game in progress with scoreboard when game starts', async ({ browser }) => {
    console.log('🚀 Starting test: HomePage shows game in progress with scoreboard');
    
    const playerBuilder = new PlayerBuilder(browser);
    const hostBuilder = new HostBuilder(browser);
    const setup = new TestSetup(playerBuilder, hostBuilder);

    try {
      // Create host and game
      const host = await setup.createHost();
      await host.goToHome();
      const gameId = await host.createGame();
      expect(gameId).toBeTruthy();

      // Create and join players
      const playerA = await setup.createPlayer('Alice');
      const playerB = await setup.createPlayer('Bob');
      const playerC = await setup.createPlayer('Charlie');

      await playerA.joinGame(gameId);
      await playerB.joinGame(gameId);
      await playerC.joinGame(gameId);

      // Verify all players are visible on host page
      await host.waitForPlayersVisible(['Alice', 'Bob', 'Charlie']);

      // Start the game
      await host.startRound();

      // Wait for game to start on host page
      await host.waitForGameInProgress();

      // Verify QR code and Start button are removed
      await host.verifyQRCodeNotVisible();
      await host.verifyStartButtonNotVisible();

      // Get game state to determine current player
      await playerA.waitForGamePage();
      await playerB.waitForGamePage();
      await playerC.waitForGamePage();

      await playerA.waitForRole();
      await playerB.waitForRole();
      await playerC.waitForRole();
      
      // Verify players left count shows all players (3 at start)
      await host.verifyPlayersLeft(3);

      // Verify scoreboard shows all players with score 0, in alphabetical order (since tied)
      const expectedScoreboard = [
        { name: 'Alice', score: 0 },
        { name: 'Bob', score: 0 },
        { name: 'Charlie', score: 0 }
      ];
      await host.verifyScoreboardOrder(expectedScoreboard);

      console.log('🎉 Test completed successfully!');

    } finally {
      await setup.cleanup();
    }
  });

  test('updates scoreboard with scores in descending order', async ({ browser }) => {
    console.log('🚀 Starting test: HomePage updates scoreboard with scores');
    
    const playerBuilder = new PlayerBuilder(browser);
    const hostBuilder = new HostBuilder(browser);
    const setup = new TestSetup(playerBuilder, hostBuilder);

    try {
      // Create host and game
      const host = await setup.createHost();
      await host.goToHome();
      const gameId = await host.createGame();

      // Create and join players with names that will have different scores
      const playerA = await setup.createPlayer('Alice');
      const playerB = await setup.createPlayer('Bob');
      const playerC = await setup.createPlayer('Charlie');

      await playerA.joinGame(gameId);
      await playerB.joinGame(gameId);
      await playerC.joinGame(gameId);

      // Start the game
      await host.startRound();
      await host.waitForGameInProgress();

      // Play through a round to get different scores
      await playerA.waitForGamePage();
      await playerB.waitForGamePage();
      await playerC.waitForGamePage();

      await playerA.waitForRole();
      await playerB.waitForRole();
      await playerC.waitForRole();

      // Get role information to determine who's spy
      const roleA = await playerA.getRoleInfo();
      const roleB = await playerB.getRoleInfo();
      const roleC = await playerC.getRoleInfo();

      // Progress through the round
      await playerA.clickNext();
      await playerB.clickNext();
      await playerC.clickNext();

      // Find the spy and have them make a wrong guess
      let spy = playerA;
      let spyName = 'Alice';
      if (roleB.isSpy) {
        spy = playerB;
        spyName = 'Bob';
      } else if (roleC.isSpy) {
        spy = playerC;
        spyName = 'Charlie';
      }

      // Spy guesses wrong location
      await spy.waitForAccusationPhase();
      const wrongLocation = roleA.isSpy ? (roleB.location || roleC.location!) : 
                           roleB.isSpy ? (roleA.location || roleC.location!) :
                           (roleA.location || roleB.location!);
      const otherLocations = ['Bank', 'Beach', 'Casino', 'Hospital', 'School'];
      const guessLocation = otherLocations.find(loc => loc !== wrongLocation) || 'Bank';
      await spy.guessLocation(guessLocation);

      // Civilians vote correctly
      const players = [
        { player: playerA, name: 'Alice', isSpy: roleA.isSpy },
        { player: playerB, name: 'Bob', isSpy: roleB.isSpy },
        { player: playerC, name: 'Charlie', isSpy: roleC.isSpy }
      ];

      for (const p of players) {
        if (!p.isSpy) {
          await p.player.waitForAccusationPhase();
          await p.player.voteForPlayer(spyName);
        }
      }

      // Wait for round summary
      await playerA.waitForRoundSummary();

      // Now check the scoreboard on host page - civilians should have points
      // The scoreboard should show players in descending order by score
      // Since it's a tie between civilians, they should be alphabetically sorted
      const scoreboard = await host.getScoreboardPlayers();
      
      // Verify scores are in descending order
      for (let i = 0; i < scoreboard.length - 1; i++) {
        const current = scoreboard[i];
        const next = scoreboard[i + 1];
        
        if (current.score < next.score) {
          throw new Error(
            `Scoreboard not in descending order: ${current.name} (${current.score}) before ${next.name} (${next.score})`
          );
        }
        
        // If tied, verify alphabetical order
        if (current.score === next.score && current.name > next.name) {
          throw new Error(
            `Tied scores not in alphabetical order: ${current.name} before ${next.name}`
          );
        }
      }

      console.log('✅ Scoreboard is correctly ordered by score (descending) and alphabetically for ties');
      console.log('🎉 Test completed successfully!');

    } finally {
      await setup.cleanup();
    }
  });
});

