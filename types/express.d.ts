import { jwtPayload } from '#utils/jwtConfig';

declare global {
  namespace Express {
    interface Request {
      user?: jwtPayload;
    }
  }
}
