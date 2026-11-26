import { test, expect, Page } from '@playwright/test';
import { PrismaClient } from '@prisma/client';

// AC-01.10: the seed password comes from the local .env, never from source.
const SEED_PASSWORD = process.env.SEED_DEFAULT_PASSWORD;
if (!SEED_PASSWORD) {
  throw new Error('SEED_DEFAULT_PASSWORD must be set in .env to run the E2E suite.');
}

const ACCOUNTS_URL = /\/api\/v1\/accounts$/;
const prisma = new PrismaClient();

// The nine accounts every seeded user owns (prisma/seed-accounts.ts); anything else is test data.
const SEEDED_NAMES = [
  'Wallet',
  'Bank Account',
  'Credit Card',
  'Salary',
  'Interest Earned',
  'Dining',
  'Groceries',
  'Electricity',
  'Telecom',
];

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

/** Alice's accounts back to the seeded state: created accounts removed, seeded ones active and renamed back. */
async function resetAliceAccounts(): Promise<void> {
  const userId = await aliceUserId();
  await prisma.transaction.deleteMany({ where: { userId } });
  await prisma.account.deleteMany({ where: { userId, name: { notIn: SEEDED_NAMES } } });
  await prisma.account.updateMany({ where: { userId }, data: { isArchived: false } });
}

test.describe('F-09 Account Management (STS)', () => {
  test.beforeEach(async () => {
    await resetAliceAccounts();
  });

  test.afterAll(async () => {
    await resetAliceAccounts();
    await prisma.$disconnect();
  });

  test('TEST-09.9 (AC-09.9): the user creates, renames, archives and unarchives an account, and the transaction form follows', async ({
    page,
  }) => {
    const posts: string[] = [];
    page.on('request', (req) => {
      if (req.method() === 'POST' && ACCOUNTS_URL.test(req.url())) posts.push(req.url());
    });

    await loginAsAlice(page);
    await page.getByTestId('nav-accounts').click();
    await expect(page).toHaveURL(/\/accounts$/);

    // Invalid input shows an inline error when the user leaves the field, and sends nothing.
    await page.getByTestId('new-account-button').click();
    await page.getByTestId('new-account-name').click();
    await page.getByTestId('new-account-name').press('Tab');
    await expect(page.getByTestId('new-account-name-error')).toHaveText('Enter a name.');
    await expect(page.getByTestId('new-account-submit')).toBeDisabled();
    expect(posts).toHaveLength(0);

    // Create Savings (Cash, Bank): it appears under Cash at 0.00 ฿.
    await page.getByTestId('new-account-name').fill('Savings');
    await page.getByTestId('new-account-type').selectOption('CASH');
    await page.getByTestId('new-account-subtype').selectOption('BANK');
    await page.getByTestId('new-account-submit').click();
    const cash = page.getByTestId('accounts-section-CASH');
    await expect(cash.getByTestId('accounts-row-Savings')).toBeVisible();
    await expect(cash.getByTestId('accounts-balance-Savings')).toHaveText('0.00 ฿');
    expect(posts).toHaveLength(1);

    // A duplicate name is refused under the Name field.
    await page.getByTestId('new-account-button').click();
    await page.getByTestId('new-account-name').fill('Savings');
    await page.getByTestId('new-account-submit').click();
    await expect(page.getByTestId('new-account-name-error')).toHaveText('You already have an account with this name.');
    await page.getByTestId('new-account-cancel').click();

    // Rename.
    await page.getByTestId('rename-Savings').click();
    await page.getByTestId('rename-input').fill('Savings 2');
    await page.getByTestId('rename-save').click();
    await expect(cash.getByTestId('accounts-row-Savings 2')).toBeVisible();
    await expect(cash.getByTestId('accounts-row-Savings')).toHaveCount(0);

    // Archive: the confirmation shows the balance; the account moves to Archived.
    await page.getByTestId('archive-Savings 2').click();
    await expect(page.getByTestId('archive-confirm-text')).toContainText('0.00 ฿');
    await page.getByTestId('archive-confirm').click();
    await expect(cash.getByTestId('accounts-row-Savings 2')).toHaveCount(0);
    await expect(page.getByTestId('archived-toggle')).toHaveText('Archived (1)');

    // While archived it is not offered as a source on the transaction form.
    await page.goto('/transactions/new');
    await expect(page.getByTestId('payment-source')).toBeVisible();
    await expect(page.getByTestId('payment-source').locator('option', { hasText: 'Savings 2' })).toHaveCount(0);

    // Unarchive: it is offered again.
    await page.getByTestId('nav-accounts').click();
    await page.getByTestId('archived-toggle').click();
    await page.getByTestId('unarchive-Savings 2').click();
    await expect(page.getByTestId('archived-toggle')).toHaveCount(0);
    await expect(cash.getByTestId('accounts-row-Savings 2')).toBeVisible();
    await page.goto('/transactions/new');
    await expect(page.getByTestId('payment-source').locator('option', { hasText: 'Savings 2' })).toHaveCount(1);

    const stored = await prisma.account.findFirst({ where: { userId: await aliceUserId(), name: 'Savings 2' } });
    expect(stored).toMatchObject({ type: 'CASH', subtype: 'BANK', isArchived: false });
  });

  test('TEST-09.10 (AC-09.10): the Accounts screen shows loading, error with Retry and no empty Archived section, and fits 360 px', async ({
    page,
  }) => {
    await loginAsAlice(page);
    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto('/accounts');
    await expect(page.getByTestId('accounts-section-CASH')).toBeVisible();
    // Nothing is archived, so there is no Archived section.
    await expect(page.getByTestId('accounts-archived')).toHaveCount(0);

    // Loading: a delayed response shows skeleton rows first.
    await page.route(ACCOUNTS_URL, async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 700));
      await route.continue();
    });
    await page.reload();
    await expect(page.getByTestId('accounts-skeleton')).toBeVisible();
    await expect(page.getByTestId('accounts-section-CASH')).toBeVisible();
    await page.unroute(ACCOUNTS_URL);

    // Error: a failed load shows a banner whose Retry renders the list.
    await page.route(ACCOUNTS_URL, (route) =>
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: { code: 'INTERNAL_ERROR', message: 'Simulated failure' } }),
      })
    );
    await page.reload();
    const banner = page.getByRole('alert');
    await expect(banner).toContainText('Simulated failure');
    await expect(page.getByTestId('accounts-section-CASH')).toHaveCount(0);
    await page.unroute(ACCOUNTS_URL);
    await banner.getByRole('button', { name: 'Retry' }).click();
    await expect(page.getByTestId('accounts-section-CASH')).toBeVisible();

    // The create form fits 360 px and the create succeeds there.
    await page.getByTestId('new-account-button').click();
    await page.getByTestId('new-account-name').fill('A fairly long account name for the narrow screen');
    await page.getByTestId('new-account-type').selectOption('EXPENSE');
    const horizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth
    );
    expect(horizontalOverflow).toBeLessThanOrEqual(1);
    await page.getByTestId('new-account-submit').click();
    await expect(
      page.getByTestId('accounts-section-EXPENSE').getByTestId('accounts-row-A fairly long account name for the narrow screen')
    ).toBeVisible();
  });
});
