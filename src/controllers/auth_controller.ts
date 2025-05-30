import {
  deleteAccountSchema,
  LoginSchema,
  RegisterSchema,
  startRecoverPasswordSchema,
  recoverPasswordSchema,
  validateEmail,
  addNewEmail,
  editPasswordSchema,
} from '#schemas/authShemas';
import { ErrorReturn, IFieldError } from '#utils/errorReturn';
import { Request, Response } from 'express';
import pool from '#config/db';
import { hashPassword, verifyPassword } from '#utils/hashPassword';
import { SuccessReturn } from '#utils/successReturn';
import { DatabaseError } from 'pg';
import { DbError } from '#utils/dbErrorManagment';
import { jwtPayload, newJWT } from '#utils/jwtConfig';
import { recoverPassword, emailVerify } from '#utils/emailSender';
import redis from '#config/redis';
import { v4 as uuidv4 } from 'uuid';

const TOKEN_PREFIX_RECOVER_PASSWORD = 'token:recoverPassword:';
const TOKEN_PREFIX_VALIDATE_EMAIL = 'token:validateEmail:';
const RECOVER_PASSWORD_DURATION_TIME = 120;
const VALIDATE_EMAIL_DURATION_TIME = 240;

enum EEmailStatus {
  notSet = 'notSet',
  verificationPending = 'validationPending',
  verified = 'verified',
}

export default class AuthController {
  private async newRecoverPasswordToken(id: String): Promise<string> {
    const oldIndexKey = `${TOKEN_PREFIX_RECOVER_PASSWORD}user:${id}`;

    const oldToken = await redis.getdel(oldIndexKey);
    if (oldToken) {
      const oldTokenKey = `${TOKEN_PREFIX_RECOVER_PASSWORD}${oldToken}`;
      await redis.del(oldTokenKey);
    }

    const token = uuidv4();
    const tokenChave = `${TOKEN_PREFIX_RECOVER_PASSWORD}${token}`;
    const userChave = `${TOKEN_PREFIX_RECOVER_PASSWORD}user:${id}`;

    const data = JSON.stringify({ id: id, createdAt: Date.now() });

    await redis.set(tokenChave, data, 'EX', RECOVER_PASSWORD_DURATION_TIME);
    await redis.set(userChave, token, 'EX', RECOVER_PASSWORD_DURATION_TIME);
    return token;
  }

  private async newValidateEmailToken(id: String): Promise<string> {
    const oldIndexKey = `${TOKEN_PREFIX_VALIDATE_EMAIL}user:${id}`;

    const oldToken = await redis.getdel(oldIndexKey);
    if (oldToken) {
      const oldTokenKey = `${TOKEN_PREFIX_VALIDATE_EMAIL}${oldToken}`;
      await redis.del(oldTokenKey);
    }
    const token = uuidv4();
    const tokenKey = `${TOKEN_PREFIX_VALIDATE_EMAIL}${token}`;
    const indexKey = `${TOKEN_PREFIX_VALIDATE_EMAIL}user:${id}`;

    const payload = JSON.stringify({ id, createdAt: Date.now() });

    await redis.set(tokenKey, payload, 'EX', VALIDATE_EMAIL_DURATION_TIME);
    await redis.set(indexKey, token, 'EX', VALIDATE_EMAIL_DURATION_TIME);
    return token;
  }

  private async statusEmail(user_data: any): Promise<EEmailStatus> {
    if (!!user_data.email) {
      return user_data.email_verified ? EEmailStatus.verified : EEmailStatus.verificationPending;
    } else {
      return EEmailStatus.notSet;
    }
  }

  login = async (req: Request, res: Response) => {
    const result = LoginSchema.safeParse(req.body);

    if (!result.success) {
      const zodErr = result.error;

      const fields: IFieldError[] = zodErr.errors.map((e) => ({
        message: e.message,
        field: e.path[0]?.toString() ?? null,
      }));

      return ErrorReturn({
        msg: 'Invalid data.',
        res,
        status: 401,
        fields,
      });
    }
    try {
      const user_data = await pool.query('SELECT * FROM users WHERE username = $1', [result.data.username]);
      if (user_data.rowCount === 0) {
        return ErrorReturn({
          msg: 'User not found.',
          res,
          status: 404,
          fields: [{ field: 'username', message: 'User not found.' }],
        });
      }
      const user = user_data.rows[0];

      if (!user) {
        return ErrorReturn({
          msg: 'User not found.',
          res: res,
          status: 404,
        });
      }

      if (!(await verifyPassword(result.data.password, user.password))) {
        return ErrorReturn({
          msg: 'Invalid password',
          fields: [{ field: 'password', message: 'Wrong password.' }],
          res: res,
          status: 401,
        });
      }
      const userPayload: jwtPayload = { userID: user.id, username: user.username };
      const token = await newJWT(userPayload);

      res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 1000 * 60 * 60,
      });

      return SuccessReturn({ msg: 'Login success.', res: res, status: 200 });
    } catch (err) {
      if (err instanceof DatabaseError) {
        return ErrorReturn({
          res,
          ...DbError(err),
        });
      }
      return ErrorReturn({
        msg: 'Login internal error.',
        res: res,
        status: 500,
      });
    }
  };
  register = async (req: Request, res: Response) => {
    const result = RegisterSchema.safeParse(req.body);

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
      const securePassword = await hashPassword(result.data.password);

      const user_created = await pool.query(
        'INSERT INTO users (username, password, email) VALUES ($1, $2,$3) RETURNING id, username, email',
        [result.data.username.toLowerCase(), securePassword, result.data.email ? result.data.email : null],
      );

      if ((user_created.rowCount ?? 0) === 0) {
        return ErrorReturn({ msg: 'Creation user error.', res: res, status: 500 });
      }
      const createdUser = user_created.rows[0];

      let successSendEmail = false;

      if (!!createdUser.email) {
        const token = await this.newValidateEmailToken(createdUser.id);
        successSendEmail = await emailVerify({
          token: token,
          userEmail: createdUser.email,
          username: createdUser.username,
        });
      }

      return SuccessReturn({
        msg: 'User created',
        res: res,
        status: 201,
        data: result.data.email ? { successSendEmail: successSendEmail } : undefined,
        actions: result.data.email ? { validateEmail: true } : undefined,
      });
    } catch (err: any) {
      if (err instanceof DatabaseError) {
        return ErrorReturn({
          res,
          ...DbError(err),
        });
      }
      return ErrorReturn({
        msg: 'Create user internal error.',
        res: res,
        status: 500,
      });
    }
  };

  logout = async (req: Request, res: Response) => {
    if (!req.user?.userID) {
      return ErrorReturn({ msg: 'User not authenticated.', res, status: 401 });
    }
    res.clearCookie('token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    });

    return SuccessReturn({
      msg: 'Logout successful',
      res,
      status: 200,
    });
  };

  deleteAccount = async (req: Request, res: Response) => {
    if (!req.user?.userID) {
      return ErrorReturn({ msg: 'User not authenticated.', res, status: 401 });
    }
    const result = deleteAccountSchema.safeParse(req.body);

    if (!result.success) {
      const zodErr = result.error;

      const fields: IFieldError[] = zodErr.errors.map((e) => ({
        message: e.message,
        field: e.path[0]?.toString() ?? null,
      }));

      return ErrorReturn({
        msg: 'Invalid data.',
        res,
        status: 401,
        fields,
      });
    }

    try {
      const user_data = await pool.query('SELECT * FROM users WHERE id = $1', [req.user?.userID]);
      if (user_data.rowCount === 0) {
        return ErrorReturn({
          msg: 'User not found.',
          res,
          status: 404,
          fields: [{ field: 'user', message: 'User not found.' }],
        });
      }
      const user = user_data.rows[0];

      if (!user) {
        return ErrorReturn({
          msg: 'User not found.',
          res: res,
          status: 404,
        });
      }

      if (!(await verifyPassword(result.data.password, user.password))) {
        return ErrorReturn({ msg: 'Invalid password', res: res, status: 401 });
      }

      await pool.query('DELETE FROM users WHERE id = $1', [req.user?.userID]);

      res.clearCookie('token');
      return SuccessReturn({ msg: 'Account deleted successfully.', res: res, status: 200 });
    } catch (err) {
      if (err instanceof DatabaseError) {
        return ErrorReturn({
          res,
          ...DbError(err),
        });
      }
      return ErrorReturn({
        msg: 'DeleteAccount internal error.',
        res: res,
        status: 500,
      });
    }
  };

  startRecoverPassword = async (req: Request, res: Response) => {
    const result = startRecoverPasswordSchema.safeParse(req.body);

    if (!result.success) {
      const zodErr = result.error;

      const fields: IFieldError[] = zodErr.errors.map((e) => ({
        message: e.message,
        field: e.path[0]?.toString() ?? null,
      }));

      return ErrorReturn({
        msg: 'Invalid data.',
        res,
        status: 401,
        fields,
      });
    }
    try {
      const user_data = await pool.query('SELECT * FROM users WHERE username = $1 OR email = $1', [
        result.data.identifier,
      ]);
      if (user_data.rowCount === 0) {
        return ErrorReturn({
          msg: 'User not found.',
          res,
          status: 404,
          fields: [{ field: 'identifier', message: 'User not found.' }],
        });
      }
      const user = user_data.rows[0];

      if (!user) {
        return ErrorReturn({
          msg: 'User not found.',
          res: res,
          status: 404,
        });
      }
      if (!user.email) {
        return ErrorReturn({
          msg: 'Email no existent.',
          res: res,
          status: 400,
          fields: [
            {
              field: 'identifier',
              message: 'Your account does not have a registered email address and the password cannot be recovered',
            },
          ],
        });
      }

      const token = await this.newRecoverPasswordToken(user.id);

      try {
        const sendSuccess = await recoverPassword({ token: token, userEmail: user.email, username: user.username });

        if (!sendSuccess) {
          return ErrorReturn({
            msg: 'Could not send recovery email. Please try again later.',
            res,
            status: 500,
          });
        }

        return SuccessReturn({ msg: 'Recovery email has been sent.', res: res, status: 200 });
      } catch (err) {
        return ErrorReturn({
          msg: 'Send recover email error.',
          res: res,
          status: 500,
        });
      }
    } catch (err) {
      if (err instanceof DatabaseError) {
        return ErrorReturn({
          res,
          ...DbError(err),
        });
      }
      return ErrorReturn({
        msg: 'Start recover password internal error.',
        res: res,
        status: 500,
      });
    }
  };

  recoverPassword = async (req: Request, res: Response) => {
    const result = recoverPasswordSchema.safeParse(req.body);

    if (!result.success) {
      const zodErr = result.error;

      const fields: IFieldError[] = zodErr.errors.map((e) => ({
        message: e.message,
        field: e.path[0]?.toString() ?? null,
      }));

      return ErrorReturn({
        msg: 'Invalid data.',
        res,
        status: 401,
        fields,
      });
    }
    try {
      const chave = `${TOKEN_PREFIX_RECOVER_PASSWORD}${result.data.token}`;
      const dados = await redis.getdel(chave);

      if (!dados) {
        return ErrorReturn({ msg: 'Invalid or expired password recovery token.', res: res, status: 401 });
      }
      let parsedData = JSON.parse(dados);

      const query = 'UPDATE users SET password = $1 WHERE id = $2';

      const securePassword = await hashPassword(result.data.password);

      await pool.query(query, [securePassword, parsedData.id]);

      return SuccessReturn({ msg: 'Password successfully updated.', res: res, status: 200 });
    } catch (err) {
      if (err instanceof DatabaseError) {
        return ErrorReturn({
          res,
          ...DbError(err),
        });
      }
      return ErrorReturn({
        msg: 'Recover password internal error.',
        res: res,
        status: 500,
      });
    }
  };

  validadeEmail = async (req: Request, res: Response) => {
    const result = validateEmail.safeParse(req.body);

    if (!result.success) {
      const zodErr = result.error;

      const fields: IFieldError[] = zodErr.errors.map((e) => ({
        message: e.message,
        field: e.path[0]?.toString() ?? null,
      }));

      return ErrorReturn({
        msg: 'Invalid data.',
        res,
        status: 401,
        fields,
      });
    }
    try {
      const chave = `${TOKEN_PREFIX_VALIDATE_EMAIL}${result.data.token}`;
      const dados = await redis.getdel(chave);

      if (!dados) {
        return ErrorReturn({ msg: 'Invalid or expired password recovery token.', res: res, status: 401 });
      }
      let parsedData = JSON.parse(dados);

      const indexKey = `${TOKEN_PREFIX_VALIDATE_EMAIL}user:${parsedData.userId}`;
      await redis.del(indexKey);

      const query = 'UPDATE users SET email_verified = true WHERE id = $1';

      await pool.query(query, [parsedData.id]);

      return SuccessReturn({ msg: 'Email successfully validate.', res: res, status: 200 });
    } catch (err) {
      if (err instanceof DatabaseError) {
        return ErrorReturn({
          res,
          ...DbError(err),
        });
      }
      return ErrorReturn({
        msg: 'Validate email internal error.',
        res: res,
        status: 500,
      });
    }
  };

  getUserData = async (req: Request, res: Response) => {
    if (!req.user?.userID) {
      return ErrorReturn({ msg: 'User not authenticated.', res, status: 401 });
    }

    try {
      const indexKeyUser = `${TOKEN_PREFIX_VALIDATE_EMAIL}user:${req.user.userID}`;
      const token = await redis.get(indexKeyUser);
      const indexKeyToken = `${TOKEN_PREFIX_VALIDATE_EMAIL}${token}`;
      const ttlSeconds = await redis.ttl(indexKeyToken);

      let expiresAt = null;
      if (ttlSeconds > 0) {
        expiresAt = new Date(Date.now() + ttlSeconds * 1000);
      } else {
        await redis.del(indexKeyToken);
        await redis.del(indexKeyUser);
      }
      const user_return = await pool.query('SELECT * FROM users WHERE id = $1', [req.user?.userID]);
      const user_data = user_return.rows[0];
      const returnData = {
        username: user_data.username,
        emailStatus: await this.statusEmail(user_data),
        verifyEmailTokenExpiresAt: expiresAt ? expiresAt : undefined,
      };

      return SuccessReturn({ msg: 'Succes get user data', res: res, status: 200, data: returnData });
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

  addNewEmail = async (req: Request, res: Response) => {
    if (!req.user?.userID) {
      return ErrorReturn({ msg: 'User not authenticated.', res, status: 401 });
    }

    const result = addNewEmail.safeParse(req.body);

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
      const query = `UPDATE users
                    SET email = $1, email_verified = false
                    WHERE id = $2;`;

      const emailResult = await pool.query(query, [result.data.email, req.user.userID]);

      if (!emailResult) {
        return ErrorReturn({ msg: 'An error occurred while adding email', res: res, status: 500 });
      }

      let successSendEmail = false;

      const token = await this.newValidateEmailToken(req.user.userID);
      successSendEmail = await emailVerify({
        token: token,
        userEmail: result.data.email,
        username: req.user.username,
      });

      if (!successSendEmail) {
        return ErrorReturn({ msg: 'An occurred while sending a confirmation email', res: res, status: 500 });
      }
      return SuccessReturn({ msg: 'Success add email.', res: res, status: 200, actions: { validateEmail: true } });
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

  startValidadeEmail = async (req: Request, res: Response) => {
    if (!req.user?.userID) {
      return ErrorReturn({ msg: 'User not authenticated.', res, status: 401 });
    }
    try {
      const user_return = await pool.query('SELECT * FROM users WHERE id = $1', [req.user.userID]);
      const user_data = user_return.rows[0];

      if (user_data.email_verified == true) {
        return SuccessReturn({ msg: 'Email already verified', res: res, status: 200 });
      }

      const token = await this.newValidateEmailToken(req.user.userID);

      const successSendEmail = await emailVerify({
        token: token,
        userEmail: user_data.email,
        username: user_data.username,
      });
      if (!!successSendEmail) {
        return SuccessReturn({ msg: 'Success verification send.', res: res, status: 200 });
      } else {
        const IndexUser = `${TOKEN_PREFIX_VALIDATE_EMAIL}user:${req.user.userID}`;
        const tokenToken = `${TOKEN_PREFIX_VALIDATE_EMAIL}${token}`;

        await redis.del(IndexUser);
        await redis.del(tokenToken);
        return ErrorReturn({ msg: 'Send email verification falled.', res: res, status: 500 });
      }
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

  editPassword = async (req: Request, res: Response) => {
    if (!req.user?.userID) {
      return ErrorReturn({ msg: 'User not authenticated.', res, status: 401 });
    }
    const result = editPasswordSchema.safeParse(req.body);

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
      const query = 'UPDATE users SET password = $1 WHERE id = $2';

      const securePassword = await hashPassword(result.data.password);

      await pool.query(query, [securePassword, req.user.userID]);

      return SuccessReturn({ msg: 'Password successfully updated.', res: res, status: 200 });
    } catch (err) {
      if (err instanceof DatabaseError) {
        return ErrorReturn({
          res,
          ...DbError(err),
        });
      }
      return ErrorReturn({
        msg: 'Update password internal error.',
        res: res,
        status: 500,
      });
    }
  };

  async teste(req: Request, res: Response) {
    try {
      await recoverPassword({ token: '12345', userEmail: 'alanmarinho020@gmail.com', username: 'alanmarinho' });
      return SuccessReturn({ msg: 'Succes send email.', res: res, status: 200 });
    } catch (err) {}
    return ErrorReturn({
      msg: 'DeleteAccount internal error.',
      res: res,
      status: 500,
    });
  }
}
