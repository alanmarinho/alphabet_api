import { ErrorReturn } from '#utils/errorReturn';
import { jwtPayload, verifyJWT } from '#utils/jwtConfig';

import { Request, Response, NextFunction } from 'express';

export default class AuthMiddleware {
  async tokenVerify(req: Request, res: Response, next: NextFunction) {
    try {
      const token = req.cookies?.token;

      if (!token) {
        return res.status(401).json({ error: 'Token ausente' });
      }

      if (!token) {
        return ErrorReturn({
          res: res,
          msg: 'Token not send',
          status: 401,
        });
      }

      const payload = await verifyJWT(token);
      if (!payload) {
        return ErrorReturn({
          msg: 'Unauthorized',
          res: res,
          status: 401,
        });
      }
      if (typeof payload !== 'object' || !('userID' in payload)) {
        return res.status(401).json({ error: 'Token inválido' });
      }
      req.user = payload as jwtPayload;
      next();
    } catch (err) {
      return ErrorReturn({
        res: res,
        msg: 'Internal server error',
        status: 500,
      });
    }
  }
}
