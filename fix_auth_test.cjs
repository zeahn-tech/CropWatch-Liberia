const fs = require('fs');
let code = fs.readFileSync('test/auth-security.test.ts', 'utf8');

// The file has a '});' right before test 7
const regex = /\}\);\n\s*test\('7\. Public self-registration/g;
code = code.replace(regex, "  test('7. Public self-registration");

// Let's add the closing bracket at the end
if (!code.endsWith('});\n')) {
  code += '\n});\n';
}

fs.writeFileSync('test/auth-security.test.ts', code);
