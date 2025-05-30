import { Pool } from 'pg';

export async function ConectTester(pool: Pool): Promise<string> {
  const client = await pool.connect();
  try {
    const res = await client.query('SELECT NOW()');
    return `Conectado ao Neon, horário do servidor:', ${res.rows[0]}`;
  } catch {
    return 'Erro ao testar conexão.';
  } finally {
    client.release();
  }
}
