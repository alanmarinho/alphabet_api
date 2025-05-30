import dotenv from 'dotenv';
import nodemailer from 'nodemailer';
dotenv.config();

// Supondo que isso esteja importado corretamente
import { PasswordRecover, validateEmail } from '#utils/generateEmail';
import logger from './logger';

const FRONT_BASE_URL = process.env.FRONT_BASE_URL!;
const APP_NAME = process.env.APP_NAME!;
const SMTP_USERNAME = process.env.SMTP_USERNAME!;
const SMTP_PASSWORD = process.env.SMTP_PASSWORD!;
const SMTP_HOST = process.env.SMTP_HOST!;
const SMTP_PORT = Number(process.env.SMTP_PORT || 587);

export enum ETypeEmail {
  EmailVerify = 'EmailVerify',
  passwordReset = 'PasswordReset',
}
interface IEmailSender {
  type: ETypeEmail;
  name: string;
  to: string;
  subject: string;
  urlParameters: { key: string; value: string | number }[];
}

interface IRecoverPassword {
  token: string;
  username: string;
  userEmail: string;
}
interface IVerifyEmail {
  token: string;
  username: string;
  userEmail: string;
}

const urlParameterSerialazer = (urlParameters: { key: string; value: string | number }[]) => {
  return (
    '?' + urlParameters.map((item) => `${encodeURIComponent(item.key)}=${encodeURIComponent(item.value)}`).join('&')
  );
};

export async function recoverPassword({ token, userEmail, username }: IRecoverPassword) {
  try {
    const urlParameters = [
      { key: 'token', value: token },
      { key: 'recoverpassword', value: 'true' },
    ];

    await EmailSender({
      name: username,
      to: userEmail,
      type: ETypeEmail.passwordReset,
      urlParameters: urlParameters,
      subject: 'Recuperação de senha',
    });
    return true;
  } catch (err) {
    return false;
  }
}

export async function emailVerify({ token, userEmail, username }: IVerifyEmail) {
  try {
    const urlParameters = [
      { key: 'token', value: token },
      { key: 'emailverification', value: 'true' },
    ];

    await EmailSender({
      name: username,
      to: userEmail,
      type: ETypeEmail.EmailVerify,
      urlParameters: urlParameters,
      subject: 'Verificação de conta',
    });
    return true;
  } catch (err) {
    return false;
  }
}

async function EmailSender({ to, name, type, subject, urlParameters }: IEmailSender) {
  let emailBody = '';

  switch (type) {
    case ETypeEmail.EmailVerify:
      emailBody = validateEmail({
        name: name,
        recover_link: `${FRONT_BASE_URL}${urlParameterSerialazer(urlParameters)}`,
        email: to,
      });
      break;
    case ETypeEmail.passwordReset:
      emailBody = PasswordRecover({
        name: name,
        recover_link: `${FRONT_BASE_URL}${urlParameterSerialazer(urlParameters)}`,
      });
      break;

    default:
      throw new Error('Tipo de e-mail não suportado.');
  }

  if (!emailBody) return false;

  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,
    auth: {
      user: SMTP_USERNAME,
      pass: SMTP_PASSWORD,
    },
  });

  try {
    await transporter.sendMail({
      from: `${APP_NAME} <${SMTP_USERNAME}>`,
      to,
      subject,
      html: emailBody,
    });
    return true;
  } catch (err) {
    logger.error('Erro ao enviar e-mail:');
    return false;
  }
}
