const fs = require('fs');
let code = fs.readFileSync('server/apiRouter.ts', 'utf8');
code = code.replace(
  "    role: role || 'farmer',",
  "    role: 'farmer',"
);
fs.writeFileSync('server/apiRouter.ts', code);
