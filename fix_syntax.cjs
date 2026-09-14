const fs = require('fs');
let code = fs.readFileSync('test/auth-security.test.ts', 'utf8');

// The file has two \`});\` at the end? Let's just remove one.
code = code.replace(/\}\);\n\}\);\n\}\);\n?$/, '  });\n});\n');
fs.writeFileSync('test/auth-security.test.ts', code);
