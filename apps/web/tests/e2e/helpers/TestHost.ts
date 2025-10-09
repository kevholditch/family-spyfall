import { Page, BrowserContext } from '@playwright/test';

export class TestHost {
  private gameId: string | null = null;

  constructor(
    public readonly page: Page,
    public readonly context: BrowserContext
  ) {}

  async goToHome(): Promise<void> {
    console.log('🏠 Host navigating to home page...');
    await this.page.goto('/');
  }

  async createGame(): Promise<string> {
    console.log('⏳ Waiting for Create New Game button...');
    await this.page.waitForSelector('button:has-text("Create New Game")');
    
    console.log('🖱️  Clicking Create New Game button...');
    await this.page.click('button:has-text("Create New Game")');
    
    console.log('⏳ Waiting for game state to load...');
    // Wait for the new layout to appear (QR code or players box)
    await this.page.waitForSelector('text=Joined Players', { timeout: 10000 });
    
    console.log('🔍 Extracting game ID from QR code...');
    // Get game ID from the QR code container's data-game-id attribute
    const qrCodeContainer = await this.page.locator('[data-testid="qr-code-container"]');
    if (await qrCodeContainer.isVisible()) {
      this.gameId = await qrCodeContainer.getAttribute('data-game-id');
      console.log(`🔍 Found game ID: ${this.gameId}`);
    } else {
      console.error('❌ Could not find QR code container with game ID');
      throw new Error('Could not extract game ID from QR code container');
    }
    
    console.log(`✅ Game created with ID: ${this.gameId}`);
    return this.gameId!;
  }

  async waitForPlayersVisible(playerNames: string[]): Promise<void> {
    console.log('⏳ Verifying all players are visible on host page...');
    for (const name of playerNames) {
      await this.page.waitForSelector(`text=${name}`, { timeout: 5000 });
      console.log(`✅ ${name} visible on host page`);
    }
  }

  async startRound(): Promise<void> {
    console.log('⏳ Waiting for Start Game button...');
    await this.page.waitForSelector('button:has-text("Start Game")', { timeout: 5000 });
    
    console.log('🖱️  Clicking Start Game button...');
    await this.page.click('button:has-text("Start Game")');
    
    console.log('⏳ Waiting for round to start...');
    // Wait for the game to transition from waiting to playing state
    // This might be indicated by a change in the UI or navigation
    await this.page.waitForTimeout(2000); // Give time for the round to start
    console.log('✅ Round started!');
  }

  async startNextRound(): Promise<void> {
    console.log('⏳ Waiting for Start Next Round button...');
    await this.page.waitForSelector('button:has-text("Start Next Round")', { timeout: 5000 });
    
    console.log('🖱️  Clicking Start Next Round button...');
    await this.page.click('button:has-text("Start Next Round")');
    
    console.log('⏳ Waiting for next round to start...');
    await this.page.waitForTimeout(2000); // Give time for the round to start
    console.log('✅ Next round started!');
  }

  getGameId(): string | null {
    return this.gameId;
  }

  async waitForGameInProgress(): Promise<void> {
    console.log('⏳ Waiting for game in progress state...');
    await this.page.waitForSelector('text=Game in progress', { timeout: 10000 });
    console.log('✅ Game in progress state visible');
  }

  async verifyCurrentPlayer(playerName: string): Promise<void> {
    console.log(`🔍 Verifying ${playerName} is asking a question...`);
    await this.page.waitForSelector(`text=${playerName} is asking a question`, { timeout: 5000 });
    console.log(`✅ ${playerName} is asking a question`);
  }

  async verifyPlayersLeft(current: number): Promise<void> {
    const text = current === 1 ? '1 player left to ask questions' : `${current} players left to ask questions`;
    console.log(`🔍 Verifying players left: ${text}...`);
    await this.page.waitForSelector(`text=${text}`, { timeout: 5000 });
    console.log(`✅ Players left display correct: ${text}`);
  }

  async verifyQRCodeNotVisible(): Promise<void> {
    console.log('🔍 Verifying QR code is not visible...');
    const qrCode = await this.page.locator('[data-testid="qr-code-container"]').isVisible();
    if (qrCode) {
      throw new Error('QR code should not be visible during game');
    }
    console.log('✅ QR code is not visible');
  }

  async verifyStartButtonNotVisible(): Promise<void> {
    console.log('🔍 Verifying Start Game button is not visible...');
    const startButton = await this.page.locator('button:has-text("Start Game")').isVisible();
    if (startButton) {
      throw new Error('Start Game button should not be visible during game');
    }
    console.log('✅ Start Game button is not visible');
  }

  async getScoreboardPlayers(): Promise<Array<{ name: string; score: number }>> {
    console.log('🔍 Getting scoreboard players...');
    
    // Wait for scoreboard to be visible
    await this.page.waitForSelector('[data-testid="tv-scoreboard"]', { timeout: 5000 });
    
    const scoreboard: Array<{ name: string; score: number }> = [];
    const playerItems = await this.page.locator('[data-testid="scoreboard-player"]').all();
    
    for (const item of playerItems) {
      const nameElement = await item.locator('[data-testid="player-name"]');
      const scoreElement = await item.locator('[data-testid="player-score"]');
      
      const name = await nameElement.textContent();
      const scoreText = await scoreElement.textContent();
      
      if (name && scoreText) {
        scoreboard.push({
          name: name.trim(),
          score: parseInt(scoreText.trim(), 10) || 0
        });
      }
    }
    
    console.log(`✅ Found ${scoreboard.length} players in scoreboard:`, scoreboard);
    return scoreboard;
  }

  async verifyScoreboardOrder(expectedOrder: Array<{ name: string; score: number }>): Promise<void> {
    console.log('🔍 Verifying scoreboard order...');
    const actual = await this.getScoreboardPlayers();
    
    if (actual.length !== expectedOrder.length) {
      throw new Error(`Expected ${expectedOrder.length} players, got ${actual.length}`);
    }
    
    for (let i = 0; i < expectedOrder.length; i++) {
      if (actual[i].name !== expectedOrder[i].name || actual[i].score !== expectedOrder[i].score) {
        throw new Error(
          `Scoreboard mismatch at position ${i}: expected ${expectedOrder[i].name} (${expectedOrder[i].score}), ` +
          `got ${actual[i].name} (${actual[i].score})`
        );
      }
    }
    
    console.log('✅ Scoreboard order is correct');
  }

  async waitForRoundSummary(): Promise<void> {
    console.log('⏳ Waiting for round summary on TV display...');
    await this.page.waitForSelector('[data-testid="tv-round-summary"]', { timeout: 10000 });
    
    // Wait for content to be populated (not empty)
    await this.page.waitForFunction(() => {
      const element = document.querySelector('[data-testid="tv-round-summary"]');
      return element && element.textContent && element.textContent.trim().length > 0;
    }, { timeout: 5000 });
    
    console.log('✅ Round summary visible on TV display');
  }

  async verifyRoundSummaryText(expectedText: string): Promise<void> {
    console.log(`🔍 Verifying round summary contains: ${expectedText}`);
    const summaryContainer = this.page.locator('[data-testid="tv-round-summary"]');
    const text = await summaryContainer.textContent();
    
    if (!text?.includes(expectedText)) {
      throw new Error(`Round summary does not contain "${expectedText}". Found: "${text}"`);
    }
    
    console.log(`✅ Round summary contains: ${expectedText}`);
  }

  async verifyCiviliansWonSummary(spyName: string, correctVoters: string[]): Promise<void> {
    console.log('🔍 Verifying civilians won summary on TV display...');
    
    await this.waitForRoundSummary();
    
    // Check for "Civilians won!" text
    await this.verifyRoundSummaryText('Civilians won!');
    
    // Check for vote summary with spy name
    const voteText = `${correctVoters.length}/`;
    await this.verifyRoundSummaryText(voteText);
    await this.verifyRoundSummaryText(`guessed the spy was ${spyName}`);
    
    // Check each voter is listed with +1
    for (const voter of correctVoters) {
      await this.verifyRoundSummaryText(`+1 ${voter}`);
    }
    
    // Check for countdown text
    await this.verifyRoundSummaryText('until next round');
    
    console.log('✅ Civilians won summary verified');
  }

  async verifySpyWonSummary(spyName: string, location: string): Promise<void> {
    console.log('🔍 Verifying spy won summary on TV display...');
    
    await this.waitForRoundSummary();
    
    // Check for "Spy won!" text
    await this.verifyRoundSummaryText('Spy won!');
    
    // Check for spy's correct guess message
    await this.verifyRoundSummaryText(`The spy was ${spyName}`);
    await this.verifyRoundSummaryText(`correctly guessed the location was ${location}`);
    
    // Check for spy points
    await this.verifyRoundSummaryText(`+3 ${spyName}`);
    
    // Check for countdown text
    await this.verifyRoundSummaryText('until next round');
    
    console.log('✅ Spy won summary verified');
  }

  async close(): Promise<void> {
    await this.page.close();
    await this.context.close();
  }
}

