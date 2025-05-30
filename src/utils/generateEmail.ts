import { string } from 'zod';

interface IRecoverPassword {
  name: string;
  recover_link: string;
}

interface IVerifyEmail {
  name: string;
  recover_link: string;
  email: string;
}

export function PasswordRecover({ name, recover_link }: IRecoverPassword) {
  return `
  <!DOCTYPE html>
<html lang="pt-br">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Verificação de Conta - Lests Rifa</title>
    <style>
      body {
        font-family: Arial, sans-serif;
        background-color: #4b4b4b;
        margin: 0;
        padding: 0;
      }
      .email-container {
        width: 100%;
        max-width: 600px;
        margin: 0 auto;
        background-color: #fff;
        border-radius: 8px;
        overflow: hidden;
      }
      .email-header {
        background-color: #4caf50;
        padding: 20px;
        text-align: center;
        color: white;
      }
      .email-header h1 {
        margin: 0;
      }
      .email-body {
        padding: 30px;
        text-align: center;
      }
      .email-body p {
        font-size: 16px;
        color: #333;
        line-height: 1.6;
      }
      .email-body a {
        display: inline-block;
        margin-top: 20px;
        padding: 12px 30px;
        background-color: #4caf50;
        color: white;
        text-decoration: none;
        border-radius: 5px;
        font-size: 16px;
      }
      .email-footer {
        background-color: #f4f4f4;
        padding: 20px;
        text-align: center;
        color: #777;
      }
      .email-footer p {
        font-size: 14px;
      }
      table {
        width: 100%;
        margin-top: 20px;
        border-collapse: collapse;
      }
      td {
        padding: 10px;
        text-align: center;
      }
      .footer-table {
        background-color: #f4f4f4;
        border-top: 1px solid #ddd;
      }
    </style>
  </head>
  <body>
    <div class="email-container">
      <!-- Header -->
      <div class="email-header">
        <h1>Alphabet</h1>
        <p>Mudança de senha</p>
      </div>

      <!-- Body -->
      <div class="email-body">
        <p>Olá ${name},</p>
        <p>Abaixo segue o link para a recuperação da sua senha no game Alphabet!</p>

        <!-- Verification Button -->
        <a href="${recover_link}">Recuperar senha</a>

        <p>Se você não solicitou essa recuperação, pode ignorar este e-mail.</p>
      </div>

      <!-- Footer -->
      <div class="email-footer">
        <table>
          <tr>
            <td class="footer-table">
              <p>&copy; 2025 Alphabet. Todos os direitos reservados.</p>
            </td>
          </tr>
        </table>
      </div>
    </div>
  </body>
</html>
  `;
}

export function validateEmail({ name, recover_link, email }: IVerifyEmail) {
  return `
<!doctype html>
<html lang="pt-br">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Verificação de Conta - Lests Rifa</title>
    <style>
      body {
        font-family: Arial, sans-serif;
        background-color: #4b4b4b;
        margin: 0;
        padding: 0;
      }
      .email-container {
        width: 100%;
        max-width: 600px;
        margin: 0 auto;
        background-color: #fff;
        border-radius: 8px;
        overflow: hidden;
      }
      .email-header {
        background-color: #4caf50;
        padding: 20px;
        text-align: center;
        color: white;
      }
      .email-header h1 {
        margin: 0;
      }
      .email-body {
        padding: 30px;
        text-align: center;
      }
      .email-body p {
        font-size: 16px;
        color: #333;
        line-height: 1.6;
      }
      .email-body a {
        display: inline-block;
        margin-top: 20px;
        padding: 12px 30px;
        background-color: #4caf50;
        color: white;
        text-decoration: none;
        border-radius: 5px;
        font-size: 16px;
      }
      .email-footer {
        background-color: #f4f4f4;
        padding: 20px;
        text-align: center;
        color: #777;
      }
      .email-footer p {
        font-size: 14px;
      }
      table {
        width: 100%;
        margin-top: 20px;
        border-collapse: collapse;
      }
      td {
        padding: 10px;
        text-align: center;
      }
      .footer-table {
        background-color: #f4f4f4;
        border-top: 1px solid #ddd;
      }
    </style>
  </head>
  <body>
    <div class="email-container">
      <!-- Header -->
      <div class="email-header">
        <h1>Alphabet</h1>
        <p>Validação de email</p>
      </div>

      <!-- Body -->
      <div class="email-body">
        <p>Olá ${name},</p>
        <p>Abaixo segue o link para adicionar o email ${String(email)} como recuperador de senha no game Alphabet</p>

        <!-- Verification Button -->
        <a href="${recover_link}">Confirmar ação</a>

        <p>Se você não solicitou essa funcinalidade, pode ignorar este e-mail.</p>
      </div>

      <!-- Footer -->
      <div class="email-footer">
        <table>
          <tr>
            <td class="footer-table">
              <p>&copy; 2025 Alphabet. Todos os direitos reservados.</p>
            </td>
          </tr>
        </table>
      </div>
    </div>
  </body>
</html>

  `;
}
