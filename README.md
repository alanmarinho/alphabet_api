## Alphabet API

## Projeto completo rodando em produção: 
  - Api: https://alphabet-api.onrender.com
  - Frontend: https://games.alanmarinho.com.br/

### Overview

- Api dedicada ao projeto game Alphabet, que visa fornecer uma interface para manipulação de dados do jogo.
- A API manipula valida e armazena sequencias do alfabeto alvo do game Alphabet.
- A API é baseada em REST e utiliza JSON como formato de troca de dados.
- A autenticação é feita via JWT, com cookies seguros para manter a sessão do usuário.

### Tecnologias Utilizadas
- TypeScript
- Node.js
- Express.js
- PostgreSQL
- Neon db
- UpStash

### Instalação
1. Clone o repositório:
   ```bash 
   git clone ...
   ```

2. Navegue até o diretório do projeto
3. Instale as dependências:
   ```bash
   npm install
   ```
4. Configure as variáveis de ambiente:
   - Crie um arquivo `.env` na raiz do projeto seguindo o modelo ``.env.example``
   - Preencha as variáveis de ambiente com os valores apropriados.

    - Recomenda-se utilizar o UpStash para o Redis e Neon db para o PostgreSQL (ambos possuem planos gratuitos) um compose de banco PostgreSQL local está disponível, mas configure por sua conta e risco ``docker-compose.yml``.
5. Build (opcional):

    5.1. Execute a buid do projeto (para produção):
    ```bash
    npm run build
    ```
6. Executar as migrações do banco de dados:
   ```bash
   npm run migrate
   ```
7. Inicie o servidor:

    7.1. Para desenvolvimento:
    ```bash
    npm run dev
    ```
      
    7.2. Para produção (após o build):
    ```bash
    npm start
    ```
### Endpoints
- Authentication
  - `POST /auth/login`: Realiza o login do usuário e seta um token JWT no Cookie no navegador.
  - `POST /auth/register`: Registra um novo usuário.
  - `POST /auth/logout`: Realiza o logout do usuário, limpando os cookies.

- Password
  - `POST /auth/startrecoverpassword`: Inicia o procediemnto de recuperação de senha com o token temporário adicionado no redis e enviando por email o link de recuperação de senha.
  - `POST /auth/recoverpassword`: Redefine a senha do usuário.
  - `POST /auth/editpassword`: Altera a senha do usuário logado.

- Email
  - `POST /auth/startvalidadeemail`: Inicia o procedimento de validação de email com o token temporário adicionado no redis e enviando por email o link de validação.
  - `POST /auth/validateemail`: Valida o email do usuário.
  - `POST /auth/addemail`: Adiciona um novo email ao usuário logado.

- User
  - `GET /me`: Retorna os dados do usuário logado.

- Game
  - `GET /game/start`: Inicia um novo jogo para o usuário logado, retornando o id da partida e adicionando a partida no Redis.
  - `POST /game/finish`: Recebe o id partida e a sequência do alfabeto, valida a sequência e finaliza a partida, retornando o resultado.
  - `GET /game/ranking`: Retorna o ranking dos 10 menores tempos registradas dentro do top 100, se limitando a 1 partida por user.
  - `GET /game/mymatchs`: Retorna o histórico de partidas ainda registradas no top 100 do usuário logado com tempo, data de finalização, tempo e posição no top 100.

 
### Veja mais do meu trabalho:
- Portifólio: [alanmarinho.com.br](https://alanmarinho.com.br)
