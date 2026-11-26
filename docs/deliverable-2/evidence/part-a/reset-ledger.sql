-- Part A continuity verification: reset the two synthetic user ledgers to the Sprint 1
-- starting state before the scripted journey and again after it.
--
-- This is the reset procedure from docs/labs/lab-06/uat.md §4.1, restricted to the two
-- seeded synthetic users. It touches only their transactions, sessions and login attempts;
-- accounts, passwords and the Administrator are unchanged.
--
-- Local PostgreSQL 16 (docker compose): npx prisma db execute --stdin < reset-ledger.sql
-- Production (Cloud SQL Studio): run the same statements before a UAT or demo session.

BEGIN;
-- Allocation lines are removed with their transactions (ON DELETE CASCADE).
DELETE FROM transactions
 WHERE user_id IN (SELECT id FROM users WHERE email IN ('alice@example.test', 'bob@example.test'));
DELETE FROM sessions
 WHERE user_id IN (SELECT id FROM users WHERE email IN ('alice@example.test', 'bob@example.test'));
DELETE FROM login_attempts WHERE email IN ('alice@example.test', 'bob@example.test', 'admin@example.test');
UPDATE users SET is_active = true WHERE email IN ('alice@example.test', 'bob@example.test');
COMMIT;
