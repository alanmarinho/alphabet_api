// usado especificamente para gerar chave mestra APP_KEY
// execute node .\tools\generate256bitkey.cjs, e copie a key para o .env

const crypto = require('crypto');

function generateMasterKey() {
  const masterKey = crypto.randomBytes(32);

  return masterKey.toString('hex');
}

const key = generateMasterKey();
console.log(`Chave mestra gerada: ${key}`);
