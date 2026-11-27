import { test, expect, Page } from '@playwright/test';
import { PrismaClient } from '@prisma/client';
import { bangkokToday, formatCalendarDate } from '../../web/src/utils/date';
import { bangkokDate, insertSearchLedger } from '../helpers/ledger.helper';

const SEED_PASSWORD = process.env.SEED_DEFAULT_PASSWORD;
if (!SEED_PASSWORD) {
  throw new Error('SEED_DEFAULT_PASSWORD must be set in .env to run the E2E suite.');
}

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

const prisma = new PrismaClient();

async function loginAs(page: Page, email: string): Promise<void> {
  await page.goto('/login');
  await page.fill('#email', email);
  await page.fill('#password', SEED_PASSWORD!);
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/^http:\/\/localhost:3000\/?$/);
}

async function userIdByEmail(email: string): Promise<string> {
  const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (!user) {
    throw new Error('Seed the development database before running E2E: npm run db:seed');
  }
  return user.id;
}

async function resetLedgers(): Promise<{ aliceId: string; bobId: string }> {
  const aliceId = await userIdByEmail('alice@example.test');
  const bobId = await userIdByEmail('bob@example.test');
  for (const userId of [aliceId, bobId]) {
    await prisma.transaction.deleteMany({ where: { userId } });
    await prisma.account.deleteMany({ where: { userId, name: { notIn: SEEDED_NAMES } } });
    await prisma.account.updateMany({ where: { userId }, data: { isArchived: false } });
  }
  return { aliceId, bobId };
}

async function expectNoHorizontalOverflow(page: Page): Promise<void> {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
}

test.describe('F-15 Favorites and Duplicate (STS)', () => {
  let aliceId: string;
  let bobId: string;

  test.beforeEach(async () => {
    ({ aliceId, bobId } = await resetLedgers());
  });

  test.afterAll(async () => {
    await resetLedgers();
    await prisma.$disconnect();
  });

  test('TEST-15.6 & TEST-15.7 (AC-15.6, AC-15.7): Duplicate pre-fills without writing, then saves a new copy leaving the favorite original unchanged', async ({
    page,
  }) => {
    const ledger = await insertSearchLedger(aliceId, bobId);
    await prisma.transaction.update({
      where: { id: ledger.cardChargeTransactionId },
      data: { isFavorite: true },
    });
    const beforeRow = await prisma.transaction.findUniqueOrThrow({
      where: { id: ledger.cardChargeTransactionId },
      select: { updatedAt: true, isFavorite: true },
    });

    await loginAs(page, 'alice@example.test');

    const writes: string[] = [];
    page.on('request', (req) => {
      if (['POST', 'PATCH', 'PUT'].includes(req.method())) {
        writes.push(`${req.method()} ${req.url()}`);
      }
    });

    await page.goto(`/transactions/${ledger.cardChargeTransactionId}`);
    await page.getByTestId('transaction-duplicate').click();

    await expect(page).toHaveURL(new RegExp(`/transactions/new\\?duplicateOf=${ledger.cardChargeTransactionId}$`));
    await expect(page.getByRole('heading', { name: 'Duplicate transaction' })).toBeVisible();
    await expect(page.getByTestId('duplicate-banner')).toContainText(
      `Copied from Payment of 1,200.00 ฿ on ${formatCalendarDate(bangkokDate(-10))}`
    );
    await expect(page.getByTestId('tab-payment')).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByTestId('payment-source')).toHaveValue(ledger.ids['Credit Card']);
    await expect(page.getByTestId('payment-date')).toHaveValue(bangkokToday());
    await expect(page.getByTestId('payment-total')).toHaveValue('1200.00');
    await expect(page.getByTestId('payment-memo')).toHaveValue('Weekend');
    await expect(page.getByTestId('line-target-0')).toHaveValue(ledger.ids['Dining']);
    await expect(page.getByTestId('line-amount-0')).toHaveValue('700.00');
    await expect(page.getByTestId('line-note-0')).toHaveValue('Team lunch');
    await expect(page.getByTestId('line-target-1')).toHaveValue(ledger.ids['Groceries']);
    await expect(page.getByTestId('line-amount-1')).toHaveValue('500.00');
    expect(writes).toEqual([]);

    await page.getByTestId('payment-submit').click();
    await expect(page).toHaveURL(/\/transactions\/[0-9a-f-]{36}$/);
    expect(page.url()).not.toContain(ledger.cardChargeTransactionId);
    await expect(page.getByTestId('transaction-detail')).toContainText('1,200.00 ฿');

    const afterRow = await prisma.transaction.findUniqueOrThrow({
      where: { id: ledger.cardChargeTransactionId },
      select: { updatedAt: true, isFavorite: true },
    });
    expect(afterRow.isFavorite).toBe(beforeRow.isFavorite);
    expect(afterRow.updatedAt.getTime()).toBe(beforeRow.updatedAt.getTime());
  });

  test('TEST-15.8 (AC-15.8): handles archived accounts, voided transactions, opening balances, and unknown/other-user ids on duplicate', async ({
    page,
  }) => {
    const ledger = await insertSearchLedger(aliceId, bobId);
    await prisma.account.update({ where: { id: ledger.ids['Groceries'] }, data: { isArchived: true } });

    await loginAs(page, 'alice@example.test');

    // Archived target in original (3): flagged and Save disabled until replaced.
    await page.goto(`/transactions/new?duplicateOf=${ledger.cardChargeTransactionId}`);
    await expect(page.getByTestId('line-target-1-error')).toContainText('This account is archived. Choose another account.');
    await expect(page.getByTestId('payment-submit')).toBeDisabled();
    await page.getByTestId('line-target-1').selectOption(ledger.ids['Electricity']);
    await expect(page.getByTestId('line-target-1-error')).toHaveCount(0);
    await expect(page.getByTestId('payment-submit')).toBeEnabled();
    await page.getByTestId('payment-submit').click();
    await expect(page).toHaveURL(/\/transactions\/[0-9a-f-]{36}$/);

    // Voided (6) can be duplicated.
    await page.goto(`/transactions/new?duplicateOf=${ledger.voidedTransactionId}`);
    await expect(page.getByTestId('payment-source')).toHaveValue(ledger.ids['Wallet']);
    await expect(page.getByTestId('payment-total')).toHaveValue('150.00');
    await expect(page.getByTestId('line-target-0')).toHaveValue(ledger.ids['Dining']);

    // Opening balance (1) cannot be duplicated.
    await page.goto(`/transactions/new?duplicateOf=${ledger.openingTransactionId}`);
    await expect(page.getByTestId('duplicate-notice')).toContainText('Opening balances cannot be duplicated');
    await expect(page.getByTestId('payment-total')).toHaveValue('');

    // Unknown UUID and Bob's transaction id show "Transaction not found" and an empty form.
    for (const badId of ['00000000-0000-4000-8000-000000000099', ledger.bobPaymentTransactionId!]) {
      await page.goto(`/transactions/new?duplicateOf=${badId}`);
      await expect(page.getByTestId('duplicate-notice')).toContainText('Transaction not found');
      await expect(page.getByTestId('payment-total')).toHaveValue('');
    }
  });

  test('TEST-15.9 (AC-15.9): stars on History, opens Favorites, duplicates, and covers loading/empty/error states and 360 px layout', async ({
    page,
  }) => {
    const ledger = await insertSearchLedger(aliceId, bobId);
    await loginAs(page, 'alice@example.test');

    // Star (2) on History.
    await page.getByTestId('nav-history').click();
    await expect(page).toHaveURL(/\/transactions$/);
    const salaryRow = page.getByTestId('history-row').filter({ hasText: 'November salary' });
    const starBtn = salaryRow.getByTestId('favorite-toggle');
    await expect(starBtn).toHaveAttribute('aria-pressed', 'false');
    await starBtn.click();
    await expect(starBtn).toHaveAttribute('aria-pressed', 'true');

    // Open Favorites, duplicate (2), save.
    await page.getByTestId('nav-favorites').click();
    await expect(page).toHaveURL(/\/favorites$/);
    const favRows = page.getByTestId('history-row');
    await expect(favRows).toHaveCount(1);
    await expect(favRows.first()).toContainText('November salary');
    await favRows.first().getByTestId('row-duplicate').click();

    await expect(page).toHaveURL(new RegExp(`/transactions/new\\?duplicateOf=${ledger.salaryTransactionId}$`));
    await page.getByTestId('receipt-submit').click();
    await expect(page).toHaveURL(/\/transactions\/[0-9a-f-]{36}$/);

    // History shows both Receipts, star on original only.
    await page.getByTestId('nav-history').click();
    const salaryRows = page.getByTestId('history-row').filter({ hasText: 'November salary' });
    await expect(salaryRows).toHaveCount(2);
    const starredCount = await salaryRows.locator('[data-testid="favorite-toggle"][aria-pressed="true"]').count();
    expect(starredCount).toBe(1);

    // Favorites error + Retry, plus 360 px check.
    await page.setViewportSize({ width: 360, height: 800 });
    let failOnce = true;
    await page.route('**/api/v1/transactions?*favorite=true*', (route) => {
      if (failOnce) {
        failOnce = false;
        return route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: { code: 'INTERNAL_ERROR', message: 'Boom' } }),
        });
      }
      return route.continue();
    });
    await page.goto('/favorites');
    const banner = page.getByRole('alert');
    await expect(banner).toBeVisible();
    await banner.getByRole('button', { name: 'Retry' }).click();
    await expect(page.getByTestId('history-row')).toHaveCount(1);
    await expectNoHorizontalOverflow(page);

    // Bob has no favorites -> empty state.
    await page.context().clearCookies();
    await loginAs(page, 'bob@example.test');
    await page.getByTestId('nav-favorites').click();
    await expect(page.getByTestId('favorites-empty')).toContainText(
      'No favorites yet. Use the star on a transaction to add one.'
    );
    await expect(page.getByTestId('favorites-empty').getByRole('link')).toHaveAttribute('href', '/transactions');
    await expectNoHorizontalOverflow(page);
  });
});
