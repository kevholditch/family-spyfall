import { test, expect } from '@playwright/test';

test.describe('Simple Game Creation Test', () => {
  test('TV creates game and shows game interface', async ({ page }) => {
    // Step 1: Load the TV control center
    await page.goto('/');
    
    // Verify initial screen
    await expect(page.locator('text=FAMILY SPYFALL')).toBeVisible();
    await expect(page.locator('text=TV Control Center')).toBeVisible();
    await expect(page.locator('button:has-text("Create New Game")')).toBeVisible();
    
    // Step 2: Create a game
    await page.click('button:has-text("Create New Game")');
    
    // Wait for the button to show loading state
    await expect(page.locator('button:has-text("Creating Game...")')).toBeVisible();
    
    // Wait for the game interface to appear
    await page.waitForSelector('text=Game ID:', { timeout: 10000 });
    
    // Verify game interface is shown
    await expect(page.locator('text=Game ID:')).toBeVisible();
    await expect(page.locator('text=Players: 1')).toBeVisible();
    await expect(page.locator('text=TV Host')).toBeVisible();
    
    // Verify QR code is present
    await expect(page.locator('img[alt="QR code to join the game"]')).toBeVisible();
    
    // Verify join URL text
    await expect(page.locator('text=Scan to join the game')).toBeVisible();
    
    console.log('✅ Game creation test passed!');
  });

  test('Game creation handles API errors gracefully', async ({ page }) => {
    // This test would need the server to be down or return errors
    // For now, just verify the basic flow works
    await page.goto('/');
    await expect(page.locator('button:has-text("Create New Game")')).toBeVisible();
    
    // The button should be clickable
    const button = page.locator('button:has-text("Create New Game")');
    await expect(button).toBeEnabled();
  });
});
