import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import redis from '#config/redis';
import { SuccessReturn } from '#utils/successReturn';
import { ErrorReturn, IFieldError } from '#utils/errorReturn';
import { FinishSchema, inputInterface } from '#schemas/gameShemas';
import pool from '#config/db';
import { DbError } from '#utils/dbErrorManagment';
import { DatabaseError } from 'pg';

const TOKEN_PREFIX = 'token:partida:';
const DURATION_TIME = 30;
const ALLOWED_MARGIN = 2000;
export default class GameController {
  private async newGameToken(userId: String): Promise<string> {
    const token = uuidv4();
    const chave = `${TOKEN_PREFIX}${token}`;

    const data = JSON.stringify({ userId: userId, createdAt: Date.now() });

    await redis.set(chave, data, 'EX', DURATION_TIME);
    return token;
  }

  private async validateSequence(sequence: inputInterface[], data: string) {
    let parsedData = JSON.parse(data);
    const now = Date.now();
    const lastInputTime = sequence[sequence.length - 1].time;
    const startTime = Number(parsedData.createdAt);

    if (now < startTime + lastInputTime) {
      return { valid: false, msg: 'Suspeita de automação N°3.' };
    }
    // recusando tentativas legitimas
    // if (now > startTime + lastInputTime - ALLOWED_MARGIN) {
    //   return { valid: false, msg: 'Suspeita de automação N°4.' };
    // }
    const expectedSequence = 'abcdefghijklmnopqrstuvwxyz'.split('');
    let suspicionsOfAutomation = 0;
    if (sequence.length !== expectedSequence.length) {
      return { valid: false, msg: 'Tamanho incorreto' };
    }
    for (let i = 0; i < expectedSequence.length; i++) {
      if (sequence[i].key !== expectedSequence[i]) {
        return { valid: false, msg: 'Sequência incorreta' };
      }
    }
    const intervals = [];
    for (let i = 1; i < sequence.length; i++) {
      intervals.push(sequence[i].time - sequence[i - 1].time);
    }

    for (const interval of intervals) {
      if (interval < 25) {
        suspicionsOfAutomation++;
      }
    }

    if (suspicionsOfAutomation > 3) {
      return { valid: false, msg: 'Suspeita de automação N°1.' };
    }

    const avg = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const variance = intervals.reduce((sum, val) => sum + (val - avg) ** 2, 0) / intervals.length;
    const stdDev = Math.sqrt(variance);

    if (stdDev < 10) {
      return { valid: false, msg: 'Suspeita de automação N°2.' };
    }
    const repeatedIntervals = intervals.filter((v, i, arr) => v === arr[i - 1]).length;
    if (repeatedIntervals > 5) {
      return { valid: false, msg: 'Suspeita de automação N°5.' };
    }

    return { valid: true, msg: 'Partida considerada válida.' };
  }

  startGame = async (req: Request, res: Response): Promise<void> => {
    if (!req.user?.userID) {
      return ErrorReturn({ msg: 'User not authenticated.', res, status: 401 });
    }
    try {
      const matchToken = await this.newGameToken(req.user.userID);
      const expireDate = new Date(Date.now() + DURATION_TIME * 1000);
      expireDate.setHours(expireDate.getHours() - 3);
      const expireAt = expireDate.toISOString();
      return SuccessReturn({
        msg: 'New match started.',
        res: res,
        status: 200,
        data: { matchToken: matchToken, expireIn: expireAt },
      });
    } catch (err) {
      return ErrorReturn({ msg: 'Start game error.', res: res, status: 500 });
    }
  };

  finishGame = async (req: Request, res: Response): Promise<void> => {
    if (!req.user?.userID) {
      return ErrorReturn({ msg: 'User not authenticated.', res, status: 401 });
    }
    const result = FinishSchema.safeParse(req.body);

    if (!result.success) {
      const zodErr = result.error;

      const fields: IFieldError[] = zodErr.errors.map((e) => ({
        message: e.message,
        field: e.path[0]?.toString() ?? null,
      }));

      return ErrorReturn({
        msg: 'Invalid data.',
        res,
        status: 400,
        fields,
      });
    }
    try {
      const chave = `${TOKEN_PREFIX}${result.data.matchToken}`;
      const dados = await redis.getdel(chave);
      if (!dados) {
        return ErrorReturn({ msg: 'Invalid ou expired MatchToken', res: res, status: 401 });
      }

      const query = `WITH inserted AS (
                    INSERT INTO top_scores (user_id, username, match_id, duration_ms)
                    VALUES ($1, $2, $3, $4)
                    RETURNING *
                  )
                  SELECT 
                    i.*, 
                    (
                      SELECT COUNT(*) + 1
                      FROM top_scores
                      WHERE duration_ms < i.duration_ms
                        OR (duration_ms = i.duration_ms AND played_at < i.played_at)
                    ) AS rank
                  FROM inserted i;`;
      const { valid, msg } = await this.validateSequence(result.data.input, dados);

      if (!valid) {
        return ErrorReturn({ msg: `Partida invalidada. Motivo: ${msg}`, res: res, status: 400 });
      }

      const queryData = [
        req.user?.userID,
        req.user?.username,
        result.data.matchToken,
        result.data.input[result.data.input.length - 1].time,
      ];

      const matchResult = await pool.query(query, queryData);
      const matchData = matchResult.rows[0];

      return SuccessReturn({
        msg: 'Partida válida.',
        res: res,
        status: 200,
        data: {
          position: matchData.rank <= 100 ? String(matchData.rank) : '100+',
          time: result.data.input[result.data.input.length - 1].time,
        },
      });
    } catch (err) {
      if (err instanceof DatabaseError) {
        return ErrorReturn({
          res,
          ...DbError(err),
        });
      }
      return ErrorReturn({
        msg: 'Get user data internal error.',
        res: res,
        status: 500,
      });
    }
  };

  getRanking = async (req: Request, res: Response): Promise<void> => {
    try {
      const query = `SELECT username, duration_ms, played_at
                      FROM (
                        SELECT DISTINCT ON (username) username, duration_ms, played_at
                        FROM top_scores
                        ORDER BY username, duration_ms ASC
                      ) AS best_per_user
                      ORDER BY duration_ms ASC
                      LIMIT 10;`;
      const rankingResult = await pool.query(query);
      const returnData = rankingResult.rows.map((row, index) => ({
        position: index + 1,
        ...row,
      }));
      if (!rankingResult) {
        return ErrorReturn({ msg: 'Get ranking error', res: res, status: 500 });
      }
      return SuccessReturn({ msg: 'Get rankind success', res: res, status: 200, data: returnData });
    } catch (err) {
      return ErrorReturn({ msg: 'Get ranking internal error.', res: res, status: 500 });
    }
  };

  getMyMatchs = async (req: Request, res: Response): Promise<void> => {
    try {
      const query = `SELECT username, duration_ms, played_at
                      FROM top_scores
                      ORDER BY duration_ms ASC;`;
      const rankingResult = await pool.query(query);
      if (!rankingResult) {
        return ErrorReturn({ msg: 'Get matchs error', res: res, status: 500 });
      }
      const rankingData = rankingResult.rows.map((row, index) => ({
        position: index + 1,
        ...row,
      }));
      const returnData = rankingData.filter((match) => match.username === req.user?.username);
      return SuccessReturn({ msg: 'Get matchs success', res: res, status: 200, data: returnData });
    } catch (err) {
      if (err instanceof DatabaseError) {
        return ErrorReturn({
          res,
          ...DbError(err),
        });
      }
      return ErrorReturn({
        msg: 'Get user data internal error.',
        res: res,
        status: 500,
      });
    }
  };
}
