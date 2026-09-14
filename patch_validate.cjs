const fs = require('fs');
let code = fs.readFileSync('server/apiRouter.ts', 'utf8');

const validateCode = `
apiRouter.post('/knowledge/:id/validate', requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user as User;
  if (user.role === 'farmer') {
    return res.status(403).json({ success: false, error: 'Farmers cannot validate knowledge base articles.' });
  }

  // Check if reviewer is a verified expert, senior expert, or admin
  if (user.role === 'expert') {
    const expertProfile = db.getExpertProfileByUserId(user.id);
    if (!expertProfile || expertProfile.verificationStatus !== 'verified') {
      return res.status(403).json({ success: false, error: 'Governance restriction: Unverified experts cannot validate knowledge articles.' });
    }
  }

  const items = db.getKnowledge();
  const item = items.find((k) => k.id === req.params.id);
  if (!item) {
    return res.status(404).json({ success: false, error: 'Knowledge article not found.' });
  }

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

  const updated = db.updateKnowledge(item.id, {
`;

// Replace `apiRouter.post('/knowledge/:id/validate', requireAuth, (req: Request, res: Response) => {` and everything until `const updated = db.updateKnowledge(item.id, {`

const regex = /apiRouter\.post\('\/knowledge\/:id\/validate', requireAuth, \(req: Request, res: Response\) => \{[\s\S]*?const updated = db\.updateKnowledge\(item\.id, \{/;
code = code.replace(regex, validateCode);
fs.writeFileSync('server/apiRouter.ts', code);
