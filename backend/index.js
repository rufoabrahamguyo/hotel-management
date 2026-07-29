import 'dotenv/config';
import { createApp } from './app.js';
import { ensureBootstrapAdmin } from './lib/bootstrapAdmin.js';
import { assertJwtSecretConfigured } from './lib/jwt.js';

assertJwtSecretConfigured();

const app = createApp();
const PORT = Number(process.env.PORT) || 4000;

async function start() {
  await ensureBootstrapAdmin();
  app.listen(PORT, () => {
    console.log(`Hotel API listening on http://localhost:${PORT}`);
  });
}

start().catch((err) => {
  console.error('Failed to start server', err);
  process.exit(1);
});
