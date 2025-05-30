import express from 'express';
import GameController from '#controller/game_controller';
import authMiddleware from '#middlewares/auth_middleware';

const auth = new authMiddleware();
const router = express.Router();
const controller = new GameController();

router.get('/start', auth.tokenVerify, controller.startGame);
router.post('/finish', auth.tokenVerify, controller.finishGame);
router.get('/ranking', controller.getRanking);
router.get('/mymatchs', auth.tokenVerify, controller.getMyMatchs);

export default router;
