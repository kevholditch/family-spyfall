import { Page, BrowserContext, expect } from '@playwright/test';

export interface RoleInfo {
  isSpy: boolean;
  location?: string;
}

export class TestPlayer {
  constructor(
    public readonly name: string,
    public readonly page: Page,
    public readonly context: BrowserContext
  ) {}

  async joinGame(gameId: string): Promise<void> {
    console.log(`👤 [${this.name}] Navigating to join page...`);
    await this.page.goto(`/join/${gameId}`);
    
    console.log(`👤 [${this.name}] Waiting for player name input...`);
    await this.page.waitForSelector('input#playerName', { timeout: 5000 });
    
    console.log(`👤 [${this.name}] Entering player name...`);
    await this.page.fill('input#playerName', this.name);
    
    console.log(`👤 [${this.name}] Clicking Join Game button...`);
    await this.page.click('button:has-text("Join Game")');
    
    console.log(`👤 [${this.name}] Waiting for welcome message...`);
    await this.page.waitForSelector(`text=Welcome to the game, ${this.name}!`, { timeout: 5000 });
    
    console.log(`✅ [${this.name}] Successfully joined the game`);
  }

  async waitForGamePage(): Promise<void> {
    await this.page.waitForURL(/\/game\//, { timeout: 10000 });
  }

  async waitForRole(): Promise<void> {
    // Wait for either spy image or any location image to appear
    await Promise.race([
      this.page.waitForSelector('img[src="/assets/spy.png"]', { timeout: 10000 }),
      this.page.waitForSelector('img[src^="/assets/"][src$=".png"]:not([src="/assets/spy.png"])', { timeout: 10000 })
    ]);
  }

  async acknowledgeRole(): Promise<void> {
    const ackButton = this.page.locator('button:has-text("Ready")');
    await ackButton.waitFor({ state: 'visible', timeout: 5000 });
    await ackButton.click();
    console.log(`✅ [${this.name}] acknowledged role`);
  }

  async getRoleInfo(): Promise<RoleInfo> {
    console.log(`🔍 [${this.name}] Getting role info...`);
    
    // Check if spy image is visible
    const spyImage = this.page.locator('img[src="/assets/spy.png"]');
    const isSpy = await spyImage.isVisible();
    
    if (isSpy) {
      console.log(`✅ [${this.name}] is a SPY`);
      return { isSpy: true };
    }
    
    console.log(`👤 [${this.name}] is a CIVILIAN, getting location...`);
    // Look for location image (any asset image that's not spy.png)
    const locationImage = this.page.locator('img[src^="/assets/"][src$=".png"]:not([src="/assets/spy.png"])');
    const alt = await locationImage.getAttribute('alt');
    console.log(`✅ [${this.name}] Location: ${alt}`);
    
    return { 
      isSpy: false, 
      location: alt || undefined
    };
  }

  async clickNext(): Promise<void> {
    // Wait for the "Done" button to be visible (indicating it's this player's turn)
    await this.page.waitForSelector('button:has-text("Done")', { timeout: 10000 });
    await this.page.click('button:has-text("Done")');
    console.log(`✅ [${this.name}] asked their question`);
  }

  async clickNextIfMyTurn(): Promise<boolean> {
    try {
      // Check if it's this player's turn by looking for the "Done" button
      const doneButton = this.page.locator('button:has-text("Done")');
      const isVisible = await doneButton.isVisible();
      
      if (isVisible) {
        await doneButton.click();
        console.log(`✅ [${this.name}] asked their question`);
        return true;
      }
      return false;
    } catch (error) {
      return false;
    }
  }

  async guessLocation(location: string): Promise<void> {
    const locationButtons = await this.page.locator('button').filter({ hasText: location });
    await locationButtons.first().click();
    console.log(`✅ [${this.name}] guessed: ${location}`);
  }

  async voteForPlayer(targetPlayerName: string): Promise<void> {
    const voteButtons = await this.page.locator('button').filter({ hasText: targetPlayerName });
    await voteButtons.first().click();
    console.log(`✅ [${this.name}] voted for ${targetPlayerName}`);
  }

  async waitForAccusationPhase(): Promise<void> {
    await Promise.race([
      this.page.waitForSelector('text=Accusation Phase!', { timeout: 10000 }),
      this.page.waitForSelector('text=Guess the location', { timeout: 10000 })
    ]);
  }

  async waitForQuestionRound(): Promise<void> {
    // Wait for either "Ask a question" or "asking question" text which indicates the round has started
    await Promise.race([
      this.page.waitForSelector('text=Ask a question', { timeout: 10000 }),
      this.page.waitForSelector('text=asking question', { timeout: 10000 })
    ]);
  }

  async waitForRoundSummary(): Promise<void> {
    await this.page.waitForSelector('text=Round Results!', { timeout: 10000 });
  }

  async getScore(): Promise<number> {
    // Wait a bit to ensure content is rendered
    await this.page.waitForTimeout(500);
    
    // Find all divs that contain player names by looking for text content that matches
    const allText = await this.page.locator('body').textContent();
    
    // Try to find the player's name and the score near it in the Points This Round section
    // Look for pattern: playerName followed by +X or 0
    const scoreMatch = allText?.match(new RegExp(`${this.name}\\s*\\+?(\\d+)`, 'i'));
    
    if (scoreMatch && scoreMatch[1]) {
      const points = parseInt(scoreMatch[1], 10);
      return isNaN(points) ? 0 : points;
    }
    
    return 0;
  }

  async clickViewRole(): Promise<void> {
    const viewRoleButton = this.page.locator('button:has-text("View Role")');
    await viewRoleButton.waitFor({ state: 'visible', timeout: 5000 });
    await viewRoleButton.click();
    console.log(`✅ [${this.name}] clicked View Role`);
  }

  async clickHideRole(): Promise<void> {
    const hideRoleButton = this.page.locator('button:has-text("Hide Role")');
    await hideRoleButton.waitFor({ state: 'visible', timeout: 5000 });
    await hideRoleButton.click();
    console.log(`✅ [${this.name}] clicked Hide Role`);
  }

  async isRoleVisible(): Promise<boolean> {
    // Check if role image is visible in the overlay
    const spyImage = this.page.locator('img[src="/assets/spy.png"]');
    const locationImage = this.page.locator('img[src^="/assets/"][src$=".png"]:not([src="/assets/spy.png"])');
    
    const spyVisible = await spyImage.isVisible();
    const locationVisible = await locationImage.isVisible();
    
    return spyVisible || locationVisible;
  }

  async verifyRoleNotVisible(): Promise<void> {
    const spyImage = this.page.locator('img[src="/assets/spy.png"]');
    const locationImage = this.page.locator('img[src^="/assets/"][src$=".png"]:not([src="/assets/spy.png"])');
    
    const spyVisible = await spyImage.isVisible();
    const locationVisible = await locationImage.isVisible();
    
    if (spyVisible || locationVisible) {
      throw new Error(`Role should not be visible for ${this.name}, but it is`);
    }
    
    console.log(`✅ [${this.name}] verified role is not visible`);
  }

  async verifyRoleVisible(): Promise<void> {
    const spyImage = this.page.locator('img[src="/assets/spy.png"]');
    const locationImage = this.page.locator('img[src^="/assets/"][src$=".png"]:not([src="/assets/spy.png"])');
    
    const spyVisible = await spyImage.isVisible();
    const locationVisible = await locationImage.isVisible();
    
    if (!spyVisible && !locationVisible) {
      throw new Error(`Role should be visible for ${this.name}, but it is not`);
    }
    
    console.log(`✅ [${this.name}] verified role is visible`);
  }

  async getRoundPoints(): Promise<number> {
    return this.getScore();
  }

  async verifySpyWinMessage(location: string): Promise<void> {
    const spyWinMsg = await this.page.locator('text=Spy wins the round!').isVisible();
    expect(spyWinMsg).toBe(true);
    console.log('✅ Spy win message shown');
    
    const locationMsg = await this.page.locator(`text=Location: ${location}`).isVisible();
    expect(locationMsg).toBe(true);
    console.log(`✅ Location displayed: ${location}`);
  }

  async verifyCiviliansWinMessage(correctVoters: number, totalCivilians: number, location: string): Promise<void> {
    // Check for the civilian win message
    const winMessage = await this.page.getByText(/Civilians win the round/).isVisible();
    expect(winMessage).toBe(true);
    console.log(`✅ Civilian win message shown`);
    
    // Check that the voter ratio appears on the page (simplified check)
    const voterRatio = `${correctVoters}/${totalCivilians}`;
    const hasVoterRatio = await this.page.getByText(voterRatio).isVisible();
    expect(hasVoterRatio).toBe(true);
    console.log(`✅ Voter ratio shown: ${voterRatio}`);
    
    const locationMsg = await this.page.locator(`text=Location: ${location}`).isVisible();
    expect(locationMsg).toBe(true);
    console.log(`✅ Location displayed: ${location}`);
  }

  async verifyNoWinnerMessage(location: string): Promise<void> {
    const noWinnerMsg = await this.page.locator('text=No winner this round!').isVisible();
    expect(noWinnerMsg).toBe(true);
    console.log('✅ No winner message shown');
    
    const locationMsg = await this.page.locator(`text=Location: ${location}`).isVisible();
    expect(locationMsg).toBe(true);
    console.log(`✅ Location displayed: ${location}`);
  }

  async close(): Promise<void> {
    await this.page.close();
    await this.context.close();
  }

  // Static helper method to advance through all players in turn order
  static async advanceAllPlayersInTurnOrder(players: TestPlayer[]): Promise<void> {
    console.log('❓ Each player asking their question...');
    
    // Keep trying until all players have had their turn
    let playersCompleted = 0;
    const totalPlayers = players.length;
    
    while (playersCompleted < totalPlayers) {
      let anyPlayerAdvanced = false;
      
      // Try each player to see if it's their turn
      for (const player of players) {
        const didAdvance = await player.clickNextIfMyTurn();
        if (didAdvance) {
          playersCompleted++;
          anyPlayerAdvanced = true;
          // Wait a bit for the turn to advance to the next player
          await player.page.waitForTimeout(200);
          break; // Move to next iteration to let the next player's turn start
        }
      }
      
      // If no player could advance, wait a bit and try again
      if (!anyPlayerAdvanced) {
        await players[0].page.waitForTimeout(100);
      }
    }
  }
}

