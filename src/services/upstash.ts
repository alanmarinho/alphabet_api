import Redis from 'ioredis';

export async function testarRedis(redis: Redis): Promise<string> {
  try {
    await redis.set('teste_conexao', 'ok', 'EX', 10);
    const valor = await redis.get('teste_conexao');
    return `Conectado ao Redis. Valor armazenado: ${valor}`;
  } catch (err) {
    return `Erro ao testar conexão`;
  }
}
