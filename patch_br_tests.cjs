const fs = require('fs');
let code = fs.readFileSync('test/business-rules.test.ts', 'utf8');

const additionalTests = `
    test('Unverified expert cannot validate article', async () => {
      const unverifiedToken = await login('arthur.doe@extension.moa.gov.lr', 'Password123!');
      const res = await fetch(\`\${baseUrl}/knowledge/know_cassava_1/validate\`, {
        method: 'POST',
        headers: { Authorization: \`Bearer \${unverifiedToken}\` },
      });
      assert.strictEqual(res.status, 403);
      const data = await res.json();
      assert.match(data.error, /Unverified/);
    });

    test('Draft cannot be validated directly', async () => {
      const verifiedToken = await login('expert.marie@cari.gov.lr', 'Password123!');
      
      // We need a draft article. We can create one first.
      const resCreate = await fetch(\`\${baseUrl}/knowledge\`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: \`Bearer \${verifiedToken}\` 
        },
        body: JSON.stringify({
          topic: 'Draft Article',
          content: 'This is a draft.',
          tags: ['Draft'],
          governanceStatus: 'draft',
        }),
      });
      const dataCreate = await resCreate.json();
      const draftId = dataCreate.knowledgeItem.id;

      // Another verified expert tries to validate it (to avoid author check)
      const adminToken = await login('admin@cropwatch.gov.lr', 'admin');
      const resValidate = await fetch(\`\${baseUrl}/knowledge/\${draftId}/validate\`, {
        method: 'POST',
        headers: { Authorization: \`Bearer \${adminToken}\` },
      });
      
      assert.strictEqual(resValidate.status, 400);
      const dataValidate = await resValidate.json();
      assert.match(dataValidate.error, /review/);
    });
`;

code = code.replace(/test\('Author cannot publish or validate their own article'[\s\S]*?\}\);/, (match) => match + additionalTests);
fs.writeFileSync('test/business-rules.test.ts', code);
