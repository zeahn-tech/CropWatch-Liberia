const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');
code = code.replace(
  /const data = await res\.json\(\);/,
  `const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (parseError) {
        if (text.trim().startsWith('<')) {
           throw new Error('Backend is not running. GitHub Pages only supports static files, not Node.js servers. Please deploy to Render, Vercel, or Cloud Run.');
        }
        throw new Error('Invalid JSON response from server.');
      }`
);
fs.writeFileSync('src/App.tsx', code);
