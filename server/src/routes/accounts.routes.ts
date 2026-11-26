import { Router, Request, Response, NextFunction } from 'express';
import { access } from '../middleware/route-guard.middleware.js';
import { AppError } from '../middleware/error.middleware.js';
import { accountService } from '../services/account.service.js';
import { openingBalanceService } from '../services/opening-balance.service.js';
import {
  AccountIdSchema,
  OpeningBalanceBodySchema,
} from '../schemas/opening-balance.schema.js';
import { CreateAccountBodySchema, UpdateAccountBodySchema } from '../schemas/account.schema.js';

const router = Router();

/** GET /api/v1/accounts — User only (Admin 403 per BR-02, anonymous 401). */
router.get('/', access('USER'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new AppError(401, 'UNAUTHENTICATED', 'Authentication required');
    }
    const items = await accountService.listAccounts(req.user.id);
    res.status(200).json({ items });
  } catch (error) {
    next(error);
  }
});

/** POST /api/v1/accounts — User only (f-09 §2.1; Admin 403 per BR-02, anonymous 401). */
router.post('/', access('USER'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new AppError(401, 'UNAUTHENTICATED', 'Authentication required');
    }
    const dto = CreateAccountBodySchema.parse(req.body);
    const account = await accountService.createAccount(req.user.id, dto);
    res.status(201).json({ account });
  } catch (error) {
    next(error);
  }
});

/** PATCH /api/v1/accounts/:id — rename or archive; another user's id is 404 (f-09 §2.1, D-03). */
router.patch('/:id', access('USER'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new AppError(401, 'UNAUTHENTICATED', 'Authentication required');
    }
    const accountId = AccountIdSchema.parse(req.params.id);
    const dto = UpdateAccountBodySchema.parse(req.body);
    const account = await accountService.updateAccount(req.user.id, accountId, dto);
    res.status(200).json({ account });
  } catch (error) {
    next(error);
  }
});

/** POST /api/v1/accounts/:id/opening-balance — User only (f-04 §2.1). */
router.post(
  '/:id/opening-balance',
  access('USER'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new AppError(401, 'UNAUTHENTICATED', 'Authentication required');
      }
      const accountId = AccountIdSchema.parse(req.params.id);
      const dto = OpeningBalanceBodySchema.parse(req.body);
      const transaction = await openingBalanceService.createOpeningBalance(
        accountId,
        dto,
        req.user.id
      );
      res.status(201).json({ transaction });
    } catch (error) {
      next(error);
    }
  }
);

export const accountsRouter = router;
