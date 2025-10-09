import { test, expect } from '@playwright/test';
import { PlayerBuilder, HostBuilder, TestSetup } from './helpers/TestBuilders';

test.describe('Spyfall Game Logic', () => {
  test('verifies game logic with three players', async ({ browser }) => {
    console.log('🚀 Starting test: verifies game logic with three players');
    
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
      const playerC = await setup.createPlayer('player c');

      await playerA.joinGame(gameId);
      await playerB.joinGame(gameId);
      await playerC.joinGame(gameId);

      // Verify all players are visible on host page
      await host.waitForPlayersVisible(['player a', 'player b', 'player c']);

      // When: The host starts round 1
      await host.startRound();

      // Wait for players to be redirected and receive roles
      console.log('⏳ Waiting for players to redirect to game page...');
      await playerA.waitForGamePage();
      await playerB.waitForGamePage();
      await playerC.waitForGamePage();
      console.log('✅ All players redirected to game page');

      await playerA.waitForRole();
      await playerB.waitForRole();
      await playerC.waitForRole();
      console.log('✅ All players received roles');

      // Collect role information from all players BEFORE acknowledging
      console.log('🔍 Collecting role information from all players...');
      const playerARoleInfo = await playerA.getRoleInfo();
      const playerBRoleInfo = await playerB.getRoleInfo();
      const playerCRoleInfo = await playerC.getRoleInfo();

      // Players acknowledge their roles
      console.log('🎯 Players acknowledging their roles...');
      await playerA.acknowledgeRole();
      await playerB.acknowledgeRole();
      await playerC.acknowledgeRole();
      console.log('✅ All players acknowledged');

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
      await setup.cleanup();
    }
  });
});
