const fs = require('fs');
let code = fs.readFileSync('test/auth-security.test.ts', 'utf8');

// The file has two `});` at the end now, because of my last commands and append.
// Let's just remove the last occurrences and put them back correctly.

const correctCode = code.replace(/test\('7\. Public self-registration[\s\S]*/, `
  test('7. Public self-registration ignores supplied role and creates farmer account', async () => {
    const res = await fetch(\`\${baseUrl}/auth/register\`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Sneaky Hacker',
        email: 'hacker@example.com',
        password: 'password123',
        role: 'admin',
      }),
    });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.user.role, 'farmer', 'Role must be forced to farmer');
  });

  test('8. Admin can invite users with specific roles', async () => {
    const adminToken = await login('admin@cropwatch.gov.lr', 'admin');
    const res = await fetch(\`\${baseUrl}/admin/users/invite\`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: \`Bearer \${adminToken}\`,
      },
      body: JSON.stringify({
        fullName: 'New Expert',
        email: 'newexpert@example.com',
        password: 'password123',
        role: 'expert',
      }),
    });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.user.role, 'expert', 'Admin should be able to create expert account');
  });
});
`);

fs.writeFileSync('test/auth-security.test.ts', correctCode);
