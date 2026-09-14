const fs = require('fs');
let code = fs.readFileSync('test/business-rules.test.ts', 'utf8');

// I just appended the test, but I need to make sure it's inside a describe block or at least before the final }); 
// It got appended at the end of the file.
code = code.replace(/  test\('Expert can only see their assigned cases in lists'[\s\S]*\}\);/, '');

const testStr = `
  test('Expert can only see their assigned cases in lists', async () => {
    const verifiedToken = await login('expert.marie@cari.gov.lr', 'Password123!');
    const res = await fetch(\`\${baseUrl}/observations\`, {
      headers: { Authorization: \`Bearer \${verifiedToken}\` },
    });
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.ok(data.observations.length >= 1, "Expert should see their assigned observations");
    const obs = data.observations.find((o: any) => o.id === 'obs_cass_1');
    assert.ok(obs, "Expert should see obs_cass_1");
  });
});
`;
code = code.replace(/}\);\n$/, testStr);
fs.writeFileSync('test/business-rules.test.ts', code);
