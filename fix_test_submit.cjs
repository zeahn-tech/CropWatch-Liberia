const fs = require('fs');
let code = fs.readFileSync('test/business-rules.test.ts', 'utf8');

// Fix the Draft validation test to use correct fields for creation
code = code.replace(
  /content: 'This is a draft\.',\n\s*tags: \['Draft'\],\n\s*governanceStatus: 'draft',/,
  "symptomsDescription: 'This is a draft.',\n          preventativeMeasures: 'Draft.',"
);

// We need to add submit-for-review before validating Marie's article and Flomo's article
code = code.replace(
  "const articleId = dataCreate.knowledgeItem.id;",
  "const articleId = dataCreate.knowledgeItem.id;\n      await fetch(\`\${baseUrl}/knowledge/\${articleId}/submit-for-review\`, { method: 'POST', headers: { Authorization: \`Bearer \${marieToken}\` } });"
);

code = code.replace(
  "const flomoArticleId = dataCreateFlomo.knowledgeItem.id;",
  "const flomoArticleId = dataCreateFlomo.knowledgeItem.id;\n      await fetch(\`\${baseUrl}/knowledge/\${flomoArticleId}/submit-for-review\`, { method: 'POST', headers: { Authorization: \`Bearer \${flomoToken}\` } });"
);

fs.writeFileSync('test/business-rules.test.ts', code);
