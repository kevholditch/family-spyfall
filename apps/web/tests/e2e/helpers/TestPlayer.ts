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
    await Promise.race([
      this.page.waitForSelector('text=YOU ARE THE SPY!', { timeout: 10000 }),
      this.page.waitForSelector('text=YOUR LOCATION', { timeout: 10000 })
    ]);
  }

  async acknowledgeRole(): Promise<void> {
    const ackButton = this.page.locator('button:has-text("I Understand")');
    await ackButton.waitFor({ state: 'visible', timeout: 5000 });
    await ackButton.click();
    console.log(`✅ [${this.name}] acknowledged role`);
  }

  async getRoleInfo(): Promise<RoleInfo> {
    console.log(`🔍 [${this.name}] Getting role info...`);
    
    const isSpy = await this.page.locator('text=YOU ARE THE SPY!').isVisible();
    
    if (isSpy) {
      console.log(`✅ [${this.name}] is a SPY`);
      return { isSpy: true };
    }
    
    console.log(`👤 [${this.name}] is a CIVILIAN, getting location...`);
    const locationElement = await this.page.locator('.text-4xl.font-bold.text-green-400').first();
    const location = await locationElement.textContent();
    console.log(`✅ [${this.name}] Location: ${location?.trim()}`);
    
    return { 
      isSpy: false, 
      location: location?.trim() 
    };
  }

  async clickNext(): Promise<void> {
    await this.page.waitForSelector('button:has-text("Next")', { timeout: 5000 });
    await this.page.click('button:has-text("Next")');
    console.log(`✅ [${this.name}] asked their question`);
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
    await this.page.waitForSelector('text=Question Round', { timeout: 10000 });
  }

  async waitForRoundSummary(): Promise<void> {
    await this.page.waitForSelector('text=Round Results!', { timeout: 10000 });
  }

  async getScore(): Promise<number> {
    // Find the "Points This Round" section and locate this player's card
    const pointsSection = await this.page.locator('h3:has-text("Points This Round:")').locator('..').first();
    const playerCards = await pointsSection.locator('.p-3.rounded-lg').all();
    
    for (const card of playerCards) {
      const nameElement = await card.locator('.font-semibold').first();
      const name = await nameElement.textContent();
      
      if (name?.trim() === this.name) {
        const pointsElement = await card.locator('.text-2xl.font-bold.text-yellow-400').first();
        const pointsText = await pointsElement.textContent();
        
        if (pointsText) {
          const cleanText = pointsText.replace('+', '').trim();
          const points = parseInt(cleanText, 10);
          return isNaN(points) ? 0 : points;
        }
      }
    }
    
    return 0;
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
}

