// Part A continuity check: the original Sprint 1 critical domain journey over the real HTTP API
// and the real PostgreSQL database.
//
// Preconditions: the candidate is running on http://localhost:8080 (npm run dev:server), the
// database is migrated and seeded, and the two synthetic user ledgers have been reset to the
// starting state in evidence/part-a/README.md. PANGTAO_PASS holds SEED_DEFAULT_PASSWORD.
//
// Usage: node continuity-journey.mjs

const BASE = process.env.PANGTAO_BASE ?? 'http://localhost:8080';
const PASSWORD = process.env.PANGTAO_PASS;

if (!PASSWORD) throw new Error('PANGTAO_PASS not set');

const results = [];
function record(id, expected, actual, extra = {}) {
  const pass = actual.status === expected;
  results.push({ id, expected, actual: actual.status, code: actual.body?.error?.code ?? null, pass, ...extra });
  return pass;
}

function cookieFrom(res) {
  const raw = res.headers.getSetCookie?.() ?? [];
  for (const c of raw) {
    const m = /^sid=([^;]*)/.exec(c);
    if (m) return m[1];
  }
  return '';
}

async function call(method, path, { body, sid } = {}) {
  const headers = { Origin: BASE };
  if (body) headers['Content-Type'] = 'application/json';
  if (sid) headers.Cookie = `sid=${sid}`;
  const res = await fetch(BASE + path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = text;
  }
  return { status: res.status, body: json, sid: cookieFrom(res) };
}

async function login(email) {
  const r = await call('POST', '/api/v1/auth/login', { body: { email, password: PASSWORD } });
  if (r.status !== 200 || !r.sid) throw new Error(`login ${email} failed: ${r.status} ${JSON.stringify(r.body)}`);
  return r.sid;
}

async function accounts(sid) {
  const r = await call('GET', '/api/v1/accounts', { sid });
  if (r.status !== 200) throw new Error(`accounts failed: ${r.status}`);
  return Object.fromEntries(r.body.items.map((a) => [a.name, a]));
}

const today = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Bangkok',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
}).format(new Date());
const dayOffset = (n) => {
  const d = new Date(Date.now() + n * 86_400_000);
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
};

const aliceSid = await login('alice@example.test');
let a = await accounts(aliceSid);

// 1. Opening balance 50,000.00 on Bank Account.
record(
  'A1 opening balance Bank 5,000,000 satang',
  201,
  await call('POST', `/api/v1/accounts/${a['Bank Account'].id}/opening-balance`, {
    sid: aliceSid,
    body: { amount: 5_000_000, date: today },
  })
);

// 2. Receive 30,000.00 salary into Bank Account.
record(
  'A2 receipt Bank 3,000,000 satang -> Salary',
  201,
  await call('POST', '/api/v1/transactions', {
    sid: aliceSid,
    body: {
      kind: 'RECEIPT',
      accountId: a['Bank Account'].id,
      totalAmount: 3_000_000,
      txnDate: today,
      memo: 'Sprint 1 continuity salary',
      lines: [{ targetAccountId: a['Salary'].id, amount: 3_000_000 }],
    },
  })
);

// 3. Charge 1,200.00 on the Credit Card, split over two expenses.
record(
  'A3 card charge 120,000 satang (Dining 70,000 + Groceries 50,000)',
  201,
  await call('POST', '/api/v1/transactions', {
    sid: aliceSid,
    body: {
      kind: 'PAYMENT',
      accountId: a['Credit Card'].id,
      totalAmount: 120_000,
      txnDate: today,
      memo: 'Sprint 1 continuity card charge',
      lines: [
        { targetAccountId: a['Dining'].id, amount: 70_000, note: 'Team dinner' },
        { targetAccountId: a['Groceries'].id, amount: 50_000 },
      ],
    },
  })
);

// 4. Repay 800.00 from Bank Account to the Credit Card.
record(
  'A4 card repayment Bank 80,000 satang -> Credit Card',
  201,
  await call('POST', '/api/v1/transactions', {
    sid: aliceSid,
    body: {
      kind: 'PAYMENT',
      accountId: a['Bank Account'].id,
      totalAmount: 80_000,
      txnDate: today,
      memo: 'Sprint 1 continuity repayment',
      lines: [{ targetAccountId: a['Credit Card'].id, amount: 80_000 }],
    },
  })
);

a = await accounts(aliceSid);
const balances = Object.fromEntries(Object.entries(a).map(([k, v]) => [k, v.balance]));
results.push({ id: 'A5 balances after journey (satang)', expected: { Bank: 7_920_000, Card: 40_000 }, actual: { Bank: balances['Bank Account'], Card: balances['Credit Card'] }, pass: balances['Bank Account'] === 7_920_000 && balances['Credit Card'] === 40_000 });

const summary = await call('GET', `/api/v1/summary/income-expense?from=${today}&to=${today}`, { sid: aliceSid });
results.push({ id: 'A6 month summary (satang)', expected: { income: 3_000_000, expense: 120_000, net: 2_880_000 }, actual: { income: summary.body?.income, expense: summary.body?.expense, net: summary.body?.net }, pass: summary.body?.income === 3_000_000 && summary.body?.expense === 120_000 && summary.body?.net === 2_880_000 });

const history = await call('GET', '/api/v1/transactions?limit=10&offset=0', { sid: aliceSid });
results.push({ id: 'A7 history rows', expected: 4, actual: history.body?.items?.length, pass: history.body?.items?.length === 4 });

// 5. Rule rejection: lines summing below the total must save nothing (BR-05 / AC-05.4).
const before = (await call('GET', '/api/v1/transactions?limit=50&offset=0', { sid: aliceSid })).body.total;
const rejected = await call('POST', '/api/v1/transactions', {
  sid: aliceSid,
  body: {
    kind: 'PAYMENT',
    accountId: a['Bank Account'].id,
    totalAmount: 100_000,
    txnDate: today,
    memo: 'should be rejected',
    lines: [{ targetAccountId: a['Dining'].id, amount: 60_000 }],
  },
});
record('A8 under-allocated payment rejected', 400, rejected);
const after = (await call('GET', '/api/v1/transactions?limit=50&offset=0', { sid: aliceSid })).body.total;
results.push({ id: 'A9 nothing saved after rejection', expected: before, actual: after, pass: before === after });

record('A10 future date rejected', 400, await call('POST', '/api/v1/transactions', {
  sid: aliceSid,
  body: {
    kind: 'PAYMENT',
    accountId: a['Bank Account'].id,
    totalAmount: 1_000,
    txnDate: dayOffset(1),
    lines: [{ targetAccountId: a['Dining'].id, amount: 1_000 }],
  },
}));

record('A11 T-91 rejected (BR-10 v2.0)', 400, await call('POST', '/api/v1/transactions', {
  sid: aliceSid,
  body: {
    kind: 'PAYMENT',
    accountId: a['Bank Account'].id,
    totalAmount: 1_000,
    txnDate: dayOffset(-91),
    lines: [{ targetAccountId: a['Dining'].id, amount: 1_000 }],
  },
}));

// 6. Access restrictions: ownership and role.
const bobSid = await login('bob@example.test');
const aliceTxnId = history.body.items[0].id;
record('A12 Bob reading Alice transaction', 404, await call('GET', `/api/v1/transactions/${aliceTxnId}`, { sid: bobSid }));

const adminSid = await login('admin@example.test');
record('A13 Admin reading accounts', 403, await call('GET', '/api/v1/accounts', { sid: adminSid }));

record('A14 anonymous history', 401, await call('GET', '/api/v1/transactions'));

// 7. Persistence across a new session.
const aliceSid2 = await login('alice@example.test');
const detail = await call('GET', `/api/v1/transactions/${aliceTxnId}`, { sid: aliceSid2 });
results.push({ id: 'A15 detail after re-login', expected: aliceTxnId, actual: detail.body?.transaction?.id ?? null, pass: detail.status === 200 && detail.body?.transaction?.id === aliceTxnId });

console.log(JSON.stringify({ today, results }, null, 2));
if (results.some((r) => !r.pass)) process.exitCode = 1;
