import { Router, Request, Response, NextFunction } from 'express';
import { access } from '../middleware/route-guard.middleware.js';
import { AppError } from '../middleware/error.middleware.js';
import { loansService } from '../services/loans.service.js';

const router = Router();

/** GET /api/v1/loans — User only (f-10 §2.1; Admin 403 per BR-02, anonymous 401). */
router.get('/', access('USER'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new AppError(401, 'UNAUTHENTICATED', 'Authentication required');
    }
    res.status(200).json(await loansService.getLoans(req.user.id));
  } catch (error) {
    next(error);
  }
});

export const loansRouter = router;
