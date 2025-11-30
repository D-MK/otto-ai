import { test, expect } from '@playwright/test';

test.describe('Otto AI E2E Tests', () => {
  test('should load the application', async ({ page }) => {
    await page.goto('/');
    
    // Check if the app loaded
    await expect(page).toHaveTitle(/Otto AI/i);
  });

  test('should display chat interface', async ({ page }) => {
    await page.goto('/');
    
    // Check for chat input
    const chatInput = page.locator('input[type="text"], textarea').first();
    await expect(chatInput).toBeVisible();
  });

  test('should display sidebar with scripts', async ({ page }) => {
    await page.goto('/');
    
    // Check for sidebar
    const sidebar = page.locator('[data-testid="sidebar"], .sidebar, aside').first();
    await expect(sidebar).toBeVisible();
  });

  // Add more E2E tests as needed
  // Example: test script creation, execution, etc.
});

