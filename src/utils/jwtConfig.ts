import jwt, { JwtPayload } from 'jsonwebtoken';
import dotenv from 'dotenv';
import logger from '#utils/logger';
dotenv.config();

export interface jwtPayload {
  userID: string;
  username: string;
}

const APP_KEY = process.env.APP_KEY || '';

const JwtLifeTime = '1h';

export async function newJWT(jwtPayload: jwtPayload) {
  return jwt.sign(jwtPayload, APP_KEY, { expiresIn: JwtLifeTime });
}
export async function verifyJWT(token: string) {
  try {
    const decoded = jwt.verify(token, APP_KEY) as JwtPayload;
    return decoded;
  } catch (err) {
    return null;
  }
}
