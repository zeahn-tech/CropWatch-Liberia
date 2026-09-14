const fs = require('fs');
let code = fs.readFileSync('test/auth-security.test.ts', 'utf8');

// The tests 7 and 8 are currently appended after the \`});\` that closes the describe block.
// I will just remove the first \`});\` that closes it and put it at the end.

const firstEndBracketIndex = code.indexOf('});\n  test(\'7. Public self-registration');
if (firstEndBracketIndex !== -1) {
  code = code.replace('});\n  test(\'7. Public self-registration', '  test(\'7. Public self-registration');
  code = code + '\n});\n';
}

fs.writeFileSync('test/auth-security.test.ts', code);
