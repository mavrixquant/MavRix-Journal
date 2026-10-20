import { Router } from 'express';
import { GEX_SYMBOLS } from '@mavrix/shared';
import { requireAuth } from '../middleware/auth.js';
import { HttpError } from '../middleware/error.js';
import * as ctrl from '../controllers/gex.controller.js';

export const gexRoutes = Router();

gexRoutes.use(requireAuth);

const validateSymbolQuery = (req, _res, next) => {
  const sym = req.query.symbol;
  if (sym && !GEX_SYMBOLS.includes(sym)) {
    return next(
      new HttpError(400, `Invalid symbol. Allowed: ${GEX_SYMBOLS.join(', ')}`)
    );
  }
  next();
};

gexRoutes.get('/', validateSymbolQuery, ctrl.list);
gexRoutes.get('/:date', validateSymbolQuery, ctrl.get);