const fs = require('fs');
let code = fs.readFileSync('server/apiRouter.ts', 'utf8');

const oldCheck = `
  // Ensure item is actually in 'review' status
  if (item.governanceStatus !== 'review') {
    return res.status(400).json({ success: false, error: 'Governance restriction: Only articles in "review" status can be validated.' });
  }

  // Author check
  if (item.authorId === user.id) {
    return res.status(403).json({
      success: false,
      error: 'Governance restriction: You cannot review or validate your own authored knowledge articles.',
    });
  }
`;

const newCheck = `
  // Author check
  if (item.authorId === user.id) {
    return res.status(403).json({
      success: false,
      error: 'Governance restriction: You cannot review or validate your own authored knowledge articles.',
    });
  }

  // Ensure item is actually in 'review' status
  if (item.governanceStatus !== 'review') {
    return res.status(400).json({ success: false, error: 'Governance restriction: Only articles in "review" status can be validated.' });
  }
`;

code = code.replace(oldCheck, newCheck);
fs.writeFileSync('server/apiRouter.ts', code);
