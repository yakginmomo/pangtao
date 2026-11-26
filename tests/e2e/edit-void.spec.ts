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

/**
 * f-13 §4 starting state through the API as the logged-in Alice: Bank opening 50,000.00 THB;
 * salary 30,000.00; card charge 1,200.00 (Dining 700.00, Groceries 500.00); repayment 800.00.
 */
async function startingState(page: Page) {
  const accounts = await prisma.account.findMany({ where: { userId: await aliceUserId() }, select: { id: true, name: true } });
  const id = Object.fromEntries(accounts.map((a) => [a.name, a.id]));
  const today = bangkokToday();
  const post = async (url: string, data: object) => {
    const res = await page.request.post(url, { headers: { Origin: ORIGIN }, data });
    expect(res.status(), await res.text()).toBe(201);
    return (await res.json()).transaction.id as string;
  };
  const opening = await post(`/api/v1/accounts/${id['Bank Account']}/opening-balance`, { amount: 5_000_000, date: `${today.slice(0, 8)}01` });
  const pay = (kind: string, accountId: string, totalAmount: number, lines: object[]) =>
    post('/api/v1/transactions', { kind, accountId, txnDate: today, totalAmount, lines });
  await pay('RECEIPT', id['Bank Account'], 3_000_000, [{ targetAccountId: id['Salary'], amount: 3_000_000 }]);
  const charge = await pay('PAYMENT', id['Credit Card'], 120_000, [
    { targetAccountId: id['Dining'], amount: 70_000 },
    { targetAccountId: id['Groceries'], amount: 50_000 },
  ]);
  const repayment = await pay('PAYMENT', id['Bank Account'], 80_000, [{ targetAccountId: id['Credit Card'], amount: 80_000 }]);
  return { opening, charge, repayment };
}

async function expectNoHorizontalOverflow(page: Page): Promise<void> {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
}

test.describe('F-13 Edit and void transactions (STS)', () => {
  test.beforeEach(async () => {
    await resetAlice();
  });

  test.afterAll(async () => {
    await resetAlice();
    await prisma.$disconnect();
  });

  test('TEST-13.10 (AC-13.10): the user edits the card charge and voids the repayment; detail, history and the Dashboard update without a reload, and the edit form fits 360 px', async ({
    page,
  }) => {
    await loginAsAlice(page);
    const { charge, repayment } = await startingState(page);
    // A marker on window survives client-side navigation but not a page reload.
    await page.goto(`/transactions/${charge}`);
    await page.evaluate(() => ((window as unknown as { __noReload: boolean }).__noReload = true));

    // Edit: pre-filled Payment form, kind tabs disabled.
    await page.getByTestId('transaction-edit').click();
    await expect(page).toHaveURL(new RegExp(`/transactions/${charge}/edit$`));
    await expect(page.getByTestId('payment-total')).toHaveValue('1200.00');
    await expect(page.getByTestId('line-amount-0')).toHaveValue('700.00');
    await expect(page.getByTestId('tab-receipt')).toBeDisabled();
    // Nothing changed yet: Save stays disabled.
    await expect(page.getByTestId('payment-submit')).toBeDisabled();

    // Live allocation: Dining 900.00 of 1,200.00 leaves −200.00, so Save stays disabled.
    await page.getByTestId('line-amount-0').fill('900.00');
    await expect(page.getByTestId('summary-remaining')).toHaveText('-200.00 ฿');
    await expect(page.getByTestId('payment-submit')).toBeDisabled();
    await page.getByTestId('payment-total').fill('1400.00');
    await expect(page.getByTestId('payment-submit')).toBeEnabled();
    await page.getByTestId('payment-submit').click();

    await expect(page).toHaveURL(new RegExp(`/transactions/${charge}$`));
    await expect(page.getByTestId('detail-line').filter({ hasText: 'Dining' })).toContainText('900.00 ฿');
    await expect(page.getByTestId('transaction-edited')).toContainText('Edited');

    // Void the repayment after confirming.
    await page.goto(`/transactions/${repayment}`);
    await page.evaluate(() => ((window as unknown as { __noReload: boolean }).__noReload = true));
    await page.getByTestId('transaction-void').click();
    const dialog = page.getByTestId('void-dialog');
    await expect(dialog).toContainText('Void this Payment of 800.00 ฿ on');
    await expect(dialog).toContainText('It will stay in history but no longer count in balances or summaries. This cannot be undone.');
    await page.getByTestId('void-confirm').click();
    await expect(page.getByTestId('transaction-voided-badge')).toHaveText('Voided');
    await expect(page.getByTestId('transaction-voided-on')).toContainText('Voided on');
    await expect(page.getByTestId('transaction-edit')).toHaveCount(0);
    await expect(page.getByTestId('transaction-void')).toHaveCount(0);

    // History: the voided row keeps its place with a badge and a struck-through total.
    await page.getByTestId('nav-history').click();
    await expect(page).toHaveURL(/\/transactions$/);
    const voidedRow = page.getByTestId('history-row').filter({ has: page.getByTestId('history-voided') });
    await expect(voidedRow).toHaveCount(1);
    await expect(voidedRow.getByTestId('history-voided')).toHaveText('Voided');
    const total = voidedRow.getByTestId('history-total');
    await expect(total).toContainText('800.00 ฿');
    await expect(total).toHaveCSS('text-decoration-line', 'line-through');

    // Dashboard: Bank 80,000.00 and Credit Card 1,400.00, through client-side navigation only.
    await page.getByTestId('nav-dashboard').click();
    await expect(page.getByTestId('account-row-Bank Account')).toContainText('80,000.00 ฿');
    await expect(page.getByTestId('account-row-Credit Card')).toContainText('1,400.00 ฿');
    expect(await page.evaluate(() => (window as unknown as { __noReload?: boolean }).__noReload)).toBe(true);

    // The edit form at 360 px.
    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto(`/transactions/${charge}/edit`);
    await expect(page.getByTestId('payment-submit')).toBeVisible();
    await expect(page.getByTestId('line-amount-0')).toBeInViewport();
    await expectNoHorizontalOverflow(page);
  });

  test('f-13 §2.2: Cancel on the edit page and in the void dialog changes nothing', async ({ page }) => {
    await loginAsAlice(page);
    const { charge, repayment } = await startingState(page);

    await page.goto(`/transactions/${charge}/edit`);
    await page.getByTestId('line-amount-0').fill('900.00');
    await page.getByTestId('edit-cancel').click();
    await expect(page).toHaveURL(new RegExp(`/transactions/${charge}$`));
    await expect(page.getByTestId('detail-line').filter({ hasText: 'Dining' })).toContainText('700.00 ฿');
    await expect(page.getByTestId('transaction-edited')).toHaveCount(0);

    await page.goto(`/transactions/${repayment}`);
    await page.getByTestId('transaction-void').click();
    await page.getByTestId('void-cancel').click();
    await expect(page.getByTestId('void-dialog')).toHaveCount(0);
    await expect(page.getByTestId('transaction-voided-badge')).toHaveCount(0);
    const row = await prisma.transaction.findUniqueOrThrow({ where: { id: repayment }, select: { voidedAt: true } });
    expect(row.voidedAt).toBeNull();
  });

  test('f-13 §2.2: an opening balance has no actions and points to the Dashboard; a voided transaction cannot be edited', async ({ page }) => {
    await loginAsAlice(page);
    const { opening, repayment } = await startingState(page);

    await page.goto(`/transactions/${opening}`);
    await expect(page.getByTestId('transaction-opening-note')).toHaveText('Change it from the Dashboard');
    await expect(page.getByTestId('transaction-edit')).toHaveCount(0);
    await expect(page.getByTestId('transaction-void')).toHaveCount(0);

    const voided = await page.request.post(`/api/v1/transactions/${repayment}/void`, { headers: { Origin: ORIGIN } });
    expect(voided.status()).toBe(200);
    await page.goto(`/transactions/${repayment}/edit`);
    await expect(page.getByTestId('edit-not-editable')).toContainText('This transaction has already been voided.');
    await expect(page.getByTestId('payment-submit')).toHaveCount(0);
  });

  test('f-13 §2.2: a void that loses the race shows the 409 message and reloads the transaction as voided', async ({ page }) => {
    await loginAsAlice(page);
    const { repayment } = await startingState(page);

    await page.goto(`/transactions/${repayment}`);
    await page.getByTestId('transaction-void').click();
    // Voided elsewhere while the dialog is open.
    const elsewhere = await page.request.post(`/api/v1/transactions/${repayment}/void`, { headers: { Origin: ORIGIN } });
    expect(elsewhere.status()).toBe(200);
    await page.getByTestId('void-confirm').click();

    await expect(page.getByText('This transaction has already been voided.')).toBeVisible();
    await expect(page.getByTestId('transaction-voided-badge')).toHaveText('Voided');
  });

  test('f-13 §2.2: the detail page and the void dialog fit 360 px', async ({ page }) => {
    await loginAsAlice(page);
    const { repayment } = await startingState(page);
    await page.setViewportSize({ width: 360, height: 800 });

    await page.goto(`/transactions/${repayment}`);
    await expect(page.getByTestId('transaction-void')).toBeInViewport();
    await expectNoHorizontalOverflow(page);
    await page.getByTestId('transaction-void').click();
    await expect(page.getByTestId('void-confirm')).toBeInViewport();
    await expectNoHorizontalOverflow(page);
  });
});
