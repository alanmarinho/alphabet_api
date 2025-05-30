import { Pool } from 'pg';
import logger from '#utils/logger';
import dotenv from 'dotenv';
dotenv.config();
const pool = new Pool({
  connectionString: process.env.DB_URL || '',
  ssl: { rejectUnauthorized: false },
});

async function testarConexao() {
  try {
    const res = await pool.query('SELECT NOW()');
    logger.info('Conectado ao NeonDB.');
  } catch (err) {
    logger.error('Erro ao conectar no NeonDB.');
  }
}

testarConexao();

export default pool;
