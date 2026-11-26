// Part A persistence check: after the continuity journey, stop and start the server, then read
// the saved transaction and the derived balances through a new session.
//
// Usage: node persistence-read.mjs <transaction-id>

const BASE = process.env.PANGTAO_BASE ?? 'http://localhost:8080';
const PASSWORD = process.env.PANGTAO_PASS;
const id = process.argv[2];
if (!PASSWORD || !id) throw new Error('usage: node persistence-read.mjs <transaction-id>');

const login = await fetch(BASE + '/api/v1/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Origin: BASE },
  body: JSON.stringify({ email: 'alice@example.test', password: PASSWORD }),
});
const setCookie = login.headers.getSetCookie?.() ?? [];
const sid = /^sid=([^;]*)/.exec(setCookie.find((c) => c.startsWith('sid=')) ?? '')?.[1];
const headers = { Origin: BASE, Cookie: `sid=${sid}` };
const detail = await fetch(`${BASE}/api/v1/transactions/${id}`, { headers });
const accounts = await fetch(`${BASE}/api/v1/accounts`, { headers });
const body = await detail.json();
const acc = await accounts.json();
console.log(
  JSON.stringify(
    {
      loginStatus: login.status,
      detailStatus: detail.status,
      transaction: {
        id: body.transaction?.id,
        kind: body.transaction?.kind,
        totalAmount: body.transaction?.totalAmount,
        memo: body.transaction?.memo,
        lines: body.transaction?.lines?.length,
      },
      balances: Object.fromEntries((acc.items ?? []).map((a) => [a.name, a.balance])),
    },
    null,
    2
  )
);
