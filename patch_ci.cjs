const fs = require('fs');
let code = fs.readFileSync('.github/workflows/ci.yml', 'utf8');

code = code.replace(
  'JWT_SECRET: "test-secret-for-ci"',
  'JWT_SECRET: "test-secret-for-ci"\n          DAILY_AI_ANALYSES_LIMIT: "50"'
);

fs.writeFileSync('.github/workflows/ci.yml', code);
