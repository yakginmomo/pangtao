import { z } from 'zod';
import { IdParamSchema } from './common.schema.js';
import { isRealCalendarDate } from '../utils/date.util.js';

/** Route parameter for POST /api/v1/accounts/:id/opening-balance. */
export const AccountIdSchema = IdParamSchema;

/** BR-04: integer satang 0…10,000,000,000 (an opening balance may be 0). */
const OpeningAmountSchema = z
  .number({
    required_error: 'amount is required',
    invalid_type_error: 'amount must be an integer number of satang',
  })
  .int({ message: 'amount must be an integer number of satang' })
  .min(0, { message: 'amount must be at least 0 satang' })
  .max(10_000_000_000, { message: 'amount must be at most 100,000,000.00 THB' });

/** BR-10: a real `YYYY-MM-DD` calendar day; the future-date rule lives in the service. */
const OpeningDateSchema = z
  .string({
    required_error: 'date is required',
    invalid_type_error: 'date must be a string',
  })
  .refine(isRealCalendarDate, {
    message: 'date must be a valid calendar date in YYYY-MM-DD format',
  });

/**
 * POST /api/v1/accounts/:id/opening-balance — strictly { amount, date } (f-04 §2.1).
 * `amount` is integer satang 0…10,000,000,000 (BR-04); `date` is a real `YYYY-MM-DD`
 * calendar day (BR-10). The future-date rule needs "today", so it lives in the service.
 */
export const OpeningBalanceBodySchema = z
  .object({
    amount: OpeningAmountSchema,
    date: OpeningDateSchema,
  })
  .strict();

/**
 * PATCH /api/v1/accounts/:id/opening-balance — `amount` and/or `date`, at least one, nothing
 * else (f-12 §1). The same BR-04 and BR-10 field rules as recording one (F-04).
 */
export const CorrectOpeningBalanceBodySchema = z
  .object({
    amount: OpeningAmountSchema.optional(),
    date: OpeningDateSchema.optional(),
  })
  .strict()
  .refine((body) => body.amount !== undefined || body.date !== undefined, {
    message: 'provide amount or date',
  });

export type OpeningBalanceBodyDto = z.infer<typeof OpeningBalanceBodySchema>;
export type CorrectOpeningBalanceBodyDto = z.infer<typeof CorrectOpeningBalanceBodySchema>;
