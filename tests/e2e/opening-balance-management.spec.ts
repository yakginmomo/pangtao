import { test, expect, Page } from '@playwright/test';
import { PrismaClient } from '@prisma/client';
import { bangkokToday } from '../../web/src/utils/date';

// AC-01.10: the seed password comes from the local .env, never from source.
const SEED_PASSWORD = process.env.SEED_DEFAULT_PASSWORD;
if (!SEED_PASSWORD) {
  throw new Error('SEED_DEFAULT_PASSWORD must be set in .env to run the E2E suite.');
}

const ORIGIN = 'http://localhost:3000';
const OPENING_URL = /\/api\/v1\/accounts\/[^/]+\/opening-balance$/;
const prisma = new PrismaClient();

async function loginAsAlice(page: Page): Promise<void> {
  await page.goto('/login');
  await page.fill('#email', 'alice@example.test');
  await page.fill('#password', SEED_PASSWORD!);
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/^http:\/\/localhost:3000\/?$/);
}

async function aliceUserId(): Promise<string> {
  const alice = await prisma.user.findUnique({ where: { email: 'alice@example.test' }, select: { id: true } });
  if (!alice) {
    throw new Error('Seed the development database before running E2E: npm run db:seed');
  }
  return alice.id;
}

/** Alice with no transactions and every seeded account active. */
async function resetAlice(): Promise<void> {
  const userId = await aliceUserId();
  await prisma.transaction.deleteMany({ where: { userId } });
  await prisma.account.updateMany({ where: { userId }, data: { isArchived: false } });
}

test.describe('F-12 Opening Balance Management (STS)', () => {
  test.beforeEach(async () => {
    await resetAlice();
  });

  test.afterAll(async () => {
    await resetAlice();
    await prisma.$disconnect();
  });

  test('TEST-12.7 (AC-12.7): the user corrects an opening balance from the Dashboard card with inline validation, then removes it, without a page reload, and the dialogs fit 360 px', async ({
    page,
  }) => {
    await loginAsAlice(page);
    const bank = await prisma.account.findFirstOrThrow({ where: { userId: await aliceUserId(), name: 'Bank Account' }, select: { id: true } });
    const created = await page.request.post(`/api/v1/accounts/${bank.id}/opening-balance`, {
      headers: { Origin: ORIGIN },
      data: { amount: 5_000_000, date: `${bangkokToday().slice(0, 8)}01` }, // 50,000.00 THB
    });
    expect(created.status()).toBe(201);

    const patches: string[] = [];
    page.on('request', (req) => {
      if (req.method() === 'PATCH' && OPENING_URL.test(req.url())) patches.push(req.url());
    });

    await page.goto('/');
    // Marks this page load: it survives in-page updates and is lost on a reload.
    await page.evaluate(() => ((window as unknown as { __noReload: boolean }).__noReload = true));
    const cash = page.getByTestId('dashboard-section-cash');
    const balance = cash.getByTestId('account-balance-Bank Account');
    await expect(balance).toHaveText('50,000.00 ฿');
    await expect(cash.getByTestId('opening-balance-info-Bank Account')).toContainText('Opening balance 50,000.00 ฿');

    // Edit: pre-filled, Save disabled until a value changes, inline error and no request while invalid.
    await cash.getByTestId('edit-opening-balance-Bank Account').click();
    const dialog = page.getByTestId('opening-balance-dialog');
    await expect(dialog).toContainText('Edit opening balance — Bank Account');
    const amount = page.getByTestId('opening-amount');
    await expect(amount).toHaveValue('50000.00');
    const save = page.getByTestId('opening-balance-save');
    await expect(save).toBeDisabled();

    // PR #69 review: the same amount typed another way is not a change, so Save stays disabled
    // and no PATCH (with an empty body) can be sent.
    for (const sameAmount of ['50000', '50,000.00', '50000.0']) {
      await amount.fill(sameAmount);
      await expect(save, sameAmount).toBeDisabled();
    }
    await amount.press('Enter');
    await expect(dialog).toBeVisible();
    await expect(page.getByRole('alert')).toHaveCount(0);
    expect(patches).toHaveLength(0);

    await amount.fill('-1');
    await save.click();
    await expect(page.getByTestId('opening-balance-error')).toHaveText('Enter a valid amount in THB with at most 2 decimal places.');
    expect(patches).toHaveLength(0);

    // 360 px: the dialog fits without horizontal scrolling.
    await page.setViewportSize({ width: 360, height: 800 });
    const editOverflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(editOverflow).toBeLessThanOrEqual(1);
    await page.setViewportSize({ width: 1280, height: 800 });

    await amount.fill('55,000.00');
    await save.click();
    await expect(dialog).toHaveCount(0);
    expect(patches).toHaveLength(1);
    await expect(balance).toHaveText('55,000.00 ฿');
    await expect(cash.getByTestId('opening-balance-info-Bank Account')).toContainText('Opening balance 55,000.00 ฿');

    // Remove: confirm with the amount and account named, then the card offers Set opening balance again.
    await page.setViewportSize({ width: 360, height: 800 });
    await cash.getByTestId('remove-opening-balance-Bank Account').click();
    const confirm = page.getByTestId('remove-opening-dialog');
    await expect(page.getByTestId('remove-opening-text')).toHaveText(
      'Remove the opening balance of 55,000.00 ฿ from Bank Account? The balance will no longer include it.'
    );
    const removeOverflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(removeOverflow).toBeLessThanOrEqual(1);
    await page.getByTestId('remove-opening-confirm').click();
    await expect(confirm).toHaveCount(0);
    await expect(balance).toHaveText('0.00 ฿');
    await expect(cash.getByTestId('set-opening-balance-Bank Account')).toBeVisible();
    await expect(cash.getByTestId('opening-balance-info-Bank Account')).toHaveCount(0);
    expect(await page.evaluate(() => (window as unknown as { __noReload?: boolean }).__noReload)).toBe(true);

    // D-04: the row is voided, not deleted.
    const stored = await prisma.transaction.findMany({
      where: { userId: await aliceUserId(), kind: 'OPENING_BALANCE' },
      select: { totalAmount: true, voidedAt: true },
    });
    expect(stored).toHaveLength(1);
    expect(stored[0].totalAmount).toBe(5_500_000n);
    expect(stored[0].voidedAt).not.toBeNull();
  });
});
