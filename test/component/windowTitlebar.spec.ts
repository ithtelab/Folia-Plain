import { expect, test } from './fixtures';

// Real hit testing catches invisible chrome wrappers intercepting navigation and window dragging.
test.beforeEach(async ({ mount }) => { await mount('windowTitlebar'); });

test('navigation clears the titlebar and does not reveal its controls', async ({ page }) => {
    const navigation = page.locator('[data-titlebar-test-navigation]');
    const box = (await navigation.boundingBox())!;
    expect(box.y).toBeGreaterThanOrEqual(56);
    await page.mouse.move(600, 48);
    const hiddenButtons = page.locator('button[tabindex="-1"]');
    expect(await hiddenButtons.count()).toBeGreaterThanOrEqual(5);
    await navigation.click();
    await expect(page.locator('[data-titlebar-test-action]')).toHaveText('navigation');
    expect(await hiddenButtons.count()).toBeGreaterThanOrEqual(5);
});

test('hidden controls cannot catch a click, and revealed controls remain usable', async ({ page }) => {
    const edge = page.locator('[data-titlebar-reveal-edge]');
    await expect(edge).toHaveCSS('-webkit-app-region', 'no-drag');
    const width = page.viewportSize()!.width;
    const hit = await page.evaluate(x => document.elementFromPoint(x, 16)?.closest('button')?.textContent ?? null, width - 22);
    expect(hit).toBeNull();
    await page.mouse.move(width - 22, 4);
    const close = page.locator('button').filter({ has: page.locator('.lucide-x') });
    await expect(close).toHaveAttribute('tabindex', '0');
    await close.click();
    await expect(page.locator('[data-titlebar-test-action]')).toHaveText('close');
    await page.mouse.move(600, 100);
    await expect(close).toHaveAttribute('tabindex', '-1');
});

test('the always-visible preference keeps controls accessible away from the edge', async ({ page }) => {
    await page.getByRole('button', { name: 'Toggle always-visible titlebar' }).click();
    await page.mouse.move(600, 200);
    const close = page.locator('button').filter({ has: page.locator('.lucide-x') });
    await expect(close).toHaveAttribute('tabindex', '0');
    await close.click();
    await expect(page.locator('[data-titlebar-test-action]')).toHaveText('close');
});
