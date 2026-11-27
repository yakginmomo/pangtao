# Evidence: v0.3.0 post-deploy checks

Screenshots for [release-v0.3.0.md](../../release-v0.3.0.md) §2.2–§2.3, taken by Supichaya on 27 Nov 2026 on the public URL (`pangtao-837912025702.asia-southeast1.run.app`, revision `pangtao-00012-29s`). Seeded synthetic users only; no passwords or cookies are visible.

| File | Check | Shows |
|---|---|---|
| `01-pd3-history-salary-favorite.png` | PD3-5 | Alice's History, 10 transactions; star filled on the 30,000.00 Salary receipt only; voided rows have no star button |
| `02-pd3-duplicate-form.png` | PD3-6 | Duplicate form, `duplicateOf=ce6627fb…`: "Copied from Receipt of 30,000.00 ฿ on 27 Nov 2026", Bank Account, 11/27/2026, Salary 30,000.00, fully allocated |
| `03-pd3-history-after-duplicate.png` | PD3-7 | History after Save: new 30,000.00 Receipt at the top without a star; original still starred |
| `04-pd3-voided-favorite-409.png` | PD3-8 | Console in Alice's session: `favorite voided 409 TRANSACTION_VOIDED` on `b58f4921…` |
| `05-pd3-bob-placeholder-400.png` | PD3-9 (deviation) | Incognito as Bob: snippet sent with the placeholder id, 400 (§2.3 item 2) |
| `06-pd3-bob-404.png` | PD3-9 | Incognito as Bob (`running as bob@example.test`): `PATCH …/ce6627fb…/favorite` 404 |
