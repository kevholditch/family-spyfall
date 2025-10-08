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
    
    console.log('⏳ Waiting for Game ID to appear...');
    await this.page.waitForSelector('text=Game ID:', { timeout: 10000 });
    
    console.log('🔍 Extracting game ID...');
    const gameIdElement = await this.page.locator('strong.text-yellow-400').first();
    this.gameId = await gameIdElement.textContent();
    
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
    console.log('⏳ Waiting for Start Round 1 button...');
    await this.page.waitForSelector('button:has-text("Start Round 1")', { timeout: 5000 });
    
    console.log('🖱️  Clicking Start Round 1 button...');
    await this.page.click('button:has-text("Start Round 1")');
    
    console.log('⏳ Waiting for round to start...');
    await this.page.waitForSelector('text=Round 1', { timeout: 5000 });
    console.log('✅ Round 1 started!');
  }

  getGameId(): string | null {
    return this.gameId;
  }

  async close(): Promise<void> {
    await this.page.close();
    await this.context.close();
  }
}

