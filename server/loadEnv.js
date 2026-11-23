const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Keep the host's NODE_ENV (Next sets production on Vercel). A local .env
// must not flip a production process back to development.
const nodeEnvFromHost = process.env.NODE_ENV;

const candidates = [
  path.join(__dirname, '..', '.env'),
];

for (const envPath of candidates) {
  if (!fs.existsSync(envPath)) continue;
  if (fs.statSync(envPath).size === 0) {
    console.warn(`Warning: ${envPath} is empty on disk. Save the file, then retry.`);
    continue;
  }
  dotenv.config({ path: envPath, override: true });
}

if (nodeEnvFromHost) {
  process.env['NODE' + '_ENV'] = nodeEnvFromHost;
}
