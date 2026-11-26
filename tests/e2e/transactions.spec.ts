import { test, expect, Page } from '@playwright/test';
import { PrismaClient } from '@prisma/client';
import { bangkokToday, oldestAllowedDate } from '../../web/src/utils/date';

// AC-01.10: the seed password comes from the local .env, never from source.
const SEED_PASSWORD = process.env.SEED_DEFAULT_PASSWORD;
if (!SEED_PASSWORD) {
  throw new Error('SEED_DEFAULT_PASSWORD must be set in .env to run the E2E suite.');
}

// Voiding arrives in Sprint 2 (F-13), so fixture rows are removed directly. Lines cascade.
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

/** Alice's ledger back to the seeded state: no transactions at all. */
async function clearAliceLedger(): Promise<void> {
  await prisma.transaction.deleteMany({ where: { userId: await aliceUserId() } });
}

test.describe('F-05 Payment and Charge (STS)', () => {
  test.beforeEach(async () => {
    await clearAliceLedger();
  });

  test.afterAll(async () => {
    await clearAliceLedger();
    await prisma.$disconnect();
  });

  test('TEST-05.9 (AC-05.9): a multi-line card charge shows live allocation, submits, and raises the card debt', async ({
    page,
  }) => {
    await loginAsAlice(page);
    await page.getByTestId('record-payment-link').click();
    await expect(page).toHaveURL(/\/transactions\/new$/);
    await expect(page.getByTestId('tab-payment')).toHaveAttribute('aria-selected', 'true');

    // The source list offers Cash and Loan Taken accounts only (f-05 §2.2).
    const source = page.getByTestId('payment-source');
    await expect(source.locator('option', { hasText: 'Credit Card' })).toHaveCount(1);
    await expect(source.locator('option', { hasText: 'Salary' })).toHaveCount(0);
    await expect(source.locator('option', { hasText: 'Dining' })).toHaveCount(0);
    await source.selectOption({ label: 'Credit Card' });

    // A card charge may only target Expense accounts in Sprint 1 (BR-06).
    const firstTarget = page.getByTestId('line-target-0');
    await expect(firstTarget.locator('option', { hasText: 'Bank Account' })).toHaveCount(0);
    await expect(firstTarget.locator('option', { hasText: 'Credit Card' })).toHaveCount(0);

    await page.getByTestId('payment-total').fill('1,200.00');
    await expect(page.getByTestId('summary-total')).toHaveText('1,200.00 ฿');
    await expect(page.getByTestId('summary-remaining')).toHaveText('1,200.00 ฿');
    const submit = page.getByTestId('payment-submit');
    await expect(submit).toBeDisabled();

    await firstTarget.selectOption({ label: 'Dining' });
    await page.getByTestId('line-amount-0').fill('700');
    await expect(page.getByTestId('summary-allocated')).toHaveText('700.00 ฿');
    await expect(page.getByTestId('summary-remaining')).toHaveText('500.00 ฿');
    await expect(submit).toBeDisabled();

    await page.getByTestId('add-line').click();
    await page.getByTestId('line-target-1').selectOption({ label: 'Groceries' });
    await page.getByTestId('line-amount-1').fill('500');
    await expect(page.getByTestId('summary-allocated')).toHaveText('1,200.00 ฿');
    await expect(page.getByTestId('summary-remaining')).toHaveText('0.00 ฿');
    await expect(submit).toBeEnabled();

    await submit.click();

    // f-05 1.2: redirect to the Dashboard, where the card debt reflects the charge.
    await expect(page).toHaveURL(/^http:\/\/localhost:3000\/?$/);
    await expect(
      page.getByTestId('dashboard-section-debts').getByTestId('account-balance-Credit Card')
    ).toHaveText('1,200.00 ฿');

    // One PAYMENT with two allocation lines is stored for Alice.
    const stored = await prisma.transaction.findMany({
      where: { userId: await aliceUserId(), kind: 'PAYMENT' },
      include: { lines: { orderBy: { lineNo: 'asc' }, include: { targetAccount: { select: { name: true } } } } },
    });
    expect(stored).toHaveLength(1);
    expect(stored[0].totalAmount).toBe(120_000n); // 1,200.00 THB
    expect(stored[0].lines.map((l) => [l.targetAccount.name, l.amount])).toEqual([
      ['Dining', 70_000n], // 700.00 THB
      ['Groceries', 50_000n], // 500.00 THB
    ]);
  });

  test('the form shows over-allocation, removes lines, and fits a 360 px viewport (f-05 §2.2, NFR-08)', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await loginAsAlice(page);
    await page.goto('/transactions/new');

    await page.getByTestId('payment-source').selectOption({ label: 'Wallet' });
    await page.getByTestId('payment-total').fill('100');
    await page.getByTestId('line-target-0').selectOption({ label: 'Dining' });
    await page.getByTestId('line-amount-0').fill('80');
    await page.getByTestId('add-line').click();
    await page.getByTestId('line-target-1').selectOption({ label: 'Groceries' });
    await page.getByTestId('line-amount-1').fill('50');

    await expect(page.getByTestId('summary-remaining')).toHaveText('-30.00 ฿');
    await expect(page.getByTestId('summary-status')).toHaveText('Over-allocated');
    await expect(page.getByTestId('payment-submit')).toBeDisabled();

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth
    );
    expect(overflow).toBeLessThanOrEqual(1);

    await page.getByTestId('remove-line-1').click();
    await expect(page.getByTestId('line-1')).toHaveCount(0);
    await expect(page.getByTestId('summary-remaining')).toHaveText('20.00 ฿');
    await expect(page.getByTestId('payment-submit')).toBeDisabled();
  });

  test('TEST-05.15 (AC-05.15): the date picker starts at today − 90, and an older typed date shows a field error and sends nothing', async ({
    page,
  }) => {
    const daysAgo = (n: number) => bangkokToday(new Date(Date.now() - n * 86_400_000));
    const posts: string[] = [];
    page.on('request', (req) => {
      if (req.method() === 'POST' && req.url().includes('/api/v1/transactions')) posts.push(req.url());
    });

    await loginAsAlice(page);
    await page.goto('/transactions/new');

    // A complete, balanced payment, so the date is the only thing that can stop the submit.
    await page.getByTestId('payment-source').selectOption({ label: 'Wallet' });
    await page.getByTestId('payment-total').fill('100');
    await page.getByTestId('line-target-0').selectOption({ label: 'Dining' });
    await page.getByTestId('line-amount-0').fill('100');
    const submit = page.getByTestId('payment-submit');
    await expect(submit).toBeEnabled();

    const date = page.getByTestId('payment-date');
    await expect(date).toHaveAttribute('min', daysAgo(90));
    await expect(date).toHaveAttribute('max', bangkokToday());

    // T−91 typed: field error, no request, still on the form.
    await date.fill(daysAgo(91));
    await submit.click();
    await expect(page.getByTestId('payment-date-error')).toHaveText('Date cannot be more than 90 days ago.');
    await expect(page).toHaveURL(/\/transactions\/new$/);
    expect(posts).toHaveLength(0);

    // T−90: the error clears and the payment is saved with that date.
    await date.fill(daysAgo(90));
    await expect(page.getByTestId('payment-date-error')).toHaveCount(0);
    await submit.click();
    await expect(page).toHaveURL(/^http:\/\/localhost:3000\/?$/);
    expect(posts).toHaveLength(1);

    const stored = await prisma.transaction.findMany({
      where: { userId: await aliceUserId(), kind: 'PAYMENT' },
      select: { txnDate: true, totalAmount: true },
    });
    expect(stored.map((t) => [t.txnDate.toISOString().slice(0, 10), t.totalAmount])).toEqual([
      [daysAgo(90), 10_000n], // 100.00 THB
    ]);
  });

  test('L7-01 (AC-05.15): a form left open across Bangkok midnight moves its date window and default date to the new day without any input', async ({
    page,
  }) => {
    // The browser clock starts 10 s before Bangkok midnight on today's Bangkok date.
    const day = bangkokToday();
    const beforeMidnight = new Date(`${day}T23:59:50+07:00`);
    const afterMidnight = new Date(beforeMidnight.getTime() + 20_000); // 00:00:10 the next day
    const nextDay = bangkokToday(afterMidnight);
    await page.clock.install({ time: beforeMidnight });

    await loginAsAlice(page);
    await page.goto('/transactions/new');

    const date = page.getByTestId('payment-date');
    await expect(date).toHaveAttribute('max', day);
    await expect(date).toHaveAttribute('min', oldestAllowedDate(beforeMidnight));
    await expect(date).toHaveValue(day);

    // Midnight passes while the form is open and nobody touches it.
    await page.clock.runFor(20_000);

    await expect(date).toHaveAttribute('max', nextDay);
    await expect(date).toHaveAttribute('min', oldestAllowedDate(afterMidnight));
    // The untouched default follows today, so a save after midnight is not silently dated yesterday.
    await expect(date).toHaveValue(nextDay);

    // A date the user typed is theirs: the next midnight moves the window but keeps the value.
    const typed = bangkokToday(new Date(afterMidnight.getTime() - 3 * 86_400_000));
    await date.fill(typed);
    await page.clock.fastForward('24:00:00');
    const dayAfter = bangkokToday(new Date(afterMidnight.getTime() + 86_400_000));
    await expect(date).toHaveAttribute('max', dayAfter);
    await expect(date).toHaveValue(typed);
  });
});

test.describe('F-06 Received Money (STS)', () => {
  test.beforeEach(async () => {
    await clearAliceLedger();
  });

  test.afterAll(async () => {
    await clearAliceLedger();
    await prisma.$disconnect();
  });

  test('TEST-06.8 (AC-06.8): a salary receipt shows live allocation, submits, and raises the Cash balance', async ({
    page,
  }) => {
    await loginAsAlice(page);
    await page.goto('/transactions/new');
    await page.getByTestId('tab-receipt').click();
    await expect(page.getByTestId('tab-receipt')).toHaveAttribute('aria-selected', 'true');

    // The source list offers Cash accounts only (f-06 §2.2).
    const source = page.getByTestId('receipt-source');
    await expect(source.locator('option', { hasText: 'Bank Account' })).toHaveCount(1);
    await expect(source.locator('option', { hasText: 'Wallet' })).toHaveCount(1);
    await expect(source.locator('option', { hasText: 'Credit Card' })).toHaveCount(0);
    await expect(source.locator('option', { hasText: 'Salary' })).toHaveCount(0);
    await source.selectOption({ label: 'Bank Account' });

    // A receipt may only target Income accounts in Sprint 1 (BR-06).
    const firstTarget = page.getByTestId('line-target-0');
    await expect(firstTarget.locator('option', { hasText: 'Salary' })).toHaveCount(1);
    await expect(firstTarget.locator('option', { hasText: 'Dining' })).toHaveCount(0);
    await expect(firstTarget.locator('option', { hasText: 'Bank Account' })).toHaveCount(0);

    await page.getByTestId('receipt-total').fill('30,000.00');
    await expect(page.getByTestId('summary-total')).toHaveText('30,000.00 ฿');
    await expect(page.getByTestId('summary-remaining')).toHaveText('30,000.00 ฿');
    const submit = page.getByTestId('receipt-submit');
    await expect(submit).toBeDisabled();

    await firstTarget.selectOption({ label: 'Salary' });
    await page.getByTestId('line-amount-0').fill('30000');
    await expect(page.getByTestId('summary-allocated')).toHaveText('30,000.00 ฿');
    await expect(page.getByTestId('summary-remaining')).toHaveText('0.00 ฿');
    await expect(submit).toBeEnabled();

    await submit.click();

    // f-06 1.2: redirect to the Dashboard, where the Cash balance reflects the receipt.
    await expect(page).toHaveURL(/^http:\/\/localhost:3000\/?$/);
    await expect(
      page.getByTestId('dashboard-section-cash').getByTestId('account-balance-Bank Account')
    ).toHaveText('30,000.00 ฿');

    // One RECEIPT with one allocation line is stored for Alice.
    const stored = await prisma.transaction.findMany({
      where: { userId: await aliceUserId(), kind: 'RECEIPT' },
      include: { lines: { orderBy: { lineNo: 'asc' }, include: { targetAccount: { select: { name: true } } } } },
    });
    expect(stored).toHaveLength(1);
    expect(stored[0].totalAmount).toBe(3_000_000n); // 30,000.00 THB
    expect(stored[0].lines.map((l) => [l.targetAccount.name, l.amount])).toEqual([['Salary', 3_000_000n]]);
  });
});
