import Redis from 'ioredis';
import dotenv from 'dotenv';
import logger from '#utils/logger';
dotenv.config();

const redis = new Redis(process.env.REDIS_URL || '');

redis.on('connect', () => {
  logger.info('Conectado ao Redis.');
});

redis.on('error', () => {
  logger.error('Erro no Redis.');
});

export default redis;
