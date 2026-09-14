const fs = require('fs');
let code = fs.readFileSync('test/auth-security.test.ts', 'utf8');

code = code.replace(
  "email: 'hacker@example.com',",
  "email: \`hacker\${Date.now()}@example.com\`,"
);

code = code.replace(
  "email: 'newexpert@example.com',",
  "email: \`newexpert\${Date.now()}@example.com\`,"
);

fs.writeFileSync('test/auth-security.test.ts', code);
