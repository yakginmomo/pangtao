import { test, expect, Page } from '@playwright/test';
import { PrismaClient } from '@prisma/client';
import { bangkokToday } from '../../web/src/utils/date';

// AC-01.10: the seed password comes from the local .env, never from source.
const SEED_PASSWORD = process.env.SEED_DEFAULT_PASSWORD;
if (!SEED_PASSWORD) {
  throw new Error('SEED_DEFAULT_PASSWORD must be set in .env to run the E2E suite.');
}

const ORIGIN = 'http://localhost:3000';
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

/** The labels of each optgroup in a target select, in order. */
async function targetGroups(page: Page, testId: string): Promise<string[]> {
  return page.getByTestId(testId).locator('optgroup').evaluateAll((groups) => groups.map((g) => (g as HTMLOptGroupElement).label));
}

test.describe('F-11 Transfers (STS)', () => {
  test.beforeEach(async () => {
    await resetAlice();
  });

  test.afterAll(async () => {
    await resetAlice();
    await prisma.$disconnect();
  });

  test('TEST-11.8 (AC-11.8): the user transfers out from the Transfer to group and in from the Transfer from group, the source is never its own target, and the Dashboard shows both balances', async ({
    page,
  }) => {
    await loginAsAlice(page);
    const bank = await prisma.account.findFirstOrThrow({ where: { userId: await aliceUserId(), name: 'Bank Account' }, select: { id: true } });
    const opening = await page.request.post(`/api/v1/accounts/${bank.id}/opening-balance`, {
      headers: { Origin: ORIGIN },
      data: { amount: 5_000_000, date: `${bangkokToday().slice(0, 8)}01` }, // 50,000.00 THB on the 1st of this month
    });
    expect(opening.status()).toBe(201);

    // Transfer out: Payment tab, Bank Account → Wallet from the Transfer to group.
    await page.goto('/transactions/new');
    const paymentSource = page.getByTestId('payment-source');
    const target = page.getByTestId('line-target-0');
    await paymentSource.selectOption({ label: 'Bank Account' });
    expect(await targetGroups(page, 'line-target-0')).toEqual(['Expenses', 'Loan repayment', 'Transfer to']);
    await expect(target.locator('optgroup[label="Transfer to"] option')).toHaveText(['Wallet']); // never Bank Account itself

    // f-11 §2.2: choosing the line's target as the new source clears that line and says why.
    await target.selectOption({ label: 'Wallet' });
    await paymentSource.selectOption({ label: 'Wallet' });
    await expect(target).toHaveValue('');
    await expect(page.getByTestId('line-target-0-error')).toHaveText('Choose another account for this line.');
    await expect(target.locator('optgroup[label="Transfer to"] option')).toHaveText(['Bank Account']);
    await page.getByTestId('payment-total').fill('1,000.00');
    await page.getByTestId('line-amount-0').fill('1000');
    await expect(page.getByTestId('payment-submit')).toBeDisabled(); // no target chosen yet

    await paymentSource.selectOption({ label: 'Bank Account' });
    await target.selectOption({ label: 'Wallet' });
    await expect(page.getByTestId('line-target-0-error')).toHaveCount(0);
    await page.getByTestId('payment-submit').click();
    await expect(page).toHaveURL(/^http:\/\/localhost:3000\/?$/);

    // Transfer in (f-11 1.1): Receive tab, into Bank Account from the Wallet, chosen in the Transfer from group.
    await page.getByTestId('record-payment-link').click();
    await page.getByTestId('tab-receipt').click();
    await page.getByTestId('receipt-source').selectOption({ label: 'Bank Account' });
    expect(await targetGroups(page, 'line-target-0')).toEqual(['Income', 'Borrow', 'Transfer from']);
    await expect(target.locator('optgroup[label="Transfer from"] option')).toHaveText(['Wallet']); // never Bank Account itself
    await page.getByTestId('receipt-total').fill('200.00');
    await target.selectOption({ label: 'Wallet' });
    await page.getByTestId('line-amount-0').fill('200');
    await page.getByTestId('receipt-submit').click();
    await expect(page).toHaveURL(/^http:\/\/localhost:3000\/?$/);

    const cash = page.getByTestId('dashboard-section-cash');
    await expect(cash.getByTestId('account-balance-Bank Account')).toHaveText('49,200.00 ฿');
    await expect(cash.getByTestId('account-balance-Wallet')).toHaveText('800.00 ฿');

    // The two transfers are a Payment and a Receipt with Cash targets: no new kind (S2-D3).
    const stored = await prisma.transaction.findMany({
      where: { userId: await aliceUserId(), kind: { in: ['PAYMENT', 'RECEIPT'] } },
      select: { kind: true, totalAmount: true },
      orderBy: { createdAt: 'asc' },
    });
    expect(stored.map((t) => [t.kind, t.totalAmount])).toEqual([
      ['PAYMENT', 100_000n],
      ['RECEIPT', 20_000n],
    ]);
  });
});
