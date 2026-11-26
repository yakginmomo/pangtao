import { z } from 'zod';
import { isValidSubtype } from '../services/account.rules.js';

/**
 * Account name (f-09 §1): trimmed, then 1 to 60 characters. Uniqueness is a database matter
 * (BR-14, `(user_id, name)`), so it is checked by the service.
 */
const NameSchema = z
  .string({ required_error: 'name is required', invalid_type_error: 'name must be a string' })
  .trim()
  .min(1, { message: 'name must not be blank' })
  .max(60, { message: 'name must be at most 60 characters' });

const AccountTypeSchema = z.enum(['CASH', 'LOAN_TAKEN', 'LOAN_GIVEN', 'INCOME', 'EXPENSE'], {
  errorMap: (issue, ctx) => ({
    message:
      issue.code === z.ZodIssueCode.invalid_type && ctx.data === undefined
        ? 'type is required'
        : 'type must be CASH, LOAN_TAKEN, LOAN_GIVEN, INCOME or EXPENSE',
  }),
});

const AccountSubtypeSchema = z.enum(['WALLET', 'BANK', 'CREDIT_CARD', 'OTHER'], {
  errorMap: () => ({ message: 'subtype must be WALLET, BANK, CREDIT_CARD or OTHER' }),
});

/** POST /api/v1/accounts: strictly { name, type, subtype? } (f-09 §2.1). */
export const CreateAccountBodySchema = z
  .object({
    name: NameSchema,
    type: AccountTypeSchema,
    subtype: AccountSubtypeSchema.nullish(),
  })
  .strict()
  .superRefine((body, ctx) => {
    if (!isValidSubtype(body.type, body.subtype)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['subtype'],
        message: `subtype ${body.subtype} is not valid for type ${body.type}`,
      });
    }
  });

/**
 * PATCH /api/v1/accounts/:id: only `name` and `isArchived`, at least one (f-09 §2.1).
 * `type`, `subtype` and any other field are rejected (BR-14: they never change).
 */
export const UpdateAccountBodySchema = z
  .object({
    name: NameSchema.optional(),
    isArchived: z.boolean({ invalid_type_error: 'isArchived must be true or false' }).optional(),
  })
  .strict()
  .refine((body) => body.name !== undefined || body.isArchived !== undefined, {
    message: 'provide name or isArchived',
  });

export type CreateAccountBodyDto = z.infer<typeof CreateAccountBodySchema>;
export type UpdateAccountBodyDto = z.infer<typeof UpdateAccountBodySchema>;
