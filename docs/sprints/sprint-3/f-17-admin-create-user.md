# F-17 Administrator Creates a User: Engineering Contract

Requirements: FR-07; BR-02; NFR-01, NFR-02, NFR-04, NFR-08, NFR-10 · Depends on: F-02 · Issue: to open · Contract version: 1.0 (see [version history](README.md#8-contract-version-history)) · Suggested branch: `feature/F-17-admin-create-user`

Shared conventions and error codes are in [Sprint 1 README](../sprint-1/README.md) §2 and [Sprint 3 README](README.md) §2; the Sprint 3 Definition of Done is in [Sprint 3 README](README.md) §5.

---

## 1. Feature design

**Purpose.** Let the Administrator give a new person access to Pangtao without a database seed, since there is no self-registration (SRS §3).

**Workflow**

1. On Users (`/admin/users`) the Administrator clicks **Create user**.
2. A dialog asks for Email, Display name and Initial password (with a **Show** toggle). Inline validation runs as the Administrator types.
3. **Create** sends `POST /api/v1/admin/users`. On 201 the dialog closes, the list reloads and shows the new user as Active, and a message says "Carol was created. Give them the initial password yourself; Pangtao does not send it."
4. The new user logs in with the email and initial password and lands on an empty Dashboard, which points to Accounts (F-09) to create their first account.

**Rules and validation**

- **Body:** exactly `{ email, displayName, password }`; any other field, including `role` or `isActive`, is `400 VALIDATION_ERROR` (**Q-13**, S3-D5).
- **Email:** trimmed and lower-cased before validation and storage, as at login (`LoginSchema`); a valid email address of at most 254 characters.
- **Uniqueness:** an email that already exists after normalisation is `409 EMAIL_EXISTS`, and nothing is saved. The unique index on `users.email` is the last line of defence: a concurrent duplicate that passes the check is mapped from Prisma `P2002` to the same 409, never a 500.
- **Display name:** trimmed, 1 to 100 characters.
- **Initial password (Q-14):** 12 to 128 characters (the login limit is 128), not equal to the email ignoring case. It is not trimmed. It is hashed with bcrypt at `BCRYPT_COST` (12, NFR-01) before the insert; the plaintext is never stored, returned, logged or echoed in an error message or `details[].issue`.
- **New user:** `role = USER`, `is_active = true`. No sessions, accounts or transactions are created (**S3-D5**, BR-02): the Administrator never writes a financial record.
- **Q-15:** there is no forced password change at first login and no email is sent. Disclosed limitation.
- **One database transaction** for the check and the insert; a rejected request saves nothing.
- **Order of checks:** (1) role `ADMIN` (else 403; anonymous 401), Origin and Content-Type (403, 415); (2) body schema → 400; (3) email exists → 409; (4) insert → 201.
- Creating a user does not affect the Administrator's session or the BR-03 self-disable rule.

**Permissions:** Administrator only. A User receives 403, anonymous receives 401.

---

## 2. Specifications

### 2.1 API

| Endpoint | Request | Success | Errors |
|---|---|---|---|
| POST /api/v1/admin/users | `{ email, displayName, password }` | 201 `{ user: { id, email, displayName, role, isActive, createdAt } }` | 400 VALIDATION_ERROR; 401 UNAUTHENTICATED; 403 FORBIDDEN; 409 EMAIL_EXISTS; 415 UNSUPPORTED_MEDIA_TYPE |

- The response uses `USER_PROFILE_SELECT` (F-02), so the hash is never selected.
- `details[]` name the field (`email`, `displayName`, `password`) and the rule, never the value.
- The route uses `access('ADMIN')` and is added to the NFR-02 route list.

### 2.2 UI

- **Create user** button above the Users table; the dialog has labelled fields, field-level errors (invalid email, name required, "Password must be 12 to 128 characters", "Password must not be the email"), a Show/Hide toggle for the password, and Create and Cancel. Create is disabled while a field is invalid and while saving.
- A 409 shows "A user with this email already exists." under Email; other server errors map to their field or a banner in the dialog.
- After success the `admin users` query is invalidated and the new row appears; the password field is cleared from memory when the dialog closes.
- Usable at 360 px (the dialog fills the width). An API 401 redirects to `/login`.

### 2.3 Data

- No migration. Inserts one `users` row (`email` unique, lower-case; `password_hash`; `role` `USER`; `is_active` true).

---

## 3. Acceptance criteria

| AC | Observable outcome |
|---|---|
| AC-17.1 | The Administrator creates a user and receives 201 with the profile only (`role: USER`, `isActive: true`); the user appears in `GET /admin/users`; the stored `password_hash` is a bcrypt hash with cost ≥ 12 that verifies the initial password and does not equal it. |
| AC-17.2 | The new user logs in with the initial password, `GET /accounts` returns no accounts, and `GET /admin/users` returns 403 for them. |
| AC-17.3 | The email is stored trimmed and lower-cased; creating the same email in any letter case returns 409 EMAIL_EXISTS and saves nothing; two concurrent requests with the same new email give one 201 and one 409. |
| AC-17.4 | A missing or invalid email, an empty or 101-character display name, a password shorter than 12 or longer than 128 characters, a password equal to the email, or a body with `role` or another extra field returns 400 VALIDATION_ERROR naming the field, saves nothing, and never contains the password. |
| AC-17.5 | A User receives 403 FORBIDDEN and an anonymous caller 401 UNAUTHENTICATED; a request with a wrong Origin returns 403 and a non-JSON body 415; nothing is saved. |
| AC-17.6 | The password does not appear in any server log line written while handling a create, successful or rejected. |
| AC-17.7 | In the browser, the Administrator creates a user from the Users screen with inline validation and sees them in the list; the new user then logs in and sees the empty Dashboard; the dialog is usable at 360 px. |

---

## 4. Software test specification

Starting state: the seed (admin@example.test, alice@example.test, bob@example.test). The test password values are built in the test file and are not real credentials.

| Test | AC | Level | Precondition and input | Action | Expected result |
|---|---|---|---|---|---|
| **TEST-17.1** | AC-17.1 | A | Admin logged in | POST `{ email: "carol@example.test", displayName: "Carol", password: <14-character test value> }`; `GET /admin/users`; read the row with Prisma | 201 with exactly the six profile keys, `role: "USER"`, `isActive: true`; Carol in the list (`total` 4); `password_hash` starts with `$2` and has cost ≥ 12, `bcrypt.compare` with the value is true, and it is not equal to the value. |
| **TEST-17.2** | AC-17.2 | A | TEST-17.1 state | Log in as Carol; `GET /accounts`; `GET /admin/users` | Login 200 with role USER; `{ items: [] }`; 403 FORBIDDEN. |
| **TEST-17.3** | AC-17.3 | U, A | Admin logged in | POST with email `"  Carol@Example.TEST "`; POST `alice@example.test` and `ALICE@example.test`; two parallel POSTs with `dave@example.test` | First 201 with `email: "carol@example.test"`. Alice in both cases: 409 EMAIL_EXISTS, user count unchanged. Parallel: one 201 and one 409, one Dave row. U: the schema normalises the email. |
| **TEST-17.4** | AC-17.4 | U, A | Admin logged in | POST in turn: no email; `email: "carol"`; `displayName: "   "`; a 101-character name; an 11-character password; a 129-character password; password equal to `"Carol@example.test"` with email `carol@example.test`; extra `role: "ADMIN"`; extra `isActive: false` | Each 400 VALIDATION_ERROR with `details[0].field` `email`, `email`, `displayName`, `displayName`, `password`, `password`, `password`, `role`, `isActive`; user count unchanged; no response body contains the password value. U: the schema gives the same errors. |
| **TEST-17.5** | AC-17.5 | A | Alice and Admin logged in | Alice POSTs a valid body; anonymous POSTs it; Admin POSTs it with `Origin: https://evil.example`; Admin POSTs it as `text/plain` | 403 FORBIDDEN; 401 UNAUTHENTICATED; 403 FORBIDDEN; 415 UNSUPPORTED_MEDIA_TYPE; user count unchanged. |
| **TEST-17.6** | AC-17.6 | A | Admin logged in; server log output captured | One successful create and one rejected create (11-character password) | The captured log contains neither password value. |
| **TEST-17.7** | AC-17.7 | E | Admin logged in; viewports 1280 and 360 | Open Users, click Create user; type an invalid email and an 8-character password; correct them to `erin@example.test`, "Erin" and a valid password; Create; log out; log in as Erin | Inline errors shown and Create disabled until fixed; after Create the dialog closes and Erin is listed as Active; Erin's login lands on the Dashboard with the empty state pointing to Accounts; the dialog fits 360 px. |

---

## 5. Definition of done (F-17)

- Every AC above has an executed automated test with results recorded per Sprint 3 README §5.
- Failing-first evidence is retained for AC-17.1 (create and bcrypt hash), AC-17.3 (normalised uniqueness and the race), AC-17.4 (validation) and AC-17.6 (no password in logs).
- `EMAIL_EXISTS` is added to the Sprint 1 README §2.4 catalogue in the implementation PR.
- F-02 tests pass unchanged (each test starts from a reset and reseeded database, so users created here do not reach them).
- The NFR-02 route-list test includes `POST /admin/users`.
- System-Level SDS §3 (Create user on Users), §4 (route) and §5 (create-user row: Administrator allow, User 403) and SRS §2 (Administrator responsibilities: drop "(later)") are updated in the implementation PR.
- The Sprint 3 DoD in [README.md](README.md) §5 is met.
