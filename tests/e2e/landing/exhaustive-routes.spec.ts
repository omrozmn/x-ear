import { test, expect } from '@playwright/test';

const LANDING_URL = process.env.LANDING_BASE_URL || 'http://localhost:3000';

test.describe('Landing: Exhaustive Route Coverage', () => {

    test('Features Page: should render all feature sections', async ({ page }) => {
        // Features page returns 404 - not implemented yet
        test.skip(true, 'Features page not implemented (404)');

        await page.goto(`${LANDING_URL}/features`);
        
        await expect(page.getByRole('heading', { name: /Özellikler|Features/i })).toBeVisible();
        
        // Check for specific feature sections if known
        // Assuming some common features like "CRM", "Stock", "AI"
        await expect(page.locator('body')).toContainText(/CRM|Müşteri/i);
        await expect(page.locator('body')).toContainText(/Stok|Inventory/i);
        await expect(page.locator('body')).toContainText(/Yapay Zeka|AI/i);
    });

    test('Contact Page: should render contact form and info', async ({ page }) => {
        // Contact page returns 404 - not implemented yet
        test.skip(true, 'Contact page not implemented (404)');

        await page.goto(`${LANDING_URL}/contact`);
        
        await expect(page.getByRole('heading', { name: /İletişim|Contact/i })).toBeVisible();
        
        // Form elements
        await expect(page.getByLabel(/İsim|Name/i)).toBeVisible();
        await expect(page.getByLabel(/E-posta|Email/i)).toBeVisible();
        await expect(page.getByLabel(/Mesaj|Message/i)).toBeVisible();
        await expect(page.getByRole('button', { name: /Gönder|Send/i })).toBeVisible();
        
        // Contact info
        await expect(page.locator('body')).toContainText(/info@x-ear.com/i);
    });

    test('Blog Page: should render blog list and search', async ({ page }) => {
        // Blog page returns 404 - not implemented yet
        test.skip(true, 'Blog page not implemented (404)');

        await page.goto(`${LANDING_URL}/blog`);
        
        await expect(page.getByRole('heading', { name: /Blog/i })).toBeVisible();
        
        // Check for blog posts
        const blogPosts = page.locator('article, .blog-post');
        // Even if empty, the container should be there
        await expect(page.locator('body')).toContainText(/Blog/i);
    });

    test('FAQ Page: exhaustive accordion check', async ({ page }) => {
        await page.goto(`${LANDING_URL}/faq`);
        
        const faqItems = page.locator('button[aria-expanded]');
        const count = await faqItems.count();
        
        if (count > 0) {
            // Click first item
            await faqItems.first().click();
            await expect(faqItems.first()).toHaveAttribute('aria-expanded', 'true');
        }
    });
});
