import express from 'express';
import authMiddleware from '#middlewares/auth_middleware';
import AuthController from '#controller/auth_controller';

const auth = new authMiddleware();
const router = express.Router();
const controller = new AuthController();

router.post('/login', controller.login);
router.post('/register', controller.register);
router.post('/logout', auth.tokenVerify, controller.logout);
router.post('/deleteaccount', auth.tokenVerify, controller.deleteAccount);

router.post('/startrecoverpassword', controller.startRecoverPassword);
router.post('/recoverpassword', controller.recoverPassword);
router.post('/editpassword', auth.tokenVerify, controller.editPassword);

router.post('/startvalidadeemail', auth.tokenVerify, controller.startValidadeEmail);
router.post('/validadeemail', controller.validadeEmail);
router.post('/addemail', auth.tokenVerify, controller.addNewEmail);

router.get('/me', auth.tokenVerify, controller.getUserData);
// add forma de adicinar email quando conta criada sem email

// router.post('/teste', controller.teste);
export default router;
