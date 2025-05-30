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
import { SuccessReturn } from '#utils/successReturn';
dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cookieParser());
app.use(express.json());
app.use(helmet());
app.set('trust proxy', 1);
const BASE_URL = process.env.FRONT_BASE_URL;
app.use(
  cors({
    origin: BASE_URL,
    credentials: true,
  }),
);
app.use(express.json());
app.set('trust proxy', 1);
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: 'Muitas requisições deste IP, tente novamente mais tarde.',
  }),
);

app.use('/game', gameRoutes);
app.use('/auth', authRoutes);
app.use('/', (req: Request, res: Response) => {
  return SuccessReturn({
    msg: 'Hello from Alphabet API!',
    res: res,
    status: 200,
    data: { time: new Date(), front: BASE_URL },
  });
});

app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error(err.stack);
  res.status(500).send('Algo deu errado!');
});

app.listen(port, () => {
  logger.info(`Servidor rodando na porta ${port}`);
});
