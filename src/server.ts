import express, { Request, Response, NextFunction } from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import '#config/db';
import '#config/redis';
import gameRoutes from '#routes/gameRoutes';
import authRoutes from '#routes/authRoutes';
import logger from '#utils/logger';
import cookieParser from 'cookie-parser';
dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cookieParser());
app.use(express.json());
app.use(helmet());
app.use(
  cors({
    origin: 'https://games.alanmarinho.com.br',
    credentials: true,
  }),
);
app.use(express.json());
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: 'Muitas requisições deste IP, tente novamente mais tarde.',
  }),
);

app.use('/game', gameRoutes);
app.use('/auth', authRoutes);

app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error(err.stack);
  res.status(500).send('Algo deu errado!');
});

app.listen(port, () => {
  logger.info(`Servidor rodando na porta ${port}`);
});
