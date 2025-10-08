import { Browser } from '@playwright/test';
import { TestPlayer } from './TestPlayer';
import { TestHost } from './TestHost';

export class PlayerBuilder {
  constructor(private browser: Browser) {}

  async create(name: string): Promise<TestPlayer> {
    console.log(`📱 Creating browser context for ${name}...`);
    const context = await this.browser.newContext();
    
    console.log(`📄 Creating page for ${name}...`);
    const page = await context.newPage();
    
    return new TestPlayer(name, page, context);
  }
}

export class HostBuilder {
  constructor(private browser: Browser) {}

  async create(): Promise<TestHost> {
    console.log('📱 Creating browser context for host...');
    const context = await this.browser.newContext();
    
    console.log('📄 Creating page for host...');
    const page = await context.newPage();
    
    return new TestHost(page, context);
  }
}

export class TestSetup {
  private players: TestPlayer[] = [];
  private host: TestHost | null = null;

  constructor(
    private playerBuilder: PlayerBuilder,
    private hostBuilder: HostBuilder
  ) {}

  async createHost(): Promise<TestHost> {
    this.host = await this.hostBuilder.create();
    return this.host;
  }

  async createPlayer(name: string): Promise<TestPlayer> {
    const player = await this.playerBuilder.create(name);
    this.players.push(player);
    return player;
  }

  async cleanup(): Promise<void> {
    console.log('🧹 Cleaning up browser contexts and pages...');
    
    for (const player of this.players) {
      await player.close();
    }
    
    if (this.host) {
      await this.host.close();
    }
    
    console.log('✅ Cleanup complete');
  }
}

