import { test, expect, Page } from '@playwright/test';
import { PrismaClient } from '@prisma/client';
import { bangkokToday } from '../../web/src/utils/date';

// AC-01.10: the seed password comes from the local .env, never from source.
const SEED_PASSWORD = process.env.SEED_DEFAULT_PASSWORD;
if (!SEED_PASSWORD) {
  throw new Error('SEED_DEFAULT_PASSWORD must be set in .env to run the E2E suite.');
}

const ORIGIN = 'http://localhost:3000';
const LOANS_URL = /\/api\/v1\/loans$/;
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

/** Alice back to the seeded state: no transactions, created accounts removed, seeded ones active. */
async function resetAlice(): Promise<void> {
  const userId = await aliceUserId();
  await prisma.transaction.deleteMany({ where: { userId } });
  await prisma.account.deleteMany({ where: { userId, name: { notIn: SEEDED_NAMES } } });
  await prisma.account.updateMany({ where: { userId }, data: { isArchived: false } });
}

/** f-10 §4: loan accounts are created through POST /api/v1/accounts (F-09), as the signed-in user. */
async function createAccount(page: Page, name: string, type: string, subtype?: string): Promise<string> {
  const res = await page.request.post('/api/v1/accounts', {
    headers: { Origin: ORIGIN },
    data: { name, type, ...(subtype ? { subtype } : {}) },
  });
  expect(res.status(), name).toBe(201);
  return (await res.json()).account.id as string;
}

async function recordTransaction(page: Page, kind: 'PAYMENT' | 'RECEIPT', accountId: string, targetAccountId: string, amount: number) {
  const res = await page.request.post('/api/v1/transactions', {
    headers: { Origin: ORIGIN },
    data: { kind, accountId, txnDate: bangkokToday(), totalAmount: amount, lines: [{ targetAccountId, amount }] },
  });
  expect(res.status()).toBe(201);
}

async function accountId(name: string): Promise<string> {
  const account = await prisma.account.findFirst({ where: { userId: await aliceUserId(), name }, select: { id: true } });
  if (!account) throw new Error(`No account named ${name}`);
  return account.id;
}

/** The option labels of each optgroup in a target select, in order. */
async function targetGroups(page: Page, testId: string): Promise<string[]> {
  return page.getByTestId(testId).locator('optgroup').evaluateAll((groups) => groups.map((g) => (g as HTMLOptGroupElement).label));
}

test.describe('F-10 Loans (STS)', () => {
  test.beforeEach(async () => {
    await resetAlice();
  });

  test.afterAll(async () => {
    await resetAlice();
    await prisma.$disconnect();
  });

  test('TEST-10.9 (AC-10.9): the Loans page shows its empty, loading and error states, both lists with totals and a negative balance, fits 360 px, and opens the form on the right tab', async ({
    page,
  }) => {
    // No loan accounts: the seeded Credit Card is the only Loan Taken account, archived at 0 it is left out (f-10 §1).
    await prisma.account.updateMany({ where: { userId: await aliceUserId(), name: 'Credit Card' }, data: { isArchived: true } });
    await loginAsAlice(page);
    await page.getByTestId('nav-loans').click();
    await expect(page).toHaveURL(/\/loans$/);
    await expect(page.getByTestId('loans-empty')).toContainText('No loans yet.');
    await page.getByTestId('loans-empty-accounts-link').click();
    await expect(page).toHaveURL(/\/accounts$/);

    // TEST-10.7 state: lent 2,000.00, repaid 500.00, then 2,000.00 received, so Loan to Bob is −500.00.
    const loanToBob = await createAccount(page, 'Loan to Bob', 'LOAN_GIVEN');
    const bank = await accountId('Bank Account');
    await recordTransaction(page, 'PAYMENT', bank, loanToBob, 200_000);
    await recordTransaction(page, 'RECEIPT', bank, loanToBob, 50_000);
    await recordTransaction(page, 'RECEIPT', bank, loanToBob, 200_000);
    await prisma.account.updateMany({ where: { userId: await aliceUserId(), name: 'Credit Card' }, data: { isArchived: false } });

    // Loading: a delayed response shows the skeleton first.
    await page.route(LOANS_URL, async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 700));
      await route.continue();
    });
    await page.goto('/loans');
    await expect(page.getByTestId('loans-skeleton')).toBeVisible();
    await expect(page.getByTestId('loans-owed-to-me')).toBeVisible();
    await page.unroute(LOANS_URL);

    // Error: a failed load shows a banner whose Retry renders the lists.
    await page.route(LOANS_URL, (route) =>
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: { code: 'INTERNAL_ERROR', message: 'Simulated failure' } }),
      })
    );
    await page.reload();
    const banner = page.getByRole('alert');
    await expect(banner).toContainText('Simulated failure');
    await expect(page.getByTestId('loans-owed-to-me')).toHaveCount(0);
    await page.unroute(LOANS_URL);
    await banner.getByRole('button', { name: 'Retry' }).click();

    // Both lists with totals; the negative balance has a minus sign and its text label (D-02).
    const owedToMe = page.getByTestId('loans-owed-to-me');
    await expect(owedToMe.getByTestId('loans-balance-Loan to Bob')).toHaveText('-500.00 ฿');
    await expect(owedToMe.getByTestId('loans-row-Loan to Bob')).toContainText('Negative balance');
    await expect(owedToMe.getByTestId('loans-total-owed-to-me')).toHaveText('-500.00 ฿');
    const owedByMe = page.getByTestId('loans-owed-by-me');
    await expect(owedByMe.getByTestId('loans-row-Credit Card')).toContainText('Credit card');
    await expect(owedByMe.getByTestId('loans-total-owed-by-me')).toHaveText('0.00 ฿');

    // 360 px: no horizontal scrolling.
    await page.setViewportSize({ width: 360, height: 800 });
    await expect(owedToMe).toBeVisible();
    const horizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(horizontalOverflow).toBeLessThanOrEqual(1);

    // Borrow opens the transaction form on the Receive tab.
    await page.getByTestId('loans-borrow').click();
    await expect(page).toHaveURL(/\/transactions\/new\?tab=receive$/);
    await expect(page.getByTestId('tab-receipt')).toHaveAttribute('aria-selected', 'true');
  });

  test('TEST-10.10 (AC-10.10): the user lends from the Lend group and borrows from the Borrow group, and the Loans page and Dashboard follow without a reload', async ({
    page,
  }) => {
    await loginAsAlice(page);
    await createAccount(page, 'Loan to Bob', 'LOAN_GIVEN');
    await createAccount(page, 'Loan from Mom', 'LOAN_TAKEN', 'OTHER');

    await page.goto('/transactions/new');
    // Marks this page load: it survives client-side navigation and is lost on a reload.
    await page.evaluate(() => ((window as unknown as { __noReload: boolean }).__noReload = true));

    // A Credit Card source offers Expense targets only (Q-1).
    await page.getByTestId('payment-source').selectOption({ label: 'Credit Card' });
    expect(await targetGroups(page, 'line-target-0')).toEqual(['Expenses']);

    // Lend: Payment tab, Bank Account → Loan to Bob from the Lend group.
    await page.getByTestId('payment-source').selectOption({ label: 'Bank Account' });
    // F-11 adds the Transfer to group after Lend (f-10 §2.2, f-11 §2.2).
    expect(await targetGroups(page, 'line-target-0')).toEqual(['Expenses', 'Loan repayment', 'Lend', 'Transfer to']);
    await expect(page.getByTestId('line-target-0').locator('optgroup[label="Lend"] option', { hasText: 'Loan to Bob' })).toHaveCount(1);
    await page.getByTestId('payment-total').fill('2,000.00');
    await page.getByTestId('line-target-0').selectOption({ label: 'Loan to Bob' });
    await page.getByTestId('line-amount-0').fill('2000');
    await page.getByTestId('payment-submit').click();
    await expect(page).toHaveURL(/^http:\/\/localhost:3000\/?$/);

    // Borrow: Receive tab, Wallet ← Loan from Mom from the Borrow group.
    await page.getByTestId('record-payment-link').click();
    await page.getByTestId('tab-receipt').click();
    await page.getByTestId('receipt-source').selectOption({ label: 'Wallet' });
    // F-11 adds the Transfer from group after Borrow (f-10 §2.2, f-11 §2.2).
    expect(await targetGroups(page, 'line-target-0')).toEqual(['Income', 'Repayment received', 'Borrow', 'Transfer from']);
    await expect(page.getByTestId('line-target-0').locator('optgroup[label="Borrow"] option', { hasText: 'Loan from Mom' })).toHaveCount(1);
    await page.getByTestId('receipt-total').fill('5,000.00');
    await page.getByTestId('line-target-0').selectOption({ label: 'Loan from Mom' });
    await page.getByTestId('line-amount-0').fill('5000');
    await page.getByTestId('receipt-submit').click();
    await expect(page).toHaveURL(/^http:\/\/localhost:3000\/?$/);

    await expect(page.getByTestId('dashboard-section-cash').getByTestId('account-balance-Wallet')).toHaveText('5,000.00 ฿');
    await page.getByTestId('nav-loans').click();
    await expect(page.getByTestId('loans-balance-Loan to Bob')).toHaveText('2,000.00 ฿');
    await expect(page.getByTestId('loans-balance-Loan from Mom')).toHaveText('5,000.00 ฿');
    expect(await page.evaluate(() => (window as unknown as { __noReload?: boolean }).__noReload)).toBe(true);
  });
});
